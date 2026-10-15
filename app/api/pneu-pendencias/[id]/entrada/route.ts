import { NextRequest } from "next/server";
import { exigirPermissao } from "@/lib/permissoes-server";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { registrarEntradaPendencia } from "@/lib/pneus-service";

type Context = { params: Promise<{ id: string }> };

/** POST { numero, marca, modelo, medida, dot, condicao, pct_borracha, valor... } — cadastra a carcaça no estoque. */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Pendência inválida." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    await exigirPermissao(request, "pneus-criar", "lançar entrada de pneus");
    return Response.json(serializar(await registrarEntradaPendencia(BigInt(id), body, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
