import { NextRequest } from "next/server";
import { list } from "@/lib/crud-prisma";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_medicoes";
const FIELDS = [
  "id",
  "placas",
  "tipo_cobranca",
  "dias_mes",
  "valor",
  "terceiro",
  "valor_terceiro",
  "horas_extras",
  "data_medicao",
  "parceiro",
  "observacoes",
  "status",
  "periodo",
  "valor_hora_extra",
  "conta_recebimento_id",
  "obs_internas",
  "cliente_id",
];

function contarDiasPeriodo(periodo: string): number | null {
  const intervalo = periodo.match(/^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (intervalo) {
    const inicio = new Date(`${intervalo[1]}T00:00:00Z`);
    const fim = new Date(`${intervalo[2]}T00:00:00Z`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) return null;
    return Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
  }

  const mes = periodo.match(/^(\d{4})-(\d{2})$/);
  return mes ? new Date(Number(mes[1]), Number(mes[2]), 0).getDate() : null;
}

export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const valor = Number(body.valor) || 0;
    const terceiro = Boolean(body.terceiro);
    const valorTerceiro = Number(body.valor_terceiro) || 0;
    const dataMedicao = new Date(body.data_medicao);
    const id = body.id || crypto.randomUUID();
    const periodo = String(body.periodo || dataMedicao.toISOString().slice(0, 7));
    const competencia = periodo.match(/^(\d{4}-\d{2})/)?.[1]
      || dataMedicao.toISOString().slice(0, 7);
    const diasMes = body.tipo_cobranca === "Valor Mensal"
      ? Number(body.dias_mes) || contarDiasPeriodo(periodo)
      : null;

    const resultado = await prisma.$transaction(async (tx) => {
      const medicao = await tx.mh3_medicoes.create({
        data: {
          id,
          placas: body.placas || [],
          tipo_cobranca: body.tipo_cobranca,
          dias_mes: diasMes,
          valor,
          terceiro,
          valor_terceiro: valorTerceiro,
          horas_extras: Number(body.horas_extras) || 0,
          data_medicao: dataMedicao,
          parceiro: body.parceiro || null,
          observacoes: body.observacoes || null,
          status: body.status || "pendente",
          periodo,
          valor_hora_extra: Number(body.valor_hora_extra) || 0,
          conta_recebimento_id: body.conta_recebimento_id || null,
          obs_internas: body.obs_internas || null,
          cliente_id: body.cliente_id || null,
        },
      });

      await tx.mh3_contas_receber.create({
        data: {
          id: crypto.randomUUID(),
          cliente: body.parceiro || "Medição",
          competencia,
          valor_total: valor - (terceiro ? valorTerceiro : 0),
          status: "pendente",
          observacoes: `Lançamento automático da medição ${id}.`,
          data_emissao: dataMedicao,
        },
      });

      if (terceiro) {
        await tx.mh3_despesas.create({
          data: {
            descricao: `Medição ${id}`,
            categoria: "Medição de terceiro",
            fornecedor: body.parceiro || null,
            data_competencia: dataMedicao,
            data_vencimento: dataMedicao,
            valor: valorTerceiro,
            status_disp: "pendente",
            observacoes: `Lançamento automático da medição ${id}.`,
            num_desp: `MED - ${id}`,
          },
        });
      }

      return medicao;
    });

    return Response.json(resultado, { status: 201 });
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
}
