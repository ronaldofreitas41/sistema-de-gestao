import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmarOcorrencia, ocorrenciasPendentes } from "@/lib/ajuda-service";
import { carregarSessao, exigirPermissao, sessaoPode } from "@/lib/permissoes-server";
import { respostaErro, serializar } from "@/lib/medicao-service";

const DIA_MS = 86_400_000;
const DIAS_DOCUMENTOS = 10;
const DIAS_SEGURO = 15;

const hoje = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
const dias = (data: Date) => Math.round((data.getTime() - hoje().getTime()) / DIA_MS);

/**
 * Painel de pendências/alertas. Cada bloco só aparece para quem tem a permissão correspondente:
 * ajudas (confirma-ajuda), documentos da frota (doc-veiculo), seguros (seguro),
 * pneus e romaneios (pneus) e contas a pagar do mês (desp).
 */
export async function GET(request: NextRequest) {
  try {
    const sessao = await carregarSessao(request);
    if (!sessao) return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

    const limite = (qtd: number) => new Date(hoje().getTime() + qtd * DIA_MS);
    const passado = new Date(hoje().getTime() - 90 * DIA_MS);

    const [ajudas, equipamentos, seguros, pneusPendentes, romaneios, despesas] = await Promise.all([
      sessaoPode(sessao, "confirma-ajuda") ? ocorrenciasPendentes() : [],
      sessaoPode(sessao, "doc-veiculo")
        ? prisma.mh3_equipamentos.findMany({
            where: {
              OR: [
                { cronotacografo_venc: { gte: passado, lte: limite(DIAS_DOCUMENTOS) } },
                { inmetro_venc: { gte: passado, lte: limite(DIAS_DOCUMENTOS) } },
                { outros_venc: { gte: passado, lte: limite(DIAS_DOCUMENTOS) } },
                { vencimento_licenca_antt: { gte: passado, lte: limite(DIAS_DOCUMENTOS) } },
              ],
            },
            select: {
              id: true,
              placa: true,
              cronotacografo_venc: true,
              inmetro_venc: true,
              outros_nome: true,
              outros_venc: true,
              vencimento_licenca_antt: true,
            },
          })
        : [],
      sessaoPode(sessao, "seguro")
        ? prisma.mh3_seguros.findMany({
            where: { data_fim: { gte: passado, lte: limite(DIAS_SEGURO) }, NOT: { status: { in: ["Cancelado", "Vencido"] } } },
            orderBy: { data_fim: "asc" },
          })
        : [],
      sessaoPode(sessao, "pneus") ? prisma.mh3_pneu_pendencias.findMany({ where: { status: "pendente" }, orderBy: { id: "desc" } }) : [],
      sessaoPode(sessao, "pneus") ? prisma.mh3_romaneios.findMany({ where: { status: "aberto" }, orderBy: { id: "desc" } }) : [],
      sessaoPode(sessao, "desp")
        ? prisma.mh3_despesas.findMany({
            where: {
              status_disp: "pendente",
              data_vencimento: {
                gte: new Date(Date.UTC(hoje().getUTCFullYear(), hoje().getUTCMonth(), 1)),
                lt: new Date(Date.UTC(hoje().getUTCFullYear(), hoje().getUTCMonth() + 1, 1)),
              },
            },
            orderBy: { data_vencimento: "asc" },
          })
        : [],
    ]);

    const documentos = equipamentos.flatMap((eq) =>
      (
        [
          ["Cronotacógrafo", eq.cronotacografo_venc],
          ["Inmetro", eq.inmetro_venc],
          [eq.outros_nome || "Outros", eq.outros_venc],
          ["Licença ANTT", eq.vencimento_licenca_antt],
        ] as [string, Date | null][]
      )
        .filter(([, data]) => data && data >= passado && data <= limite(DIAS_DOCUMENTOS))
        .map(([nome, data]) => ({
          equipamentoId: String(eq.id),
          placa: eq.placa,
          documento: nome,
          vencimento: data!.toISOString().slice(0, 10),
          diasParaVencer: dias(data!),
        })),
    );

    return Response.json(
      serializar({
        ajudas,
        documentos: documentos.sort((a, b) => a.diasParaVencer - b.diasParaVencer),
        seguros: seguros.map((s) => ({ ...s, diasParaVencer: s.data_fim ? dias(s.data_fim) : null })),
        pneus: pneusPendentes,
        romaneios,
        despesas,
      }),
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}

/** POST { acao: "confirmar_ajuda", ajudaId, mes } */
export async function POST(request: NextRequest) {
  let body: { acao?: string; ajudaId?: string; mes?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    if (body.acao === "confirmar_ajuda" && body.ajudaId && /^\d+$/.test(body.ajudaId)) {
      await exigirPermissao(request, "confirma-ajuda", "confirmar ajudas de motorista");
      return Response.json(serializar(await confirmarOcorrencia(BigInt(body.ajudaId), String(body.mes), request)), { status: 201 });
    }
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
