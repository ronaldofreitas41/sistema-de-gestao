import { prisma } from "./prisma";
import { ErroNegocio } from "./medicao-service";

export const SEGURO_FIELDS = [
  "seguradora",
  "numero_apolice",
  "data_inicio",
  "data_fim",
  "status",
  "observacoes",
  "placas",
];

const normalizarPlaca = (placa: unknown) => String(placa ?? "").trim().toUpperCase().replace(/\s+/g, "");

/** Valida os campos da apólice: seguradora, nº, vencimento e ao menos uma placa da frota. */
export async function prepararSeguro(body: Record<string, unknown>) {
  if (!String(body.seguradora ?? "").trim()) throw new ErroNegocio(400, "Informe a seguradora.");
  if (!String(body.numero_apolice ?? "").trim()) throw new ErroNegocio(400, "Informe o número da apólice.");
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(body.data_fim ?? ""))) throw new ErroNegocio(400, "Informe o vencimento da apólice.");

  const placas = Array.isArray(body.placas)
    ? [...new Set(body.placas.map(normalizarPlaca).filter(Boolean))]
    : [];
  if (!placas.length) throw new ErroNegocio(400, "Inclua ao menos uma placa nesta apólice.");

  const cadastradas = await prisma.mh3_equipamentos.findMany({
    where: { placa: { in: placas } },
    select: { placa: true },
  });
  const conhecidas = new Set(cadastradas.map((e) => normalizarPlaca(e.placa)));
  const faltando = placas.filter((p) => !conhecidas.has(p));
  if (faltando.length) throw new ErroNegocio(400, `Placa não cadastrada na frota: ${faltando.join(", ")}.`);

  return { ...body, numero_apolice: String(body.numero_apolice).trim(), placas };
}
