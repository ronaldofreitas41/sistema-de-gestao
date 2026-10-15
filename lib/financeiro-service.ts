import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { auditar, obterAtor, proximoNumero } from "./audit";
import { ErroNegocio } from "./medicao-service";

type Tx = Prisma.TransactionClient;

const arredondar = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
const dataSomente = (valor: unknown) => {
  const texto = String(valor ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T00:00:00.000Z`) : null;
};
const hoje = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

function exigirMotivo(motivo: unknown, minimo = 5) {
  const texto = String(motivo ?? "").trim();
  if (texto.length < minimo) {
    throw new ErroNegocio(400, `Informe o motivo (mínimo ${minimo} caracteres) para a auditoria.`);
  }
  return texto;
}

async function contaBancaria(tx: Tx, id: unknown) {
  if (!/^\d+$/.test(String(id ?? ""))) throw new ErroNegocio(400, "Selecione a conta bancária.");
  const conta = await tx.mh3_contas_bancarias.findUnique({ where: { id: BigInt(String(id)) } });
  if (!conta) throw new ErroNegocio(400, "Conta bancária não encontrada.");
  return conta;
}

/** Aplica um movimento ao saldo da conta e registra a movimentação. */
async function movimentarSaldo(
  tx: Tx,
  conta: { id: bigint; nome: string | null; saldo: unknown },
  delta: number,
  info: { tipo: string; motivo: string; usuario: string; refTipo: string; refId: string },
) {
  const anterior = Number(conta.saldo) || 0;
  const novo = arredondar(anterior + delta);
  await tx.mh3_contas_bancarias.update({ where: { id: conta.id }, data: { saldo: novo } });
  await tx.mh3_movimentacoes_bancarias.create({
    data: {
      data: new Date(),
      usuario: info.usuario.slice(0, 45),
      tipo: info.tipo,
      valor: Math.abs(delta),
      motivo: info.motivo.slice(0, 255),
      conta_id: conta.id,
      saldo_anterior: anterior,
      saldo_novo: novo,
      ref_tipo: info.refTipo,
      ref_id: info.refId,
    },
  });
  return novo;
}

// ───────── Acerto de saldo (senha + motivo, vai para a auditoria) ─────────

export async function acertarSaldo(
  contaId: bigint,
  novoSaldo: unknown,
  motivo: unknown,
  senha: unknown,
  request?: Request,
) {
  const texto = exigirMotivo(motivo);
  const valor = Number(novoSaldo);
  if (!Number.isFinite(valor)) throw new ErroNegocio(400, "Informe o novo saldo.");

  const ator = await obterAtor(request);
  if (!ator.id) throw new ErroNegocio(401, "Sessão expirada. Entre novamente.");
  const usuario = await prisma.mh3_usuarios.findUnique({ where: { id: ator.id } });
  const armazenada = String(usuario?.senha ?? "");
  const senhaOk = !!usuario && !!senha && (armazenada.startsWith("$2")
    ? await bcrypt.compare(String(senha), armazenada)
    : String(senha) === armazenada);
  if (!senhaOk) {
    await auditar({ request, acao: "ACERTO_NEGADO", modulo: "mh3_contas_bancarias", registroId: contaId, descricao: "Tentativa de acerto com senha inválida" });
    throw new ErroNegocio(403, "Senha incorreta.");
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const conta = await tx.mh3_contas_bancarias.findUnique({ where: { id: contaId } });
    if (!conta) throw new ErroNegocio(404, "Conta bancária não encontrada.");
    const anterior = Number(conta.saldo) || 0;
    const delta = arredondar(valor - anterior);
    if (delta === 0) throw new ErroNegocio(400, "O novo saldo é igual ao saldo atual.");
    await movimentarSaldo(tx, conta, delta, {
      tipo: "acerto",
      motivo: texto,
      usuario: ator.nome,
      refTipo: "acerto",
      refId: String(contaId),
    });
    return { conta, anterior, novo: arredondar(valor) };
  });

  await auditar({
    request,
    acao: "ACERTO_SALDO",
    modulo: "mh3_contas_bancarias",
    registroId: contaId,
    descricao: `${resultado.conta.nome ?? resultado.conta.banco ?? "Conta"}: saldo ${resultado.anterior} → ${resultado.novo}. Motivo: ${texto}`,
  });
  return resultado;
}

// ───────── Contas a pagar ─────────

type Parcela = { valor?: unknown; data_vencimento?: unknown };

export async function criarDespesas(body: Record<string, any>, request?: Request) {
  const parcelas: Parcela[] = Array.isArray(body.parcelas) && body.parcelas.length ? body.parcelas : [];
  const total = parcelas.length || 1;
  const grupo = total > 1 ? `G${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase() : null;

  const criadas = await prisma.$transaction(async (tx) => {
    const lista = [];
    for (let i = 0; i < total; i++) {
      const parcela = parcelas[i];
      const valor = Number(parcela ? parcela.valor : body.valor);
      const vencimento = dataSomente(parcela ? parcela.data_vencimento : body.data_vencimento);
      if (!Number.isFinite(valor) || valor <= 0) throw new ErroNegocio(400, `Informe o valor${total > 1 ? ` da parcela ${i + 1}` : ""}.`);
      if (!vencimento) throw new ErroNegocio(400, `Informe o vencimento${total > 1 ? ` da parcela ${i + 1}` : ""}.`);
      const sufixo = total > 1 ? ` (${i + 1}/${total})` : "";
      lista.push(await tx.mh3_despesas.create({
        data: {
          descricao: `${String(body.descricao ?? "").trim()}${sufixo}`.slice(0, 255),
          categoria: body.categoria || "Geral",
          fornecedor: body.fornecedor || null,
          data_competencia: dataSomente(body.data_competencia),
          data_vencimento: vencimento,
          valor,
          status_disp: "pendente",
          observacoes: body.observacoes || null,
          placa: body.placa || null,
          antigo: false,
          num_desp: await proximoNumero("DESP", tx),
          grupo_parcela: grupo,
          parcela_num: total > 1 ? i + 1 : null,
          parcela_total: total > 1 ? total : null,
          origem: body.origem || null,
        },
      }));
    }
    return lista;
  });

  for (const despesa of criadas) {
    await auditar({
      request,
      acao: "CRIAR",
      modulo: "mh3_despesas",
      registroId: despesa.id,
      descricao: `${despesa.num_desp} ${despesa.descricao} — R$ ${despesa.valor} venc. ${despesa.data_vencimento?.toISOString().slice(0, 10)}`,
    });
  }
  return criadas;
}

export async function baixarDespesa(
  id: bigint,
  dados: { conta_banco_id?: unknown; valor_pago?: unknown; data_pagamento?: unknown },
  request?: Request,
) {
  const ator = await obterAtor(request);
  const despesa = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_despesas.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "Despesa não encontrada.");
    if (atual.status_disp === "pago") throw new ErroNegocio(409, "Esta despesa já está paga.");
    const conta = await contaBancaria(tx, dados.conta_banco_id);
    const valorPago = arredondar(Number(dados.valor_pago ?? atual.valor));
    if (!Number.isFinite(valorPago) || valorPago <= 0) throw new ErroNegocio(400, "Informe o valor pago.");
    const dataPagamento = dataSomente(dados.data_pagamento) ?? hoje();

    await movimentarSaldo(tx, conta, -valorPago, {
      tipo: "saida",
      motivo: `Pagamento ${atual.num_desp ?? atual.id}: ${atual.descricao ?? ""}`,
      usuario: ator.nome,
      refTipo: "despesa",
      refId: String(id),
    });
    return tx.mh3_despesas.update({
      where: { id },
      data: {
        status_disp: "pago",
        valor_pago: valorPago,
        data_pagamento: dataPagamento,
        conta_banco_id: String(conta.id),
        conta_banco: conta.nome ?? conta.banco ?? null,
      },
    });
  });
  const previsto = Number(despesa.valor) || 0;
  const pago = Number(despesa.valor_pago) || 0;
  await auditar({
    request,
    acao: "PAGAR",
    modulo: "mh3_despesas",
    registroId: id,
    descricao: `${despesa.num_desp} paga: R$ ${pago} (previsto R$ ${previsto}${pago !== previsto ? `, diferença R$ ${arredondar(pago - previsto)}` : ""}) conta ${despesa.conta_banco}`,
  });
  return despesa;
}

export async function estornarDespesa(id: bigint, motivo: unknown, request?: Request) {
  const texto = exigirMotivo(motivo);
  const ator = await obterAtor(request);
  const despesa = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_despesas.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "Despesa não encontrada.");
    if (atual.status_disp !== "pago") throw new ErroNegocio(409, "Apenas despesas pagas podem ser estornadas.");
    if (atual.conta_banco_id && /^\d+$/.test(atual.conta_banco_id)) {
      const conta = await tx.mh3_contas_bancarias.findUnique({ where: { id: BigInt(atual.conta_banco_id) } });
      if (conta) {
        await movimentarSaldo(tx, conta, Number(atual.valor_pago ?? atual.valor) || 0, {
          tipo: "estorno",
          motivo: `Estorno ${atual.num_desp ?? atual.id}: ${texto}`,
          usuario: ator.nome,
          refTipo: "despesa",
          refId: String(id),
        });
      }
    }
    return tx.mh3_despesas.update({
      where: { id },
      data: { status_disp: "pendente", data_pagamento: null, valor_pago: null, conta_banco_id: null, conta_banco: null },
    });
  });
  await auditar({ request, acao: "ESTORNAR", modulo: "mh3_despesas", registroId: id, descricao: `${despesa.num_desp} voltou para pendente. Motivo: ${texto}` });
  return despesa;
}

// ───────── Contas a receber ─────────

async function carregarConta(tx: Tx, id: string) {
  const conta = await tx.mh3_contas_receber.findUnique({ where: { id } });
  if (!conta) throw new ErroNegocio(404, "Conta a receber não encontrada.");
  return conta;
}

export async function receberConta(
  id: string,
  dados: { conta_banco_id?: unknown; data_recebimento?: unknown },
  request?: Request,
) {
  const ator = await obterAtor(request);
  const conta = await prisma.$transaction(async (tx) => {
    const atual = await carregarConta(tx, id);
    if (!["pendente", "remarcado"].includes(atual.status)) {
      throw new ErroNegocio(409, "Apenas contas pendentes ou remarcadas podem ser recebidas.");
    }
    const banco = await contaBancaria(tx, dados.conta_banco_id);
    await movimentarSaldo(tx, banco, Number(atual.valor_total) || 0, {
      tipo: "entrada",
      motivo: `Recebimento ${atual.numero ?? atual.id}: ${atual.cliente}`,
      usuario: ator.nome,
      refTipo: "conta_receber",
      refId: id,
    });
    return tx.mh3_contas_receber.update({
      where: { id },
      data: {
        status: "pago",
        data_recebimento: dataSomente(dados.data_recebimento) ?? hoje(),
        conta_banco_id: String(banco.id),
      },
    });
  });
  await auditar({ request, acao: "RECEBER", modulo: "mh3_contas_receber", registroId: id, descricao: `${conta.numero} recebida: R$ ${conta.valor_total} (${conta.cliente})` });
  return conta;
}

export async function estornarRecebimento(id: string, motivo: unknown, request?: Request) {
  const texto = exigirMotivo(motivo);
  const ator = await obterAtor(request);
  const conta = await prisma.$transaction(async (tx) => {
    const atual = await carregarConta(tx, id);
    if (atual.status !== "pago") throw new ErroNegocio(409, "Apenas contas recebidas podem ser estornadas.");
    if (atual.conta_banco_id && /^\d+$/.test(atual.conta_banco_id)) {
      const banco = await tx.mh3_contas_bancarias.findUnique({ where: { id: BigInt(atual.conta_banco_id) } });
      if (banco) {
        await movimentarSaldo(tx, banco, -(Number(atual.valor_total) || 0), {
          tipo: "estorno",
          motivo: `Estorno recebimento ${atual.numero ?? atual.id}: ${texto}`,
          usuario: ator.nome,
          refTipo: "conta_receber",
          refId: id,
        });
      }
    }
    const remarcada = atual.vencimento_original && atual.data_vencimento
      && atual.vencimento_original.getTime() !== atual.data_vencimento.getTime();
    return tx.mh3_contas_receber.update({
      where: { id },
      data: { status: remarcada ? "remarcado" : "pendente", data_recebimento: null, conta_banco_id: null },
    });
  });
  await auditar({ request, acao: "ESTORNAR", modulo: "mh3_contas_receber", registroId: id, descricao: `${conta.numero} voltou para ${conta.status}. Motivo: ${texto}` });
  return conta;
}

export async function remarcarConta(id: string, novaData: unknown, motivo: unknown, request?: Request) {
  const texto = exigirMotivo(motivo);
  const data = dataSomente(novaData);
  if (!data) throw new ErroNegocio(400, "Informe a nova data de vencimento.");
  const conta = await prisma.$transaction(async (tx) => {
    const atual = await carregarConta(tx, id);
    if (!["pendente", "remarcado"].includes(atual.status)) {
      throw new ErroNegocio(409, "Apenas contas pendentes podem ser remarcadas.");
    }
    return tx.mh3_contas_receber.update({
      where: { id },
      data: {
        status: "remarcado",
        data_vencimento: data,
        vencimento_original: atual.vencimento_original ?? atual.data_vencimento,
      },
    });
  });
  await auditar({ request, acao: "REMARCAR", modulo: "mh3_contas_receber", registroId: id, descricao: `${conta.numero} remarcada para ${data.toISOString().slice(0, 10)}. Motivo: ${texto}` });
  return conta;
}

/** ATRASADO: sai do fluxo/recebimentos e entra em prejuízos. */
export async function marcarAtrasada(id: string, motivo: unknown, request?: Request) {
  const texto = exigirMotivo(motivo);
  const resultado = await prisma.$transaction(async (tx) => {
    const atual = await carregarConta(tx, id);
    if (!["pendente", "remarcado"].includes(atual.status)) {
      throw new ErroNegocio(409, "Apenas contas pendentes ou remarcadas podem ser marcadas como atrasadas.");
    }
    const prejuizo = await tx.mh3_prejuizos.create({
      data: {
        numero: await proximoNumero("PRJ", tx),
        data: hoje(),
        descricao: `Inadimplência: ${atual.cliente} — ${atual.numero ?? atual.id}`,
        valor: atual.valor_total,
        status: "aberto",
        observacoes: texto,
        conta_receber_id: atual.id,
        cliente: atual.cliente,
        vencimento_original: atual.vencimento_original ?? atual.data_vencimento,
      },
    });
    await tx.mh3_contas_receber.update({ where: { id }, data: { status: "atrasado", prejuizo_id: prejuizo.id } });
    return { atual, prejuizo };
  });
  await auditar({ request, acao: "ATRASADO", modulo: "mh3_contas_receber", registroId: id, descricao: `${resultado.atual.numero} → prejuízo ${resultado.prejuizo.numero}. Motivo: ${texto}` });
  return resultado.prejuizo;
}

export async function negociarPrejuizo(
  id: bigint,
  parcelas: Parcela[],
  motivo: unknown,
  request?: Request,
) {
  const texto = exigirMotivo(motivo);
  if (!Array.isArray(parcelas) || !parcelas.length) throw new ErroNegocio(400, "Informe ao menos uma parcela.");
  const geradas = await prisma.$transaction(async (tx) => {
    const prejuizo = await tx.mh3_prejuizos.findUnique({ where: { id } });
    if (!prejuizo) throw new ErroNegocio(404, "Prejuízo não encontrado.");
    if (prejuizo.status !== "aberto") throw new ErroNegocio(409, "Este prejuízo já foi negociado.");
    const lista = [];
    for (let i = 0; i < parcelas.length; i++) {
      const valor = Number(parcelas[i].valor);
      const vencimento = dataSomente(parcelas[i].data_vencimento);
      if (!Number.isFinite(valor) || valor <= 0) throw new ErroNegocio(400, `Informe o valor da parcela ${i + 1}.`);
      if (!vencimento) throw new ErroNegocio(400, `Informe o vencimento da parcela ${i + 1}.`);
      lista.push(await tx.mh3_contas_receber.create({
        data: {
          id: crypto.randomUUID(),
          numero: await proximoNumero("REC", tx),
          cliente: prejuizo.cliente ?? "Renegociação",
          competencia: vencimento.toISOString().slice(0, 7),
          valor_total: valor,
          status: "pendente",
          observacoes: `Renegociação do prejuízo ${prejuizo.numero} — parcela ${i + 1}/${parcelas.length}. ${texto}`,
          data_emissao: new Date(),
          data_vencimento: vencimento,
          vencimento_original: vencimento,
          prejuizo_id: prejuizo.id,
        },
      }));
    }
    if (prejuizo.conta_receber_id) {
      await tx.mh3_contas_receber.updateMany({
        where: { id: prejuizo.conta_receber_id, status: "atrasado" },
        data: { status: "renegociado" },
      });
    }
    await tx.mh3_prejuizos.update({ where: { id }, data: { status: "negociado", negociado_em: new Date() } });
    return lista;
  });
  await auditar({ request, acao: "NEGOCIAR", modulo: "mh3_prejuizos", registroId: id, descricao: `${geradas.length} parcela(s) geradas em Contas a Receber (${geradas.map((c) => c.numero).join(", ")}). ${texto}` });
  return geradas;
}
