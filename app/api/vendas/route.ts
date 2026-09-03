import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_vendas";
const FIELDS = ["empresa_id", "cliente_id", "numero", "data_venda", "vendedor", "subtotal", "desconto", "total", "forma_pagamento", "status", "observacoes"];
const SEARCH_FIELDS = ["numero", "vendedor", "forma_pagamento", "status"];

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
