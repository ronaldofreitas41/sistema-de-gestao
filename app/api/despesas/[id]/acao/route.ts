import { NextRequest } from "next/server";
import { baixarDespesa, estornarDespesa } from "@/lib/financeiro-service";
import { respostaErro, serializar } from "@/lib/medicao-service";

type Context = { params: Promise<{ id: string }> };

/** POST { acao: "pagar" | "estornar", conta_banco_id, valor_pago, data_pagamento, motivo } */
export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return Response.json({ error: "Despesa inválida." }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    if (body.acao === "pagar") {
      return Response.json(serializar(await baixarDespesa(BigInt(id), body, request)));
    }
    if (body.acao === "estornar") {
      return Response.json(serializar(await estornarDespesa(BigInt(id), body.motivo, request)));
    }
    return Response.json({ error: "Ação inválida." }, { status: 400 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
