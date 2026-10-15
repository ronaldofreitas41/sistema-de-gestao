import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarOS } from "@/lib/os-service";
import { respostaErro, serializar } from "@/lib/medicao-service";

/**
 * GET ?mes=YYYY-MM → apenas OS com entrada no mês (padrão: mês vigente, para aliviar o painel).
 * ?mes=todos → sem filtro de mês. OS em aberto de meses anteriores sempre aparecem.
 */
export async function GET(request: NextRequest) {
  try {
    const page = Math.max(Number(request.nextUrl.searchParams.get("page") ?? 1), 1);
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const mes = request.nextUrl.searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);

    const filtros: Record<string, unknown>[] = [];
    if (search) {
      filtros.push({
        OR: [
          { osNum: { contains: search } },
          { placa: { contains: search } },
          { eqLbl: { contains: search } },
          { tipo: { contains: search } },
          { status: { contains: search } },
        ],
      });
    }
    if (mes !== "todos" && /^\d{4}-\d{2}$/.test(mes)) {
      const [ano, numero] = mes.split("-").map(Number);
      filtros.push({
        OR: [
          { en: { gte: new Date(Date.UTC(ano, numero - 1, 1)), lt: new Date(Date.UTC(ano, numero, 1)) } },
          { status: "aberta" },
        ],
      });
    }

    const data = await prisma.mh3_manutencoes.findMany({
      where: filtros.length ? { AND: filtros } : undefined,
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
        custo: true,
      },
      orderBy: { id: "desc" },
      skip: (page - 1) * 10000,
      take: 10000,
    });

    return Response.json(serializar({ data, page }));
  } catch (error) {
    console.error("Erro ao consultar manutenções:", error);
    return Response.json({ error: "Não foi possível carregar as manutenções." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    return Response.json(serializar(await criarOS(body, request)), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
