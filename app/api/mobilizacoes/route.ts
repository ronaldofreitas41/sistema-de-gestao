import { NextRequest } from "next/server";
import { criarRegistro, list } from "@/lib/crud-prisma";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { FIELDS_MOBILIZACAO, validarMobilizacao } from "@/lib/mobilizacao-service";

const TABLE = "mh3_mobilizacoes";
const SEARCH_FIELDS = ["tipo", "local_origem", "local_destino", "responsavel", "contratante", "numero"];

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
  try {
    validarMobilizacao(body);
    return Response.json(serializar(await criarRegistro(TABLE, FIELDS_MOBILIZACAO, body, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
