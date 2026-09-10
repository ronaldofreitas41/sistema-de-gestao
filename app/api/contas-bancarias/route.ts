import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_contas_bancarias";
const FIELDS = [
  "banco",
  "nome",
  "conta",
  "tipo",
  "saldo",
  "saldo_polpanca",
  "fluxo",
  "agencia",
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
