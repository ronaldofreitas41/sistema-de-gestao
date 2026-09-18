import { prisma } from "@/lib/prisma";

function inicioDoMes(data: Date) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

function proximoMes(data: Date) {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 1));
}

export function intervaloMesAtual(data = new Date()) {
  const inicio = inicioDoMes(data);

  return { inicio, fim: proximoMes(inicio) };
}

/** Cria uma única conta pendente para cada ajuda recorrente vencida no mês anterior. */
export async function verificarAjudasRecorrentes(data = new Date()) {
  const { inicio: inicioAtual, fim: fimAtual } = intervaloMesAtual(data);
  const inicioAnterior = new Date(
    Date.UTC(inicioAtual.getUTCFullYear(), inicioAtual.getUTCMonth() - 1, 1),
  );

  return prisma.$transaction(async (transaction) => {
    const ajudas = await transaction.mh3_ajudas_motorista.findMany({
      where: {
        recorrente: 1,
        data: { gte: inicioAnterior, lt: inicioAtual },
      },
    });

    const criadas = [];

    for (const ajuda of ajudas) {
      if (ajuda.despesa_id) {
        const despesaVigente = await transaction.mh3Despesas.findFirst({
          where: {
            id: ajuda.despesa_id,
            status_disp: "pendente",
            data_competencia: { gte: inicioAtual, lt: fimAtual },
          },
        });

        if (despesaVigente) continue;
      }

      const despesa = await transaction.mh3Despesas.create({
        data: {
          descricao: `AJUDA DE CUSTO - ${ajuda.empresa || ""} - ${ajuda.motorista || ""}`,
          categoria: "Ajuda Motorista",
          fornecedor: "",
          data_competencia: data,
          data_vencimento: data,
          data_pagamento: null,
          valor: ajuda.valor ?? 0,
          status_disp: "pendente",
          observacoes: ajuda.observacoes,
          conta_banco_id: null,
          conta_banco: ajuda.conta,
          placa: ajuda.placa,
          antigo: false,
          num_desp: `DP - AC - ${ajuda.id}-${data.getUTCFullYear()}${String(data.getUTCMonth() + 1).padStart(2, "0")}`,
        },
      });

      await transaction.mh3_ajudas_motorista.update({
        where: { id: ajuda.id },
        data: { despesa_id: despesa.id },
      });

      criadas.push(despesa);
    }

    return criadas;
  });
}