import { NextRequest } from "next/server";
import { criarRegistro, list } from "@/lib/crud-prisma";
import { gerarFinanciamento, validarFinanciamento } from "@/lib/frota-service";
import { ErroNegocio, respostaErro, serializar } from "@/lib/medicao-service";
import { prisma } from "@/lib/prisma";

const TABLE = "mh3_equipamentos";
export const FIELDS_EQUIPAMENTO = [
  "empresa_id",
  "placa",
  "frota",
  "tipo",
  "marca",
  "modelo",
  "ano",
  "renavam",
  "chassi",
  "km_atual",
  "horimetro",
  "status",
  "observacoes",
  "crv",
  "crlv",
  "estado",
  "dt_km_atual",
  "prorietario",
  "valor_aquisi__o",
  "data_aquisicao",
  "situacao_financeira",
  "modalidade_financiamento",
  "quantidade_parcelas",
  "tipo_parcela",
  "valor_parcela",
  "parcelas_pagas",
  "data_primeira_parcela",
  "banco_financiamento",
  "vencimento_licenca_antt",
  "cronotacografo_venc",
  "inmetro_venc",
  "outros_nome",
  "outros_venc",
  "seguro_id",
];
const SEARCH_FIELDS = ["placa", "frota", "marca", "modelo"];

export async function GET(request: NextRequest) {
  return list(TABLE, request, SEARCH_FIELDS);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    const placa = String(body.placa ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (!placa) throw new ErroNegocio(400, "Informe a placa do veículo.");
    const existente = await prisma.mh3_equipamentos.findFirst({ where: { placa } });
    if (existente) throw new ErroNegocio(409, `A placa ${placa} já está cadastrada na frota.`);
    validarFinanciamento(body, true);

    const row = await criarRegistro(TABLE, FIELDS_EQUIPAMENTO, { ...body, placa }, request);
    const despesas = String(body.situacao_financeira ?? "").toLowerCase().startsWith("financ")
      ? await gerarFinanciamento({
          request,
          tabela: "mh3_equipamentos",
          id: BigInt(row.id),
          placa,
          titulo: placa,
          banco: body.banco_financiamento,
          modalidade: body.modalidade_financiamento,
          parcelas: body.parcelas as { valor?: unknown; data_vencimento?: unknown }[],
        })
      : [];
    return Response.json(serializar({ ...row, parcelas_geradas: despesas.length }), { status: 201 });
  } catch (erro) {
    return respostaErro(erro);
  }
}
