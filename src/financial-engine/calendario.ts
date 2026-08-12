/**
 * Semiannual investor calendar. Single source of truth for payment dates —
 * used by the engine, by the audit layer and by the antecipation rule.
 */

/** Investors are paid every six months: january and july closings. */
export function mesDePagamento(mes: number): number {
  const posicao = ((mes % 12) + 12) % 12;
  if (posicao <= 6) return mes + (6 - posicao);
  return mes + (12 - posicao);
}
