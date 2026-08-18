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

/** Absolute month (year*12 + monthIndex) of the current date. */
export function mesAtualAbs(hoje: Date = new Date()): number {
  return hoje.getFullYear() * 12 + hoje.getMonth();
}

/**
 * Investor entry: the investment happens today, so nothing generated before
 * it can be paid in the past. Every receipt older than the investor's first
 * semiannual closing is accumulated into that closing.
 */
export function mesPagamentoInvestidor(mesGeracaoAbs: number, mesEntradaAbs: number): number {
  return Math.max(mesDePagamento(mesGeracaoAbs), mesDePagamento(mesEntradaAbs));
}
