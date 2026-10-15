import { prisma } from "./prisma";
import { auditar, obterAtor } from "./audit";
import { criarDespesas } from "./financeiro-service";
import { ErroNegocio } from "./medicao-service";

export const DIAS_ALERTA_AJUDA = 7;

const DIA_MS = 86_400_000;
const inicioDoDia = (data: Date) => new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
const chaveMes = (data: Date) => data.toISOString().slice(0, 7);

function tratados(texto: string | null | undefined) {
  return new Set(String(texto ?? "").split(",").map((m) => m.trim()).filter(Boolean));
}

export type OcorrenciaAjuda = {
  ajudaId: string;
  mes: string;
  vencimento: string;
  diasParaVencer: number;
  motorista: string | null;
  empresa: string | null;
  placa: string | null;
  valor: number;
};

/**
 * Ajudas recorrentes: o dia do vencimento é o da data cadastrada pela 1ª vez.
 * Cada mês entra em Pendências 7 dias antes e some depois de confirmado.
 * Meses com mais de 31 dias de atraso são ignorados para não inundar o painel com legado.
 */
export async function ocorrenciasPendentes(referencia = new Date()): Promise<OcorrenciaAjuda[]> {
  const hoje = inicioDoDia(referencia);
  const limiteFuturo = new Date(hoje.getTime() + DIAS_ALERTA_AJUDA * DIA_MS);
  const limitePassado = new Date(hoje.getTime() - 31 * DIA_MS);

  const ajudas = await prisma.mh3_ajudas_motorista.findMany({ where: { recorrente: 1 } });
  const lista: OcorrenciaAjuda[] = [];

  for (const ajuda of ajudas) {
    if (!ajuda.data) continue;
    const primeira = inicioDoDia(ajuda.data);
    const jaTratados = tratados(ajuda.meses_tratados);
    const dia = primeira.getUTCDate();

    for (let deslocamento = -2; deslocamento <= 1; deslocamento++) {
      const base = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + deslocamento, 1));
      const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
      const vencimento = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), Math.min(dia, ultimoDia)));
      if (vencimento < primeira) continue;
      if (vencimento > limiteFuturo || vencimento < limitePassado) continue;
      const mes = chaveMes(vencimento);
      if (jaTratados.has(mes)) continue;
      lista.push({
        ajudaId: String(ajuda.id),
        mes,
        vencimento: vencimento.toISOString().slice(0, 10),
        diasParaVencer: Math.round((vencimento.getTime() - hoje.getTime()) / DIA_MS),
        motorista: ajuda.motorista,
        empresa: ajuda.empresa,
        placa: ajuda.placa,
        valor: Number(ajuda.valor) || 0,
      });
    }
  }
  return lista.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

/** Confirma a ocorrência: gera a conta a pagar (pendente) e marca o mês como tratado. */
export async function confirmarOcorrencia(ajudaId: bigint, mes: string, request?: Request) {
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new ErroNegocio(400, "Mês inválido.");
  const ator = await obterAtor(request);
  const ocorrencias = await ocorrenciasPendentes();
  const ocorrencia = ocorrencias.find((o) => o.ajudaId === String(ajudaId) && o.mes === mes);
  if (!ocorrencia) throw new ErroNegocio(409, "Esta ajuda não está pendente de confirmação para o mês informado.");

  const ajuda = await prisma.mh3_ajudas_motorista.findUnique({ where: { id: ajudaId } });
  if (!ajuda) throw new ErroNegocio(404, "Ajuda não encontrada.");

  const [despesa] = await criarDespesas(
    {
      descricao: `AJUDA DE CUSTO - ${ajuda.empresa ?? ""} - ${ajuda.motorista ?? ""} (${mes})`,
      categoria: "Ajuda Motorista",
      fornecedor: ajuda.motorista,
      data_competencia: `${mes}-01`,
      data_vencimento: ocorrencia.vencimento,
      valor: Number(ajuda.valor) || 0,
      placa: ajuda.placa,
      observacoes: ajuda.observacoes,
      origem: `ajuda:${ajuda.id}`,
    },
    request,
  );

  const todos = tratados(ajuda.meses_tratados);
  todos.add(mes);
  await prisma.mh3_ajudas_motorista.update({
    where: { id: ajudaId },
    data: { meses_tratados: [...todos].sort().join(","), despesa_id: despesa.id, confirma_user: ator.nome },
  });
  await auditar({
    request,
    acao: "CONFIRMAR_AJUDA",
    modulo: "mh3_ajudas_motorista",
    registroId: ajudaId,
    descricao: `Ajuda ${mes} de ${ajuda.motorista} confirmada → ${despesa.num_desp}`,
  });
  return despesa;
}

/** Ajuda avulsa (não recorrente): vai direto para o contas a pagar como pendente. */
export async function lancarAjudaAvulsa(
  ajuda: { id: bigint; empresa: string | null; motorista: string | null; placa: string | null; valor: unknown; data: Date | null; observacoes: string | null },
  request?: Request,
) {
  const vencimento = (ajuda.data ?? new Date()).toISOString().slice(0, 10);
  const [despesa] = await criarDespesas(
    {
      descricao: `AJUDA DE CUSTO - ${ajuda.empresa ?? ""} - ${ajuda.motorista ?? ""}`,
      categoria: "Ajuda Motorista",
      fornecedor: ajuda.motorista,
      data_competencia: vencimento,
      data_vencimento: vencimento,
      valor: Number(ajuda.valor) || 0,
      placa: ajuda.placa,
      observacoes: ajuda.observacoes,
      origem: `ajuda:${ajuda.id}`,
    },
    request,
  );
  await prisma.mh3_ajudas_motorista.update({ where: { id: ajuda.id }, data: { despesa_id: despesa.id } });
  return despesa;
}
