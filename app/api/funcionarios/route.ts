import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_funcionarios";
const FIELDS = ["empresa_id", "nome", "cpf", "cargo", "telefone", "email", "data_admissao", "salario", "ativo", "observacoes"];
const SEARCH_FIELDS = ["nome", "cpf", "cargo", "email", "telefone"];

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
