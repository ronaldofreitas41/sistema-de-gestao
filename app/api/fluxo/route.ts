import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializar } from "@/lib/medicao-service";

const soma = (itens: { v: unknown }[]) =>
  Math.round(itens.reduce((total, item) => total + (Number(item.v) || 0), 0) * 100) / 100;

function intervalo(mes: string) {
  const [ano, numero] = mes.split("-").map(Number);
  return { inicio: new Date(Date.UTC(ano, numero - 1, 1)), fim: new Date(Date.UTC(ano, numero, 1)) };
}

type Periodo = { inicio: Date; fim: Date };

/** GET ?mes=YYYY-MM — fluxo de caixa pela data em que o dinheiro andou. */
export async function GET(request: NextRequest) {
  const mes = request.nextUrl.searchParams.get("mes") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) return Response.json({ error: "Mês inválido." }, { status: 400 });
  const atual = intervalo(mes);
  const [ano, numero] = mes.split("-").map(Number);
  const anteriorMes = `${numero === 1 ? ano - 1 : ano}-${String(numero === 1 ? 12 : numero - 1).padStart(2, "0")}`;
  const anterior = intervalo(anteriorMes);

  const recebidas = (periodo: Periodo) =>
    prisma.mh3_contas_receber.findMany({
      where: { status: "pago", data_recebimento: { gte: periodo.inicio, lt: periodo.fim } },
      orderBy: { data_recebimento: "asc" },
    });
  const pagas = (periodo: Periodo) =>
    prisma.mh3_despesas.findMany({
      where: { status_disp: "pago", data_pagamento: { gte: periodo.inicio, lt: periodo.fim } },
      orderBy: { data_pagamento: "asc" },
    });

  const [entradas, saidas, entradasAnt, saidasAnt, aPagar, aReceber, pagosSemData] = await Promise.all([
    recebidas(atual),
    pagas(atual),
    recebidas(anterior),
    pagas(anterior),
    prisma.mh3_despesas.findMany({
      where: { status_disp: "pendente", data_vencimento: { gte: atual.inicio, lt: atual.fim } },
    }),
    // Remarcadas entram pela nova data; atrasadas e renegociadas ficam fora do fluxo.
    prisma.mh3_contas_receber.findMany({
      where: { status: { in: ["pendente", "remarcado"] }, data_vencimento: { gte: atual.inicio, lt: atual.fim } },
    }),
    prisma.mh3_despesas.findMany({
      where: { status_disp: "pago", data_pagamento: null },
      select: { valor: true, valor_pago: true },
    }),
  ]);

  const totalEntradas = soma(entradas.map((conta) => ({ v: conta.valor_total })));
  const totalSaidas = soma(saidas.map((despesa) => ({ v: despesa.valor_pago ?? despesa.valor })));
  return Response.json(serializar({
    mes,
    entradas,
    saidas,
    totais: {
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldo: Math.round((totalEntradas - totalSaidas) * 100) / 100,
      aPagar: soma(aPagar.map((despesa) => ({ v: despesa.valor }))),
      aReceber: soma(aReceber.map((conta) => ({ v: conta.valor_total }))),
    },
    anterior: {
      mes: anteriorMes,
      recebido: soma(entradasAnt.map((conta) => ({ v: conta.valor_total }))),
      pago: soma(saidasAnt.map((despesa) => ({ v: despesa.valor_pago ?? despesa.valor }))),
    },
    pagosSemData: {
      quantidade: pagosSemData.length,
      total: soma(pagosSemData.map((despesa) => ({ v: despesa.valor_pago ?? despesa.valor }))),
    },
  }));
}
