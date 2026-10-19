import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { auditar, proximoNumero } from "./audit";
import { ErroNegocio } from "./medicao-service";

type Tx = Prisma.TransactionClient;
type Dados = Record<string, any>;

export const STATUS_VENDA = ["pendente", "faturada", "cancelado"] as const;
export type StatusVenda = (typeof STATUS_VENDA)[number];

const arredondar = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
const num = (valor: unknown) => Number(valor) || 0;
const novoId = () => randomUUID().replace(/-/g, "").slice(0, 20);

/** Aceita AAAA-MM-DD (ou ISO completo) e DD/MM/AAAA; devolve Date em UTC ou null. */
function dataSomente(valor: unknown): Date | null {
  const texto = String(valor ?? "").trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const partes = iso ? [iso[1], iso[2], iso[3]] : br ? [br[3], br[2], br[1]] : null;
  if (!partes) return null;
  const data = new Date(`${partes[0]}-${partes[1]}-${partes[2]}T00:00:00.000Z`);
  return Number.isNaN(data.getTime()) ? null : data;
}

const isoData = (data: Date | null) => (data ? data.toISOString().slice(0, 10) : null);

type VendaComItens = Prisma.mh3_vendasGetPayload<{ include: { mh3_venda_itens: true } }>;

export function statusDaVenda(venda: { status: string; faturada: boolean }): StatusVenda {
  if (venda.status === "cancelado") return "cancelado";
  return venda.faturada || venda.status === "faturada" ? "faturada" : "pendente";
}

/** Formato consumido pela tela (números reais, datas AAAA-MM-DD, itens embutidos). */
export function formatarVenda(venda: VendaComItens) {
  const status = statusDaVenda(venda);
  return {
    id: venda.id,
    numero: venda.numero,
    cliente: venda.cliente,
    data: isoData(venda.data),
    documento: venda.documento ?? "",
    tipo_documento: venda.tipo_documento ?? "",
    contato: venda.contato ?? "",
    pagamento: venda.pagamento ?? "",
    observacoes: venda.observacoes ?? "",
    sub_total: Number(venda.sub_total),
    desconto: Number(venda.desconto),
    total: Number(venda.total),
    status,
    faturada: status === "faturada",
    vencimento: isoData(venda.vencimento),
    avaria: venda.avaria,
    em_medicao: venda.em_medicao,
    sinal_medicao: venda.sinal_medicao ?? "+",
    placa_medicao: venda.placa_medicao ?? "",
    items: venda.mh3_venda_itens.map((item) => ({
      id: item.id,
      desc: item.descricao ?? "",
      qtd: Number(item.quantidade),
      val: Number(item.valor),
      tipo: item.tipo ?? "Produto",
      fonte: item.fonte?.startsWith("pneu:") ? "pneu" : item.fonte ?? "manual",
      pneu_id: item.fonte?.startsWith("pneu:") ? item.fonte.slice(5) : undefined,
    })),
  };
}

export async function listarVendas() {
  const vendas = await prisma.mh3_vendas.findMany({
    include: { mh3_venda_itens: true },
    orderBy: { criado_em: "desc" },
  });
  return vendas.map(formatarVenda);
}

export async function buscarVenda(id: string) {
  const venda = await prisma.mh3_vendas.findUnique({ where: { id }, include: { mh3_venda_itens: true } });
  if (!venda) throw new ErroNegocio(404, "Venda não encontrada.");
  return formatarVenda(venda);
}

type Preparada = {
  cabecalho: Omit<Prisma.mh3_vendasUncheckedCreateInput, "id" | "numero">;
  itens: Array<{ descricao: string; quantidade: number; valor: number; tipo: string; fonte: string }>;
};

function preparar(body: Dados): Preparada {
  const cliente = String(body.cliente ?? "").trim();
  if (!cliente) throw new ErroNegocio(400, "Informe o cliente da venda.");

  const data = dataSomente(body.data) ?? dataSomente(new Date().toISOString());
  if (!data) throw new ErroNegocio(400, "Informe uma data válida.");

  const itensEntrada: Dados[] = Array.isArray(body.items) ? body.items : [];
  if (!itensEntrada.length) throw new ErroNegocio(400, "Adicione ao menos um item à venda.");
  const itens = itensEntrada.map((item, indice) => {
    const descricao = String(item.desc ?? item.descricao ?? "").trim();
    const quantidade = num(item.qtd ?? item.quantidade);
    const valor = num(item.val ?? item.valor);
    if (!descricao) throw new ErroNegocio(400, `Informe a descrição do item ${indice + 1}.`);
    if (!(quantidade > 0)) throw new ErroNegocio(400, `A quantidade do item ${indice + 1} deve ser maior que zero.`);
    if (valor < 0) throw new ErroNegocio(400, `O valor do item ${indice + 1} não pode ser negativo.`);
    const fonte = item.fonte === "pneu" && item.pneu_id ? `pneu:${String(item.pneu_id).slice(0, 40)}` : "manual";
    return {
      descricao: descricao.slice(0, 255),
      quantidade,
      valor: arredondar(valor),
      tipo: String(item.tipo ?? "Produto").slice(0, 50),
      fonte,
    };
  });

  const subTotal = arredondar(itens.reduce((soma, item) => soma + item.quantidade * item.valor, 0));
  const desconto = arredondar(Math.max(num(body.desconto), 0));
  if (desconto > subTotal) throw new ErroNegocio(400, "O desconto não pode ser maior que o subtotal.");

  const emMedicao = body.em_medicao === true;
  const placa = String(body.placa_medicao ?? "").trim().toUpperCase();
  if (emMedicao && !placa) throw new ErroNegocio(400, "Informe a placa da medição.");

  return {
    cabecalho: {
      cliente: cliente.slice(0, 150),
      data,
      documento: body.documento ? String(body.documento).slice(0, 100) : null,
      tipo_documento: body.tipo_documento ? String(body.tipo_documento).slice(0, 50) : null,
      contato: body.contato ? String(body.contato).slice(0, 50) : null,
      pagamento: body.pagamento ? String(body.pagamento).slice(0, 100) : null,
      observacoes: body.observacoes ? String(body.observacoes) : null,
      sub_total: subTotal,
      desconto,
      total: arredondar(subTotal - desconto),
      vencimento: dataSomente(body.vencimento),
      avaria: body.avaria === true,
      em_medicao: emMedicao,
      sinal_medicao: emMedicao ? (body.sinal_medicao === "-" ? "-" : "+") : null,
      placa_medicao: emMedicao ? placa.slice(0, 20) : null,
    },
    itens,
  };
}

export async function criarVenda(body: Dados, request?: Request) {
  const { cabecalho, itens } = preparar(body);
  const venda = await prisma.$transaction(async (tx) => {
    return tx.mh3_vendas.create({
      data: {
        ...cabecalho,
        id: novoId(),
        numero: await proximoNumero("VD", tx),
        status: "pendente",
        faturada: false,
        mh3_venda_itens: {
          create: itens.map((item) => ({ ...item, id: novoId() })),
        },
      },
      include: { mh3_venda_itens: true },
    });
  });
  await auditar({
    request,
    acao: "CRIAR",
    modulo: "mh3_vendas",
    registroId: venda.id,
    descricao: `Venda ${venda.numero} — ${venda.cliente} — R$ ${venda.total}`,
  });
  return formatarVenda(venda);
}

export async function atualizarVenda(id: string, body: Dados, request?: Request) {
  const { cabecalho, itens } = preparar(body);
  const venda = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_vendas.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "Venda não encontrada.");
    if (statusDaVenda(atual) === "faturada") {
      throw new ErroNegocio(409, "Venda faturada não pode ser editada. Volte o status para Pendente antes de editar.");
    }
    await tx.mh3_venda_itens.deleteMany({ where: { venda_id: id } });
    return tx.mh3_vendas.update({
      where: { id },
      data: {
        ...cabecalho,
        atualizado_em: new Date(),
        mh3_venda_itens: {
          create: itens.map((item) => ({ ...item, id: novoId() })),
        },
      },
      include: { mh3_venda_itens: true },
    });
  });
  await auditar({
    request,
    acao: "EDITAR",
    modulo: "mh3_vendas",
    registroId: venda.id,
    descricao: `Venda ${venda.numero} editada — R$ ${venda.total}`,
  });
  return formatarVenda(venda);
}

function descricaoConta(venda: VendaComItens) {
  const itens = venda.mh3_venda_itens.map((item) => item.descricao).filter(Boolean).join(", ");
  return `Venda ${venda.numero} — ${venda.cliente}${itens ? ` — ${itens}` : ""}`.slice(0, 1000);
}

function vencimentoConta(venda: VendaComItens) {
  if (venda.vencimento) return venda.vencimento;
  const dias = /(\d+)d/.exec(venda.pagamento ?? "")?.[1];
  const base = new Date(venda.data);
  if (dias) base.setUTCDate(base.getUTCDate() + Number(dias));
  return base;
}

async function removerContaDaVenda(tx: Tx, vendaId: string) {
  const contas = await tx.mh3_contas_receber.findMany({ where: { venda_id: vendaId } });
  if (contas.some((conta) => conta.status === "pago")) {
    throw new ErroNegocio(409, "Existe recebimento já baixado para esta venda. Estorne o recebimento em Contas a Receber antes.");
  }
  await tx.mh3_contas_receber.deleteMany({ where: { venda_id: vendaId } });
}

async function medicaoDaVenda(tx: Tx, vendaId: string) {
  const medicoes = await tx.mh3_medicoes.findMany({ select: { numero: true, vendas: true } });
  return medicoes.find(
    (m) => Array.isArray(m.vendas) && (m.vendas as { id?: string }[]).some((v) => v.id === vendaId),
  );
}

/** Troca o status da venda; faturar gera a conta a receber (vendas em medição entram na medição). */
export async function alterarStatusVenda(id: string, novoStatus: unknown, request?: Request) {
  if (!STATUS_VENDA.includes(novoStatus as StatusVenda)) {
    throw new ErroNegocio(400, "Status inválido.");
  }
  const status = novoStatus as StatusVenda;
  const venda = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_vendas.findUnique({ where: { id }, include: { mh3_venda_itens: true } });
    if (!atual) throw new ErroNegocio(404, "Venda não encontrada.");
    if (statusDaVenda(atual) === status) return atual;

    if (status === "cancelado" && atual.em_medicao) {
      const usada = await medicaoDaVenda(tx, id);
      if (usada) {
        throw new ErroNegocio(409, `A venda está vinculada à medição ${usada.numero}. Remova-a da medição antes de alterar o status.`);
      }
    }

    await removerContaDaVenda(tx, id);
    if (status === "faturada" && !atual.em_medicao) {
      const vencimento = vencimentoConta(atual);
      await tx.mh3_contas_receber.create({
        data: {
          id: randomUUID(),
          numero: await proximoNumero("REC", tx),
          cliente: atual.cliente,
          competencia: vencimento.toISOString().slice(0, 7),
          valor_total: atual.total,
          status: "pendente",
          observacoes: descricaoConta(atual),
          data_emissao: new Date(),
          data_vencimento: vencimento,
          vencimento_original: vencimento,
          venda_id: atual.id,
        },
      });
    }
    return tx.mh3_vendas.update({
      where: { id },
      data: { status, faturada: status === "faturada", atualizado_em: new Date() },
      include: { mh3_venda_itens: true },
    });
  });
  await auditar({
    request,
    acao: "STATUS",
    modulo: "mh3_vendas",
    registroId: id,
    descricao: `Venda ${venda.numero} → ${status}`,
  });
  return formatarVenda(venda);
}

export async function excluirVenda(id: string, request?: Request) {
  const numero = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_vendas.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "Venda não encontrada.");
    if (atual.em_medicao) {
      const usada = await medicaoDaVenda(tx, id);
      if (usada) throw new ErroNegocio(409, `A venda está vinculada à medição ${usada.numero} e não pode ser excluída.`);
    }
    await removerContaDaVenda(tx, id);
    await tx.mh3_vendas.delete({ where: { id } });
    return atual.numero;
  });
  await auditar({ request, acao: "EXCLUIR", modulo: "mh3_vendas", registroId: id, descricao: `Venda ${numero} excluída` });
}
