import { NextRequest } from "next/server";
import { acertarSaldo } from "@/lib/financeiro-service";
import { respostaErro, serializar } from "@/lib/medicao-service";

type Context = { params: Promise<{ id: string }> };

/** POST { novo_saldo, motivo, senha } — exige a senha do usuário logado e grava na auditoria. */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Conta inválida." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    const resultado = await acertarSaldo(BigInt(id), body.novo_saldo, body.motivo, body.senha, request);
    return Response.json(serializar({ anterior: resultado.anterior, novo: resultado.novo }));
  } catch (erro) {
    return respostaErro(erro);
  }
}
