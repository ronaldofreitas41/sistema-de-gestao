import { prisma } from "./prisma";
import { verifyToken } from "./auth";

type Ator = { id: string; nome: string };

/** Lê o cookie de sessão de qualquer Request (NextRequest ou Request padrão). */
export async function obterAtor(request?: Request): Promise<Ator> {
  const cookie = request?.headers.get("cookie") ?? "";
  const token = cookie.match(/(?:^|;\s*)mh3_token=([^;]+)/)?.[1];
  const payload = token ? await verifyToken(decodeURIComponent(token)) : null;
  return payload
    ? { id: payload.usuarioId, nome: payload.nome }
    : { id: "", nome: "Sistema" };
}

function obterIp(request?: Request) {
  const forwarded = request?.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? request?.headers.get("x-real-ip") ?? "").trim() || null;
}

type EntradaAuditoria = {
  request?: Request;
  acao: string;
  modulo: string;
  registroId?: string | number | bigint | null;
  descricao?: string;
};

/** Grava na auditoria. Nunca lança erro: falha de auditoria não deve derrubar a operação. */
export async function auditar({ request, acao, modulo, registroId, descricao }: EntradaAuditoria) {
  try {
    const ator = await obterAtor(request);
    const idNumerico = registroId != null && /^\d+$/.test(String(registroId))
      ? BigInt(String(registroId))
      : null;
    await prisma.mh3_auditoria.create({
      data: {
        usuario_id: ator.id || null,
        usuario_nome: ator.nome,
        acao,
        modulo,
        registro_id: idNumerico,
        descricao: (registroId != null && idNumerico === null
          ? `[${registroId}] ${descricao ?? ""}`
          : descricao ?? "").slice(0, 60000),
        ip: obterIp(request),
      },
    });
  } catch (error) {
    console.error("Falha ao gravar auditoria:", error);
  }
}

/** Número sequencial automático e atômico, ex.: proximoNumero("MED") → "MED-000001". */
export async function proximoNumero(prefixo: string, cliente: Pick<typeof prisma, "mh3_sequencias"> = prisma) {
  const seq = await cliente.mh3_sequencias.upsert({
    where: { nome: prefixo },
    create: { nome: prefixo, ultimo: 1 },
    update: { ultimo: { increment: 1 } },
  });
  return `${prefixo}-${String(seq.ultimo).padStart(6, "0")}`;
}

/** Tabelas que recebem numeração automática na criação: campo e prefixo. */
export const NUMERACAO: Record<string, { campo: string; prefixo: string }> = {
  mh3_medicoes: { campo: "numero", prefixo: "MED" },
  mh3_despesas: { campo: "num_desp", prefixo: "DESP" },
  mh3_contas_receber: { campo: "numero", prefixo: "REC" },
  mh3_ajudas_motorista: { campo: "numero", prefixo: "AJU" },
  mh3_mobilizacoes: { campo: "numero", prefixo: "MOB" },
  mh3_prejuizos: { campo: "numero", prefixo: "PRJ" },
  mh3_seguros: { campo: "numero", prefixo: "SEG" },
  mh3_implementos: { campo: "numero", prefixo: "IMP" },
  mh3_romaneios: { campo: "numero", prefixo: "ROM" },
  mh3_pneus: { campo: "codigo", prefixo: "PNE" },
};

/** Compara dois registros e descreve apenas os campos alterados. */
export function descreverAlteracoes(antes: Record<string, unknown> | null, depois: Record<string, unknown>) {
  const valor = (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10)
      : typeof v === "string" && v.length > 80 ? `${v.slice(0, 80)}…`
      : typeof v === "object" && v !== null ? JSON.stringify(v).slice(0, 80)
      : String(v ?? "");
  const partes: string[] = [];
  for (const chave of Object.keys(depois)) {
    if (chave === "senha" || chave === "codigo_acesso") { partes.push(`${chave} alterado`); continue; }
    if (chave === "logo" || chave === "fotos") { if (antes && String(antes[chave]) !== String(depois[chave])) partes.push(`${chave} alterado`); continue; }
    const a = antes?.[chave];
    if (valor(a) !== valor(depois[chave])) partes.push(`${chave}: "${valor(a)}" → "${valor(depois[chave])}"`);
  }
  return partes.join("; ") || "sem alterações de campos";
}
