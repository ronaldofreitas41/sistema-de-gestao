import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_nfs";
const FIELDS = ["empresa_id", "numero", "serie", "fornecedor", "cnpj_fornecedor", "chave_nfe", "data_emissao", "data_entrada", "valor_total", "condicao_pagamento", "cp", "status", "observacoes"];
const SEARCH_FIELDS = ["numero", "serie", "fornecedor", "cnpj_fornecedor", "chave_nfe"];

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
