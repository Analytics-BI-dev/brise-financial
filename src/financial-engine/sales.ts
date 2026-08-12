import type { Cenario } from "@/types";
import { MESES_ATE_ENTREGA } from "@/constants";

/** Normalized yearly distribution (always sums to 1 when possible). */
export function distribuicaoNormalizada(cenario: Cenario): number[] {
  const bruto = cenario.distribuicaoAnual.map((v) => (Number.isFinite(v) ? Math.max(0, v) : 0));
  const soma = bruto.reduce((a, b) => a + b, 0);
  if (soma <= 0) return [1 / 3, 1 / 3, 1 / 3];
  return bruto.map((v) => v / soma);
}

/** True when the user-entered distribution already adds up to exactly 100%. */
export function distribuicaoValida(cenario: Cenario): boolean {
  const soma = cenario.distribuicaoAnual.reduce((a, b) => a + (Number(b) || 0), 0);
  return Math.abs(soma - 1) < 0.0005;
}

/**
 * Sales curve: share of the units sold in each month of the construction
 * period. Position `i` is the share sold `i` months after the launch.
 * Each construction year is spread evenly across its 12 months.
 */
export function curvaDeVendas(cenario: Cenario): number[] {
  const anual = distribuicaoNormalizada(cenario);
  const curva: number[] = [];
  for (let mes = 0; mes < MESES_ATE_ENTREGA; mes++) {
    const ano = Math.floor(mes / 12);
    curva.push((anual[ano] ?? 0) / 12);
  }
  return curva;
}
