import type { ResultadoAntecipacao } from "@/financial-engine/antecipacao";

/**
 * Domain types for the real-estate barter (permuta) investment simulator.
 * These are pure data contracts — no logic lives here.
 */

/**
 * Receipt rule of an empreendimento. Each rule is implemented in
 * `src/financial-engine/rules.ts` and can evolve independently.
 */
export type RegraRecebimentoId =
  /** 100% received before delivery, spread from the sale to the month before delivery. */
  | "antes-da-entrega"
  /** 10% entrada + 20% installments until delivery + 70% at delivery. */
  | "coliv"
  /** A share of the units is paid in cash; the rest is financed over many months. */
  | "brise";

export interface Empreendimento {
  id: string;
  nome: string;
  numeroUnidades: number;
  /** Average sale price of one unit, in BRL, at the IPCA base month. */
  valorMedioUnidade: number;
  /** Share of the VGV paid to the land owners as permuta. 0..1 */
  percentualPermuta: number;
  /** ISO month, format YYYY-MM. Delivery is always launch + 36 months. */
  dataLancamento: string;
  /** Which receipt rule applies to every unit of this empreendimento. */
  regraRecebimento: RegraRecebimentoId;
  ativo: boolean;
}

export type CenarioId = "otimista" | "esperado" | "pessimista";

export interface Cenario {
  id: CenarioId;
  nome: string;
  descricao: string;
  /** Share of the units sold in each of the 3 construction years. Sums to 1. */
  distribuicaoAnual: [number, number, number];
}

export interface PremissasGlobais {
  valorTerreno: number;
  valorCaptacao: number;
  valorCota: number;
  quantidadeCotas: number;
  aplicarIpca: boolean;
  /** Moves every receipt open after the last delivery to the next payment. */
  anteciparRecebimentos: boolean;
  /** Annual IPCA, e.g. 0.045 for 4.5%. */
  ipcaAnual: number;
  /** Annual discount rate used for NPV / discounted cash flow. */
  taxaDescontoAnual: number;
  cenarioAtivo: CenarioId;
}

/** One month of the consolidated investor cash flow. */
export interface FluxoMensal {
  /** Months elapsed since the simulation start (0-based). */
  indice: number;
  /** ISO month, YYYY-MM. */
  data: string;
  /** Investor receipts in the month, per empreendimento id. */
  porEmpreendimento: Record<string, number>;
  /** Investor nominal receipt in the month. */
  receita: number;
  /** Investor receipt already corrected (equals receita — IPCA acts on sales). */
  receitaCorrigida: number;
  /** Present value of receitaCorrigida. */
  valorDescontado: number;
  /** Running sum of receitaCorrigida. */
  acumulado: number;
  /** Running sum of receitaCorrigida minus the invested amount. */
  saldo: number;
}

export interface FluxoAnual {
  ano: number;
  receita: number;
  receitaCorrigida: number;
  valorDescontado: number;
  acumulado: number;
}

export interface ResumoEmpreendimento {
  id: string;
  nome: string;
  /** Realized VGV: sum of every sale at its IPCA-corrected price. */
  vgv: number;
  valorPermuta: number;
  /** Total the investor actually receives from this empreendimento. */
  retornoInvestidor: number;
  dataLancamento: string;
  /** ISO month of the delivery (launch + 36 months). */
  dataEntrega: string;
  numeroUnidades: number;
}

export interface IndicadoresInvestimento {
  valorInvestido: number;
  participacao: number;
  valorProjetado: number;
  lucro: number;
  roi: number;
  /** Annualized IRR. null when it cannot be computed. */
  tir: number | null;
  /** Monthly IRR from the exact same flow used for `tir`. */
  tirMensal: number | null;
  /** Months until the accumulated return covers the investment. null if never. */
  paybackMeses: number | null;
  /** Months from the start of the simulation until the last receipt. */
  prazoRecebimentoMeses: number | null;
  vpl: number;
  multiplo: number;
  duracaoMeses: number;
}

/** A visual milestone over the accumulated flow (payback, 50/80/100%). */
export interface MarcoRetorno {
  tipo: "payback" | "percentual";
  rotulo: string;
  /** ISO month, YYYY-MM. */
  data: string;
  /** Index within fluxoMensal. */
  indice: number;
  /** Share of the total return already received at this point. 0..1 */
  percentual: number;
  acumulado: number;
}

/** Memory of the IRR: it starts today and consumes the final investor flow. */
export interface DetalheTir {
  /** ISO day (YYYY-MM-DD) used as t = 0 of the IRR. */
  dataInicio: string;
  valorInvestido: number;
  quantidadeRecebimentos: number;
  totalRecebido: number;
  dataPrimeiroRecebimento: string | null;
  dataUltimoRecebimento: string | null;
  tirAnual: number | null;
  tirMensal: number | null;
}

export interface ResultadoSimulacao {
  indicadores: IndicadoresInvestimento;
  /** Memory of the IRR calculation (start date, flows, resulting rates). */
  tirDetalhe: DetalheTir;
  /** Memory of the antecipation transformation applied to the flow. */
  antecipacao: ResultadoAntecipacao;
  fluxoMensal: FluxoMensal[];
  fluxoAnual: FluxoAnual[];
  marcos: MarcoRetorno[];
  empreendimentos: ResumoEmpreendimento[];
  totais: {
    vgvTotal: number;
    permutaTotal: number;
    receitaTotal: number;
    receitaCorrigidaTotal: number;
    descontadoTotal: number;
  };
}
