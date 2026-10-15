import { NextRequest } from "next/server";
import { exigirPermissao } from "@/lib/permissoes-server";
import { respostaErro, serializar } from "@/lib/medicao-service";
import { inutilizarPneu } from "@/lib/pneus-service";

type Context = { params: Promise<{ id: string }> };

/** POST { motivo } — saída de pneu por inutilização (feita dentro do módulo de pneus). */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  let body: { motivo?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    await exigirPermissao(request, "pneus-inutilizar", "inutilizar pneus");
    return Response.json(serializar(await inutilizarPneu(id, body.motivo, request)));
  } catch (erro) {
    return respostaErro(erro);
  }
}
