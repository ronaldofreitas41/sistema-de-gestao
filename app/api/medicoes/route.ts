import { NextRequest } from "next/server";
import { list } from "@/lib/crud-prisma";
import { criarMedicao, respostaErro, serializar } from "@/lib/medicao-service";

const TABLE = "mh3_medicoes";
const SEARCH_FIELDS = ["numero", "parceiro", "periodo", "observacoes"];

export async function GET(request: NextRequest) {
  return list(TABLE, request, SEARCH_FIELDS);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "O conteúdo enviado é inválido." }, { status: 400 });
  }
  try {
    return Response.json(serializar(await criarMedicao(body, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
