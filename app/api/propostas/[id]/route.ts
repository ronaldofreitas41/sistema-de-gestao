import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

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

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const { numero: _numero, ...body } = await request.json();
    return update(TABLE, FIELDS, id, body);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const { numero: _numero, ...body } = await request.json();
    return update(TABLE, FIELDS, id, body);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
