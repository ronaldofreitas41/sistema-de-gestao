import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

const TABLE = "mh3_manutencoes";
const FIELDS = ["empresa_id", "equipamento_id", "numero_os", "tipo", "descricao", "data_abertura", "data_fechamento", "km", "horimetro", "fornecedor", "valor_pecas", "valor_mao_obra", "valor_total", "status", "observacoes"];

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
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

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
