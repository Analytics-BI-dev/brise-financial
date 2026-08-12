import { MESES_ATE_ENTREGA } from "@/constants";
import type { Empreendimento } from "@/types";
import { isoDeMesAbsoluto, mesAbsoluto } from "@/utils/date";

/**
 * Core valuation rules of an empreendimento.
 * VGV, permuta and delivery date are always derived — never entered by hand.
 */

export function calcularVgv(e: Empreendimento): number {
  return Math.max(0, e.numeroUnidades) * Math.max(0, e.valorMedioUnidade);
}

export function calcularValorPermuta(e: Empreendimento): number {
  return calcularVgv(e) * Math.max(0, e.percentualPermuta);
}

export function calcularVgvTotal(lista: Empreendimento[]): number {
  return lista.reduce((acc, e) => acc + calcularVgv(e), 0);
}

export function calcularPermutaTotal(lista: Empreendimento[]): number {
  return lista.reduce((acc, e) => acc + calcularValorPermuta(e), 0);
}

/** Delivery is always launch + 36 months. Fixed rule, never editable. */
export function mesDeEntrega(dataLancamento: string): string {
  return isoDeMesAbsoluto(mesAbsoluto(dataLancamento) + MESES_ATE_ENTREGA);
}

/** Investor share of the captação: invested / total available. */
export function calcularParticipacao(valorInvestido: number, valorCaptacao: number): number {
  if (valorCaptacao <= 0) return 0;
  return valorInvestido / valorCaptacao;
}

export function calcularValorInvestido(valorCota: number, quantidadeCotas: number): number {
  return Math.max(0, valorCota) * Math.max(0, quantidadeCotas);
}
