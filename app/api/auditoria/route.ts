import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_auditoria";
const FIELDS = ["usuario_id", "usuario_nome", "acao", "modulo", "registro_id", "descricao", "ip"];
const SEARCH_FIELDS = ["usuario_nome", "acao", "modulo", "descricao", "ip"];

export async function GET(request: NextRequest) {
  return list(TABLE, request, SEARCH_FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    return create(TABLE, FIELDS, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
