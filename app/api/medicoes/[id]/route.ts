import { NextRequest } from "next/server";
import { getById, remove, update } from "@/lib/crud-prisma";
import { calcularPlacasMedicao, contarDiasPeriodoMedicao } from "@/lib/medicoes";

const TABLE = "mh3_medicoes";
const FIELDS = [
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
  "vendas",
];

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id);
}

export async function PUT(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return atualizarMedicao(request, id);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return atualizarMedicao(request, id);
}

async function atualizarMedicao(request: NextRequest, id: string) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "O conteúdo enviado é inválido." }, { status: 400 });
  }

  let dados;
  try {
    dados = bodyComValoresCalculados(body as Record<string, unknown>);
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Os valores das placas são inválidos.",
    }, { status: 400 });
  }
  return update(TABLE, FIELDS, id, dados);
}

function bodyComValoresCalculados(body: Record<string, unknown>) {
  if (!Array.isArray(body.placas)) return body;

  const periodo = typeof body.periodo === "string" ? body.periodo : "";
  const diasInformados = Number(body.dias_mes);
  const diasMes = body.tipo_cobranca === "Valor Mensal"
    ? diasInformados > 0 ? diasInformados : contarDiasPeriodoMedicao(periodo) || 0
    : 0;
  let calculoPlacas: ReturnType<typeof calcularPlacasMedicao>;
  try {
    calculoPlacas = calcularPlacasMedicao(
      body.placas,
      String(body.tipo_cobranca || ""),
      diasMes,
      Number(body.horas_extras) || 0,
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "A lista de placas ou seus valores é inválida.",
    );
  }

  if (!calculoPlacas.detalhadas) return body;

  const ajusteVendas = Array.isArray(body.vendas)
    ? body.vendas.reduce((total: number, venda: unknown) => {
        if (!venda || typeof venda !== "object") return total;
        const registro = venda as { total?: unknown; sinal_medicao?: unknown };
        const valorVenda = Number(registro.total) || 0;
        return total + (registro.sinal_medicao === "-" ? -1 : 1) * valorVenda;
      }, 0)
    : 0;

  return {
    ...body,
    placas: calculoPlacas.placas,
    dias_mes: body.tipo_cobranca === "Valor Mensal" ? diasMes || null : null,
    valor: calculoPlacas.total + (Number(body.valor_sem_placa) || 0) + ajusteVendas,
  };
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id);
}
