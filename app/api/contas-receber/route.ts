import { NextRequest } from "next/server";
import { list } from "@/lib/crud-prisma";

const TABLE = "mh3_contas_receber";

// Campos permitidos no POST (excluídos ID e colunas automáticas de data)
const FIELDS = [
  "contrato_id",
  "cliente",
  "competencia",
  "valor_total",
  "status",
  "observacoes",
  "data_emissao",
  "data_vencimento",
  "vencimento_original",
];


export async function GET(request: NextRequest) {
  return list(TABLE, request, FIELDS);
}

// Contas a receber nascem apenas da aprovação de uma medição ou do faturamento de uma venda.
export async function POST() {
  return Response.json(
    { error: "Lançamento manual desativado. A conta a receber é gerada ao aprovar uma medição ou faturar uma venda." },
    { status: 405 },
  );
}