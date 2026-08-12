import { isoDeMesAbsoluto } from "@/utils/date";
import { mesDePagamento } from "./calendario";

/**
 * Antecipation rule (presentation of the schedule, not of the value):
 * every receipt scheduled after the first semiannual payment that follows the
 * last delivery is moved — at nominal value, without discount — to that date.
 * The total per empreendimento never changes; only the payment dates do.
 */

/** Investor receipts already consolidated on semiannual dates, by abs month. */
export type FluxoPorEmpreendimento = Map<string, Map<number, number>>;

export interface ParcelaAntecipada {
  empreendimentoId: string;
  mesOriginalAbs: number;
  dataOriginal: string;
  valor: number;
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
  parcelasMovidas: number;
  parcelas: ParcelaAntecipada[];
}

export interface SaidaAntecipacao {
  fluxo: FluxoPorEmpreendimento;
  antecipacao: ResultadoAntecipacao;
}

function clonar(fluxo: FluxoPorEmpreendimento): FluxoPorEmpreendimento {
  const copia: FluxoPorEmpreendimento = new Map();
  for (const [id, mapa] of fluxo) copia.set(id, new Map(mapa));
  return copia;
}

function ultimoMes(fluxo: FluxoPorEmpreendimento): number | null {
  let fim = Number.NEGATIVE_INFINITY;
  for (const mapa of fluxo.values()) {
    for (const [mes, valor] of mapa) if (valor !== 0 && mes > fim) fim = mes;
  }
  return Number.isFinite(fim) ? fim : null;
}

/**
 * Transforms an already-built investor flow. Never recomputes IPCA, permuta or
 * participation: it only relocates values that are still open after the cut.
 */
export function aplicarAntecipacao(
  fluxoOriginal: FluxoPorEmpreendimento,
  mesesEntregaAbs: number[],
  ativa: boolean,
): SaidaAntecipacao {
  const mesUltimoOriginalAbs = ultimoMes(fluxoOriginal);
  const mesUltimaEntregaAbs = mesesEntregaAbs.length ? Math.max(...mesesEntregaAbs) : null;

  const base: ResultadoAntecipacao = {
    ativa: false,
    mesUltimaEntregaAbs,
    dataUltimaEntrega: mesUltimaEntregaAbs === null ? null : isoDeMesAbsoluto(mesUltimaEntregaAbs),
    dataProximoPagamento:
      mesUltimaEntregaAbs === null ? null : isoDeMesAbsoluto(mesDePagamento(mesUltimaEntregaAbs)),
    mesCorteAbs: null,
    dataCorte: null,
    mesUltimoOriginalAbs,
    dataUltimoOriginal: mesUltimoOriginalAbs === null ? null : isoDeMesAbsoluto(mesUltimoOriginalAbs),
    porEmpreendimento: {},
    totalAntecipado: 0,
    parcelasMovidas: 0,
    parcelas: [],
    valorNormalCorte: 0,
    valorFinalCorte: 0,
  };

  if (!ativa || mesUltimaEntregaAbs === null || mesUltimoOriginalAbs === null) {
    return { fluxo: clonar(fluxoOriginal), antecipacao: base };
  }

  // First semiannual payment after the last delivery, plus one more semester.
  const mesCorteAbs = mesDePagamento(mesUltimaEntregaAbs) + 6;
  const fluxo = clonar(fluxoOriginal);
  const parcelas: ParcelaAntecipada[] = [];
  const porEmpreendimento: Record<string, number> = {};
  let totalAntecipado = 0;
  let valorNormalCorte = 0;

  for (const mapa of fluxo.values()) valorNormalCorte += mapa.get(mesCorteAbs) ?? 0;

  for (const [id, mapa] of fluxo) {
    let antecipado = 0;
    for (const [mes, valor] of [...mapa]) {
      if (mes <= mesCorteAbs || valor === 0) continue;
      antecipado += valor;
      parcelas.push({
        empreendimentoId: id,
        mesOriginalAbs: mes,
        dataOriginal: isoDeMesAbsoluto(mes),
        valor,
      });
      mapa.delete(mes);
    }
    if (antecipado === 0) {
      porEmpreendimento[id] = 0;
      continue;
    }
    mapa.set(mesCorteAbs, (mapa.get(mesCorteAbs) ?? 0) + antecipado);
    porEmpreendimento[id] = antecipado;
    totalAntecipado += antecipado;
  }

  return {
    fluxo,
    antecipacao: {
      ...base,
      ativa: true,
      mesCorteAbs,
      dataCorte: isoDeMesAbsoluto(mesCorteAbs),
      porEmpreendimento,
      totalAntecipado,
      parcelasMovidas: parcelas.length,
      parcelas: parcelas.sort((a, b) => a.mesOriginalAbs - b.mesOriginalAbs),
      valorNormalCorte,
      valorFinalCorte: valorNormalCorte + totalAntecipado,
    },
  };
}
