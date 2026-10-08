import { NextRequest } from "next/server";
import { create } from "@/lib/crud-prisma";
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
  try {
    const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1);
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const where = search
      ? {
          OR: [
            { osNum: { contains: search } },
            { placa: { contains: search } },
            { eqLbl: { contains: search } },
            { tipo: { contains: search } },
            { status: { contains: search } },
          ],
        }
      : undefined;
    const data = await prisma.mh3_manutencoes.findMany({
      where,
      select: {
        id: true,
        osNum: true,
        eqId: true,
        eqLbl: true,
        placa: true,
        tipo: true,
        en: true,
        sa: true,
        km: true,
        hr: true,
        status: true,
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * 10000,
      take: 10000,
    });

    return Response.json({ data, page });
  } catch (error) {
    console.error("Erro ao consultar manutenções:", error);
    return Response.json(
      { error: "Não foi possível carregar as manutenções." },
      { status: 500 },
    );
  }
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
