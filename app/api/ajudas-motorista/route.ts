import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_ajudas_motorista";
const FIELDS = ["funcionario_id", "equipamento_id", "data", "tipo_conta", "pix", "agencia", "conta", "valor", "status", "observacoes"];
const SEARCH_FIELDS = ["tipo_conta", "pix", "status", "observacoes"];

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
