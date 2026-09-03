import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_tabelas_precos";
const FIELDS = ["nome", "descricao", "valor", "ativo"];
const SEARCH_FIELDS = ["nome", "descricao"];

export async function GET(request: NextRequest) {
  return list(TABLE, request, SEARCH_FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    return create(TABLE, FIELDS, await request.json(), request);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
