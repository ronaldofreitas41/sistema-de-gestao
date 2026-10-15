import { NextRequest } from "next/server";
import { negociarPrejuizo } from "@/lib/financeiro-service";
import { respostaErro, serializar } from "@/lib/medicao-service";

type Context = { params: Promise<{ id: string }> };

/** POST { parcelas: [{ valor, data_vencimento }], motivo } — gera lançamentos em Contas a Receber. */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Prejuízo inválido." }, { status: 400 });
  let body: { parcelas?: { valor?: unknown; data_vencimento?: unknown }[]; motivo?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    const geradas = await negociarPrejuizo(BigInt(id), body.parcelas ?? [], body.motivo, request);
    return Response.json(serializar(geradas), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
