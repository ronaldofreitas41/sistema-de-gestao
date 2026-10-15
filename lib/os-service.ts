import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { auditar, obterAtor } from "./audit";
import { ErroNegocio } from "./medicao-service";
import { devolverPneusDaOS, retirarPneusParaOS } from "./pneus-service";

type Dados = Record<string, any>;

export const TIPOS_OS = ["PREVENTIVA", "TROCA DE PNEUS", "MANUTENÇÃO"] as const;
export const STATUS_OS = ["aberta", "finalizada"] as const;

function extrairNumeroOs(osNum?: string | null) {
  const resultado = osNum?.match(/(\d+)\s*$/);
  return resultado ? Number.parseInt(resultado[1], 10) : 0;
}

const formatarNumeroOs = (numero: number) => `OS - ${String(numero).padStart(5, "0")}`;

function normalizarTipo(valor: unknown) {
  const texto = String(valor ?? "").trim().toUpperCase().replace("MANUTENCAO", "MANUTENÇÃO");
  if (!TIPOS_OS.includes(texto as (typeof TIPOS_OS)[number])) {
    throw new ErroNegocio(400, "Selecione o tipo da OS: Preventiva, Troca de pneus ou Manutenção.");
  }
  return texto;
}

function normalizarStatus(valor: unknown) {
  const texto = String(valor ?? "aberta").trim().toLowerCase();
  if (!STATUS_OS.includes(texto as (typeof STATUS_OS)[number])) {
    throw new ErroNegocio(400, "O status da OS deve ser Em aberto ou Finalizada.");
  }
  return texto;
}

const dataOuNula = (valor: unknown) => {
  const texto = String(valor ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T00:00:00.000Z`) : null;
};
const numeroOuNulo = (valor: unknown) => {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

async function montarDados(body: Dados, tx: Prisma.TransactionClient) {
  const tipo = normalizarTipo(body.tipo);
  const status = normalizarStatus(body.status);

  const placa = String(body.placa ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!placa) throw new ErroNegocio(400, "Selecione a placa do veículo (cadastrada na frota).");
  const equipamento = await tx.mh3_equipamentos.findFirst({ where: { placa } });
  if (!equipamento) throw new ErroNegocio(400, `A placa ${placa} não está cadastrada na frota.`);

  const pneus: { pneu_id: string; numero: string }[] = Array.isArray(body.pneus)
    ? body.pneus
        .map((p: any) => ({ pneu_id: String(p?.pneu_id ?? ""), numero: String(p?.numero ?? "") }))
        .filter((p: { pneu_id: string }) => p.pneu_id)
    : [];
  if (tipo === "TROCA DE PNEUS" && pneus.length === 0) {
    throw new ErroNegocio(400, "Na troca de pneus, selecione os pneus do estoque que serão retirados.");
  }
  if (tipo !== "TROCA DE PNEUS" && pneus.length > 0) {
    throw new ErroNegocio(400, "Pneus só podem ser retirados do estoque em OS do tipo Troca de pneus.");
  }
  if (new Set(pneus.map((p) => p.pneu_id)).size !== pneus.length) {
    throw new ErroNegocio(400, "O mesmo pneu foi informado mais de uma vez.");
  }

  const dados = {
    finStatus: status,
    eqId: String(equipamento.id),
    eqLbl: body.eqLbl || [equipamento.tipo, equipamento.marca, equipamento.modelo].filter(Boolean).join(" "),
    placa,
    tipo,
    en: dataOuNula(body.en),
    sa: dataOuNula(body.sa),
    km: numeroOuNulo(body.km),
    hr: numeroOuNulo(body.hr),
    pkm: numeroOuNulo(body.pkm),
    phr: numeroOuNulo(body.phr),
    custo: body.custo === undefined || body.custo === null ? null : String(body.custo),
    status,
    resp: body.resp || null,
    ob: body.ob || null,
    lancs: (Array.isArray(body.lancs) ? body.lancs : []) as Prisma.InputJsonValue,
    checklist: (Array.isArray(body.checklist) ? body.checklist : []) as Prisma.InputJsonValue,
    fotos: (Array.isArray(body.fotos) ? body.fotos : []) as Prisma.InputJsonValue,
    pneus: pneus as unknown as Prisma.InputJsonValue,
  };
  return { dados, pneus };
}

export async function criarOS(body: Dados, request?: Request) {
  const ator = await obterAtor(request);
  const os = await prisma.$transaction(async (tx) => {
    const { dados, pneus } = await montarDados(body, tx);
    const todas = await tx.mh3_manutencoes.findMany({ select: { osNum: true } });
    const maior = todas.reduce((m, r) => Math.max(m, extrairNumeroOs(r.osNum)), 0);
    const criada = await tx.mh3_manutencoes.create({
      data: { id: crypto.randomUUID(), osNum: formatarNumeroOs(maior + 1), ...dados },
    });
    await retirarPneusParaOS(tx, pneus.map((p) => p.pneu_id), { id: criada.id, osNum: criada.osNum, placa: dados.placa }, ator.nome);
    return criada;
  });
  await auditar({
    request,
    acao: "CRIAR",
    modulo: "mh3_manutencoes",
    registroId: os.id,
    descricao: `${os.osNum} ${os.tipo} — ${os.placa} (${os.status})`,
  });
  return os;
}

export async function atualizarOS(id: string, body: Dados, request?: Request) {
  const ator = await obterAtor(request);
  const resultado = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_manutencoes.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "OS não encontrada.");
    const { dados, pneus } = await montarDados(body, tx);

    const anteriores: string[] = Array.isArray(atual.pneus)
      ? (atual.pneus as { pneu_id?: string }[]).map((p) => String(p.pneu_id))
      : [];
    const novos = pneus.map((p) => p.pneu_id);
    const removidos = anteriores.filter((p) => !novos.includes(p));
    const adicionados = novos.filter((p) => !anteriores.includes(p));
    if (removidos.length) await devolverPneusDaOS(tx, removidos, id, ator.nome);
    if (adicionados.length) {
      await retirarPneusParaOS(tx, adicionados, { id, osNum: atual.osNum, placa: dados.placa }, ator.nome);
    }
    const atualizada = await tx.mh3_manutencoes.update({ where: { id }, data: dados });
    return { atualizada, statusAnterior: atual.status };
  });
  await auditar({
    request,
    acao: resultado.statusAnterior !== resultado.atualizada.status ? "STATUS_OS" : "EDITAR",
    modulo: "mh3_manutencoes",
    registroId: id,
    descricao: `${resultado.atualizada.osNum} — ${resultado.atualizada.placa} (${resultado.statusAnterior} → ${resultado.atualizada.status})`,
  });
  return resultado.atualizada;
}

export async function excluirOS(id: string, request?: Request) {
  const ator = await obterAtor(request);
  const os = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_manutencoes.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "OS não encontrada.");
    const pneus: string[] = Array.isArray(atual.pneus)
      ? (atual.pneus as { pneu_id?: string }[]).map((p) => String(p.pneu_id))
      : [];
    if (pneus.length) await devolverPneusDaOS(tx, pneus, id, ator.nome);
    await tx.mh3_manutencoes.delete({ where: { id } });
    return atual;
  });
  await auditar({ request, acao: "EXCLUIR", modulo: "mh3_manutencoes", registroId: id, descricao: `${os.osNum} — ${os.placa} excluída` });
}
