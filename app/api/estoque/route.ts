import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_estoque";
const FIELDS = ["empresa_id", "codigo", "descricao", "categoria", "unidade", "quantidade", "estoque_minimo", "custo_unitario", "fornecedor", "localizacao", "ativo"];
const SEARCH_FIELDS = ["codigo", "descricao", "categoria", "fornecedor", "localizacao"];

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
