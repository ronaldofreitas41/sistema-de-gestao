import { NextRequest } from "next/server";
import { list } from "@/lib/crud-prisma";
import { calcularPlacasMedicao, contarDiasPeriodoMedicao } from "@/lib/medicoes";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_medicoes";
const FIELDS = [
  "id",
  "placas",
  "tipo_cobranca",
  "dias_mes",
  "valor",
  "terceiro",
  "valor_terceiro",
  "horas_extras",
  "data_medicao",
  "parceiro",
  "observacoes",
  "status",
  "periodo",
  "valor_hora_extra",
  "conta_recebimento_id",
  "obs_internas",
  "cliente_id",
];

export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "O conteúdo enviado é inválido." }, { status: 400 });
  }

  try {
    const idsVendas: string[] = Array.isArray(body.vendas)
      ? [...new Set(body.vendas.map((venda: { id?: unknown }) => venda?.id).filter((id: unknown): id is string => typeof id === "string" && id.length > 0))]
      : [];
    if (Array.isArray(body.vendas) && idsVendas.length !== body.vendas.length) {
      return Response.json({ error: "A lista de vendas selecionadas é inválida." }, { status: 400 });
    }
    const registrosVendas = idsVendas.length
      ? await prisma.mh3_vendas.findMany({
          where: { id: { in: idsVendas }, em_medicao: true, status: { not: "cancelado" } },
          select: {
            id: true,
            numero: true,
            cliente: true,
            total: true,
            sinal_medicao: true,
            placa_medicao: true,
          },
        })
      : [];
    if (registrosVendas.length !== idsVendas.length) {
      return Response.json({ error: "Uma ou mais vendas não estão disponíveis para medição." }, { status: 400 });
    }
    const vendas = registrosVendas.map((venda) => ({
      id: venda.id,
      numero: venda.numero,
      cliente: venda.cliente,
      total: Number(venda.total),
      sinal_medicao: venda.sinal_medicao,
      placa_medicao: venda.placa_medicao,
    }));
    const dataMedicao = new Date(body.data_medicao);
    const id = body.id || crypto.randomUUID();
    const periodo = String(body.periodo || dataMedicao.toISOString().slice(0, 7));
    const diasInformados = Number(body.dias_mes);
    const diasMes = body.tipo_cobranca === "Valor Mensal"
      ? diasInformados > 0 ? diasInformados : contarDiasPeriodoMedicao(periodo)
      : null;
    let calculoPlacas: ReturnType<typeof calcularPlacasMedicao>;
    try {
      calculoPlacas = calcularPlacasMedicao(
        body.placas || [],
        String(body.tipo_cobranca || ""),
        diasMes || 0,
        Number(body.horas_extras) || 0,
      );
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : "A lista de placas ou seus valores é inválida.",
      }, { status: 400 });
    }
    const ajusteVendas = vendas.reduce(
      (total, venda) => total + (venda.sinal_medicao === "-" ? -1 : 1) * venda.total,
      0,
    );
    const valorBase = calculoPlacas.detalhadas
      ? calculoPlacas.total + (Number(body.valor_sem_placa) || 0)
      : Number(body.valor) || 0;
    const valor = valorBase + ajusteVendas;
    const terceiro = Boolean(body.terceiro);
    const valorTerceiro = Number(body.valor_terceiro) || 0;
    const competencia = periodo.match(/^(\d{4}-\d{2})/)?.[1]
      || dataMedicao.toISOString().slice(0, 7);

    const resultado = await prisma.$transaction(async (tx) => {
      const medicao = await tx.mh3_medicoes.create({
        data: {
          id,
          placas: calculoPlacas.detalhadas ? calculoPlacas.placas : body.placas || [],
          tipo_cobranca: body.tipo_cobranca,
          dias_mes: diasMes,
          valor,
          terceiro,
          valor_terceiro: valorTerceiro,
          horas_extras: Number(body.horas_extras) || 0,
          data_medicao: dataMedicao,
          parceiro: body.parceiro || null,
          observacoes: body.observacoes || null,
          status: body.status || "pendente",
          periodo,
          valor_hora_extra: Number(body.valor_hora_extra) || 0,
          conta_recebimento_id: body.conta_recebimento_id || null,
          obs_internas: body.obs_internas || null,
          cliente_id: body.cliente_id || null,
          vendas,
        },
      });

      await tx.mh3_contas_receber.create({
        data: {
          id: crypto.randomUUID(),
          cliente: body.parceiro || "Medição",
          competencia,
          valor_total: valor - (terceiro ? valorTerceiro : 0),
          status: "pendente",
          observacoes: `Lançamento automático da medição ${id}.`,
          data_emissao: dataMedicao,
        },
      });

      if (terceiro) {
        await tx.mh3_despesas.create({
          data: {
            descricao: `Medição ${id}`,
            categoria: "Medição de terceiro",
            fornecedor: body.parceiro || null,
            data_competencia: dataMedicao,
            data_vencimento: dataMedicao,
            valor: valorTerceiro,
            status_disp: "pendente",
            observacoes: `Lançamento automático da medição ${id}.`,
            num_desp: `MED - ${id}`,
          },
        });
      }

      return medicao;
    });

    return Response.json(resultado, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar medição:", error);
    return Response.json({ error: "Não foi possível criar a medição." }, { status: 500 });
  }
}
