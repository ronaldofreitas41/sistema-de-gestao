export type PlacaMedicao = {
  placa: string;
  valor: number;
  valor_calculado?: number;
  dias_trabalhados?: number;
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
    return [{
      placa,
      valor: Number.isFinite(valor) ? valor : 0,
      ...(valorCalculado !== undefined && Number.isFinite(valorCalculado)
        ? { valor_calculado: valorCalculado }
        : {}),
      ...(diasTrabalhados !== undefined && Number.isFinite(diasTrabalhados)
        ? { dias_trabalhados: diasTrabalhados }
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
    if (
      !placa ||
      !Number.isFinite(valor) ||
      valor < 0 ||
      !Number.isFinite(diasTrabalhados) ||
      diasTrabalhados < 0
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
      valor_calculado: calcularValorPlaca(
        valorArredondado,
        tipoCobranca,
        diasMes,
        tipoCobranca === "Valor Mensal" ? diasTrabalhados : horas,
      ),
    };
  });

  const total = Math.round(
    (detalhadas.reduce((soma, item) => soma + item.valor_calculado, 0) + Number.EPSILON) * 100,
  ) / 100;
  return { placas: detalhadas, total, detalhadas: true };
}
