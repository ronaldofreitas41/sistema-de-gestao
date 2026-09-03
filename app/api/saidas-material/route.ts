import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_saidas_material";
const FIELDS = ["equipamento_id", "funcionario_id", "data", "motivo", "observacoes"];
const SEARCH_FIELDS = ["motivo", "observacoes"];

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
