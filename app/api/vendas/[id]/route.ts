import { NextRequest } from "next/server";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { validarAutorizacaoExclusao } from "@/lib/permissoes-server";
import { atualizarVenda, buscarVenda, excluirVenda } from "@/lib/venda-service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return Response.json(serializar(await buscarVenda(id)));
  } catch (erro) {
    return respostaErro(erro);
  }
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
    return Response.json(serializar(await atualizarVenda(id, body, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export const PUT = editar;
export const PATCH = editar;

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const erroAutorizacao = await validarAutorizacaoExclusao(request);
    if (erroAutorizacao) return erroAutorizacao;
    await excluirVenda(id, request);
    return Response.json({ message: "Venda excluída com sucesso." });
  } catch (erro) {
    return respostaErro(erro);
  }
}
