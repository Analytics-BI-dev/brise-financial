/**
 * Rate conversions. All rates are expressed as decimals (0.045 = 4.5%).
 */

/** Converts an effective annual rate into its equivalent monthly rate. */
export function taxaAnualParaMensal(taxaAnual: number): number {
  return Math.pow(1 + taxaAnual, 1 / 12) - 1;
}

/** Converts an effective monthly rate into its equivalent annual rate. */
export function taxaMensalParaAnual(taxaMensal: number): number {
  return Math.pow(1 + taxaMensal, 12) - 1;
}

/** Compound correction factor for `meses` months at a monthly rate. */
export function fatorCorrecao(taxaMensal: number, meses: number): number {
  return Math.pow(1 + taxaMensal, meses);
}

/** Present value of an amount received in `meses` months. */
export function valorPresente(valor: number, taxaMensal: number, meses: number): number {
  return valor / Math.pow(1 + taxaMensal, meses);
}
