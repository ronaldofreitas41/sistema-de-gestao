import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_medicoes";
const FIELDS = ["empresa_id", "contrato_id", "equipamento_id", "competencia", "data_medicao", "km_inicial", "km_final", "horas_inicial", "horas_final", "quantidade", "valor_unitario", "valor_total", "status", "observacoes"];

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
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

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
