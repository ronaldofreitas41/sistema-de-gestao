import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_revisoes";
const FIELDS = ["equipamento_id", "tipo", "km_atual", "km_proxima", "horas_atual", "horas_proxima", "data_realizacao", "data_proxima", "status", "observacoes"];
const SEARCH_FIELDS = ["tipo", "status", "observacoes"];

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
