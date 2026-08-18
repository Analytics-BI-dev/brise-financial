import type { Cenario, CenarioId, Empreendimento, PremissasGlobais } from "@/types";

export const PREMISSAS_INICIAIS: PremissasGlobais = {
  valorTerreno: 18_750_000,
  valorCaptacao: 18_750_000,
  valorCota: 250_000,
  quantidadeCotas: 4,
  aplicarIpca: false,
  anteciparRecebimentos: false,
  ipcaAnual: 0.045,
  taxaDescontoAnual: 0.12,
  cenarioAtivo: "esperado",
};

/** Construction period: delivery is always launch + 36 months. */
export const MESES_ATE_ENTREGA = 36;

/**
 * Portfolio. Every empreendimento is independent: its own launch date,
 * receipt rule and cash flow.
 */
export const EMPREENDIMENTOS_INICIAIS: Empreendimento[] = [
  {
    id: "brise",
    nome: "Brise",
    numeroUnidades: 358,
    valorMedioUnidade: 95_000,
    percentualPermuta: 0.264,
    dataLancamento: "2025-08",
    regraRecebimento: "brise",
    ativo: true,
  },
  {
    id: "coliv",
    nome: "Coliv",
    numeroUnidades: 268,
    valorMedioUnidade: 333_432.84,
    percentualPermuta: 0.1056,
    dataLancamento: "2028-02",
    regraRecebimento: "coliv",
    ativo: true,
  },
  {
    id: "alento",
    nome: "Alento",
    numeroUnidades: 360,
    valorMedioUnidade: 210_000,
    percentualPermuta: 0.1056,
    dataLancamento: "2027-11",
    regraRecebimento: "antes-da-entrega",
    ativo: true,
  },
  {
    id: "mirada-2",
    nome: "Miradas II",
    numeroUnidades: 320,
    valorMedioUnidade: 185_000,
    percentualPermuta: 0.088,
    dataLancamento: "2028-12",
    regraRecebimento: "antes-da-entrega",
    ativo: true,
  },
  {
    id: "mirada-3",
    nome: "Miradas III",
    numeroUnidades: 320,
    valorMedioUnidade: 185_000,
    percentualPermuta: 0.088,
    dataLancamento: "2028-12",
    regraRecebimento: "antes-da-entrega",
    ativo: true,
  },
];

/**
 * Scenarios only define how the units are absorbed over the three
 * construction years. Each distribution must sum to 100%.
 */
export const CENARIOS_INICIAIS: Record<CenarioId, Cenario> = {
  otimista: {
    id: "otimista",
    nome: "Otimista",
    descricao: "Absorção acelerada nos primeiros anos de obra.",
    distribuicaoAnual: [0.6, 0.3, 0.1],
  },
  esperado: {
    id: "esperado",
    nome: "Esperado",
    descricao: "Ritmo de vendas equilibrado ao longo da obra.",
    distribuicaoAnual: [0.33, 0.33, 0.34],
  },
  pessimista: {
    id: "pessimista",
    nome: "Pessimista",
    descricao: "Absorção lenta, concentrada no fim da obra.",
    distribuicaoAnual: [0.2, 0.3, 0.5],
  },
};

export const CENARIOS_ORDEM: CenarioId[] = ["otimista", "esperado", "pessimista"];

/** Palette slots used to color empreendimentos consistently across charts. */
export const CORES_SERIES = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];
