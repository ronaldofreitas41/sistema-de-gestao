import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_ajudas_motorista";
const FIELDS = [
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
  "despesa_id",
  "meses_tratados",
  "recorrente",
];

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
