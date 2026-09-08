import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_despesas";

// Campos permitidos no POST (excluídos ID e colunas automáticas de data)
const FIELDS = [
  "descricao",
  "categoria",
  "fornecedor",
  "data_competencia",
  "data_vencimento",
  "data_pagamento",
  "valor",
  "status_disp",
  "observacoes",
  "conta_banco_id",
  "conta_banco",
  "placa",
  "antigo",
  "num_desp"
];


export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    return create(TABLE, FIELDS, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}