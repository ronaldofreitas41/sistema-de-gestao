import { NextRequest } from "next/server";
import { criarRegistro, list } from "@/lib/crud-prisma";
import { lancarAjudaAvulsa } from "@/lib/ajuda-service";
import { ErroNegocio, respostaErro, serializar } from "@/lib/medicao-service";

const TABLE = "mh3_ajudas_motorista";
export const FIELDS_AJUDA = [
  "pix",
  "agencia",
  "conta",
  "valor",
  "observacoes",
  "confirma_user",
  "empresa",
  "motorista",
  "telefone",
  "data",
  "forma_pagamento",
  "placa",
  "recorrente",
];

export async function GET(request: NextRequest) {
  return list(TABLE, request, ["motorista", "empresa", "placa", "numero"]);
}

/**
 * Ajuda recorrente: só é cadastrada; entra em Pendências 7 dias antes de cada vencimento e,
 * depois de confirmada, vira conta a pagar. Ajuda avulsa vai direto para o contas a pagar (pendente).
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    if (!String(body.motorista ?? "").trim()) throw new ErroNegocio(400, "Informe o motorista.");
    if (!(Number(body.valor) > 0)) throw new ErroNegocio(400, "Informe o valor da ajuda.");
    if (!body.data) throw new ErroNegocio(400, "Informe a data de vencimento da ajuda.");
    const ajuda = await criarRegistro(TABLE, FIELDS_AJUDA, { ...body, recorrente: body.recorrente ? 1 : 0 }, request);
    const despesa = ajuda.recorrente
      ? null
      : await lancarAjudaAvulsa(
          {
            id: BigInt(ajuda.id),
            empresa: ajuda.empresa,
            motorista: ajuda.motorista,
            placa: ajuda.placa,
            valor: ajuda.valor,
            data: ajuda.data,
            observacoes: ajuda.observacoes,
          },
          request,
        );
    return Response.json(serializar({ ...ajuda, despesa_id: despesa?.id ?? null }), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
