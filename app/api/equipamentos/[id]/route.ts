import { NextRequest } from "next/server";
import { atualizarRegistro, getById, remove } from "@/lib/crud-prisma";
import { gerarFinanciamento, validarFinanciamento } from "@/lib/frota-service";
import { ErroNegocio, respostaErro, serializar } from "@/lib/medicao-service";
import { prisma } from "@/lib/prisma";
import { FIELDS_EQUIPAMENTO } from "../route";

const TABLE = "mh3_equipamentos";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return getById(TABLE, id, request);
}

async function editar(request: NextRequest, { params }: Context) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  try {
    if (!/^\d+$/.test(id)) throw new ErroNegocio(400, "Veículo inválido.");
    const atual = await prisma.mh3_equipamentos.findUnique({ where: { id: BigInt(id) } });
    if (!atual) throw new ErroNegocio(404, "Veículo não encontrado.");

    const placa = String(body.placa ?? atual.placa ?? "").trim().toUpperCase().replace(/\s+/g, "");
    if (!placa) throw new ErroNegocio(400, "Informe a placa do veículo.");
    if (placa !== atual.placa) {
      const duplicada = await prisma.mh3_equipamentos.findFirst({ where: { placa, id: { not: atual.id } } });
      if (duplicada) throw new ErroNegocio(409, `A placa ${placa} já está cadastrada na frota.`);
    }
    const precisaGerar = !atual.financiamento_gerado
      && String(body.situacao_financeira ?? "").toLowerCase().startsWith("financ");
    validarFinanciamento(body, precisaGerar);

    const row = await atualizarRegistro(TABLE, FIELDS_EQUIPAMENTO, id, { ...body, placa }, request);
    const despesas = precisaGerar
      ? await gerarFinanciamento({
          request,
          tabela: "mh3_equipamentos",
          id: atual.id,
          placa,
          titulo: placa,
          banco: body.banco_financiamento,
          modalidade: body.modalidade_financiamento,
          parcelas: body.parcelas as { valor?: unknown; data_vencimento?: unknown }[],
        })
      : [];
    return Response.json(serializar({ ...row, parcelas_geradas: despesas.length }));
  } catch (erro) {
    return respostaErro(erro);
  }
}

export const PUT = editar;
export const PATCH = editar;

export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return remove(TABLE, id, request);
}
