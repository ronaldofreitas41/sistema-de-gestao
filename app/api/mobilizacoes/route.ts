import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_mobilizacoes";
const FIELDS = ["equipamento_id", "contrato_id", "tipo", "data", "local_origem", "local_destino", "km", "responsavel", "observacoes"];
const SEARCH_FIELDS = ["tipo", "local_origem", "local_destino", "responsavel"];

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
