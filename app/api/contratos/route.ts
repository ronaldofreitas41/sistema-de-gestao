import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_contratos";
const FIELDS = ["empresa_id", "cliente_id", "equipamento_id", "numero", "descricao", "data_inicio", "data_fim", "valor", "status", "ciclo_medicao", "observacoes"];
const SEARCH_FIELDS = ["numero", "descricao", "status"];

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
