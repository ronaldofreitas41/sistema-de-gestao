export type PlacaMedicao = {
  placa: string;
  valor: number;
  valor_calculado?: number;
  dias_trabalhados?: number;
  horas_trabalhadas?: number;
  valor_parceiro?: number;
};

export function obterPlacasMedicao(placas: unknown): PlacaMedicao[] {
  if (!Array.isArray(placas)) return [];

  return placas.flatMap((item): PlacaMedicao[] => {
    if (typeof item === "string") {
      return item.trim() ? [{ placa: item, valor: 0 }] : [];
    }
    if (!item || typeof item !== "object") return [];

    const placa = "placa" in item && typeof item.placa === "string"
      ? item.placa.trim()
      : "";
    if (!placa) return [];

    const valor = "valor" in item ? Number(item.valor) : 0;
    const valorCalculado = "valor_calculado" in item
      ? Number(item.valor_calculado)
      : undefined;
    const diasTrabalhados = "dias_trabalhados" in item
      ? Number(item.dias_trabalhados)
      : undefined;
    const horasTrabalhadas = "horas_trabalhadas" in item
      ? Number(item.horas_trabalhadas)
      : undefined;
    const valorParceiro = "valor_parceiro" in item
      ? Number(item.valor_parceiro)
      : undefined;
    return [{
      placa,
      valor: Number.isFinite(valor) ? valor : 0,
      ...(valorCalculado !== undefined && Number.isFinite(valorCalculado)
        ? { valor_calculado: valorCalculado }
        : {}),
      ...(diasTrabalhados !== undefined && Number.isFinite(diasTrabalhados)
        ? { dias_trabalhados: diasTrabalhados }
        : {}),
      ...(horasTrabalhadas !== undefined && Number.isFinite(horasTrabalhadas)
        ? { horas_trabalhadas: horasTrabalhadas }
        : {}),
      ...(valorParceiro !== undefined && Number.isFinite(valorParceiro)
        ? { valor_parceiro: valorParceiro }
        : {}),
    }];
  });
}

export function calcularValorPlaca(
  valor: number,
  tipoCobranca: string,
  diasMes: number,
  diasTrabalhadosOuHoras: number,
): number {
  const total = tipoCobranca === "Valor Mensal"
    ? diasMes > 0 ? valor / diasMes * diasTrabalhadosOuHoras : 0
    : tipoCobranca === "Valor por Hora"
      ? valor * diasTrabalhadosOuHoras
      : valor;

  return Math.round((total + Number.EPSILON) * 100) / 100;
}

export function contarDiasPeriodoMedicao(periodo: string): number | null {
  const intervalo = periodo.match(/^(\d{4}-\d{2}-\d{2})\s*(?:a|até)\s*(\d{4}-\d{2}-\d{2})$/i);
  if (intervalo) {
    const inicio = new Date(`${intervalo[1]}T00:00:00Z`);
    const fim = new Date(`${intervalo[2]}T00:00:00Z`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) return null;
    return Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
  }

  const mes = periodo.match(/^(\d{4})-(\d{2})$/);
  return mes ? new Date(Number(mes[1]), Number(mes[2]), 0).getDate() : null;
}

export function calcularPlacasMedicao(
  placas: unknown,
  tipoCobranca: string,
  diasMes: number,
  horas: number,
  diasTrabalhadosPadrao = 0,
): { placas: Array<string | PlacaMedicao>; total: number; detalhadas: boolean } {
  if (!Array.isArray(placas)) {
    throw new TypeError("A lista de placas é inválida.");
  }

  const somenteLegadas = placas.length === 0 || placas.every((item) => typeof item === "string");
  if (somenteLegadas) {
    return { placas: placas as string[], total: 0, detalhadas: false };
  }

  const detalhadas = placas.map((item) => {
    if (!item || typeof item !== "object" || !("placa" in item) || typeof item.placa !== "string") {
      throw new TypeError("Uma ou mais placas estão inválidas.");
    }

    const placa = item.placa.trim().toUpperCase();
    const valor = "valor" in item ? Number(item.valor) : 0;
    const diasTrabalhados = "dias_trabalhados" in item
      ? Number(item.dias_trabalhados)
      : diasTrabalhadosPadrao;
    const horasTrabalhadas = "horas_trabalhadas" in item
      ? Number(item.horas_trabalhadas)
      : horas;
    if (
      !placa ||
      !Number.isFinite(valor) ||
      valor < 0 ||
      !Number.isFinite(diasTrabalhados) ||
      diasTrabalhados < 0 ||
      !Number.isFinite(horasTrabalhadas) ||
      horasTrabalhadas < 0
    ) {
      throw new TypeError("Informe uma placa e um valor válido para cada veículo.");
    }

    const valorArredondado = Math.round((valor + Number.EPSILON) * 100) / 100;
    return {
      placa,
      valor: valorArredondado,
      ...(tipoCobranca === "Valor Mensal"
        ? { dias_trabalhados: diasTrabalhados }
        : {}),
      ...(tipoCobranca === "Valor por Hora"
        ? { horas_trabalhadas: horasTrabalhadas }
        : {}),
      ...("valor_parceiro" in item && Number.isFinite(Number(item.valor_parceiro))
        ? { valor_parceiro: Number(item.valor_parceiro) }
        : {}),
      valor_calculado: calcularValorPlaca(
        valorArredondado,
        tipoCobranca,
        diasMes,
        tipoCobranca === "Valor Mensal" ? diasTrabalhados : horasTrabalhadas,
      ),
    };
  });

  const total = Math.round(
    (detalhadas.reduce((soma, item) => soma + item.valor_calculado, 0) + Number.EPSILON) * 100,
  ) / 100;
  return { placas: detalhadas, total, detalhadas: true };
}

export type VendaAjuste = { total?: unknown; sinal_medicao?: unknown };

export function ajusteVendas(vendas: unknown): number {
  if (!Array.isArray(vendas)) return 0;
  return vendas.reduce((soma: number, venda: VendaAjuste) => {
    const valor = Number(venda?.total) || 0;
    return soma + (venda?.sinal_medicao === "-" ? -1 : 1) * valor;
  }, 0);
}

const arredondar = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

/**
 * Total da medição: (locação + excedente) − desconto% ± vendas.
 * O desconto incide apenas sobre locação + excedente, nunca sobre as vendas.
 */
export function totalMedicao(
  subtotalPlacas: number,
  excedente: number,
  descontoPercentual: number,
  vendas: unknown,
) {
  const bruto = subtotalPlacas + excedente;
  const desconto = arredondar(bruto * (Math.min(Math.max(descontoPercentual, 0), 100) / 100));
  const vendasValor = arredondar(ajusteVendas(vendas));
  return {
    bruto: arredondar(bruto),
    desconto,
    vendas: vendasValor,
    total: arredondar(bruto - desconto + vendasValor),
  };
}

export const TIPOS_COBRANCA_NOVOS = ["Valor por Hora", "Valor Mensal"] as const;
