import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_contas_receber";

// Campos permitidos no POST (excluídos ID e colunas automáticas de data)
const FIELDS = [
  "contrato_id",
  "cliente",
  "competencia",
  "valor_total",
  "status",
  "observacoes",
  "data_emissao",
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