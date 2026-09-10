import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

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

export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    return create(TABLE, FIELDS, await request.json());
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
