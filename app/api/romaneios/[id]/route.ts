import { NextRequest } from "next/server";
import { exigirPermissao, validarAutorizacaoExclusao } from "@/lib/permissoes-server";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { excluirRomaneio, retornarRomaneio } from "@/lib/pneus-service";

type Context = { params: Promise<{ id: string }> };

/** PUT { itens: [{ id, resultado: "reformado" | "recusado", pct_borracha, valor_reforma, observacao }] } */
export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Romaneio inválido." }, { status: 400 });
  let body: { itens?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    await exigirPermissao(request, "pneus-romaneio", "lançar o retorno de romaneios");
    const resultado = await retornarRomaneio(BigInt(id), (body.itens ?? []) as never[], request);
    return Response.json(serializar({ concluido: resultado.concluido }));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Romaneio inválido." }, { status: 400 });
  try {
    const erroAutorizacao = await validarAutorizacaoExclusao(request);
    if (erroAutorizacao) return erroAutorizacao;
    await excluirRomaneio(BigInt(id), request);
    return Response.json({ message: "Romaneio excluído." });
  } catch (erro) {
    return respostaErro(erro);
  }
}
