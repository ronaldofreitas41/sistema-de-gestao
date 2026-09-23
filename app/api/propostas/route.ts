import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_propostas";
const FIELDS = [
  "id",
  "empresaId",
  "data",
  "validade",
  "contratante",
  "obra",
  "veiculo",
  "modelo",
  "ano",
  "qtd",
  "cobrancaModo",
  "turnoFechado",
  "valorFechado",
  "km",
  "horimetro",
  "mostrarKmHr",
  "linhas",
  "franquia",
  "obs",
  "mobilTipo",
  "mobilValor",
  "duracao",
  "tempoLocacao",
  "multaTipo",
  "fidelidade",
  "multaPct",
  "resp",
  "seguro",
  "ciclo",
  "pagamento",
  "criadoEm",
  "criadoPor",
  "numero",
  "email",
  "fotos",
  "aprovada",
  "ctAssinado",
  "equipsExtra",
  "temSeguro",
  "manutTipo",
  "incluirTurnos"
];

function extrairNumeroProposta(numero?: string | null) {
  const resultado = numero?.match(/(\d+)\s*$/);
  return resultado ? Number.parseInt(resultado[1], 10) : 0;
}

function formatarNumeroProposta(numero: number) {
  return `PROP - ${String(numero).padStart(5, "0")}`;
}

export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const propostas = await prisma.mh3_propostas.findMany({
      select: { numero: true },
    });
    const maiorNumero = propostas.reduce(
      (maior, proposta) => Math.max(maior, extrairNumeroProposta(proposta.numero)),
      0,
    );

    return create(TABLE, FIELDS, {
      ...body,
      id: crypto.randomUUID(),
      numero: formatarNumeroProposta(maiorNumero + 1),
    });
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
