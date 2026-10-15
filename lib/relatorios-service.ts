import { prisma } from "./prisma";
import { ErroNegocio } from "./medicao-service";

export type TipoColuna = "texto" | "moeda" | "numero" | "data";
export type Coluna = { chave: string; rotulo: string; tipo: TipoColuna };
export type Linha = Record<string, string | number | null>;
export type Relatorio = {
  titulo: string;
  colunas: Coluna[];
  linhas: Linha[];
  totais: Record<string, number>;
  /** Colunas somadas no modo simplificado (agrupado por empresa). */
  somar: string[];
};

export type TipoRelatorio =
  | "faturamento"
  | "lucro-empresa"
  | "lucro-parceiros"
  | "a-pagar"
  | "a-receber"
  | "pagar-receber"
  | "estoque"
  | "pneus"
  | "resultado-placa";

/** Permissão necessária para cada relatório (chaves já existentes em permissoesPadrao). */
export const PERMISSAO_RELATORIO: Record<TipoRelatorio, string[]> = {
  faturamento: ["rel-fin"],
  "lucro-empresa": ["rel-fin"],
  "lucro-parceiros": ["rel-fin"],
  "a-pagar": ["rel-cpagar"],
  "a-receber": ["rel-creceber"],
  "pagar-receber": ["rel-cpagar", "rel-creceber"],
  estoque: ["rel-estq"],
  pneus: ["rel-estq"],
  "resultado-placa": ["rel-resultado"],
};

export const TIPOS_RELATORIO = Object.keys(PERMISSAO_RELATORIO) as TipoRelatorio[];

type Filtro = { inicio: Date; fim: Date; empresaId: string | null };

const SEM_EMPRESA = "Sem empresa";
const arred = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const num = (v: unknown) => Number(v) || 0;
const dia = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const normPlaca = (p: unknown) => String(p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const soma = (linhas: Linha[], chave: string) => arred(linhas.reduce((t, l) => t + num(l[chave]), 0));

export function lerFiltro(params: URLSearchParams): Filtro {
  const data = (valor: string | null) => (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00.000Z`) : null);
  const inicio = data(params.get("inicio"));
  const fimDia = data(params.get("fim"));
  if (!inicio || !fimDia) throw new ErroNegocio(400, "Informe o período (início e fim).");
  if (fimDia < inicio) throw new ErroNegocio(400, "A data final não pode ser anterior à inicial.");
  const empresa = params.get("empresa");
  return {
    inicio,
    fim: new Date(fimDia.getTime() + 86_400_000), // exclusivo
    empresaId: empresa && /^\d+$/.test(empresa) ? empresa : null,
  };
}

/** Mapas auxiliares para descobrir a empresa de cada lançamento. */
async function contextoEmpresas() {
  const [empresas, equipamentos, medicoes] = await Promise.all([
    prisma.mh3_empresas.findMany({ select: { id: true, nome: true } }),
    prisma.mh3_equipamentos.findMany({ select: { placa: true, empresa_id: true } }),
    prisma.mh3_medicoes.findMany({ select: { id: true, empresa_id: true } }),
  ]);
  const nomes = new Map(empresas.map((e) => [String(e.id), e.nome]));
  const porPlaca = new Map(equipamentos.map((e) => [normPlaca(e.placa), e.empresa_id ? String(e.empresa_id) : null]));
  const porMedicao = new Map(medicoes.map((m) => [String(m.id), m.empresa_id ? String(m.empresa_id) : null]));
  return {
    nome: (id: string | null) => (id ? nomes.get(id) ?? SEM_EMPRESA : SEM_EMPRESA),
    daPlaca: (placa: unknown) => porPlaca.get(normPlaca(placa)) ?? null,
    daMedicao: (id: unknown) => (id == null ? null : porMedicao.get(String(id)) ?? null),
  };
}

type Contexto = Awaited<ReturnType<typeof contextoEmpresas>>;
const passa = (f: Filtro, empresaId: string | null) => !f.empresaId || empresaId === f.empresaId;

const col = (chave: string, rotulo: string, tipo: TipoColuna = "texto"): Coluna => ({ chave, rotulo, tipo });
const ordenar = (linhas: Linha[], chave: string) =>
  linhas.sort((a, b) => String(a[chave] ?? "").localeCompare(String(b[chave] ?? "")));

function montar(titulo: string, colunas: Coluna[], linhas: Linha[], somar: string[]): Relatorio {
  return {
    titulo,
    colunas,
    linhas,
    somar,
    totais: Object.fromEntries(somar.map((chave) => [chave, soma(linhas, chave)])),
  };
}

// ───────── Faturamento: medições aprovadas do contratante ─────────
async function faturamento(f: Filtro, ctx: Contexto) {
  const medicoes = await prisma.mh3_medicoes.findMany({
    where: { status: "aprovado", papel: "contratante", data_medicao: { gte: f.inicio, lt: f.fim } },
    orderBy: { data_medicao: "asc" },
  });
  const linhas: Linha[] = medicoes
    .filter((m) => passa(f, m.empresa_id ? String(m.empresa_id) : null))
    .map((m) => ({
      empresa: ctx.nome(m.empresa_id ? String(m.empresa_id) : null),
      data: dia(m.data_medicao),
      numero: m.numero,
      cliente: m.cliente_id ?? "-",
      placas: Array.isArray(m.placas) ? (m.placas as { placa?: string }[]).map((p) => p.placa).join(", ") : "-",
      valor: num(m.valor),
    }));
  return montar(
    "Faturamento por período",
    [col("empresa", "Empresa"), col("data", "Data", "data"), col("numero", "Medição"), col("cliente", "Cliente"), col("placas", "Placas"), col("valor", "Valor", "moeda")],
    linhas,
    ["valor"],
  );
}

// ───────── Lucro por empresa: recebido − pago (regime de caixa) ─────────
async function lucroEmpresa(f: Filtro, ctx: Contexto) {
  const [recebidas, pagas] = await Promise.all([
    prisma.mh3_contas_receber.findMany({ where: { status: "pago", data_recebimento: { gte: f.inicio, lt: f.fim } } }),
    prisma.mh3_despesas.findMany({ where: { status_disp: "pago", data_pagamento: { gte: f.inicio, lt: f.fim } } }),
  ]);
  const acumulado = new Map<string, { recebido: number; pago: number }>();
  const item = (id: string | null) => {
    const chave = id ?? "";
    if (!acumulado.has(chave)) acumulado.set(chave, { recebido: 0, pago: 0 });
    return acumulado.get(chave)!;
  };
  for (const c of recebidas) {
    const emp = ctx.daMedicao(c.medicao_id);
    if (passa(f, emp)) item(emp).recebido += num(c.valor_total);
  }
  for (const d of pagas) {
    const emp = ctx.daMedicao(d.medicao_id) ?? ctx.daPlaca(d.placa);
    if (passa(f, emp)) item(emp).pago += num(d.valor_pago ?? d.valor);
  }
  const linhas: Linha[] = [...acumulado.entries()].map(([id, v]) => ({
    empresa: ctx.nome(id || null),
    recebido: arred(v.recebido),
    pago: arred(v.pago),
    lucro: arred(v.recebido - v.pago),
  }));
  return montar(
    "Lucro por empresa",
    [col("empresa", "Empresa"), col("recebido", "Recebido", "moeda"), col("pago", "Pago", "moeda"), col("lucro", "Lucro", "moeda")],
    ordenar(linhas, "empresa"),
    ["recebido", "pago", "lucro"],
  );
}

// ───────── Lucro sobre parceiros: contratante − parceiro − corretor ─────────
async function lucroParceiros(f: Filtro, ctx: Contexto) {
  const medicoes = await prisma.mh3_medicoes.findMany({
    where: { status: "aprovado", papel: "contratante", parceiro: { not: null }, data_medicao: { gte: f.inicio, lt: f.fim } },
    orderBy: { data_medicao: "asc" },
  });
  const parceiros = await prisma.mh3_medicoes.findMany({
    where: { papel: "parceiro", status: "aprovado", medicao_principal_id: { in: medicoes.map((m) => m.id) } },
    select: { medicao_principal_id: true, corretor_valor: true },
  });
  const corretorParceiro = new Map(parceiros.map((p) => [String(p.medicao_principal_id), num(p.corretor_valor)]));
  const linhas: Linha[] = medicoes
    .filter((m) => passa(f, m.empresa_id ? String(m.empresa_id) : null))
    .map((m) => {
      const corretor = num(m.corretor_valor) + (corretorParceiro.get(String(m.id)) ?? 0);
      return {
        empresa: ctx.nome(m.empresa_id ? String(m.empresa_id) : null),
        parceiro: m.parceiro ?? "-",
        data: dia(m.data_medicao),
        numero: m.numero,
        faturado: num(m.valor),
        repasse: num(m.valor_terceiro),
        corretor: arred(corretor),
        lucro: arred(num(m.valor) - num(m.valor_terceiro) - corretor),
      };
    });
  return montar(
    "Lucro sobre parceiros",
    [col("empresa", "Empresa"), col("parceiro", "Parceiro"), col("data", "Data", "data"), col("numero", "Medição"), col("faturado", "Faturado", "moeda"), col("repasse", "Repasse parceiro", "moeda"), col("corretor", "Corretor", "moeda"), col("lucro", "Lucro", "moeda")],
    linhas,
    ["faturado", "repasse", "corretor", "lucro"],
  );
}

async function linhasAPagar(f: Filtro, ctx: Contexto): Promise<Linha[]> {
  const despesas = await prisma.mh3_despesas.findMany({
    where: { status_disp: "pendente", data_vencimento: { gte: f.inicio, lt: f.fim } },
    orderBy: { data_vencimento: "asc" },
  });
  return despesas
    .map((d) => ({ d, emp: ctx.daMedicao(d.medicao_id) ?? ctx.daPlaca(d.placa) }))
    .filter(({ emp }) => passa(f, emp))
    .map(({ d, emp }) => ({
      empresa: ctx.nome(emp),
      vencimento: dia(d.data_vencimento),
      numero: d.num_desp,
      descricao: d.descricao ?? "-",
      fornecedor: d.fornecedor ?? "-",
      valor: num(d.valor),
    }));
}

async function linhasAReceber(f: Filtro, ctx: Contexto): Promise<Linha[]> {
  const contas = await prisma.mh3_contas_receber.findMany({
    where: { status: { in: ["pendente", "remarcado", "atrasado"] }, data_vencimento: { gte: f.inicio, lt: f.fim } },
    orderBy: { data_vencimento: "asc" },
  });
  return contas
    .map((c) => ({ c, emp: ctx.daMedicao(c.medicao_id) }))
    .filter(({ emp }) => passa(f, emp))
    .map(({ c, emp }) => ({
      empresa: ctx.nome(emp),
      vencimento: dia(c.data_vencimento),
      numero: c.numero,
      cliente: c.cliente,
      status: c.status,
      valor: num(c.valor_total),
    }));
}

async function aPagar(f: Filtro, ctx: Contexto) {
  return montar(
    "Contas a pagar no período",
    [col("empresa", "Empresa"), col("vencimento", "Vencimento", "data"), col("numero", "Nº"), col("descricao", "Descrição"), col("fornecedor", "Fornecedor"), col("valor", "Valor", "moeda")],
    await linhasAPagar(f, ctx),
    ["valor"],
  );
}

async function aReceber(f: Filtro, ctx: Contexto) {
  return montar(
    "Contas a receber no período",
    [col("empresa", "Empresa"), col("vencimento", "Vencimento", "data"), col("numero", "Nº"), col("cliente", "Cliente"), col("status", "Status"), col("valor", "Valor", "moeda")],
    await linhasAReceber(f, ctx),
    ["valor"],
  );
}

async function pagarReceber(f: Filtro, ctx: Contexto, permitir: { pagar: boolean; receber: boolean }) {
  const [pagar, receber] = await Promise.all([
    permitir.pagar ? linhasAPagar(f, ctx) : Promise.resolve([]),
    permitir.receber ? linhasAReceber(f, ctx) : Promise.resolve([]),
  ]);
  const linhas: Linha[] = [
    ...receber.map((l) => ({ empresa: l.empresa, vencimento: l.vencimento, tipo: "A receber", numero: l.numero, descricao: l.cliente, receber: l.valor, pagar: 0, saldo: num(l.valor) })),
    ...pagar.map((l) => ({ empresa: l.empresa, vencimento: l.vencimento, tipo: "A pagar", numero: l.numero, descricao: l.descricao, receber: 0, pagar: l.valor, saldo: -num(l.valor) })),
  ].sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)));
  return montar(
    "A pagar e a receber (juntos)",
    [col("empresa", "Empresa"), col("vencimento", "Vencimento", "data"), col("tipo", "Tipo"), col("numero", "Nº"), col("descricao", "Descrição"), col("receber", "A receber", "moeda"), col("pagar", "A pagar", "moeda"), col("saldo", "Saldo", "moeda")],
    linhas,
    ["receber", "pagar", "saldo"],
  );
}

// ───────── Estoque (posição atual) ─────────
async function estoque() {
  const itens = await prisma.mh3_estoque.findMany({ where: { ativo: { not: false } }, orderBy: { descricao: "asc" } });
  const linhas: Linha[] = itens.map((i) => ({
    empresa: "Geral",
    codigo: i.codigo ?? "-",
    descricao: i.descricao ?? "-",
    categoria: i.categoria ?? "-",
    quantidade: num(i.quantidade),
    minimo: num(i.estoque_minimo),
    custo: num(i.custo_unitario),
    total: arred(num(i.quantidade) * num(i.custo_unitario)),
  }));
  return montar(
    "Estoque (posição atual)",
    [col("codigo", "Código"), col("descricao", "Descrição"), col("categoria", "Categoria"), col("quantidade", "Qtd", "numero"), col("minimo", "Mínimo", "numero"), col("custo", "Custo un.", "moeda"), col("total", "Total", "moeda")],
    linhas,
    ["quantidade", "total"],
  );
}

// ───────── Pneus: entradas e saídas no período (romaneio de reforma não entra) ─────────
const ROTULO_MOV: Record<string, string> = {
  entrada: "Entrada",
  saida_os: "Saída por OS",
  saida_inutilizacao: "Saída por inutilização",
  saida_venda: "Saída por venda",
  retorno_estoque: "Retorno ao estoque",
};

async function pneus(f: Filtro) {
  const movimentos = await prisma.mh3_pneus_historico.findMany({
    where: {
      data: { gte: f.inicio, lt: f.fim },
      NOT: [{ tipo: { startsWith: "romaneio" } }, { tipo: { contains: "reforma" } }],
    },
    orderBy: { data: "asc" },
  });
  const ids = [...new Set(movimentos.map((m) => m.pneu_id))];
  const cadastro = await prisma.mh3_pneus.findMany({ where: { id: { in: ids } } });
  const porId = new Map(cadastro.map((p) => [p.id, p]));
  const linhas: Linha[] = movimentos.map((m) => {
    const p = porId.get(m.pneu_id);
    const entrada = m.tipo === "entrada" || m.tipo === "retorno_estoque";
    return {
      empresa: "Geral",
      data: dia(m.data),
      movimento: ROTULO_MOV[m.tipo] ?? m.tipo,
      pneu: p?.numero ?? m.pneu_id,
      marca: p ? `${p.marca}${p.modelo ? ` ${p.modelo}` : ""}` : "-",
      condicao: p?.condicao ?? "-",
      placa: m.placa ?? "-",
      entradas: entrada ? 1 : 0,
      saidas: entrada ? 0 : 1,
    };
  });
  return montar(
    "Pneus: estoque, entradas e saídas",
    [col("data", "Data", "data"), col("movimento", "Movimento"), col("pneu", "Pneu nº"), col("marca", "Marca/modelo"), col("condicao", "Condição"), col("placa", "Placa"), col("entradas", "Entradas", "numero"), col("saidas", "Saídas", "numero")],
    linhas,
    ["entradas", "saidas"],
  );
}

// ───────── Resultado por placa: receita − despesas − OS ─────────
async function resultadoPlaca(f: Filtro, ctx: Contexto) {
  const [medicoes, despesas, os, equipamentos] = await Promise.all([
    prisma.mh3_medicoes.findMany({
      where: { status: "aprovado", papel: "contratante", data_medicao: { gte: f.inicio, lt: f.fim } },
      select: { valor: true, placas: true },
    }),
    prisma.mh3_despesas.findMany({
      where: { placa: { not: null }, data_vencimento: { gte: f.inicio, lt: f.fim }, status_disp: { not: "cancelado" } },
      select: { placa: true, valor: true, valor_pago: true, status_disp: true },
    }),
    prisma.mh3_manutencoes.findMany({
      where: { placa: { not: null }, en: { gte: f.inicio, lt: f.fim } },
      select: { placa: true, custo: true },
    }),
    prisma.mh3_equipamentos.findMany({ select: { placa: true, empresa_id: true } }),
  ]);
  const acc = new Map<string, { receita: number; despesas: number; os: number }>();
  const item = (placa: unknown) => {
    const k = normPlaca(placa);
    if (!acc.has(k)) acc.set(k, { receita: 0, despesas: 0, os: 0 });
    return acc.get(k)!;
  };
  for (const m of medicoes) {
    const placas = Array.isArray(m.placas) ? (m.placas as { placa?: string; valor_calculado?: unknown; valor?: unknown }[]) : [];
    const detalhadas = placas.length > 0 && placas.every((p) => Number.isFinite(Number(p.valor_calculado)));
    if (detalhadas) for (const p of placas) item(p.placa).receita += num(p.valor_calculado);
    else if (placas.length) for (const p of placas) item(p.placa).receita += num(m.valor) / placas.length;
  }
  for (const d of despesas) item(d.placa).despesas += num(d.valor_pago ?? d.valor);
  for (const o of os) item(o.placa).os += num(String(o.custo ?? "").replace(/\./g, "").replace(",", "."));
  const empresaDe = new Map(equipamentos.map((e) => [normPlaca(e.placa), e.empresa_id ? String(e.empresa_id) : null]));
  const linhas: Linha[] = [...acc.entries()]
    .filter(([placa]) => passa(f, empresaDe.get(placa) ?? null))
    .map(([placa, v]) => ({
      empresa: ctx.nome(empresaDe.get(placa) ?? null),
      placa,
      receita: arred(v.receita),
      despesas: arred(v.despesas),
      os: arred(v.os),
      resultado: arred(v.receita - v.despesas - v.os),
    }));
  return montar(
    "Resultado por placa",
    [col("empresa", "Empresa"), col("placa", "Placa"), col("receita", "Receita", "moeda"), col("despesas", "Despesas", "moeda"), col("os", "OS", "moeda"), col("resultado", "Resultado", "moeda")],
    ordenar(linhas, "placa"),
    ["receita", "despesas", "os", "resultado"],
  );
}

export async function gerarRelatorio(
  tipo: TipoRelatorio,
  filtro: Filtro,
  permitir: { pagar: boolean; receber: boolean },
): Promise<Relatorio> {
  const ctx = await contextoEmpresas();
  switch (tipo) {
    case "faturamento": return faturamento(filtro, ctx);
    case "lucro-empresa": return lucroEmpresa(filtro, ctx);
    case "lucro-parceiros": return lucroParceiros(filtro, ctx);
    case "a-pagar": return aPagar(filtro, ctx);
    case "a-receber": return aReceber(filtro, ctx);
    case "pagar-receber": return pagarReceber(filtro, ctx, permitir);
    case "estoque": return estoque();
    case "pneus": return pneus(filtro);
    case "resultado-placa": return resultadoPlaca(filtro, ctx);
  }
}
