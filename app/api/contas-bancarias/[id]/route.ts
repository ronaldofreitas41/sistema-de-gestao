import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";

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

// Saldo muda só por pagamentos, recebimentos ou acerto (senha + motivo).
function semSaldo(body: Record<string, unknown>) {
  const { saldo: _saldo, saldo_polpanca: _poup, ...resto } = body;
  return resto;
}

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id, request);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, semSaldo(await request.json()), request);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  try {
    return update(TABLE, FIELDS, id, semSaldo(await request.json()), request);
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id, request);
}
