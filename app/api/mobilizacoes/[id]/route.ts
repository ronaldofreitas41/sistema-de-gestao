import { NextRequest } from "next/server";
import { atualizarRegistro, getById, remove } from "@/lib/crud-prisma";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { FIELDS_MOBILIZACAO, validarMobilizacao } from "@/lib/mobilizacao-service";

const TABLE = "mh3_mobilizacoes";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id, request);
}

async function editar(request: NextRequest, { params }: Context) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    validarMobilizacao(body, true);
    return Response.json(serializar(await atualizarRegistro(TABLE, FIELDS_MOBILIZACAO, id, body, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export const PUT = editar;
export const PATCH = editar;

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id, request);
}
