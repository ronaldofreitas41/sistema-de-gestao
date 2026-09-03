import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_seguros";
const FIELDS = ["equipamento_id", "seguradora", "numero_apolice", "data_inicio", "data_fim", "valor", "franquia", "status", "observacoes"];
const SEARCH_FIELDS = ["seguradora", "numero_apolice", "status", "observacoes"];

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
