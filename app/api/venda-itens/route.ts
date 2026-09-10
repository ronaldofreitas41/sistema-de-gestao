import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_venda_itens";
const FIELDS = [
  "venda_id",
  "descricao",
  "quantidade",
  "valor",
  "tipo",
  "fonte",
];

export async function GET(request: NextRequest) {
  return list(TABLE, request);
}

export async function POST(request: NextRequest) {
  try {
    return create(TABLE, FIELDS, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
