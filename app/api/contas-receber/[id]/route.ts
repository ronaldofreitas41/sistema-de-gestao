import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_contas_receber";
const FIELDS = [
  "contrato_id",
  "cliente",
  "competencia",
  "valor_total",
  "observacoes",
  "data_emissao",
  "data_vencimento",
];

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id, request);
}

// Status, recebimento e remarcação só pelas ações (/acao), que ajustam caixa e auditoria.
async function editar(request: NextRequest, id: string) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const atual = await prisma.mh3_contas_receber.findUnique({ where: { id } });
  if (atual?.medicao_id) {
    return Response.json({ error: "Conta gerada por medição aprovada não pode ser editada. Retorne a medição para aguardando." }, { status: 409 });
  }
  if (atual && atual.status !== "pendente") {
    return Response.json({ error: `Conta ${atual.status} não pode ser editada.` }, { status: 409 });
  }
  return update(TABLE, FIELDS, id, body, request);
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
  const atual = await prisma.mh3_contas_receber.findUnique({ where: { id } });
  if (atual?.medicao_id) {
    return Response.json({ error: "Conta gerada por medição aprovada não pode ser excluída. Retorne a medição para aguardando." }, { status: 409 });
  }
  if (atual && atual.status !== "pendente") {
    return Response.json({ error: `Conta ${atual.status} não pode ser excluída.` }, { status: 409 });
  }
  return remove(TABLE, id, request);
}
