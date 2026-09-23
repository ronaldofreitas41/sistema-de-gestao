import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { create, list } from "@/lib/crud-prisma";

const TABLE = "mh3_usuarios";
const FIELDS = ["id", "nome", "login", "senha", "perfil", "permissoes", "ativo", "ultimo_acesso"];
const SEARCH_FIELDS = ["nome", "login", "perfil"];

export async function GET(request: NextRequest) {
  return list(TABLE, request, SEARCH_FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return create(TABLE, FIELDS, {
      ...body,
      id: crypto.randomUUID(),
      senha: await bcrypt.hash(String(body.senha ?? ""), 12),
    });
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
