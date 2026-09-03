import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_contas_bancarias";
const FIELDS = ["empresa_id", "banco", "agencia", "conta", "tipo", "saldo_inicial", "saldo_atual", "ativo"];
const SEARCH_FIELDS = ["banco", "agencia", "conta", "tipo"];

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
