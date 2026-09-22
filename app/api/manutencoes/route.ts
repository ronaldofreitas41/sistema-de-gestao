import { NextRequest } from "next/server";
import { create, list } from "@/lib/crud-prisma";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_manutencoes";
const FIELDS = [
  "id",
  "osNum",
  "finStatus",
  "eqId",
  "eqLbl",
  "placa",
  "tipo",
  "en",
  "sa",
  "km",
  "hr",
  "pkm",
  "phr",
  "custo",
  "status",
  "resp",
  "ob",
  "lancs",
  "checklist",
  "fotos",
];

function extrairNumeroOs(osNum?: string | null) {
  const resultado = osNum?.match(/(\d+)\s*$/);
  return resultado ? Number.parseInt(resultado[1], 10) : 0;
}

function formatarNumeroOs(numero: number) {
  return `OS - ${String(numero).padStart(5, "0")}`;
}

export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const registros = await prisma.mh3_manutencoes.findMany({
      select: { osNum: true },
    });
    const maiorOs = registros.reduce((maior, registro) => {
      return Math.max(maior, extrairNumeroOs(registro.osNum));
    }, 0);

    return create(TABLE, FIELDS, {
      ...body,
      id: crypto.randomUUID(),
      osNum: formatarNumeroOs(maiorOs + 1),
    });
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
