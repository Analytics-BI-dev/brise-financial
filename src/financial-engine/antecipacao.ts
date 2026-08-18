import { isoDeMesAbsoluto } from "@/utils/date";
import { fatorCorrecao } from "./rates";
import { mesDePagamento } from "./calendario";

/**
 * Antecipation rule.
 *
 * Date: the first semiannual payment after the last delivery, plus six months.
 *
 * Money: every receipt open after that date is brought forward keeping its
 * BASE value and receiving IPCA only until the antecipation date. The monetary
 * correction that would accrue between the antecipation and the original date
 * is given up by the investor — so, with IPCA on, the antecipated flow is
 * smaller than the original one.
 */

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
  /** What is received on the antecipation date (IPCA until the cut). */
  valorAntecipado: number;
  /** Correction given up: original − antecipated. */
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
  /** Future IPCA given up by antecipating. */
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
): SaidaAntecipacao {
  const mesUltimaEntregaAbs = mesesEntregaAbs.length ? Math.max(...mesesEntregaAbs) : null;
  let mesUltimoOriginalAbs: number | null = null;
  let totalOriginal = 0;
  for (const r of recebimentos) {
    const valor = valorNoLimite(r, ipcaMensal);
    if (valor === 0) continue;
    totalOriginal += valor;
    if (mesUltimoOriginalAbs === null || r.mesPagamentoAbs > mesUltimoOriginalAbs) {
      mesUltimoOriginalAbs = r.mesPagamentoAbs;
    }
  }

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
  let valorNormalCorte = 0;
  let totalAjustado = 0;

  for (const r of recebimentos) {
    const antecipado = r.mesPagamentoAbs > mesCorteAbs;
    const mesFinal = antecipado ? mesCorteAbs : r.mesPagamentoAbs;
    const valor = valorNoLimite(r, ipcaMensal, antecipado ? mesCorteAbs : undefined);

    ajustados.push({ recebimento: r, mesPagamentoAbs: mesFinal, valor, antecipado });
    if (valor !== 0) acumular(fluxo, r.empreendimentoId, mesFinal, valor);
    totalAjustado += valor;

    if (!antecipado) {
      if (r.mesPagamentoAbs === mesCorteAbs) valorNormalCorte += valor;
      continue;
    }

    const original = valorNoLimite(r, ipcaMensal);
    totalAntecipado += valor;
    totalOriginalDosAntecipados += original;
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
        valorAntecipado: 0,
        correcaoRetirada: 0,
        valor: 0,
      } satisfies ParcelaAntecipada);
    atual.valorBase += r.valorBase;
    atual.valorOriginalCorrigido += original;
    atual.valorAntecipado += valor;
    atual.correcaoRetirada += original - valor;
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
      totalCorrecaoRetirada: totalOriginalDosAntecipados - totalAntecipado,
      totalAjustado,
      parcelasMovidas: parcelas.length,
      parcelas,
      valorNormalCorte,
      valorFinalCorte: valorNormalCorte + totalAntecipado,
    },
  };
}
