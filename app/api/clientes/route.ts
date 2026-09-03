import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_clientes";
const FIELDS = ["empresa_id", "tipo_pessoa", "nome", "razao_social", "cpf_cnpj", "email", "telefone", "endereco", "cidade", "estado", "cep", "observacoes", "ativo"];
const SEARCH_FIELDS = ["nome", "razao_social", "cpf_cnpj", "email", "telefone"];

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
