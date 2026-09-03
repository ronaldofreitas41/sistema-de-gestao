import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_investimentos";
const FIELDS = ["empresa_id", "descricao", "tipo", "data_inicio", "data_fim", "valor_total", "valor_pago", "valor_pendente", "status", "observacoes"];
const SEARCH_FIELDS = ["descricao", "tipo", "status", "observacoes"];

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
