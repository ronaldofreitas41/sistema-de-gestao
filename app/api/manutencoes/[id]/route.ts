import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_manutencoes";
const FIELDS = [
  "id",
  "osNum",
  "finStatus",
  "eqId",
  "eqLbl",
  "placa",
  "tipo",
  "en",
  "sa",
  "km",
  "hr",
  "pkm",
  "phr",
  "custo",
  "status",
  "resp",
  "ob",
  "lancs",
  "checklist",
  "fotos",
];

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const { osNum: _osNum, ...body } = await request.json();
    return update(TABLE, FIELDS, id, body);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const { osNum: _osNum, ...body } = await request.json();
    return update(TABLE, FIELDS, id, body);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
