import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_equipamentos";
const FIELDS = ["empresa_id", "codigo", "placa", "frota", "tipo", "marca", "modelo", "ano", "renavam", "chassi", "km_atual", "horimetro", "status", "observacoes"];

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
