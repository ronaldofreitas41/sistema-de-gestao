import { NextRequest } from "next/server";
import { getById } from "@/lib/crud-prisma";
import { atualizarOS, excluirOS } from "@/lib/os-service";
import { respostaErro, serializar } from "@/lib/medicao-service";

const TABLE = "mh3_manutencoes";

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
    return Response.json(serializar(await atualizarOS(id, body, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export const PUT = editar;
export const PATCH = editar;

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    await excluirOS(id, request);
    return Response.json({ message: "OS excluída com sucesso." });
  } catch (erro) {
    return respostaErro(erro);
  }
}
