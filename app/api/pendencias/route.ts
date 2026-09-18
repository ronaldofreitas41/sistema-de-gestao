import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  intervaloMesAtual,
  verificarAjudasRecorrentes,
} from "@/lib/recorrencia-ajudas";

function jsonSeguro(data: unknown, status = 200) {
  return NextResponse.json(
    JSON.parse(
      JSON.stringify(data, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    ),
    { status },
  );
}

export async function GET() {
  try {
    await verificarAjudasRecorrentes();
    const { inicio, fim } = intervaloMesAtual();
    const despesas = await prisma.mh3Despesas.findMany({
      where: {
        status_disp: "pendente",
        data_vencimento: { gte: inicio, lt: fim },
      },
      orderBy: { data_vencimento: "asc" },
    });

    return jsonSeguro({ data: despesas });
  } catch (error) {
    console.error("Erro ao carregar pendências:", error);
    return jsonSeguro({ error: "Não foi possível carregar as pendências." }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const despesaId = BigInt(String(body.despesaId));
    const dataPagamento = new Date();

    const resultado = await prisma.$transaction(async (transaction) => {
      const despesa = await transaction.mh3Despesas.findUnique({
        where: { id: despesaId },
      });

      if (!despesa) {
        throw new Error("DESPESA_NAO_ENCONTRADA");
      }

      const atualizada = await transaction.mh3Despesas.update({
        where: { id: despesaId },
        data: { status_disp: "pago", data_pagamento: dataPagamento },
      });

      await transaction.mh3_ajudas_motorista.updateMany({
        where: { despesa_id: despesaId },
        data: { data: dataPagamento },
      });

      return atualizada;
    });

    return jsonSeguro(resultado);
  } catch (error) {
    if (error instanceof Error && error.message === "DESPESA_NAO_ENCONTRADA") {
      return jsonSeguro({ error: "Despesa não encontrada." }, 404);
    }

    console.error("Erro ao pagar pendência:", error);
    return jsonSeguro({ error: "Não foi possível marcar a despesa como paga." }, 500);
  }
}