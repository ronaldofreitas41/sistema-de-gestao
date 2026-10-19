import { NextRequest } from "next/server";
import { getById, remove } from "@/lib/crud-prisma";
import { exigirPermissao } from "@/lib/permissoes-server";
import { ErroNegocio, respostaErro, serializar } from "@/lib/medicao-service";
import { editarPneu } from "@/lib/pneus-service";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_pneus";

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
    await exigirPermissao(request, "pneus-editar", "editar pneus");
    return Response.json(serializar(await editarPneu(id, body, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export const PUT = editar;
export const PATCH = editar;

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const pneu = await prisma.mh3_pneus.findUnique({ where: { id } });
    if (pneu && pneu.situacao !== "estoque") {
      throw new ErroNegocio(409, "Apenas pneus em estoque podem ser excluídos. Para descartar use a saída por inutilização.");
    }
    return remove(TABLE, id, request);
  } catch (erro) {
    return respostaErro(erro);
  }
}
