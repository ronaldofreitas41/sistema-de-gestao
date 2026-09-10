import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_vendas";
const FIELDS = [
  "numero",
  "cliente",
  "data",
  "documento",
  "tipo_documento",
  "contato",
  "pagamento",
  "observacoes",
  "sub_total",
  "desconto",
  "total",
  "status",
  "faturada",
  "vencimento",
  "avaria",
  "em_medicao",
  "sinal_medicao",
  "placa_medicao",
];
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
