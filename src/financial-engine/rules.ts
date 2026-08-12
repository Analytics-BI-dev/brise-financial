import type { RegraRecebimentoId } from "@/types";

/**
 * Receipt rules. Each empreendimento has its own rule, isolated here so a
 * future change touches a single function and propagates to the whole app.
 *
 * All rules receive one monthly batch of sales and return the receipts of
 * that batch, keyed by the month offset counted from the LAUNCH month.
 *
 * `detalharLote` is the single source of truth: it returns every receipt
 * component (cash, down payment, installment, delivery) with its label, and
 * `recebimentosDoLote` is just the sum of those components. The audit page
 * consumes the detailed form so documentation can never diverge from code.
 */

export interface LoteVenda {
  /** Month of the sale, counted from the launch (0 = launch month). */
  mesVenda: number;
  /** Units sold in that month (can be fractional before rounding). */
  unidades: number;
  /** Sale price of one unit at the sale month (already IPCA-corrected). */
  valorUnitario: number;
  /** Delivery month, counted from the launch (always 36). */
  mesEntrega: number;
}

/** Brise: share of the monthly units paid fully in cash. */
export const BRISE_UNIDADES_A_VISTA = 0.1;
/** Brise: financing term, in months, of the remaining units. */
export const BRISE_PARCELAS = 180;

/** Coliv: 10% entrada, 20% parcelado até a entrega, 70% na entrega. */
export const COLIV_ENTRADA = 0.1;
export const COLIV_PARCELADO = 0.2;
export const COLIV_ENTREGA = 0.7;

export type TipoComponente = "a-vista" | "entrada" | "parcela" | "entrega";

export interface ComponenteRecebimento {
  tipo: TipoComponente;
  /** Month offset counted from the LAUNCH month. */
  offset: number;
  valor: number;
}

export interface DetalheLote {
  regra: RegraRecebimentoId;
  componentes: ComponenteRecebimento[];
  /** Intermediate numbers of the rule, exposed for auditing. */
  meta: Record<string, number>;
}

type Recebimentos = Map<number, number>;

/** 100% received before the delivery, spread from the sale month onwards. */
function antesDaEntrega(lote: LoteVenda): DetalheLote {
  const componentes: ComponenteRecebimento[] = [];
  const total = lote.unidades * lote.valorUnitario;
  const meses = Math.max(1, lote.mesEntrega - lote.mesVenda);
  const parcela = total / meses;
  for (let i = 0; i < meses; i++) {
    componentes.push({ tipo: "parcela", offset: lote.mesVenda + i, valor: parcela });
  }
  return {
    regra: "antes-da-entrega",
    componentes,
    meta: {
      total,
      meses,
      parcela,
      primeiroMes: lote.mesVenda,
      ultimoMes: lote.mesVenda + meses - 1,
    },
  };
}

/**
 * Coliv: every unit has its own schedule — 10% at the sale, 20% split evenly
 * between the sale and the delivery, 70% at the delivery. A unit sold early
 * therefore has more (and smaller) installments than a late one.
 */
function coliv(lote: LoteVenda): DetalheLote {
  const componentes: ComponenteRecebimento[] = [];
  const total = lote.unidades * lote.valorUnitario;
  const meses = Math.max(0, lote.mesEntrega - lote.mesVenda - 1);

  const entrada = total * COLIV_ENTRADA;
  const parcelado = total * COLIV_PARCELADO;
  const naEntrega = total * COLIV_ENTREGA;

  componentes.push({ tipo: "entrada", offset: lote.mesVenda, valor: entrada });

  let parcela = 0;
  if (meses === 0) {
    parcela = parcelado;
    componentes.push({ tipo: "parcela", offset: lote.mesVenda, valor: parcelado });
  } else {
    parcela = parcelado / meses;
    for (let i = 1; i <= meses; i++) {
      componentes.push({ tipo: "parcela", offset: lote.mesVenda + i, valor: parcela });
    }
  }

  componentes.push({ tipo: "entrega", offset: lote.mesEntrega, valor: naEntrega });

  return {
    regra: "coliv",
    componentes,
    meta: { total, entrada, parcelado, naEntrega, meses, parcela, mesEntrega: lote.mesEntrega },
  };
}

/**
 * Brise: the SPLIT IS BY UNIT, not by value. Each month a slice of the units
 * is sold in cash (received in full at the sale) and the remaining units are
 * financed over BRISE_PARCELAS months.
 */
function brise(lote: LoteVenda): DetalheLote {
  const componentes: ComponenteRecebimento[] = [];
  const aVista = lote.unidades * BRISE_UNIDADES_A_VISTA;
  const financiadas = lote.unidades - aVista;
  const valorAVista = aVista * lote.valorUnitario;
  const valorFinanciado = financiadas * lote.valorUnitario;

  componentes.push({ tipo: "a-vista", offset: lote.mesVenda, valor: valorAVista });

  const parcela = valorFinanciado / BRISE_PARCELAS;
  for (let i = 0; i < BRISE_PARCELAS; i++) {
    componentes.push({ tipo: "parcela", offset: lote.mesVenda + i, valor: parcela });
  }

  return {
    regra: "brise",
    componentes,
    meta: {
      total: lote.unidades * lote.valorUnitario,
      unidadesAVista: aVista,
      unidadesFinanciadas: financiadas,
      valorAVista,
      valorFinanciado,
      parcela,
      prazo: BRISE_PARCELAS,
      primeiroMes: lote.mesVenda,
      ultimoMes: lote.mesVenda + BRISE_PARCELAS - 1,
    },
  };
}

const REGRAS: Record<RegraRecebimentoId, (lote: LoteVenda) => DetalheLote> = {
  "antes-da-entrega": antesDaEntrega,
  coliv,
  brise,
};

const VAZIO: DetalheLote = { regra: "antes-da-entrega", componentes: [], meta: {} };

/** Full breakdown of one monthly sales batch — the audit view of a rule. */
export function detalharLote(regra: RegraRecebimentoId, lote: LoteVenda): DetalheLote {
  if (lote.unidades <= 0 || lote.valorUnitario <= 0) return VAZIO;
  return (REGRAS[regra] ?? antesDaEntrega)(lote);
}

export function recebimentosDoLote(regra: RegraRecebimentoId, lote: LoteVenda): Recebimentos {
  const mapa: Recebimentos = new Map();
  for (const c of detalharLote(regra, lote).componentes) {
    if (c.valor === 0) continue;
    mapa.set(c.offset, (mapa.get(c.offset) ?? 0) + c.valor);
  }
  return mapa;
}

export const ROTULOS_REGRA: Record<RegraRecebimentoId, string> = {
  "antes-da-entrega": "100% recebido antes da entrega",
  coliv: "10% entrada · 20% até a entrega · 70% na entrega",
  brise: "10% das unidades à vista · demais financiadas em 180 meses",
};

export const DESCRICAO_REGRA: Record<RegraRecebimentoId, string> = {
  "antes-da-entrega":
    "O valor da unidade é recebido integralmente durante o período entre a venda e a entrega.",
  coliv:
    "Cada unidade vendida gera 10% de entrada, 20% parcelados durante o período restante da obra e 70% na entrega.",
  brise:
    "10% das unidades vendidas são consideradas vendas integralmente à vista. As outras 90% das unidades são financiadas integralmente em 180 meses. Não é 10% do valor de cada unidade.",
};
