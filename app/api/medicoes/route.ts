import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_medicoes";
const FIELDS = ["empresa_id", "contrato_id", "equipamento_id", "competencia", "data_medicao", "km_inicial", "km_final", "horas_inicial", "horas_final", "quantidade", "valor_unitario", "valor_total", "status", "observacoes"];
const SEARCH_FIELDS = ["competencia", "status", "observacoes"];

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
