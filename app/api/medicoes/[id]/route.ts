import { NextRequest } from "next/server";
import { getById } from "@/lib/crud-prisma";
import {
  atualizarMedicao,
  excluirMedicao,
  respostaErro,
  serializar,
} from "@/lib/medicao-service";

const TABLE = "mh3_medicoes";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id, request);
}

async function editar(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Identificador da medição inválido." }, { status: 400 });
  }
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
    return Response.json(serializar(await atualizarMedicao(BigInt(id), body, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export const PUT = editar;
export const PATCH = editar;

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ error: "Identificador da medição inválido." }, { status: 400 });
  }
  try {
    await excluirMedicao(BigInt(id), request);
    return Response.json({ message: "Medição excluída com sucesso." });
  } catch (erro) {
    return respostaErro(erro);
  }
}
