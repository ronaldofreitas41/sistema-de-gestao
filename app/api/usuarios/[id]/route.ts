import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_usuarios";
const FIELDS = ["nome", "login", "senha", "perfil", "permissoes", "ativo", "ultimo_acesso"];

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = { ...body };

    if (String(data.senha ?? "").length > 0) {
      data.senha = await bcrypt.hash(String(data.senha), 12);
    } else {
      delete data.senha;
    }

    return update(TABLE, FIELDS, id, data);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = { ...body };

    if (String(data.senha ?? "").length > 0) {
      data.senha = await bcrypt.hash(String(data.senha), 12);
    } else {
      delete data.senha;
    }

    return update(TABLE, FIELDS, id, data);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
