import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

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

export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    return create(TABLE, FIELDS, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
