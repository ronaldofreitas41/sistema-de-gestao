import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_parceiros";
const FIELDS = ["id", "nome", "cnpj", "email", "telefone", "endereco", "cidade", "estado", "cep", "observacoes", "pix", "banco", "agencia", "conta", "tipo_conta", "titular", "documento_titular", "tipo_cadastro"];


export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    return create(TABLE, FIELDS, await request.json(), request);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
