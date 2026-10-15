import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_despesas";
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
];

// Baixa e estorno só pelas ações (/acao), que pedem a conta bancária e ajustam o saldo.
const CAMPOS_BLOQUEADOS_PAGA = ["valor", "valor_pago", "status_disp", "data_pagamento", "conta_banco_id", "conta_banco"];

async function prepararEdicao(id: string, body: Record<string, unknown>) {
  const atual = /^\d+$/.test(id)
    ? await prisma.mh3_despesas.findUnique({ where: { id: BigInt(id) }, select: { status_disp: true } })
    : null;
  if (body.status_disp === "pago" && atual?.status_disp !== "pago") {
    return { erro: "Para marcar como pago, informe a conta bancária pela ação de pagamento." };
  }
  if (atual?.status_disp === "pago") {
    for (const campo of CAMPOS_BLOQUEADOS_PAGA) delete body[campo];
  } else {
    delete body.status_disp;
    delete body.data_pagamento;
    delete body.conta_banco_id;
    delete body.conta_banco;
  }
  return { body };
}

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id, request);
}

async function editar(request: NextRequest, id: string) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const preparado = await prepararEdicao(id, body);
  if ("erro" in preparado) return Response.json({ error: preparado.erro }, { status: 400 });
  return update(TABLE, FIELDS, id, preparado.body, request);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return editar(request, id);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return editar(request, id);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const atual = /^\d+$/.test(id)
    ? await prisma.mh3_despesas.findUnique({ where: { id: BigInt(id) }, select: { status_disp: true, medicao_id: true } })
    : null;
  if (atual?.status_disp === "pago") {
    return Response.json({ error: "Despesa paga não pode ser excluída. Estorne o pagamento primeiro." }, { status: 409 });
  }
  if (atual?.medicao_id) {
    return Response.json({ error: "Despesa gerada por medição. Retorne a medição para aguardando para removê-la." }, { status: 409 });
  }
  return remove(TABLE, id, request);
}
