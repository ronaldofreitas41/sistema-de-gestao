import { NextRequest } from "next/server";
import { atualizarRegistro, getById, remove } from "@/lib/crud-prisma";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { prepararSeguro, SEGURO_FIELDS } from "@/lib/seguro-service";

const TABLE = "mh3_seguros";

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
    const dados = await prepararSeguro(body);
    return Response.json(serializar(await atualizarRegistro(TABLE, SEGURO_FIELDS, id, dados, request)));
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
