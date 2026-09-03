import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_pneus_historico";
const FIELDS = ["pneu_id", "equipamento_id", "acao", "posicao_anterior", "posicao_nova", "km", "data_evento", "observacoes"];
const SEARCH_FIELDS = ["acao", "posicao_anterior", "posicao_nova", "observacoes"];

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
