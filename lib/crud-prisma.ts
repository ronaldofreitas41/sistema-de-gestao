import { NextResponse } from "next/server";
import { prisma } from "./prisma";


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
  mh3_empresas: "mh3Empresas",
  mh3_usuarios: "mh3Usuarios",
  mh3_equipamentos: "mh3Equipamentos",
  mh3_clientes: "mh3Clientes",
  mh3_funcionarios: "mh3Funcionarios",
  mh3_contratos: "mh3Contratos",
  mh3_medicoes: "mh3Medicoes",
  mh3_manutencoes: "mh3Manutencoes",
  mh3_revisoes: "mh3Revisoes",
  mh3_vendas: "mh3Vendas",
  mh3_venda_itens: "mh3VendaItens",
  mh3_estoque: "mh3Estoque",
  mh3_nfs: "mh3Nfs",
  mh3_nf_itens: "mh3NfItens",
  mh3_despesas: "mh3Despesas",
  mh3_contas_bancarias: "mh3ContasBancarias",
  mh3_investimentos: "mh3Investimentos",
  mh3_pneus: "mh3Pneus",
  mh3_pneus_historico: "mh3PneusHistorico",
  mh3_mobilizacoes: "mh3Mobilizacoes",
  mh3_saidas_material: "mh3SaidasMaterial",
  mh3_ajudas_motorista: "mh3AjudasMotorista",
  mh3_checklists: "mh3Checklists",
  mh3_checklist_itens: "mh3ChecklistItens",
  mh3_seguros: "mh3Seguros",
  mh3_prejuizos: "mh3Prejuizos",
  mh3_tratativas: "mh3Tratativas",
  mh3_propostas: "mh3Propostas",
  mh3_prazos: "mh3Prazos",
  mh3_tabelas_precos: "mh3TabelasPrecos",
  mh3_auditoria: "mh3Auditoria",
  mh3_configuracoes: "mh3Configuracoes",
  mh3_sequencias: "mh3Sequencias",
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
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 50), 1),
      200
    );
    const skip = (page - 1) * limit;
    const search = searchParams.get("search")?.trim();

    const delegate = getDelegate(table);

    const where = search && searchFields.length
      ? {
          OR: searchFields.map((field) => ({
            [field]: { contains: search },
          })),
        }
      : undefined;

    const rows = await delegate.findMany({
      where,
      orderBy: { id: "desc" },
      skip,
      take: limit,
    });

    return json({ data: rows, page, limit });
  } catch (error) {
    console.error("Prisma list error:", error);
    return json(
      { error: "Erro ao consultar registros.", detail: prismaError(error) },
      500
    );
  }
}

export async function getById(table: string, id: Id) {
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

export async function create(
  table: string,
  allowedFields: string[],
  body: Record<string, unknown>
) {
  try {
    const data = normalizeBody(table, allowedFields, body);

    if (!Object.keys(data).length) {
      return json({ error: "Nenhum campo válido foi enviado." }, 400);
    }

    const delegate = getDelegate(table);
    const row = await delegate.create({ data });

    return json(row, 201);
  } catch (error) {
    console.error("Prisma create error:", error);
    return json(
      { error: "Erro ao criar registro.", detail: prismaError(error) },
      500
    );
  }
}

export async function update(
  table: string,
  allowedFields: string[],
  id: Id,
  body: Record<string, unknown>
) {
  try {
    const data = normalizeBody(table, allowedFields, body);

    if (!Object.keys(data).length) {
      return json({ error: "Nenhum campo válido foi enviado." }, 400);
    }

    const delegate = getDelegate(table);
    const recordId = normalizeId(table, id);

    const row = await delegate.update({
      where: { id: recordId },
      data,
    });

    return json(row);
  } catch (error) {
    console.error("Prisma update error:", error);
    const details = prismaError(error);

    if (details.code === "P2025") {
      return json({ error: "Registro não encontrado." }, 404);
    }

    return json(
      { error: "Erro ao atualizar registro.", detail: details },
      500
    );
  }
}

export async function remove(table: string, id: Id) {
  try {
    const delegate = getDelegate(table);
    const recordId = normalizeId(table, id);

    await delegate.delete({
      where: { id: recordId },
    });

    return json({ message: "Registro excluído com sucesso." });
  } catch (error) {
    console.error("Prisma delete error:", error);
    const details = prismaError(error);

    if (details.code === "P2025") {
      return json({ error: "Registro não encontrado." }, 404);
    }

    return json(
      { error: "Erro ao excluir registro.", detail: details },
      500
    );
  }
}
