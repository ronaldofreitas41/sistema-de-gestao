export type Rgb = [number, number, number];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Retorna a cor hex válida ou o padrão. */
export function corHex(valor: unknown, padrao: string): string {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return HEX.test(texto) ? texto : padrao;
}

export function hexParaRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Cor do layout da empresa em RGB (jsPDF). */
export function corEmpresaRgb(valor: unknown, padrao: Rgb): Rgb {
  const hex = corHex(valor, "");
  return hex ? hexParaRgb(hex) : padrao;
}
