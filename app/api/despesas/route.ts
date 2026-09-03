import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_despesas";
const FIELDS = ["empresa_id", "descricao", "categoria", "fornecedor", "documento", "data_competencia", "data_vencimento", "data_pagamento", "valor", "forma_pagamento", "status", "observacoes"];
const SEARCH_FIELDS = ["descricao", "categoria", "fornecedor", "documento", "status"];

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
