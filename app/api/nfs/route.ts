import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_nfs";
const FIELDS = [
  "numero_nf",
  "data_emissao",
  "fornecedor",
  "cnpj",
  "valor",
  "vencimento",
  "contas_pagar",
  "status",
  "observacao",
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
