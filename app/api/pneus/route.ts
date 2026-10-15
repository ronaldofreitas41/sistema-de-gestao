import { NextRequest } from "next/server";
import { list } from "@/lib/crud-prisma";
import { exigirPermissao } from "@/lib/permissoes-server";
import { ErroNegocio, respostaErro, serializar } from "@/lib/medicao-service";
import { criarPneu } from "@/lib/pneus-service";

const TABLE = "mh3_pneus";
const SEARCH_FIELDS = ["numero", "codigo", "marca", "modelo", "medida", "placa"];

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
    await exigirPermissao(request, "pneus-criar", "cadastrar pneus");
    if (!body || typeof body !== "object") throw new ErroNegocio(400, "Conteúdo inválido.");
    return Response.json(serializar(await criarPneu(body, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
