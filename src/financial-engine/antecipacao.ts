import { isoDeMesAbsoluto } from "@/utils/date";
import { fatorCorrecao } from "./rates";
import { mesDePagamento } from "./calendario";

/**
 * Antecipation rule.
 *
 * Date: the first semiannual payment after the last delivery, plus six months.
 *
 * Money: every receipt open after that date is taken WITHOUT IPCA (base value)
 * and split proportionally between capital and profit, using the whole flow
 * without IPCA as reference:
 *   % capital = valor investido / retorno total sem IPCA
 *   % lucro   = 1 − % capital
 * On the antecipation date the investor gets 100% of the capital and only 50%
 * of the profit. The remaining profit is given up and never appears again.
 * Receipts on or before the antecipation date are untouched.
 */

/** Share of the profit component effectively paid on the antecipation date. */
export const PERCENTUAL_ANTECIPACAO = 0.5;


/** One investor receipt, still expressed as base value + indexation rule. */
export interface RecebimentoInvestidor {
  empreendimentoId: string;
  /** Absolute month of the sale that generated the receipt. */
  mesVendaAbs: number;
  /** Absolute month in which the buyer pays (before semiannual bucketing). */
  mesGeracaoAbs: number;
  /** Semiannual closing month in which the investor is paid. */
  mesPagamentoAbs: number;
  /** Investor share already applied, priced at the sale month. */
  valorBase: number;
  /** Whether IPCA accrues between the sale and the receipt (Brise / Coliv). */
  indexado: boolean;
}

/** Investor receipts already consolidated on semiannual dates, by abs month. */
export type FluxoPorEmpreendimento = Map<string, Map<number, number>>;

/** Value of a receipt when the correction stops at `mesLimite`. */
export function valorNoLimite(
  r: RecebimentoInvestidor,
  ipcaMensal: number,
  mesLimite: number = Number.POSITIVE_INFINITY,
): number {
  if (!r.indexado || ipcaMensal === 0) return r.valorBase;
  const meses = Math.max(0, Math.min(r.mesGeracaoAbs, mesLimite) - r.mesVendaAbs);
  return r.valorBase * fatorCorrecao(ipcaMensal, meses);
}

export interface ParcelaAntecipada {
  empreendimentoId: string;
  mesOriginalAbs: number;
  dataOriginal: string;
  /** Base value, before any IPCA. */
  valorBase: number;
  /** What would be received on the original date (IPCA until then). */
  valorOriginalCorrigido: number;
  /** Capital component of the base value (paid in full). */
  capital: number;
  /** Profit component of the base value. */
  lucro: number;
  /** Profit effectively paid (50% of `lucro`). */
  lucroPago: number;

  /** What is received on the antecipation date (50% of the corrected value). */
  valorAntecipado: number;
  /** Value given up: original − antecipated (the other 50%). */
  valorRenunciado: number;
  /** Kept for compatibility: same as valorRenunciado. */
  correcaoRetirada: number;
  /** Kept for compatibility: the value effectively antecipated. */
  valor: number;
}

/** A receipt after the antecipation: final payment month and final value. */
export interface RecebimentoAjustado {
  recebimento: RecebimentoInvestidor;
  mesPagamentoAbs: number;
  valor: number;
  antecipado: boolean;
}

export interface ResultadoAntecipacao {
  ativa: boolean;
  /** Abs month of the last delivery among the active empreendimentos. */
  mesUltimaEntregaAbs: number | null;
  dataUltimaEntrega: string | null;
  /** First semiannual payment after the last delivery, always computed. */
  dataProximoPagamento: string | null;
  /** Abs month of the payment that concentrates the antecipated receipts. */
  mesCorteAbs: number | null;
  dataCorte: string | null;
  /** Ordinary receipt already scheduled on the cut date. */
  valorNormalCorte: number;
  /** Ordinary receipt + everything antecipated to the cut date. */
  valorFinalCorte: number;
  /** Last payment date of the original (non antecipated) schedule. */
  dataUltimoOriginal: string | null;
  mesUltimoOriginalAbs: number | null;
  porEmpreendimento: Record<string, number>;
  totalAntecipado: number;
  /** Sum of what those receipts would be worth on their original dates. */
  totalOriginalDosAntecipados: number;
  /** Share of the profit component paid on the antecipation date (0.5). */
  percentual: number;
  /** Whole flow measured without any IPCA — reference of the capital/profit split. */
  retornoTotalSemIpca: number;
  /** valor investido / retorno total sem IPCA (capped at 1). */
  percentualCapital: number;
  /** 1 − percentualCapital. */
  percentualLucro: number;
  /** Effective factor applied to the future base flow: capital + 50% profit. */
  fatorAntecipacao: number;
  /** Sum of the future receipts without IPCA. */
  totalBaseFuturo: number;
  /** Capital component of the future receipts (paid in full). */
  totalCapitalFuturo: number;
  /** Profit component of the future receipts (only 50% is paid). */
  totalLucroFuturo: number;
  /** Value given up by antecipating. */
  totalRenunciado: number;
  /** Kept for compatibility: same as totalRenunciado. */
  totalCorrecaoRetirada: number;

  /** Total of the whole flow without antecipation. */
  totalOriginal: number;
  /** Total of the whole flow with antecipation. */
  totalAjustado: number;
  parcelasMovidas: number;
  parcelas: ParcelaAntecipada[];
}

export interface SaidaAntecipacao {
  fluxo: FluxoPorEmpreendimento;
  ajustados: RecebimentoAjustado[];
  antecipacao: ResultadoAntecipacao;
}

/** Antecipation date: first payment after the last delivery, plus 6 months. */
export function mesDeAntecipacao(mesesEntregaAbs: number[]): number | null {
  if (!mesesEntregaAbs.length) return null;
  return mesDePagamento(Math.max(...mesesEntregaAbs)) + 6;
}

function acumular(fluxo: FluxoPorEmpreendimento, id: string, mes: number, valor: number) {
  const mapa = fluxo.get(id) ?? new Map<number, number>();
  mapa.set(mes, (mapa.get(mes) ?? 0) + valor);
  fluxo.set(id, mapa);
}

/**
 * Transforms an already-built investor flow. Never recomputes sales, permuta
 * or participation: it only relocates receipts and drops the future IPCA.
 */
export function aplicarAntecipacao(
  recebimentos: RecebimentoInvestidor[],
  mesesEntregaAbs: number[],
  ativa: boolean,
  ipcaMensal: number,
  valorInvestido = 0,
): SaidaAntecipacao {
  const mesUltimaEntregaAbs = mesesEntregaAbs.length ? Math.max(...mesesEntregaAbs) : null;
  let mesUltimoOriginalAbs: number | null = null;
  let totalOriginal = 0;
  // Reference of the capital/profit split: the whole flow with no IPCA at all.
  let retornoTotalSemIpca = 0;
  for (const r of recebimentos) {
    retornoTotalSemIpca += r.valorBase;
    const valor = valorNoLimite(r, ipcaMensal);
    if (valor === 0) continue;
    totalOriginal += valor;
    if (mesUltimoOriginalAbs === null || r.mesPagamentoAbs > mesUltimoOriginalAbs) {
      mesUltimoOriginalAbs = r.mesPagamentoAbs;
    }
  }

  const percentualCapital =
    retornoTotalSemIpca > 0 ? Math.min(1, Math.max(0, valorInvestido) / retornoTotalSemIpca) : 1;
  const percentualLucro = 1 - percentualCapital;
  const fatorAntecipacao = percentualCapital + percentualLucro * PERCENTUAL_ANTECIPACAO;

  const base: ResultadoAntecipacao = {
    ativa: false,
    mesUltimaEntregaAbs,
    dataUltimaEntrega: mesUltimaEntregaAbs === null ? null : isoDeMesAbsoluto(mesUltimaEntregaAbs),
    dataProximoPagamento:
      mesUltimaEntregaAbs === null ? null : isoDeMesAbsoluto(mesDePagamento(mesUltimaEntregaAbs)),
    mesCorteAbs: null,
    dataCorte: null,
    mesUltimoOriginalAbs,
    dataUltimoOriginal:
      mesUltimoOriginalAbs === null ? null : isoDeMesAbsoluto(mesUltimoOriginalAbs),
    porEmpreendimento: {},
    totalAntecipado: 0,
    totalOriginalDosAntecipados: 0,
    percentual: PERCENTUAL_ANTECIPACAO,
    retornoTotalSemIpca,
    percentualCapital,
    percentualLucro,
    fatorAntecipacao,
    totalBaseFuturo: 0,
    totalCapitalFuturo: 0,
    totalLucroFuturo: 0,
    totalRenunciado: 0,
    totalCorrecaoRetirada: 0,
    totalOriginal,
    totalAjustado: totalOriginal,
    parcelasMovidas: 0,
    parcelas: [],
    valorNormalCorte: 0,
    valorFinalCorte: 0,
  };


  const mesCorteAbs = mesDeAntecipacao(mesesEntregaAbs);

  if (!ativa || mesCorteAbs === null || mesUltimoOriginalAbs === null) {
    const fluxo: FluxoPorEmpreendimento = new Map();
    const ajustados: RecebimentoAjustado[] = [];
    for (const r of recebimentos) {
      const valor = valorNoLimite(r, ipcaMensal);
      ajustados.push({
        recebimento: r,
        mesPagamentoAbs: r.mesPagamentoAbs,
        valor,
        antecipado: false,
      });
      if (valor !== 0) acumular(fluxo, r.empreendimentoId, r.mesPagamentoAbs, valor);
    }
    return { fluxo, ajustados, antecipacao: base };
  }

  const fluxo: FluxoPorEmpreendimento = new Map();
  const ajustados: RecebimentoAjustado[] = [];
  const agrupadas = new Map<string, ParcelaAntecipada>();
  const porEmpreendimento: Record<string, number> = {};
  let totalAntecipado = 0;
  let totalOriginalDosAntecipados = 0;
  let totalBaseFuturo = 0;
  let valorNormalCorte = 0;
  let totalAjustado = 0;

  for (const r of recebimentos) {
    const antecipado = r.mesPagamentoAbs > mesCorteAbs;
    const mesFinal = antecipado ? mesCorteAbs : r.mesPagamentoAbs;
    const integral = valorNoLimite(r, ipcaMensal);
    // Antecipated receipts ignore IPCA entirely: base value split into
    // capital (100% paid) + profit (only 50% paid).
    const valor = antecipado ? r.valorBase * fatorAntecipacao : integral;

    ajustados.push({ recebimento: r, mesPagamentoAbs: mesFinal, valor, antecipado });
    if (valor !== 0) acumular(fluxo, r.empreendimentoId, mesFinal, valor);
    totalAjustado += valor;

    if (!antecipado) {
      if (r.mesPagamentoAbs === mesCorteAbs) valorNormalCorte += valor;
      continue;
    }

    const original = integral;
    totalAntecipado += valor;
    totalOriginalDosAntecipados += original;
    totalBaseFuturo += r.valorBase;
    porEmpreendimento[r.empreendimentoId] = (porEmpreendimento[r.empreendimentoId] ?? 0) + valor;

    const chave = `${r.empreendimentoId}|${r.mesPagamentoAbs}`;
    const atual =
      agrupadas.get(chave) ??
      ({
        empreendimentoId: r.empreendimentoId,
        mesOriginalAbs: r.mesPagamentoAbs,
        dataOriginal: isoDeMesAbsoluto(r.mesPagamentoAbs),
        valorBase: 0,
        valorOriginalCorrigido: 0,
        capital: 0,
        lucro: 0,
        lucroPago: 0,
        valorAntecipado: 0,
        valorRenunciado: 0,
        correcaoRetirada: 0,
        valor: 0,
      } satisfies ParcelaAntecipada);
    atual.valorBase += r.valorBase;
    atual.valorOriginalCorrigido += original;
    atual.capital += r.valorBase * percentualCapital;
    atual.lucro += r.valorBase * percentualLucro;
    atual.lucroPago += r.valorBase * percentualLucro * PERCENTUAL_ANTECIPACAO;
    atual.valorAntecipado += valor;
    atual.valorRenunciado += original - valor;
    atual.correcaoRetirada = atual.valorRenunciado;
    atual.valor = atual.valorAntecipado;
    agrupadas.set(chave, atual);
  }

  for (const id of new Set(recebimentos.map((r) => r.empreendimentoId))) {
    porEmpreendimento[id] = porEmpreendimento[id] ?? 0;
  }

  const parcelas = [...agrupadas.values()].sort((a, b) => a.mesOriginalAbs - b.mesOriginalAbs);

  return {
    fluxo,
    ajustados,
    antecipacao: {
      ...base,
      ativa: true,
      mesCorteAbs,
      dataCorte: isoDeMesAbsoluto(mesCorteAbs),
      porEmpreendimento,
      totalAntecipado,
      totalOriginalDosAntecipados,
      percentual: PERCENTUAL_ANTECIPACAO,
      totalBaseFuturo,
      totalCapitalFuturo: totalBaseFuturo * percentualCapital,
      totalLucroFuturo: totalBaseFuturo * percentualLucro,
      totalRenunciado: totalOriginalDosAntecipados - totalAntecipado,
      totalCorrecaoRetirada: totalOriginalDosAntecipados - totalAntecipado,
      totalAjustado,
      parcelasMovidas: parcelas.length,
      parcelas,
      valorNormalCorte,
      valorFinalCorte: valorNormalCorte + totalAntecipado,
    },

  };
}
