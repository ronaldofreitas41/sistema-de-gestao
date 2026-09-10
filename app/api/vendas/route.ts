import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_vendas";
const FIELDS = [
  "numero",
  "cliente",
  "data",
  "documento",
  "tipo_documento",
  "contato",
  "pagamento",
  "observacoes",
  "sub_total",
  "desconto",
  "total",
  "status",
  "faturada",
  "vencimento",
  "avaria",
  "em_medicao",
  "sinal_medicao",
  "placa_medicao",
];
const SEARCH_FIELDS = ["numero", "vendedor", "forma_pagamento", "status"];

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
