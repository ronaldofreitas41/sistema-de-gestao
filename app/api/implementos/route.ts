import { NextRequest } from "next/server";
import { criarRegistro, list } from "@/lib/crud-prisma";
import { gerarFinanciamento, validarFinanciamento } from "@/lib/frota-service";
import { ErroNegocio, respostaErro, serializar } from "@/lib/medicao-service";

const TABLE = "mh3_implementos";
export const FIELDS_IMPLEMENTO = [
  "equipamento_id",
  "placa",
  "marca",
  "modelo",
  "ano",
  "niev",
  "descricao",
  "valor_aquisicao",
  "data_aquisicao",
  "situacao_financeira",
  "modalidade_financiamento",
  "banco_financiamento",
  "tipo_parcela",
  "quantidade_parcelas",
];

export async function GET(request: NextRequest) {
  return list(TABLE, request, ["placa", "marca", "modelo", "niev", "descricao"]);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    if (!String(body.marca ?? "").trim() && !String(body.modelo ?? "").trim()) {
      throw new ErroNegocio(400, "Informe ao menos a marca ou o modelo do implemento.");
    }
    validarFinanciamento(body, true);
    const row = await criarRegistro(TABLE, FIELDS_IMPLEMENTO, body, request);
    const financiado = String(body.situacao_financeira ?? "").toLowerCase().startsWith("financ");
    const despesas = financiado
      ? await gerarFinanciamento({
          request,
          tabela: "mh3_implementos",
          id: BigInt(row.id),
          placa: row.placa ?? null,
          titulo: `implemento ${row.numero ?? row.id}`,
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
