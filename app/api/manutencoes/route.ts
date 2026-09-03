import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_manutencoes";
const FIELDS = ["empresa_id", "equipamento_id", "numero_os", "tipo", "descricao", "data_abertura", "data_fechamento", "km", "horimetro", "fornecedor", "valor_pecas", "valor_mao_obra", "valor_total", "status", "observacoes"];
const SEARCH_FIELDS = ["numero_os", "tipo", "descricao", "fornecedor", "status"];

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
