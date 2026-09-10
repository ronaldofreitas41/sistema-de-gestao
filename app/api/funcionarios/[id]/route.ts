import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_funcionarios";
const FIELDS = [
  "nome",
  "cpf",
  "rg",
  "cnh",
  "cnh_validade",
  "endereco",
  "cargo",
  "telefone",
  "nascimento",
  "emergencia_nome",
  "emergencia_tel",
  "clt_num",
  "pis",
  "admissao",
  "salario",
  "beneficio",
  "seguro_valor",
  "seguro_vig",
  "seguro_seguradora",
  "fotos",
  "arqs",
  "observacao",
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
