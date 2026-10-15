import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { auditar, obterAtor, proximoNumero } from "./audit";
import { atualizarRegistro, criarRegistro } from "./crud-prisma";
import { ErroNegocio } from "./medicao-service";

type Tx = Prisma.TransactionClient;
type Dados = Record<string, any>;

export const CONDICOES = ["novo", "usado", "reformado", "carcaça"] as const;

export const FIELDS_PNEU = [
  "numero",
  "marca",
  "modelo",
  "medida",
  "dot",
  "condicao",
  "pct_borracha",
  "valor",
  "data",
  "observacao",
];

const FIELDS_PNEU_CRIACAO = [...FIELDS_PNEU, "status", "situacao", "local"];

export function normalizarCondicao(valor: unknown) {
  const texto = String(valor ?? "").trim().toLowerCase().replace("carcaca", "carcaça");
  if (!CONDICOES.includes(texto as (typeof CONDICOES)[number])) {
    throw new ErroNegocio(400, "Informe a condição do pneu: novo, usado, reformado ou carcaça.");
  }
  return texto;
}

function validarPct(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0 || numero > 100) {
    throw new ErroNegocio(400, "A % de borracha deve ser um número inteiro de 0 a 100.");
  }
  return numero;
}

async function historico(
  tx: Tx,
  dados: { pneu_id: string; tipo: string; descricao?: string; usuario?: string; placa?: string | null; os_id?: string | null; romaneio_id?: bigint | null },
) {
  await tx.mh3_pneus_historico.create({
    data: {
      pneu_id: dados.pneu_id,
      tipo: dados.tipo,
      descricao: dados.descricao ?? null,
      usuario: dados.usuario ?? null,
      placa: dados.placa ?? null,
      os_id: dados.os_id ?? null,
      romaneio_id: dados.romaneio_id ?? null,
    },
  });
}

function prepararDadosPneu(body: Dados) {
  if (!String(body.numero ?? "").trim()) throw new ErroNegocio(400, "Informe o número do pneu.");
  if (!String(body.marca ?? "").trim()) throw new ErroNegocio(400, "Informe a marca do pneu.");
  return {
    ...body,
    numero: String(body.numero).trim(),
    condicao: normalizarCondicao(body.condicao),
    pct_borracha: validarPct(body.pct_borracha),
    data: body.data || new Date().toISOString().slice(0, 10),
  };
}

export async function criarPneu(body: Dados, request?: Request) {
  const dados = prepararDadosPneu(body);
  const duplicado = await prisma.mh3_pneus.findFirst({
    where: { numero: dados.numero, situacao: { not: "inutilizado" } },
  });
  if (duplicado) throw new ErroNegocio(409, `Já existe um pneu ativo com o número ${dados.numero}.`);

  const ator = await obterAtor(request);
  const row = await criarRegistro(
    "mh3_pneus",
    FIELDS_PNEU_CRIACAO,
    { ...dados, status: "estoque", situacao: "estoque", local: "Estoque" },
    request,
  );
  await prisma.$transaction((tx) =>
    historico(tx, { pneu_id: row.id, tipo: "entrada", descricao: `Entrada em estoque (${dados.condicao})`, usuario: ator.nome }),
  );
  return row;
}

export async function editarPneu(id: string, body: Dados, request?: Request) {
  const dados = prepararDadosPneu(body);
  const atual = await prisma.mh3_pneus.findUnique({ where: { id } });
  if (!atual) throw new ErroNegocio(404, "Pneu não encontrado.");
  if (dados.numero !== atual.numero) {
    const duplicado = await prisma.mh3_pneus.findFirst({
      where: { numero: dados.numero, id: { not: id }, situacao: { not: "inutilizado" } },
    });
    if (duplicado) throw new ErroNegocio(409, `Já existe um pneu ativo com o número ${dados.numero}.`);
  }
  return atualizarRegistro("mh3_pneus", FIELDS_PNEU, id, dados, request);
}

export async function inutilizarPneu(id: string, motivo: unknown, request?: Request) {
  const texto = String(motivo ?? "").trim();
  if (texto.length < 5) throw new ErroNegocio(400, "Informe o motivo da inutilização (mínimo 5 caracteres).");
  const ator = await obterAtor(request);
  const pneu = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_pneus.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "Pneu não encontrado.");
    if (atual.situacao !== "estoque") {
      throw new ErroNegocio(409, "Apenas pneus em estoque podem ser inutilizados. Pneus instalados saem pela OS e os vendidos, pela venda.");
    }
    const emRomaneio = await tx.mh3_romaneio_itens.count({
      where: { pneu_id: id, resultado: null, romaneio_id: { in: await romaneiosAbertos(tx) } },
    });
    if (emRomaneio) throw new ErroNegocio(409, "Este pneu está em um romaneio de reforma em aberto.");
    await historico(tx, { pneu_id: id, tipo: "saida_inutilizacao", descricao: texto, usuario: ator.nome });
    return tx.mh3_pneus.update({
      where: { id },
      data: { situacao: "inutilizado", status: "inutilizado", local: "Descarte", observacao: `${atual.observacao ?? ""}\nInutilizado: ${texto}`.trim() },
    });
  });
  await auditar({ request, acao: "INUTILIZAR", modulo: "mh3_pneus", registroId: id, descricao: `Pneu ${pneu.numero} inutilizado. Motivo: ${texto}` });
  return pneu;
}

async function romaneiosAbertos(tx: Tx) {
  const abertos = await tx.mh3_romaneios.findMany({ where: { status: "aberto" }, select: { id: true } });
  return abertos.map((r) => r.id);
}

// ───────── Romaneio de reforma ─────────

export async function criarRomaneio(body: Dados, request?: Request) {
  const ids: string[] = Array.isArray(body.pneu_ids) ? [...new Set(body.pneu_ids.map(String))] : [];
  if (!ids.length) throw new ErroNegocio(400, "Selecione ao menos um pneu para o romaneio.");
  if (!String(body.reformadora ?? "").trim()) throw new ErroNegocio(400, "Informe a reformadora.");
  const ator = await obterAtor(request);

  const romaneio = await prisma.$transaction(async (tx) => {
    const pneus = await tx.mh3_pneus.findMany({ where: { id: { in: ids } } });
    if (pneus.length !== ids.length) throw new ErroNegocio(400, "Um ou mais pneus não foram encontrados.");
    const indisponivel = pneus.find((p) => p.situacao !== "estoque");
    if (indisponivel) throw new ErroNegocio(409, `O pneu ${indisponivel.numero} não está em estoque.`);
    const abertos = await romaneiosAbertos(tx);
    const jaEmRomaneio = await tx.mh3_romaneio_itens.findFirst({
      where: { pneu_id: { in: ids }, resultado: null, romaneio_id: { in: abertos } },
    });
    if (jaEmRomaneio) {
      const pneu = pneus.find((p) => p.id === jaEmRomaneio.pneu_id);
      throw new ErroNegocio(409, `O pneu ${pneu?.numero ?? ""} já está em outro romaneio aberto.`);
    }

    const criado = await tx.mh3_romaneios.create({
      data: {
        numero: await proximoNumero("ROM", tx),
        reformadora: String(body.reformadora).trim(),
        data_saida: body.data_saida ? new Date(`${String(body.data_saida).slice(0, 10)}T00:00:00.000Z`) : new Date(),
        previsao_retorno: body.previsao_retorno ? new Date(`${String(body.previsao_retorno).slice(0, 10)}T00:00:00.000Z`) : null,
        observacoes: body.observacoes || null,
        criado_por: ator.nome,
        status: "aberto",
      },
    });
    for (const pneu of pneus) {
      await tx.mh3_romaneio_itens.create({ data: { romaneio_id: criado.id, pneu_id: pneu.id } });
      await historico(tx, { pneu_id: pneu.id, tipo: "romaneio_saida", descricao: `Romaneio ${criado.numero} — ${criado.reformadora}`, usuario: ator.nome, romaneio_id: criado.id });
    }
    return criado;
  });
  await auditar({ request, acao: "CRIAR", modulo: "mh3_romaneios", registroId: romaneio.id, descricao: `Romaneio ${romaneio.numero} para ${romaneio.reformadora} com ${ids.length} pneu(s)` });
  return romaneio;
}

type ItemRetorno = { id?: unknown; resultado?: unknown; pct_borracha?: unknown; valor_reforma?: unknown; observacao?: unknown };

export async function retornarRomaneio(id: bigint, itens: ItemRetorno[], request?: Request) {
  if (!Array.isArray(itens) || !itens.length) throw new ErroNegocio(400, "Informe o resultado de ao menos um pneu.");
  const ator = await obterAtor(request);
  const resultado = await prisma.$transaction(async (tx) => {
    const romaneio = await tx.mh3_romaneios.findUnique({ where: { id } });
    if (!romaneio) throw new ErroNegocio(404, "Romaneio não encontrado.");
    if (romaneio.status !== "aberto") throw new ErroNegocio(409, "Este romaneio já foi concluído.");
    const existentes = await tx.mh3_romaneio_itens.findMany({ where: { romaneio_id: id } });

    for (const entrada of itens) {
      const item = existentes.find((x) => String(x.id) === String(entrada.id));
      if (!item) throw new ErroNegocio(400, "Item não pertence a este romaneio.");
      if (item.resultado) throw new ErroNegocio(409, "Um dos pneus já teve o retorno lançado.");
      const res = String(entrada.resultado ?? "");
      if (!["reformado", "recusado"].includes(res)) throw new ErroNegocio(400, "Informe se cada pneu foi reformado ou recusado.");
      const pct = validarPct(entrada.pct_borracha);
      if (res === "reformado" && pct === null) throw new ErroNegocio(400, "Informe a % de borracha dos pneus reformados.");
      const valor = entrada.valor_reforma === "" || entrada.valor_reforma == null ? null : Number(entrada.valor_reforma);
      if (valor !== null && (!Number.isFinite(valor) || valor < 0)) throw new ErroNegocio(400, "Valor da reforma inválido.");

      await tx.mh3_romaneio_itens.update({
        where: { id: item.id },
        data: { resultado: res, pct_borracha: pct, valor_reforma: valor, observacao: entrada.observacao ? String(entrada.observacao).slice(0, 255) : null },
      });
      await tx.mh3_pneus.update({
        where: { id: item.pneu_id },
        data: res === "reformado"
          ? { condicao: "reformado", pct_borracha: pct }
          : { condicao: "carcaça", ...(pct !== null ? { pct_borracha: pct } : {}) },
      });
      await historico(tx, {
        pneu_id: item.pneu_id,
        tipo: res === "reformado" ? "romaneio_reformado" : "romaneio_recusado",
        descricao: `Romaneio ${romaneio.numero}${pct !== null ? ` — ${pct}% de borracha` : ""}`,
        usuario: ator.nome,
        romaneio_id: id,
      });
    }

    const pendentes = await tx.mh3_romaneio_itens.count({ where: { romaneio_id: id, resultado: null } });
    if (pendentes === 0) {
      await tx.mh3_romaneios.update({ where: { id }, data: { status: "retornado", retornado_em: new Date() } });
    }
    return { romaneio, concluido: pendentes === 0 };
  });
  await auditar({ request, acao: "RETORNO_ROMANEIO", modulo: "mh3_romaneios", registroId: id, descricao: `Romaneio ${resultado.romaneio.numero}: ${itens.length} pneu(s) lançado(s)${resultado.concluido ? " — concluído" : ""}` });
  return resultado;
}

export async function excluirRomaneio(id: bigint, request?: Request) {
  const numero = await prisma.$transaction(async (tx) => {
    const romaneio = await tx.mh3_romaneios.findUnique({ where: { id } });
    if (!romaneio) throw new ErroNegocio(404, "Romaneio não encontrado.");
    const lancados = await tx.mh3_romaneio_itens.count({ where: { romaneio_id: id, resultado: { not: null } } });
    if (lancados) throw new ErroNegocio(409, "Este romaneio já tem retorno lançado e não pode ser excluído.");
    await tx.mh3_pneus_historico.deleteMany({ where: { romaneio_id: id } });
    await tx.mh3_romaneio_itens.deleteMany({ where: { romaneio_id: id } });
    await tx.mh3_romaneios.delete({ where: { id } });
    return romaneio.numero;
  });
  await auditar({ request, acao: "EXCLUIR", modulo: "mh3_romaneios", registroId: id, descricao: `Romaneio ${numero} excluído` });
}

// ───────── Ordem de serviço: troca de pneus ─────────

/** Retira pneus do estoque para uma OS e gera uma pendência de entrada (carcaça) para cada um. */
export async function retirarPneusParaOS(tx: Tx, pneuIds: string[], os: { id: string; osNum: string | null; placa: string }, usuario: string) {
  for (const pneuId of pneuIds) {
    const pneu = await tx.mh3_pneus.findUnique({ where: { id: pneuId } });
    if (!pneu) throw new ErroNegocio(400, "Pneu não encontrado no estoque.");
    if (pneu.situacao !== "estoque") throw new ErroNegocio(409, `O pneu ${pneu.numero} não está disponível em estoque.`);
    const abertos = await romaneiosAbertos(tx);
    const noRomaneio = await tx.mh3_romaneio_itens.count({ where: { pneu_id: pneuId, resultado: null, romaneio_id: { in: abertos } } });
    if (noRomaneio) throw new ErroNegocio(409, `O pneu ${pneu.numero} está em um romaneio de reforma.`);

    await tx.mh3_pneus.update({
      where: { id: pneuId },
      data: { situacao: "instalado", status: "aplicado", placa: os.placa, local: `Veículo ${os.placa}` },
    });
    await historico(tx, { pneu_id: pneuId, tipo: "saida_os", descricao: `Saiu pela ${os.osNum ?? "OS"} para ${os.placa}`, usuario, placa: os.placa, os_id: os.id });
    await tx.mh3_pneu_pendencias.create({
      data: { os_id: os.id, os_num: os.osNum, placa: os.placa, pneu_saida_id: pneuId, status: "pendente" },
    });
  }
}

/** Devolve ao estoque pneus retirados por engano da OS (só se a entrada ainda não foi lançada). */
export async function devolverPneusDaOS(tx: Tx, pneuIds: string[], osId: string, usuario: string) {
  for (const pneuId of pneuIds) {
    const pendencia = await tx.mh3_pneu_pendencias.findFirst({ where: { os_id: osId, pneu_saida_id: pneuId } });
    if (pendencia?.status === "concluida") {
      throw new ErroNegocio(409, "A entrada do pneu removido já foi lançada no estoque; não é possível retirá-lo da OS.");
    }
    if (pendencia) await tx.mh3_pneu_pendencias.delete({ where: { id: pendencia.id } });
    await tx.mh3_pneus.update({
      where: { id: pneuId },
      data: { situacao: "estoque", status: "estoque", placa: null, local: "Estoque" },
    });
    await historico(tx, { pneu_id: pneuId, tipo: "retorno_estoque", descricao: "Retirado da OS (devolvido ao estoque)", usuario, os_id: osId });
  }
}

/** Lança a entrada da carcaça que saiu na OS: cria o pneu no estoque e conclui a pendência. */
export async function registrarEntradaPendencia(pendenciaId: bigint, body: Dados, request?: Request) {
  const dados = prepararDadosPneu({ ...body, condicao: body.condicao ?? "carcaça" });
  const duplicado = await prisma.mh3_pneus.findFirst({ where: { numero: dados.numero, situacao: { not: "inutilizado" } } });
  if (duplicado) throw new ErroNegocio(409, `Já existe um pneu ativo com o número ${dados.numero}.`);
  const ator = await obterAtor(request);

  const pendencia = await prisma.mh3_pneu_pendencias.findUnique({ where: { id: pendenciaId } });
  if (!pendencia) throw new ErroNegocio(404, "Pendência não encontrada.");
  if (pendencia.status !== "pendente") throw new ErroNegocio(409, "Esta entrada já foi lançada.");

  const pneu = await criarRegistro(
    "mh3_pneus",
    FIELDS_PNEU_CRIACAO,
    { ...dados, status: "estoque", situacao: "estoque", local: "Estoque", observacao: `${body.observacao ?? ""}\nEntrada pela ${pendencia.os_num ?? "OS"} (${pendencia.placa ?? ""})`.trim() },
    request,
  );
  await prisma.$transaction(async (tx) => {
    await historico(tx, { pneu_id: pneu.id, tipo: "entrada", descricao: `Entrada após troca — ${pendencia.os_num ?? ""} ${pendencia.placa ?? ""}`, usuario: ator.nome, placa: pendencia.placa, os_id: pendencia.os_id });
    await tx.mh3_pneu_pendencias.update({
      where: { id: pendenciaId },
      data: { status: "concluida", pneu_entrada_id: pneu.id, concluido_em: new Date() },
    });
  });
  return pneu;
}
