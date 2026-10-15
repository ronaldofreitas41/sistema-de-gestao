import { prisma } from "./prisma";
import { ErroNegocio } from "./medicao-service";
import { criarDespesas } from "./financeiro-service";

export type ParcelaFinanciamento = { valor?: unknown; data_vencimento?: unknown };

const MODALIDADES = ["CDC", "Finame", "Consórcio"];
const TIPOS_PARCELA = ["fixa", "variavel"];

const ehFinanciamento = (situacao: unknown) => String(situacao ?? "").toLowerCase().startsWith("financ");

/** Regras do PDF: financiamento exige modalidade (CDC, Finame ou consórcio), tipo de parcela e as parcelas. */
export function validarFinanciamento(body: Record<string, unknown>, exigirParcelas: boolean) {
  if (!ehFinanciamento(body.situacao_financeira)) return;
  if (!MODALIDADES.includes(String(body.modalidade_financiamento ?? ""))) {
    throw new ErroNegocio(400, "Selecione a modalidade do financiamento: CDC, Finame ou Consórcio.");
  }
  if (!TIPOS_PARCELA.includes(String(body.tipo_parcela ?? "").toLowerCase())) {
    throw new ErroNegocio(400, "Informe se as parcelas são fixas ou variáveis.");
  }
  if (!exigirParcelas) return;
  const parcelas = Array.isArray(body.parcelas) ? (body.parcelas as ParcelaFinanciamento[]) : [];
  const quantidade = Number(body.quantidade_parcelas);
  if (!parcelas.length) throw new ErroNegocio(400, "Cadastre as parcelas do financiamento (valor e vencimento).");
  if (Number.isFinite(quantidade) && quantidade > 0 && parcelas.length !== quantidade) {
    throw new ErroNegocio(400, `A quantidade de parcelas (${quantidade}) não confere com as parcelas cadastradas (${parcelas.length}).`);
  }
}

/** Lança as parcelas do financiamento no Contas a Pagar, uma única vez por item. */
export async function gerarFinanciamento(opts: {
  request?: Request;
  tabela: "mh3_equipamentos" | "mh3_implementos";
  id: bigint;
  placa: string | null;
  titulo: string;
  banco?: unknown;
  modalidade?: unknown;
  parcelas: ParcelaFinanciamento[];
}) {
  const delegate = (prisma as any)[opts.tabela];
  const atual = await delegate.findUnique({ where: { id: opts.id }, select: { financiamento_gerado: true } });
  if (!atual) throw new ErroNegocio(404, "Registro não encontrado.");
  if (atual.financiamento_gerado) return [];

  const origem = `${opts.tabela === "mh3_equipamentos" ? "frota" : "implemento"}:${opts.id}`;
  const despesas = await criarDespesas(
    {
      descricao: `Financiamento ${String(opts.modalidade ?? "")} — ${opts.titulo}`.trim(),
      categoria: "Financiamento",
      fornecedor: opts.banco ? String(opts.banco) : null,
      placa: opts.placa,
      origem,
      parcelas: opts.parcelas,
    },
    opts.request,
  );
  await delegate.update({ where: { id: opts.id }, data: { financiamento_gerado: true } });
  return despesas;
}
