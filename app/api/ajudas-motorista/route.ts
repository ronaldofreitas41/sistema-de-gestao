import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_ajudas_motorista";
const FIELDS = [
  "pix",
  "agencia",
  "conta",
  "valor",
  "observacoes",
  "confirma_user",
  "empresa",
  "motorista",
  "telefone",
  "data",
  "forma_pagamento",
  "placa",
  "despesa_id",
  "meses_tratados",
  "recorrente",
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
