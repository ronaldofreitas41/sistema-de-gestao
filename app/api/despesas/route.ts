import { NextRequest } from "next/server";
import { list } from "@/lib/crud-prisma";
import { criarDespesas } from "@/lib/financeiro-service";
import { respostaErro, serializar } from "@/lib/medicao-service";

const TABLE = "mh3_despesas";

// Campos permitidos no POST (excluídos ID e colunas automáticas de data)
const FIELDS = [
  "descricao",
  "categoria",
  "fornecedor",
  "data_competencia",
  "data_vencimento",
  "data_pagamento",
  "valor",
  "status_disp",
  "observacoes",
  "conta_banco_id",
  "conta_banco",
  "placa",
  "antigo",
  "num_desp",
  "valor_pago",
  "medicao_id",
  "grupo_parcela",
  "parcela_num",
  "parcela_total",
  "origem",
];


export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

/** Aceita "parcelas": [{ valor, data_vencimento }] para lançar vários pagamentos de uma vez. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    const criadas = await criarDespesas(body, request);
    return Response.json(serializar(criadas.length === 1 ? criadas[0] : criadas), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
