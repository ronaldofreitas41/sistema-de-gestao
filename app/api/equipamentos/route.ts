import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_equipamentos";
const FIELDS = ["empresa_id", "codigo", "placa", "frota", "tipo", "marca", "modelo", "ano", "renavam", "chassi", "km_atual", "horimetro", "status", "observacoes"];
const SEARCH_FIELDS = ["codigo", "placa", "frota", "marca", "modelo"];

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
