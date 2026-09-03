import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_usuarios";
const FIELDS = ["empresa_id", "nome", "login", "senha", "perfil", "permissoes", "ativo", "ultimo_login"];
const SEARCH_FIELDS = ["nome", "login", "perfil"];

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
