import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_pneus";
const FIELDS = ["equipamento_id", "codigo", "marca", "modelo", "medida", "numero_serie", "km_instalacao", "km_atual", "posicao", "status", "valor", "data_compra", "observacoes"];
const SEARCH_FIELDS = ["codigo", "marca", "modelo", "medida", "numero_serie"];

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
