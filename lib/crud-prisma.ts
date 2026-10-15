import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { auditar, descreverAlteracoes, NUMERACAO, proximoNumero } from "./audit";

/** Campo de data usado pelo filtro ?mes= em cada tabela. */
const FILTRO_MES: Record<string, string> = {
  mh3_despesas: "data_vencimento",
  mh3_contas_receber: "data_vencimento",
  mh3_medicoes: "data_medicao",
  mh3_vendas: "data",
  mh3_mobilizacoes: "data",
  mh3_prejuizos: "data",
};

const SEM_AUDITORIA = new Set(["mh3_auditoria", "mh3_sequencias"]);
const resumo = (r: Record<string, unknown>) =>
  String(r.nome ?? r.descricao ?? r.numero ?? r.num_desp ?? r.placa ?? r.cliente ?? "").slice(0, 120);


type Id = string | number | bigint;
type PrismaDelegate = {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any | null>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
};

const json = (data: unknown, status = 200) => {
  // BigInt não pode ser serializado diretamente pelo JSON.
  const safe = JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  return NextResponse.json(safe, { status });
};

const TABLE_TO_MODEL: Record<string, string> = {
  mh3_empresas: "mh3_empresas",
  mh3_usuarios: "mh3_usuarios",
  mh3_equipamentos: "mh3_equipamentos",
  mh3_clientes: "mh3_clientes",
  mh3_funcionarios: "mh3_funcionarios",
  mh3_contratos: "mh3_contratos",
  mh3_medicoes: "mh3_medicoes",
  mh3_contas_receber: "mh3_contas_receber",
  mh3_manutencoes: "mh3_manutencoes",
  mh3_revisoes: "mh3_revisoes",
  mh3_vendas: "mh3_vendas",
  mh3_venda_itens: "mh3_venda_itens",
  mh3_estoque: "mh3_estoque",
  mh3_nfs: "mh3_nfs",
  mh3_nf_itens: "mh3_nf_itens",
  mh3_despesas: "mh3_despesas",        // @@map("mh3_despesas") → camelCase
  mh3_contas_bancarias: "mh3_contas_bancarias",
  mh3_investimentos: "mh3_investimentos",
  mh3_pneus: "mh3_pneus",
  mh3_pneus_historico: "mh3_pneus_historico",
  mh3_implementos: "mh3_implementos",
  mh3_romaneios: "mh3_romaneios",
  mh3_romaneio_itens: "mh3_romaneio_itens",
  mh3_pneu_pendencias: "mh3_pneu_pendencias",
  mh3_mobilizacoes: "mh3_mobilizacoes",
  mh3_ajudas_motorista: "mh3_ajudas_motorista",
  mh3_checklists: "mh3_checklists",
  mh3_checklist_itens: "mh3_checklist_itens",
  mh3_seguros: "mh3_seguros",
  mh3_prejuizos: "mh3_prejuizos",
  mh3_tratativas: "mh3_tratativas",
  mh3_propostas: "mh3_propostas",
  mh3_prazos: "mh3_prazos",
  mh3_tabelas_precos: "mh3_tabelas_precos",
  mh3_auditoria: "mh3_auditoria",
  mh3_configuracoes: "mh3_configuracoes",
  mh3_sequencias: "mh3_sequencias",
  mh3_parceiros: "mh3_parceiros",
};

function getDelegate(table: string): PrismaDelegate {
  const model = TABLE_TO_MODEL[table];

  if (!model) {
    throw new Error(`Tabela Prisma não mapeada: ${table}`);
  }

  const delegate = (prisma as any)[model] as PrismaDelegate | undefined;

  if (!delegate) {
    throw new Error(
      `Model Prisma '${model}' não existe no client gerado. Execute: pnpm exec prisma generate`
    );
  }

  return delegate;
}

function getModelMetadata(table: string): any | undefined {
  const model = TABLE_TO_MODEL[table];
  const runtimeModels = (prisma as any)?._runtimeDataModel?.models;
  return model ? runtimeModels?.[model] : undefined;
}

function getFieldMetadata(table: string, fieldName: string): any | undefined {
  const model = getModelMetadata(table);
  return model?.fields?.find((field: any) => field.name === fieldName);
}

function normalizeValue(table: string, fieldName: string, value: unknown): unknown {
  if (value === undefined || value === null) return value;

  const tipoCampo = getFieldMetadata(table, fieldName)?.type;
  if (value === "" && ["DateTime", "BigInt", "Int", "Float", "Decimal"].includes(tipoCampo)) {
    return null;
  }

  const field = getFieldMetadata(table, fieldName);

  if (!field) return value;

  switch (field.type) {
    case "DateTime":
      if (value instanceof Date) return value;
      return new Date(String(value));

    case "Boolean":
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      if (typeof value === "string") {
        return ["true", "1", "sim", "yes"].includes(value.toLowerCase());
      }
      return Boolean(value);

    case "BigInt":
      return typeof value === "bigint" ? value : BigInt(String(value));

    case "Int":
      return typeof value === "number" ? value : Number(value);

    case "Float":
      return typeof value === "number" ? value : Number(value);

    case "Decimal":
      // Prisma aceita string/number para Decimal.
      return value;

    case "Json":
      return value;

    case "String":
      // Campos de texto (ex.: quantidade_parcelas) podem chegar como número do formulário.
      return typeof value === "number" || typeof value === "bigint" ? String(value) : value;

    default:
      return value;
  }
}

function normalizeBody(
  table: string,
  allowedFields: string[],
  body: Record<string, unknown>
) {
  const data: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    data[field] = normalizeValue(table, field, body[field]);
  }

  return data;
}

function normalizeId(table: string, id: Id): Id {
  const field = getFieldMetadata(table, "id");

  if (field?.type === "BigInt") return BigInt(String(id));
  if (field?.type === "Int") return Number(id);

  return id;
}

/** Traduz erros comuns do Prisma/MySQL para uma mensagem que o usuário entenda. */
export function mensagemPrisma(error: unknown, padrao: string) {
  const err = error as { code?: string; message?: string; meta?: { column_name?: string; target?: unknown; modelName?: string } };
  const coluna = err?.meta?.column_name ? ` (campo ${err.meta.column_name})` : "";
  switch (err?.code) {
    case "P2000":
      return `Um dos valores é longo demais para o campo${coluna}.`;
    case "P2002":
      return "Já existe um registro com estes dados (valor duplicado).";
    case "P2003":
      return "Este registro está vinculado a outros e não pode ser alterado ou excluído.";
    case "P2011":
    case "P2012":
      return `Há um campo obrigatório sem valor${coluna}.`;
    default: {
      const faltando = err?.message?.match(/Argument `(\w+)` is missing/);
      if (faltando) return `Campo obrigatório não informado: ${faltando[1]}.`;
      return padrao;
    }
  }
}

function prismaError(error: unknown) {
  const err = error as { code?: string; message?: string };
  return {
    code: err?.code,
    message: err?.message,
  };
}

export async function list(
  table: string,
  request: Request,
  searchFields: string[] = []
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

    const skip = (page - 1) * 10000;
    const search = searchParams.get("search")?.trim();

    const delegate = getDelegate(table);

    const where: Record<string, unknown> = {};
    if (search && searchFields.length) {
      where.OR = searchFields.map((field) => ({ [field]: { contains: search } }));
    }
    // ?mes=YYYY-MM limita pela data de referência da tabela (ex.: vencimento, data da medição)
    const mes = searchParams.get("mes");
    const campoMes = FILTRO_MES[table];
    if (mes && campoMes && /^\d{4}-\d{2}$/.test(mes)) {
      const [ano, numero] = mes.split("-").map(Number);
      where[campoMes] = {
        gte: new Date(Date.UTC(ano, numero - 1, 1)),
        lt: new Date(Date.UTC(ano, numero, 1)),
      };
    }

    const rows = await delegate.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { id: "desc" },
      skip,
      take: 10000,

    });

    return json({ data: rows, page });
  } catch (error) {
    console.error("Prisma list error:", error);
    return json(
      { error: "Erro ao consultar registros.", detail: prismaError(error) },
      500
    );
  }
}

export async function getById(table: string, id: Id, _request?: Request) {
  try {
    const delegate = getDelegate(table);
    const recordId = normalizeId(table, id);

    const row = await delegate.findUnique({
      where: { id: recordId },
    });

    if (!row) return json({ error: "Registro não encontrado." }, 404);

    return json(row);
  } catch (error) {
    console.error("Prisma getById error:", error);
    return json(
      { error: "Erro ao consultar registro.", detail: prismaError(error) },
      500
    );
  }
}

export class ErroCrud extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Cria o registro (id, numeração e auditoria incluídos) e devolve a linha. Lança erro em caso de falha. */
export async function criarRegistro(
  table: string,
  allowedFields: string[],
  body: Record<string, unknown>,
  request?: Request,
) {
  const data = normalizeBody(table, allowedFields, body);

  if (!Object.keys(data).length) {
    throw new ErroCrud(400, "Nenhum campo válido foi enviado.");
  }

  // Tabelas com id texto sem valor padrão (contas a receber, pneus, vendas...)
  // falhavam ao criar porque o id não estava entre os campos permitidos.
  if (getFieldMetadata(table, "id")?.type === "String" && !data.id) {
    data.id = randomUUID().replace(/-/g, "").slice(0, 20);
  }

  const numeracao = NUMERACAO[table];
  if (numeracao && !data[numeracao.campo]) {
    data[numeracao.campo] = await proximoNumero(numeracao.prefixo);
  }

  const delegate = getDelegate(table);
  const row = await delegate.create({ data });
  if (!SEM_AUDITORIA.has(table)) {
    await auditar({ request, acao: "CRIAR", modulo: table, registroId: row.id, descricao: resumo(row) });
  }
  return row;
}

export async function create(
  table: string,
  allowedFields: string[],
  body: Record<string, unknown>,
  request?: Request
) {
  try {
    return json(await criarRegistro(table, allowedFields, body, request), 201);
  } catch (error) {
    if (error instanceof ErroCrud) return json({ error: error.message }, error.status);
    console.error("Prisma create error:", error);
    return json(
      { error: mensagemPrisma(error, "Erro ao criar registro."), detail: prismaError(error) },
      500
    );
  }
}

/** Atualiza o registro (com auditoria dos campos alterados) e devolve a linha. */
export async function atualizarRegistro(
  table: string,
  allowedFields: string[],
  id: Id,
  body: Record<string, unknown>,
  request?: Request,
) {
  const data = normalizeBody(table, allowedFields, body);

  if (!Object.keys(data).length) {
    throw new ErroCrud(400, "Nenhum campo válido foi enviado.");
  }

  const delegate = getDelegate(table);
  const recordId = normalizeId(table, id);

  const antes = SEM_AUDITORIA.has(table)
    ? null
    : await delegate.findUnique({ where: { id: recordId } });

  const row = await delegate.update({
    where: { id: recordId },
    data,
  });
  if (!SEM_AUDITORIA.has(table)) {
    await auditar({ request, acao: "EDITAR", modulo: table, registroId: row.id, descricao: `${resumo(row)} | ${descreverAlteracoes(antes, data)}` });
  }
  return row;
}

export async function update(
  table: string,
  allowedFields: string[],
  id: Id,
  body: Record<string, unknown>,
  request?: Request
) {
  try {
    return json(await atualizarRegistro(table, allowedFields, id, body, request));
  } catch (error) {
    if (error instanceof ErroCrud) return json({ error: error.message }, error.status);
    console.error("Prisma update error:", error);
    const details = prismaError(error);

    if (details.code === "P2025") {
      return json({ error: "Registro não encontrado." }, 404);
    }

    return json(
      { error: mensagemPrisma(error, "Erro ao atualizar registro."), detail: details },
      500
    );
  }
}

export async function remove(table: string, id: Id, request?: Request) {
  try {
    const delegate = getDelegate(table);
    const recordId = normalizeId(table, id);

    const antes = SEM_AUDITORIA.has(table)
      ? null
      : await delegate.findUnique({ where: { id: recordId } });

    await delegate.delete({
      where: { id: recordId },
    });
    if (!SEM_AUDITORIA.has(table)) {
      await auditar({ request, acao: "EXCLUIR", modulo: table, registroId: String(id), descricao: antes ? resumo(antes) : "" });
    }

    return json({ message: "Registro excluído com sucesso." });
  } catch (error) {
    console.error("Prisma delete error:", error);
    const details = prismaError(error);

    if (details.code === "P2025") {
      return json({ error: "Registro não encontrado." }, 404);
    }

    return json(
      { error: mensagemPrisma(error, "Erro ao excluir registro."), detail: details },
      500
    );
  }
}
