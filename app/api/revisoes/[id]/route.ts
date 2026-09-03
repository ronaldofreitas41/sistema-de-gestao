import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_revisoes";
const FIELDS = ["equipamento_id", "tipo", "km_atual", "km_proxima", "horas_atual", "horas_proxima", "data_realizacao", "data_proxima", "status", "observacoes"];

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id, request);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, await request.json(), request);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, await request.json(), request);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id, request);
}
