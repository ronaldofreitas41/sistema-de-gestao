import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { auditar, obterAtor, proximoNumero } from "./audit";
import { ErroCrud, mensagemPrisma } from "./crud-prisma";
import {
  calcularPlacasMedicao,
  contarDiasPeriodoMedicao,
  totalMedicao,
} from "./medicoes";

type Tx = Prisma.TransactionClient;
type Dados = Record<string, any>;

export class ErroNegocio extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TIPOS_VALIDOS = ["Valor por Hora", "Valor Mensal", "Valor Direito", "Misto"];
const TIPOS_PLACA = ["Valor por Hora", "Valor Mensal"];
const num = (valor: unknown) => Number(valor) || 0;
const arredondar = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
const dataSomente = (valor: unknown) => {
  const texto = String(valor ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T00:00:00.000Z`) : null;
};

export const serializar = <T,>(dados: T): T =>
  JSON.parse(JSON.stringify(dados, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

async function carregarVendas(tx: Tx, itens: unknown, ignorarMedicaoIds: bigint[]) {
  if (itens == null) return [];
  if (!Array.isArray(itens)) throw new ErroNegocio(400, "A lista de vendas selecionadas é inválida.");
  const ids = [...new Set(itens.map((v: { id?: unknown }) => v?.id).filter((id): id is string => typeof id === "string" && !!id))];
  if (ids.length !== itens.length) throw new ErroNegocio(400, "A lista de vendas selecionadas é inválida.");
  if (!ids.length) return [];

  const registros = await tx.mh3_vendas.findMany({
    where: { id: { in: ids }, em_medicao: true, status: { not: "cancelado" } },
    select: { id: true, numero: true, cliente: true, total: true, sinal_medicao: true, placa_medicao: true },
  });
  if (registros.length !== ids.length) {
    throw new ErroNegocio(400, "Uma ou mais vendas não estão disponíveis para medição.");
  }

  const outras = await tx.mh3_medicoes.findMany({
    where: { id: { notIn: ignorarMedicaoIds }, status: { not: "cancelado" } },
    select: { vendas: true },
  });
  const usadas = new Set(
    outras.flatMap((m) => (Array.isArray(m.vendas) ? (m.vendas as { id?: string }[]).map((v) => v.id) : [])),
  );
  const repetida = registros.find((v) => usadas.has(v.id));
  if (repetida) {
    throw new ErroNegocio(400, `A venda ${repetida.numero} já está vinculada a outra medição.`);
  }

  return registros.map((v) => ({
    id: v.id,
    numero: v.numero,
    cliente: v.cliente,
    total: Number(v.total),
    sinal_medicao: v.sinal_medicao,
    placa_medicao: v.placa_medicao,
  }));
}

function normalizarPlaca(placa: string) {
  return placa.trim().toUpperCase().replace(/\s+/g, "");
}

type Preparado = {
  contratante: Prisma.mh3_medicoesUncheckedCreateInput;
  parceiro: Prisma.mh3_medicoesUncheckedCreateInput | null;
};

/** Valida o corpo e calcula as duas medições (contratante e, se parceria, parceiro). */
async function prepararMedicoes(tx: Tx, body: Dados, ignorarIds: bigint[], legado = false): Promise<Preparado> {
  const modalidade = body.modalidade === "parceria" ? "parceria" : body.modalidade === "frota" ? "frota" : "";
  if (!modalidade) throw new ErroNegocio(400, "Informe se a medição é com parceria ou com frota cadastrada.");

  if (typeof body.empresa_id !== "string" && typeof body.empresa_id !== "number") {
    throw new ErroNegocio(400, "Selecione a empresa do grupo.");
  }
  if (!/^\d+$/.test(String(body.empresa_id))) throw new ErroNegocio(400, "Selecione a empresa do grupo.");
  const empresaId = BigInt(String(body.empresa_id));
  const empresa = await tx.mh3_empresas.findUnique({ where: { id: empresaId }, select: { id: true } });
  if (!empresa) throw new ErroNegocio(400, "A empresa selecionada não existe.");

  const tipo = String(body.tipo_cobranca || "");
  if (!TIPOS_VALIDOS.includes(tipo) || (tipo === "Valor Direito" && !legado)) {
    throw new ErroNegocio(400, "Informe o tipo de lançamento: por hora ou mensal.");
  }

  const dataMedicao = dataSomente(body.data_medicao) ?? new Date();
  const vencimento = dataSomente(body.data_vencimento);

  if (tipo === "Misto" && modalidade === "parceria") {
    throw new ErroNegocio(400, "Medição com parceiro aceita apenas um tipo de contrato (hora ou mensal).");
  }

  const periodo = String(body.periodo || dataMedicao.toISOString().slice(0, 7));
  let diasMes: number | null = null;
  const algumaMensal = Array.isArray(body.placas) && body.placas.some(
    (p: Dados) => p && typeof p === "object" && p.tipo_cobranca === "Valor Mensal",
  );
  if (tipo === "Valor Mensal" || (tipo === "Misto" && algumaMensal)) {
    diasMes = num(body.dias_mes) || contarDiasPeriodoMedicao(periodo);
    if (!diasMes || diasMes < 28 || diasMes > 31) {
      throw new ErroNegocio(400, "Informe os dias do mês (30 ou 31).");
    }
  }

  const placasEntrada: unknown[] = Array.isArray(body.placas) ? body.placas : [];
  if (!placasEntrada.length) throw new ErroNegocio(400, "Adicione ao menos uma placa.");
  const placasNorm = placasEntrada.map((p) => {
    const item = (typeof p === "string" ? { placa: p } : p) as Dados;
    if (!item || typeof item.placa !== "string" || !item.placa.trim()) {
      throw new ErroNegocio(400, "Uma ou mais placas estão inválidas.");
    }
    if (tipo === "Misto" && !TIPOS_PLACA.includes(String(item.tipo_cobranca))) {
      throw new ErroNegocio(400, `Informe se a placa ${item.placa} é por hora ou mensal.`);
    }
    if (tipo !== "Misto") delete item.tipo_cobranca;
    return { ...item, placa: normalizarPlaca(item.placa) } as Dados & { placa: string };
  });

  if (modalidade === "frota") {
    const cadastradas = await tx.mh3_equipamentos.findMany({
      where: { placa: { in: placasNorm.map((p) => p.placa) } },
      select: { placa: true },
    });
    const conhecidas = new Set(cadastradas.map((e) => normalizarPlaca(e.placa ?? "")));
    const faltando = placasNorm.filter((p) => !conhecidas.has(p.placa)).map((p) => p.placa);
    if (faltando.length) {
      throw new ErroNegocio(400, `Placa não cadastrada na frota: ${faltando.join(", ")}.`);
    }
  }

  const horasGlobais = num(body.horas_trabalhadas);
  const diasGlobais = num(body.dias_trabalhados);
  const excedente = arredondar(num(body.valor_excedente));
  if (excedente < 0) throw new ErroNegocio(400, "O excedente não pode ser negativo.");

  const calc = (placas: unknown[]) => {
    try {
      return calcularPlacasMedicao(placas, tipo, diasMes || 0, horasGlobais, diasGlobais);
    } catch (erro) {
      throw new ErroNegocio(400, erro instanceof Error ? erro.message : "Os valores das placas são inválidos.");
    }
  };

  const vendasContratante = await carregarVendas(tx, body.vendas, ignorarIds);
  const calculoContratante = calc(placasNorm);
  const subtotal = calculoContratante.detalhadas ? calculoContratante.total : 0;
  const totais = totalMedicao(subtotal, excedente, 0, vendasContratante);

  const base: Prisma.mh3_medicoesUncheckedCreateInput = {
    placas: calculoContratante.placas as Prisma.InputJsonValue,
    tipo_cobranca: tipo,
    dias_mes: diasMes,
    valor: totais.total,
    terceiro: modalidade === "parceria",
    valor_terceiro: 0,
    obra: body.obra ? String(body.obra).slice(0, 150) : null,
    cliente_nome: body.cliente_nome ? String(body.cliente_nome).slice(0, 255) : null,
    horas_extras: horasGlobais,
    valor_excedente: excedente,
    data_medicao: dataMedicao,
    data_vencimento: vencimento,
    parceiro: null,
    observacoes: body.observacoes || null,
    periodo,
    obs_internas: body.obs_internas ? String(body.obs_internas).slice(0, 100) : null,
    cliente_id: body.cliente_id ? String(body.cliente_id) : null,
    empresa_id: empresaId,
    vendas: vendasContratante,
    modalidade,
    papel: "contratante",
    corretor_nome: body.corretor_nome ? String(body.corretor_nome).slice(0, 150) : null,
    corretor_valor: arredondar(Math.max(num(body.corretor_valor), 0)),
    status: "aguardando",
  };

  if (modalidade !== "parceria") {
    return { contratante: base, parceiro: null };
  }

  const dadosParceiro: Dados = body.parceiro_medicao ?? {};
  const nomeParceiro = String(dadosParceiro.parceiro || "").trim();
  if (!nomeParceiro) throw new ErroNegocio(400, "Informe o parceiro da medição.");
  const vencimentoParceiro = dataSomente(dadosParceiro.data_vencimento);
  const desconto = num(dadosParceiro.desconto_percentual);
  if (desconto < 0 || desconto > 100) throw new ErroNegocio(400, "O desconto deve estar entre 0% e 100%.");

  const placasParceiro = placasNorm.map((p) => {
    const valorParceiro = Number(p.valor_parceiro);
    if (!Number.isFinite(valorParceiro) || valorParceiro < 0) {
      throw new ErroNegocio(400, `Informe o valor do parceiro para a placa ${p.placa}.`);
    }
    const { valor_parceiro: _ignorado, valor_calculado: _calc, ...resto } = p;
    return { ...resto, valor: valorParceiro };
  });
  const calculoParceiro = calc(placasParceiro);
  const vendasParceiro = await carregarVendas(tx, dadosParceiro.vendas, ignorarIds);
  const idsRepetidos = vendasParceiro.filter((v) => vendasContratante.some((c) => c.id === v.id));
  if (idsRepetidos.length) {
    throw new ErroNegocio(400, "A mesma venda não pode ser usada nas duas medições.");
  }
  const totaisParceiro = totalMedicao(
    calculoParceiro.detalhadas ? calculoParceiro.total : 0,
    excedente,
    desconto,
    vendasParceiro,
  );

  base.parceiro = nomeParceiro;
  base.valor_terceiro = totaisParceiro.total;

  const parceiro: Prisma.mh3_medicoesUncheckedCreateInput = {
    ...base,
    placas: calculoParceiro.placas as Prisma.InputJsonValue,
    valor: totaisParceiro.total,
    valor_terceiro: 0,
    parceiro: nomeParceiro,
    papel: "parceiro",
    desconto_percentual: desconto,
    data_vencimento: vencimentoParceiro,
    vendas: vendasParceiro,
    observacoes: dadosParceiro.observacoes || base.observacoes,
    corretor_nome: dadosParceiro.corretor_nome ? String(dadosParceiro.corretor_nome).slice(0, 150) : null,
    corretor_valor: arredondar(Math.max(num(dadosParceiro.corretor_valor), 0)),
  };
  return { contratante: base, parceiro };
}

export async function criarMedicao(body: Dados, request?: Request) {
  const resultado = await prisma.$transaction(async (tx) => {
    const { contratante, parceiro } = await prepararMedicoes(tx, body, []);
    const numero = await proximoNumero("MED", tx);
    const principal = await tx.mh3_medicoes.create({ data: { ...contratante, numero } });
    let secundaria = null;
    if (parceiro) {
      secundaria = await tx.mh3_medicoes.create({
        data: { ...parceiro, numero: `${numero}-P`, medicao_principal_id: principal.id },
      });
    }
    return { principal, parceiro: secundaria };
  });
  await auditar({
    request,
    acao: "CRIAR",
    modulo: "mh3_medicoes",
    registroId: resultado.principal.id,
    descricao: `Medição ${resultado.principal.numero}${resultado.parceiro ? ` + parceiro ${resultado.parceiro.numero}` : ""} (aguardando)`,
  });
  return resultado;
}

async function grupoDaMedicao(tx: Tx, id: bigint) {
  const medicao = await tx.mh3_medicoes.findUnique({ where: { id } });
  if (!medicao) throw new ErroNegocio(404, "Medição não encontrada.");
  const principalId = medicao.papel === "parceiro" && medicao.medicao_principal_id
    ? medicao.medicao_principal_id
    : medicao.id;
  const principal = principalId === medicao.id
    ? medicao
    : await tx.mh3_medicoes.findUnique({ where: { id: principalId } });
  if (!principal) throw new ErroNegocio(404, "Medição principal não encontrada.");
  const parceiro = await tx.mh3_medicoes.findFirst({
    where: { medicao_principal_id: principal.id, papel: "parceiro" },
  });
  return { principal, parceiro };
}

export async function atualizarMedicao(id: bigint, body: Dados, request?: Request) {
  const resultado = await prisma.$transaction(async (tx) => {
    const { principal, parceiro } = await grupoDaMedicao(tx, id);
    if (principal.status !== "aguardando" || (parceiro && parceiro.status !== "aguardando")) {
      throw new ErroNegocio(409, "Medição aprovada não pode ser editada. Retorne-a para aguardando em Contas a Receber.");
    }
    const legado = principal.tipo_cobranca === "Valor Direito";
    const grupoIds = [principal.id, ...(parceiro ? [parceiro.id] : [])];
    const novo = await prepararMedicoes(tx, body, grupoIds, legado);

    const { status: _s, ...dadosPrincipal } = novo.contratante;
    const atualizada = await tx.mh3_medicoes.update({ where: { id: principal.id }, data: dadosPrincipal });

    let atualizadaParceiro = null;
    if (novo.parceiro) {
      const { status: _s2, ...dadosParceiro } = novo.parceiro;
      atualizadaParceiro = parceiro
        ? await tx.mh3_medicoes.update({ where: { id: parceiro.id }, data: dadosParceiro })
        : await tx.mh3_medicoes.create({
            data: { ...novo.parceiro, numero: `${principal.numero}-P`, medicao_principal_id: principal.id },
          });
    } else if (parceiro) {
      await tx.mh3_medicoes.delete({ where: { id: parceiro.id } });
    }
    return { principal: atualizada, parceiro: atualizadaParceiro };
  });
  await auditar({
    request,
    acao: "EDITAR",
    modulo: "mh3_medicoes",
    registroId: resultado.principal.id,
    descricao: `Medição ${resultado.principal.numero} editada (valor ${resultado.principal.valor})`,
  });
  return resultado;
}

export async function excluirMedicao(id: bigint, request?: Request) {
  const numero = await prisma.$transaction(async (tx) => {
    const { principal, parceiro } = await grupoDaMedicao(tx, id);
    if (principal.status !== "aguardando" || (parceiro && parceiro.status !== "aguardando")) {
      throw new ErroNegocio(409, "Medição aprovada não pode ser excluída. Retorne-a para aguardando em Contas a Receber.");
    }
    if (parceiro) await tx.mh3_medicoes.delete({ where: { id: parceiro.id } });
    await tx.mh3_medicoes.delete({ where: { id: principal.id } });
    return principal.numero;
  });
  await auditar({
    request,
    acao: "EXCLUIR",
    modulo: "mh3_medicoes",
    registroId: id,
    descricao: `Medição ${numero} excluída`,
  });
}

function formatarPeriodo(periodo: string | null) {
  const intervalo = periodo?.match(/^(\d{4})-(\d{2})-(\d{2})\s*(?:a|até)\s*(\d{4})-(\d{2})-(\d{2})$/i);
  if (intervalo) return `${intervalo[3]}/${intervalo[2]}/${intervalo[1]} a ${intervalo[6]}/${intervalo[5]}/${intervalo[4]}`;
  return periodo ?? "";
}

/** Texto que identifica o lançamento em Contas a Receber / Pagar. */
function descricaoMedicao(
  medicao: { numero: string | null; obra: string | null; periodo: string | null },
  papel: "Contratante" | "Parceiro",
  nome: string,
) {
  return [
    `Medição ${medicao.numero}`,
    `${papel}: ${nome}`,
    medicao.obra ? `Obra: ${medicao.obra}` : "",
    medicao.periodo ? `Período: ${formatarPeriodo(medicao.periodo)}` : "",
  ].filter(Boolean).join(" · ");
}

function textoPlacas(placas: unknown) {
  if (!Array.isArray(placas)) return null;
  const lista = placas
    .map((p) => (typeof p === "string" ? p : (p as { placa?: string })?.placa))
    .filter(Boolean);
  return lista.length ? lista.join(", ").slice(0, 45) : null;
}

async function criarDespesaCorretor(
  tx: Tx,
  medicao: { id: bigint; numero: string | null; placas: unknown; corretor_nome: string | null; corretor_valor: unknown; data_vencimento: Date | null; data_medicao: Date },
) {
  const valor = Number(medicao.corretor_valor) || 0;
  if (valor <= 0) return;
  await tx.mh3_despesas.create({
    data: {
      descricao: `Comissão corretor ${medicao.corretor_nome ?? ""} — medição ${medicao.numero}`.trim(),
      categoria: "Comissão corretor",
      fornecedor: medicao.corretor_nome,
      data_competencia: medicao.data_medicao,
      data_vencimento: medicao.data_vencimento ?? medicao.data_medicao,
      valor,
      status_disp: "pendente",
      placa: textoPlacas(medicao.placas),
      medicao_id: medicao.id,
      origem: "medicao_corretor",
      num_desp: await proximoNumero("DESP", tx),
    },
  });
}

export async function aprovarMedicao(id: bigint, request?: Request) {
  const ator = await obterAtor(request);
  const resultado = await prisma.$transaction(async (tx) => {
    const medicao = await tx.mh3_medicoes.findUnique({ where: { id } });
    if (!medicao) throw new ErroNegocio(404, "Medição não encontrada.");
    if (medicao.status !== "aguardando") throw new ErroNegocio(409, "Apenas medições aguardando podem ser aprovadas.");

    if (medicao.papel === "parceiro") {
      const principal = medicao.medicao_principal_id
        ? await tx.mh3_medicoes.findUnique({ where: { id: medicao.medicao_principal_id } })
        : null;
      if (!principal || principal.status !== "aprovado") {
        throw new ErroNegocio(409, "A medição do parceiro só pode ser aprovada após a aprovação da medição do contratante.");
      }
    }

    await tx.mh3_medicoes.update({
      where: { id },
      data: { status: "aprovado", aprovado_em: new Date(), aprovado_por: ator.nome },
    });

    const vencimento = medicao.data_vencimento ?? medicao.data_medicao;
    if (medicao.papel === "parceiro") {
      await tx.mh3_despesas.create({
        data: {
          descricao: descricaoMedicao(medicao, "Parceiro", medicao.parceiro ?? "").slice(0, 255),
          categoria: "Medição de parceiro",
          fornecedor: medicao.parceiro,
          data_competencia: medicao.data_medicao,
          data_vencimento: vencimento,
          valor: medicao.valor,
          status_disp: "pendente",
          placa: textoPlacas(medicao.placas),
          medicao_id: medicao.id,
          origem: "medicao",
          num_desp: await proximoNumero("DESP", tx),
        },
      });
    } else {
      const cliente = medicao.cliente_id && /^\d+$/.test(medicao.cliente_id)
        ? await tx.mh3_clientes.findUnique({ where: { id: BigInt(medicao.cliente_id) }, select: { nome: true } })
        : null;
      const nomeContratante = medicao.cliente_nome?.trim() || cliente?.nome || medicao.parceiro || "Medição";
      await tx.mh3_contas_receber.create({
        data: {
          id: crypto.randomUUID(),
          numero: await proximoNumero("REC", tx),
          cliente: nomeContratante,
          competencia: (medicao.periodo ?? medicao.data_medicao.toISOString()).slice(0, 7),
          valor_total: medicao.valor,
          status: "pendente",
          observacoes: descricaoMedicao(medicao, "Contratante", nomeContratante),
          data_emissao: medicao.data_medicao,
          data_vencimento: vencimento,
          vencimento_original: vencimento,
          medicao_id: medicao.id,
        },
      });
    }
    await criarDespesaCorretor(tx, medicao);
    return medicao;
  });
  await auditar({
    request,
    acao: "APROVAR",
    modulo: "mh3_medicoes",
    registroId: id,
    descricao: `Medição ${resultado.numero} (${resultado.papel}) aprovada; lançamentos gerados`,
  });
}

/** Remove os lançamentos de uma medição aprovada, desde que nenhum esteja quitado. */
async function removerLancamentos(tx: Tx, medicaoId: bigint, receber: boolean) {
  if (receber) {
    const pagos = await tx.mh3_contas_receber.count({ where: { medicao_id: medicaoId, status: "pago" } });
    if (pagos) throw new ErroNegocio(409, "Existe recebimento já baixado para esta medição. Estorne o recebimento antes de retornar.");
    await tx.mh3_contas_receber.deleteMany({ where: { medicao_id: medicaoId } });
  }
  const despesasPagas = await tx.mh3_despesas.count({
    where: { medicao_id: medicaoId, status_disp: "pago" },
  });
  if (despesasPagas) throw new ErroNegocio(409, "Existe pagamento já baixado para esta medição. Estorne o pagamento antes de retornar.");
  await tx.mh3_despesas.deleteMany({ where: { medicao_id: medicaoId } });
}

export async function retornarMedicao(id: bigint, motivo: string, request?: Request) {
  if (!motivo || motivo.trim().length < 5) {
    throw new ErroNegocio(400, "Informe o motivo do retorno (mínimo 5 caracteres) para a auditoria.");
  }
  const medicao = await prisma.$transaction(async (tx) => {
    const atual = await tx.mh3_medicoes.findUnique({ where: { id } });
    if (!atual) throw new ErroNegocio(404, "Medição não encontrada.");
    if (atual.status !== "aprovado") throw new ErroNegocio(409, "Apenas medições aprovadas podem ser retornadas.");

    if (atual.papel === "contratante") {
      const parceiro = await tx.mh3_medicoes.findFirst({ where: { medicao_principal_id: id, papel: "parceiro" } });
      if (parceiro?.status === "aprovado") {
        await removerLancamentos(tx, parceiro.id, false);
        await tx.mh3_medicoes.update({
          where: { id: parceiro.id },
          data: { status: "aguardando", aprovado_em: null, aprovado_por: null },
        });
      }
      await removerLancamentos(tx, id, true);
    } else {
      await removerLancamentos(tx, id, false);
    }
    await tx.mh3_medicoes.update({
      where: { id },
      data: { status: "aguardando", aprovado_em: null, aprovado_por: null },
    });
    return atual;
  });
  await auditar({
    request,
    acao: "RETORNAR",
    modulo: "mh3_medicoes",
    registroId: id,
    descricao: `Medição ${medicao.numero} (${medicao.papel}) voltou para aguardando. Motivo: ${motivo.trim()}`,
  });
}

export function respostaErro(erro: unknown) {
  if (erro instanceof ErroNegocio) {
    return Response.json({ error: erro.message }, { status: erro.status });
  }
  if (erro instanceof ErroCrud) {
    return Response.json({ error: erro.message }, { status: erro.status });
  }
  console.error("Erro na operação:", erro);
  return Response.json({ error: mensagemPrisma(erro, "Não foi possível concluir a operação.") }, { status: 500 });
}
