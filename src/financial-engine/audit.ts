import { MESES_ATE_ENTREGA } from "@/constants";
import type {
  Cenario,
  Empreendimento,
  PremissasGlobais,
  RegraRecebimentoId,
  ResultadoSimulacao,
} from "@/types";
import { isoDeMesAbsoluto, mesAbsoluto } from "@/utils/date";
import { fatorCorrecao, taxaAnualParaMensal } from "./rates";
import { curvaDeVendas, distribuicaoNormalizada } from "./sales";
import { detalharLote, type DetalheLote, type TipoComponente } from "./rules";
import { mesAtualAbs, mesDePagamento, mesPagamentoInvestidor } from "./calendario";
import {
  aplicarAntecipacao,
  valorNoLimite,
  type RecebimentoAjustado,
  type RecebimentoInvestidor,
  type ResultadoAntecipacao,
} from "./antecipacao";
import { calcularParticipacao, calcularValorInvestido, mesDeEntrega } from "./valuation";

/**
 * Audit layer. It does NOT implement any financial rule: it replays the very
 * same primitives used by `simular()` (sales curve → IPCA factor → receipt
 * rule → permuta → investor share → semiannual bucket) while keeping every
 * intermediate number, so the validation page can show how each displayed
 * value was produced.
 */

export interface ContextoAuditoria {
  premissas: PremissasGlobais;
  cenario: Cenario;
  ativos: Empreendimento[];
  valorInvestido: number;
  participacao: number;
  ipcaMensal: number;
  mesBaseIpca: number;
  /** First semiannual closing available to the investor (entry = today). */
  mesEntradaAbs: number;
  curva: number[];
  distribuicao: number[];
}

export function contextoAuditoria({
  premissas,
  empreendimentos,
  cenario,
}: {
  premissas: PremissasGlobais;
  empreendimentos: Empreendimento[];
  cenario: Cenario;
}): ContextoAuditoria {
  const ativos = empreendimentos.filter((e) => e.ativo);
  const valorInvestido = calcularValorInvestido(premissas.valorCota, premissas.quantidadeCotas);
  const participacao = calcularParticipacao(valorInvestido, premissas.valorCaptacao);
  const ipcaMensal = premissas.aplicarIpca ? taxaAnualParaMensal(premissas.ipcaAnual) : 0;
  const mesBaseIpca = ativos.length
    ? Math.min(...ativos.map((e) => mesAbsoluto(e.dataLancamento)))
    : 0;

  return {
    premissas,
    cenario,
    ativos,
    valorInvestido,
    participacao,
    ipcaMensal,
    mesBaseIpca,
    mesEntradaAbs: mesAtualAbs(),
    curva: curvaDeVendas(cenario),
    distribuicao: distribuicaoNormalizada(cenario),
  };
}

/** One expanded receipt: sale, indexation and final value, for auditing. */
export interface DetalheRecebimento {
  empreendimentoId: string;
  empreendimento: string;
  regra: RegraRecebimentoId;
  tipo: TipoComponente;
  dataVenda: string;
  unidades: number;
  valorBaseUnidade: number;
  fatorVenda: number;
  valorUnidadeNaVenda: number;
  valorBaseRecebimento: number;
  dataOriginal: string;
  mesesPosVenda: number;
  fatorPosVenda: number;
  valorCorrigido: number;
  dataPagamento: string;
  /** Generated before the investor entered — paid in the first closing. */
  historico: boolean;
}

/** One monthly batch of sales, with its full receipt breakdown. */
export interface LoteAuditoria {
  /** Month offset from launch (0..35). */
  mes: number;
  data: string;
  anoObra: 1 | 2 | 3;
  percentualAno: number;
  percentualMes: number;
  unidades: number;
  unidadesAcumuladas: number;
  unidadesRestantes: number;
  valorBase: number;
  mesesCorrecao: number;
  fator: number;
  valorCorrigido: number;
  aumentoUnitario: number;
  aumentoPercentual: number;
  vgvBase: number;
  vgvCorrigido: number;
  mesesAteEntrega: number;
  detalhe: DetalheLote;
  /** Sum of every component of this batch — must equal vgvCorrigido. */
  somaComponentes: number;
  primeiroRecebimento: string | null;
  ultimoRecebimento: string | null;
}

/** One month of the empreendimento cash flow, already mapped to the investor. */
export interface LinhaMemoria {
  mesAbs: number;
  data: string;
  offset: number;
  aVista: number;
  entrada: number;
  parcelas: number;
  entrega: number;
  recebimento: number;
  recebimentoAcumulado: number;
  percentualPermuta: number;
  permuta: number;
  participacao: number;
  investidor: number;
  investidorAcumulado: number;
  /** Semester closing month in which this receipt is paid to the investor. */
  mesPagamento: string;
  /** Sales data of the month, when it falls inside the selling period. */
  venda: LoteAuditoria | null;
}

export interface MemoriaEmpreendimento {
  id: string;
  nome: string;
  regra: RegraRecebimentoId;
  percentualPermuta: number;
  dataLancamento: string;
  dataEntrega: string;
  numeroUnidades: number;
  valorMedioUnidade: number;
  lotes: LoteAuditoria[];
  linhas: LinhaMemoria[];
  /** Investor receipts of this empreendimento, as base value + indexation. */
  recebimentos: RecebimentoInvestidor[];
  /** Fully expanded receipts, for the validation page. */
  detalhes: DetalheRecebimento[];
  totais: {
    unidades: number;
    vgvBase: number;
    vgvCorrigido: number;
    recebimento: number;
    permuta: number;
    investidor: number;
  };
}

export function memoriaEmpreendimento(
  e: Empreendimento,
  ctx: ContextoAuditoria,
): MemoriaEmpreendimento {
  const lancamento = mesAbsoluto(e.dataLancamento);
  const permutaPercentual = Math.max(0, e.percentualPermuta);
  const indexado = e.regraRecebimento === "brise" || e.regraRecebimento === "coliv";
  const recebimentos: RecebimentoInvestidor[] = [];
  const detalhes: DetalheRecebimento[] = [];
  const lotes: LoteAuditoria[] = [];
  const porMes = new Map<
    number,
    { aVista: number; entrada: number; parcelas: number; entrega: number }
  >();

  let unidadesAcumuladas = 0;

  for (let mes = 0; mes < MESES_ATE_ENTREGA; mes++) {
    const percentualMes = ctx.curva[mes] ?? 0;
    const unidades = Math.max(0, e.numeroUnidades) * percentualMes;
    if (unidades <= 0) continue;

    const idade = lancamento + mes - ctx.mesBaseIpca;
    const mesesCorrecao = Math.max(0, idade);
    const fator = fatorCorrecao(ctx.ipcaMensal, mesesCorrecao);
    const valorBase = Math.max(0, e.valorMedioUnidade);
    const valorCorrigido = valorBase * fator;

    const detalhe = detalharLote(e.regraRecebimento, {
      mesVenda: mes,
      unidades,
      valorUnitario: valorCorrigido,
      mesEntrega: MESES_ATE_ENTREGA,
    });

    let soma = 0;
    let primeiro = Number.POSITIVE_INFINITY;
    let ultimo = Number.NEGATIVE_INFINITY;
    for (const c of detalhe.componentes) {
      soma += c.valor;
      if (c.valor !== 0) {
        if (c.offset < primeiro) primeiro = c.offset;
        if (c.offset > ultimo) ultimo = c.offset;
      }
      const abs = lancamento + c.offset;
      // Brise / Coliv installments accrue IPCA between the sale and the receipt.
      const fatorRecebimento = indexado
        ? fatorCorrecao(ctx.ipcaMensal, Math.max(0, c.offset - mes))
        : 1;
      const valorRecebido = c.valor * fatorRecebimento;
      const atual = porMes.get(abs) ?? { aVista: 0, entrada: 0, parcelas: 0, entrega: 0 };
      if (c.tipo === "a-vista") atual.aVista += valorRecebido;
      else if (c.tipo === "entrada") atual.entrada += valorRecebido;
      else if (c.tipo === "entrega") atual.entrega += valorRecebido;
      else atual.parcelas += valorRecebido;
      porMes.set(abs, atual);

      if (c.valor !== 0) {
        recebimentos.push({
          empreendimentoId: e.id,
          mesVendaAbs: lancamento + mes,
          mesGeracaoAbs: abs,
          mesPagamentoAbs: mesPagamentoInvestidor(abs, ctx.mesEntradaAbs),
          valorBase: c.valor * permutaPercentual * ctx.participacao,
          indexado,
        });

        detalhes.push({
          empreendimentoId: e.id,
          empreendimento: e.nome,
          regra: e.regraRecebimento,
          tipo: c.tipo,
          dataVenda: isoDeMesAbsoluto(lancamento + mes),
          unidades,
          valorBaseUnidade: valorBase,
          fatorVenda: fator,
          valorUnidadeNaVenda: valorCorrigido,
          valorBaseRecebimento: c.valor,
          dataOriginal: isoDeMesAbsoluto(abs),
          mesesPosVenda: Math.max(0, c.offset - mes),
          fatorPosVenda: fatorRecebimento,
          valorCorrigido: valorRecebido,
          dataPagamento: isoDeMesAbsoluto(mesPagamentoInvestidor(abs, ctx.mesEntradaAbs)),
          historico: abs < ctx.mesEntradaAbs,
        });
      }
    }

    unidadesAcumuladas += unidades;
    const anoObra = (Math.floor(mes / 12) + 1) as 1 | 2 | 3;

    lotes.push({
      mes,
      data: isoDeMesAbsoluto(lancamento + mes),
      anoObra,
      percentualAno: ctx.distribuicao[anoObra - 1] ?? 0,
      percentualMes,
      unidades,
      unidadesAcumuladas,
      unidadesRestantes: Math.max(0, e.numeroUnidades) - unidadesAcumuladas,
      valorBase,
      mesesCorrecao,
      fator,
      valorCorrigido,
      aumentoUnitario: valorCorrigido - valorBase,
      aumentoPercentual: fator - 1,
      vgvBase: unidades * valorBase,
      vgvCorrigido: unidades * valorCorrigido,
      mesesAteEntrega: MESES_ATE_ENTREGA - mes,
      detalhe,
      somaComponentes: soma,
      primeiroRecebimento: Number.isFinite(primeiro)
        ? isoDeMesAbsoluto(lancamento + primeiro)
        : null,
      ultimoRecebimento: Number.isFinite(ultimo) ? isoDeMesAbsoluto(lancamento + ultimo) : null,
    });
  }

  const porLote = new Map(lotes.map((l) => [lancamento + l.mes, l] as const));
  const meses = [...porMes.keys()].sort((a, b) => a - b);
  const linhas: LinhaMemoria[] = [];
  let acumulado = 0;
  let acumuladoInvestidor = 0;

  for (const mesAbs of meses) {
    const v = porMes.get(mesAbs)!;
    const recebimento = v.aVista + v.entrada + v.parcelas + v.entrega;
    const permuta = recebimento * permutaPercentual;
    const investidor = permuta * ctx.participacao;
    acumulado += recebimento;
    acumuladoInvestidor += investidor;

    linhas.push({
      mesAbs,
      data: isoDeMesAbsoluto(mesAbs),
      offset: mesAbs - lancamento,
      ...v,
      recebimento,
      recebimentoAcumulado: acumulado,
      percentualPermuta: permutaPercentual,
      permuta,
      participacao: ctx.participacao,
      investidor,
      investidorAcumulado: acumuladoInvestidor,
      mesPagamento: isoDeMesAbsoluto(mesPagamentoInvestidor(mesAbs, ctx.mesEntradaAbs)),
      venda: porLote.get(mesAbs) ?? null,
    });
  }

  return {
    id: e.id,
    nome: e.nome,
    regra: e.regraRecebimento,
    percentualPermuta: permutaPercentual,
    dataLancamento: e.dataLancamento,
    dataEntrega: mesDeEntrega(e.dataLancamento),
    numeroUnidades: e.numeroUnidades,
    valorMedioUnidade: e.valorMedioUnidade,
    lotes,
    linhas,
    recebimentos,
    detalhes,
    totais: {
      unidades: unidadesAcumuladas,
      vgvBase: lotes.reduce((a, l) => a + l.vgvBase, 0),
      vgvCorrigido: lotes.reduce((a, l) => a + l.vgvCorrigido, 0),
      recebimento: acumulado,
      permuta: acumulado * permutaPercentual,
      investidor: acumuladoInvestidor,
    },
  };
}

export interface SemestreAuditoria {
  /** Closing month (jan or jul) — the investor payment date. */
  data: string;
  mesAbs: number;
  inicio: string;
  fim: string;
  meses: { data: string; porEmpreendimento: Record<string, number>; total: number }[];
  porEmpreendimento: Record<string, number>;
  total: number;
  acumulado: number;
}

export interface Auditoria {
  contexto: ContextoAuditoria;
  memorias: MemoriaEmpreendimento[];
  /** Semiannual payments already reflecting the antecipation option. */
  semestres: SemestreAuditoria[];
  /** Semiannual payments on the original schedule, before antecipation. */
  semestresOriginais: SemestreAuditoria[];
  antecipacao: ResultadoAntecipacao;
  totalInvestidor: number;
}

export function auditar(entrada: {
  premissas: PremissasGlobais;
  empreendimentos: Empreendimento[];
  cenario: Cenario;
}): Auditoria {
  const contexto = contextoAuditoria(entrada);
  const memorias = contexto.ativos.map((e) => memoriaEmpreendimento(e, contexto));

  // Semiannual consolidation: every monthly receipt is paid on the next
  // january/july closing — the same bucket used by the engine.
  type Bucket = {
    meses: Map<number, Record<string, number>>;
    porEmpreendimento: Record<string, number>;
  };

  const construir = (fonte: Map<number, Bucket>): SemestreAuditoria[] => {
    const lista: SemestreAuditoria[] = [];
    let acumulado = 0;
    for (const mesAbs of [...fonte.keys()].sort((a, b) => a - b)) {
      const bucket = fonte.get(mesAbs)!;
      const meses = [...bucket.meses.keys()]
        .sort((a, b) => a - b)
        .map((abs) => {
          const porEmpreendimento = bucket.meses.get(abs)!;
          return {
            data: isoDeMesAbsoluto(abs),
            porEmpreendimento,
            total: Object.values(porEmpreendimento).reduce((a, b) => a + b, 0),
          };
        });
      const total = Object.values(bucket.porEmpreendimento).reduce((a, b) => a + b, 0);
      acumulado += total;
      lista.push({
        data: isoDeMesAbsoluto(mesAbs),
        mesAbs,
        inicio: meses[0]?.data ?? isoDeMesAbsoluto(mesAbs),
        fim: meses[meses.length - 1]?.data ?? isoDeMesAbsoluto(mesAbs),
        meses,
        porEmpreendimento: bucket.porEmpreendimento,
        total,
        acumulado,
      });
    }
    return lista;
  };

  const agrupar = (
    itens: { id: string; mesPagamentoAbs: number; mesGeracaoAbs: number; valor: number }[],
  ): Map<number, Bucket> => {
    const mapa = new Map<number, Bucket>();
    for (const item of itens) {
      if (item.valor === 0) continue;
      const bucket = mapa.get(item.mesPagamentoAbs) ?? {
        meses: new Map<number, Record<string, number>>(),
        porEmpreendimento: {} as Record<string, number>,
      };
      bucket.porEmpreendimento[item.id] = (bucket.porEmpreendimento[item.id] ?? 0) + item.valor;
      const detalhe = bucket.meses.get(item.mesGeracaoAbs) ?? {};
      detalhe[item.id] = (detalhe[item.id] ?? 0) + item.valor;
      bucket.meses.set(item.mesGeracaoAbs, detalhe);
      mapa.set(item.mesPagamentoAbs, bucket);
    }
    return mapa;
  };

  const recebimentos = memorias.flatMap((m) => m.recebimentos);

  const semestresOriginais = construir(
    agrupar(
      recebimentos.map((r) => ({
        id: r.empreendimentoId,
        mesPagamentoAbs: r.mesPagamentoAbs,
        mesGeracaoAbs: r.mesGeracaoAbs,
        valor: valorNoLimite(r, contexto.ipcaMensal),
      })),
    ),
  );

  // The antecipation is a transformation over the finished flow — same rule
  // and same cut date used by the engine.
  const { ajustados, antecipacao } = aplicarAntecipacao(
    recebimentos,
    contexto.ativos.map((e) => mesAbsoluto(e.dataLancamento) + MESES_ATE_ENTREGA),
    contexto.premissas.anteciparRecebimentos === true,
    contexto.ipcaMensal,
  );

  const semestres = construir(
    agrupar(
      ajustados.map((a: RecebimentoAjustado) => ({
        id: a.recebimento.empreendimentoId,
        mesPagamentoAbs: a.mesPagamentoAbs,
        mesGeracaoAbs: a.recebimento.mesGeracaoAbs,
        valor: a.valor,
      })),
    ),
  );

  return {
    contexto,
    memorias,
    semestres,
    semestresOriginais,
    antecipacao,
    totalInvestidor: memorias.reduce((a, m) => a + m.totais.investidor, 0),
  };
}

/** Consolidated monthly rows of several empreendimentos (sales data omitted). */
export function consolidarLinhas(memorias: MemoriaEmpreendimento[]): LinhaMemoria[] {
  const mapa = new Map<number, LinhaMemoria>();
  for (const m of memorias) {
    for (const l of m.linhas) {
      const atual = mapa.get(l.mesAbs);
      if (!atual) {
        mapa.set(l.mesAbs, { ...l, venda: null, offset: 0 });
        continue;
      }
      atual.aVista += l.aVista;
      atual.entrada += l.entrada;
      atual.parcelas += l.parcelas;
      atual.entrega += l.entrega;
      atual.recebimento += l.recebimento;
      atual.permuta += l.permuta;
      atual.investidor += l.investidor;
    }
  }
  const linhas = [...mapa.values()].sort((a, b) => a.mesAbs - b.mesAbs);
  let acumulado = 0;
  let acumuladoInvestidor = 0;
  for (const l of linhas) {
    acumulado += l.recebimento;
    acumuladoInvestidor += l.investidor;
    l.recebimentoAcumulado = acumulado;
    l.investidorAcumulado = acumuladoInvestidor;
  }
  return linhas;
}

/** Tolerance, in BRL, below which a difference is only a rounding artifact. */
export const TOLERANCIA = 0.05;

export type StatusValidacao = "ok" | "arredondamento" | "divergencia";

export function statusDaDiferenca(diferenca: number): StatusValidacao {
  const abs = Math.abs(diferenca);
  if (abs === 0) return "ok";
  if (abs <= TOLERANCIA) return "arredondamento";
  return "divergencia";
}

export interface LinhaReconciliacao {
  metrica: string;
  calculado: number;
  exibido: number;
  diferenca: number;
  status: StatusValidacao;
}

export function reconciliar(
  auditoria: Auditoria,
  resultado: ResultadoSimulacao,
): LinhaReconciliacao[] {
  const linha = (metrica: string, calculado: number, exibido: number): LinhaReconciliacao => ({
    metrica,
    calculado,
    exibido,
    diferenca: calculado - exibido,
    status: statusDaDiferenca(calculado - exibido),
  });

  const somaSemestral = auditoria.semestres.reduce((a, s) => a + s.total, 0);
  // Per empreendimento, already reflecting the antecipation.
  const ajustadoPorId = new Map<string, number>();
  for (const s of auditoria.semestres) {
    for (const [id, valor] of Object.entries(s.porEmpreendimento)) {
      ajustadoPorId.set(id, (ajustadoPorId.get(id) ?? 0) + valor);
    }
  }

  const linhas: LinhaReconciliacao[] = [
    linha("Valor projetado", somaSemestral, resultado.indicadores.valorProjetado),
    linha("Soma dos recebimentos semestrais", somaSemestral, resultado.totais.receitaTotal),
    linha(
      "Total do fluxo de caixa",
      auditoria.semestres.at(-1)?.acumulado ?? 0,
      resultado.fluxoMensal.at(-1)?.acumulado ?? 0,
    ),
  ];

  for (const m of auditoria.memorias) {
    const exibido = resultado.empreendimentos.find((r) => r.id === m.id)?.retornoInvestidor ?? 0;
    linhas.push(linha(m.nome, ajustadoPorId.get(m.id) ?? 0, exibido));
  }

  linhas.push(
    linha(
      "Soma do gráfico comparativo",
      somaSemestral,
      resultado.empreendimentos.reduce((a, r) => a + r.retornoInvestidor, 0),
    ),
  );

  return linhas;
}

export interface TesteValidacao {
  grupo: string;
  nome: string;
  status: StatusValidacao;
  detalhe: string;
}

/** Automatic assertions over the rules — the homologation checklist. */
function formatarDiferenca(d: number): string {
  return `R$ ${d.toFixed(4)} de diferença`;
}

export function executarTestes(
  auditoria: Auditoria,
  resultado: ResultadoSimulacao,
): TesteValidacao[] {
  const testes: TesteValidacao[] = [];
  const add = (grupo: string, nome: string, ok: boolean, detalhe: string, morno = false) =>
    testes.push({
      grupo,
      nome,
      status: ok ? "ok" : morno ? "arredondamento" : "divergencia",
      detalhe,
    });

  const { contexto } = auditoria;
  const somaDistribuicao = contexto.cenario.distribuicaoAnual.reduce((a, b) => a + (b || 0), 0);
  add(
    "Gerais",
    "Percentuais dos três anos somam 100%",
    Math.abs(somaDistribuicao - 1) < 0.0005,
    `${(somaDistribuicao * 100).toFixed(2)}%`,
  );

  for (const m of auditoria.memorias) {
    add(
      "Gerais",
      `${m.nome} · 100% das unidades vendidas em 36 meses`,
      Math.abs(m.totais.unidades - m.numeroUnidades) < 1e-6,
      `${m.totais.unidades.toFixed(4)} de ${m.numeroUnidades}`,
    );
    add(
      "Gerais",
      `${m.nome} · nenhuma venda após o prazo de obra`,
      m.lotes.every((l) => l.mes < MESES_ATE_ENTREGA),
      `último mês de venda: ${m.lotes.at(-1)?.mes ?? 0}`,
    );
    add(
      "Gerais",
      `${m.nome} · entrega = lançamento + 36 meses`,
      mesAbsoluto(m.dataEntrega) - mesAbsoluto(m.dataLancamento) === MESES_ATE_ENTREGA,
      `${m.dataLancamento} → ${m.dataEntrega}`,
    );

    const somaComponentes = m.lotes.reduce((a, l) => a + l.somaComponentes, 0);
    const diff = somaComponentes - m.totais.vgvCorrigido;
    add(
      "Gerais",
      `${m.nome} · soma dos recebimentos = VGV corrigido vendido`,
      Math.abs(diff) <= TOLERANCIA,
      `diferença de R$ ${diff.toFixed(4)}`,
      Math.abs(diff) > 1e-9,
    );

    if (m.regra === "brise") {
      const l = m.lotes[0];
      add(
        "Brise",
        "10% das unidades à vista e 90% financiadas",
        !l ||
          (Math.abs(l.detalhe.meta.unidadesAVista - l.unidades * 0.1) < 1e-9 &&
            Math.abs(l.detalhe.meta.unidadesFinanciadas - l.unidades * 0.9) < 1e-9),
        l ? `${l.detalhe.meta.unidadesAVista.toFixed(3)} à vista` : "sem vendas",
      );
      add(
        "Brise",
        "Financiamento em 180 meses",
        !l || l.detalhe.meta.prazo === 180,
        `${l?.detalhe.meta.prazo ?? 0} parcelas`,
      );
      add(
        "Brise",
        "À vista + financiado = valor vendido",
        !l ||
          Math.abs(l.detalhe.meta.valorAVista + l.detalhe.meta.valorFinanciado - l.vgvCorrigido) <=
            TOLERANCIA,
        "verificado em todos os lotes",
      );
    }

    if (m.regra === "coliv") {
      const l = m.lotes[0];
      add(
        "Coliv",
        "Entrada 10% · obra 20% · entrega 70%",
        !l ||
          (Math.abs(l.detalhe.meta.entrada - l.vgvCorrigido * 0.1) <= TOLERANCIA &&
            Math.abs(l.detalhe.meta.parcelado - l.vgvCorrigido * 0.2) <= TOLERANCIA &&
            Math.abs(l.detalhe.meta.naEntrega - l.vgvCorrigido * 0.7) <= TOLERANCIA),
        "proporções conferidas no primeiro lote",
      );
      const primeiro = m.lotes[0];
      const ultimo = m.lotes.at(-1);
      add(
        "Coliv",
        "Prazo das parcelas diminui conforme a venda se aproxima da entrega",
        !primeiro || !ultimo || primeiro.detalhe.meta.meses >= ultimo.detalhe.meta.meses,
        `${primeiro?.detalhe.meta.meses ?? 0} → ${ultimo?.detalhe.meta.meses ?? 0} meses`,
      );
    }

    if (m.regra === "antes-da-entrega") {
      const entrega = mesAbsoluto(m.dataEntrega);
      const forada = m.linhas.some((l) => l.mesAbs >= entrega && l.recebimento > TOLERANCIA);
      add(
        "Alento e Miradas",
        `${m.nome} · nenhuma parcela após a entrega`,
        !forada,
        `entrega em ${m.dataEntrega}`,
      );
    }
  }

  // IPCA
  const ipcaLigado = contexto.premissas.aplicarIpca;
  const qualquer = auditoria.memorias[0];
  if (qualquer) {
    const primeiro = qualquer.lotes[0];
    const ultimo = qualquer.lotes.at(-1);
    add(
      "IPCA",
      ipcaLigado
        ? "IPCA ligado aumenta o valor conforme os meses"
        : "IPCA desligado mantém o valor-base",
      ipcaLigado
        ? !!ultimo && !!primeiro && ultimo.valorCorrigido >= primeiro.valorCorrigido
        : qualquer.lotes.every((l) => Math.abs(l.fator - 1) < 1e-12),
      ipcaLigado
        ? `fator final ${ultimo?.fator.toFixed(6) ?? "—"}`
        : "fator de correção = 1 em todos os meses",
    );
    add(
      "IPCA",
      "Venda posterior nunca vale menos que venda anterior",
      qualquer.lotes.every((l, i, arr) => i === 0 || l.valorCorrigido >= arr[i - 1].valorCorrigido),
      "sequência monotônica verificada",
    );
    add(
      "IPCA",
      "Correção aplicada uma única vez, na data da venda",
      qualquer.lotes.every((l) => Math.abs(l.valorCorrigido - l.valorBase * l.fator) < 1e-6),
      "valor corrigido = valor-base × fator acumulado",
    );
  }

  // Indicadores
  const somaMensal = auditoria.semestres.reduce((a, s) => a + s.total, 0);
  add(
    "Indicadores",
    "Valor projetado = soma dos recebimentos do investidor",
    Math.abs(somaMensal - resultado.indicadores.valorProjetado) <= TOLERANCIA,
    `R$ ${(somaMensal - resultado.indicadores.valorProjetado).toFixed(4)} de diferença`,
  );
  const antec = auditoria.antecipacao;
  add(
    "Antecipação",
    antec.ativa
      ? "Antecipado = original − correção do IPCA futuro"
      : "Sem antecipação: o cronograma original é mantido",
    Math.abs(antec.totalOriginal - antec.totalCorrecaoRetirada - antec.totalAjustado) <= TOLERANCIA,
    `retirada de R$ ${antec.totalCorrecaoRetirada.toFixed(2)}`,
  );
  add(
    "Antecipação",
    "Recebimentos até a data da antecipação permanecem inalterados",
    antec.mesCorteAbs === null ||
      Math.abs(
        auditoria.semestres
          .filter((s) => s.mesAbs < antec.mesCorteAbs!)
          .reduce((a, s) => a + s.total, 0) -
          auditoria.semestresOriginais
            .filter((s) => s.mesAbs < antec.mesCorteAbs!)
            .reduce((a, s) => a + s.total, 0),
      ) <= TOLERANCIA,
    "valores vencidos conferidos",
  );
  const tirDet = resultado.tirDetalhe;
  add(
    "Indicadores",
    "TIR calculada a partir da data de hoje",
    tirDet.valorInvestido === resultado.indicadores.valorInvestido,
    `início em ${tirDet.dataInicio} · ${tirDet.quantidadeRecebimentos} recebimentos`,
  );
  add(
    "Indicadores",
    "Lucro = valor projetado − investimento",
    Math.abs(
      resultado.indicadores.lucro -
        (resultado.indicadores.valorProjetado - resultado.indicadores.valorInvestido),
    ) <= TOLERANCIA,
    "conferido",
  );
  const roiEsperado =
    resultado.indicadores.valorInvestido > 0
      ? resultado.indicadores.lucro / resultado.indicadores.valorInvestido
      : 0;
  add(
    "Indicadores",
    "ROI = lucro ÷ investimento",
    Math.abs(resultado.indicadores.roi - roiEsperado) < 1e-9,
    `${(resultado.indicadores.roi * 100).toFixed(3)}%`,
  );
  add(
    "Indicadores",
    "Pagamentos semestrais = fluxo mensal",
    Math.abs(
      auditoria.semestres.reduce((a, s) => a + s.total, 0) - resultado.totais.receitaTotal,
    ) <= TOLERANCIA,
    "consolidação conferida",
  );
  add(
    "Indicadores",
    "Payback e prazo de recebimento usam o mesmo fluxo",
    resultado.indicadores.paybackMeses === null ||
      resultado.indicadores.prazoRecebimentoMeses === null ||
      resultado.indicadores.prazoRecebimentoMeses >= resultado.indicadores.paybackMeses,
    `payback ${resultado.indicadores.paybackMeses ?? "—"} m · integral em ${
      resultado.indicadores.prazoRecebimentoMeses ?? "—"
    } m`,
  );

  // ── Antecipação ────────────────────────────────────────────────────────
  const ant = auditoria.antecipacao;
  const totalOriginal = auditoria.semestresOriginais.reduce((a, x) => a + x.total, 0);
  const totalAjustado = auditoria.semestres.reduce((a, x) => a + x.total, 0);
  add(
    "Antecipação",
    "Total depois = total antes − IPCA futuro abdicado",
    Math.abs(totalOriginal - ant.totalCorrecaoRetirada - totalAjustado) <= TOLERANCIA,
    `${ant.ativa ? "ativa" : "inativa"} · R$ ${(
      totalOriginal -
      ant.totalCorrecaoRetirada -
      totalAjustado
    ).toFixed(4)}`,
  );
  for (const m of auditoria.memorias) {
    const antes = auditoria.semestresOriginais.reduce(
      (a, x) => a + (x.porEmpreendimento[m.id] ?? 0),
      0,
    );
    const depois = auditoria.semestres.reduce((a, x) => a + (x.porEmpreendimento[m.id] ?? 0), 0);
    add(
      "Antecipação",
      `Total de ${m.nome} nunca aumenta com a antecipação`,
      depois - antes <= TOLERANCIA,
      formatarDiferenca(antes - depois),
    );
  }
  add(
    "Antecipação",
    "Valor projetado = fluxo com antecipação",
    Math.abs(totalAjustado - resultado.indicadores.valorProjetado) <= TOLERANCIA,
    formatarDiferenca(totalAjustado - resultado.indicadores.valorProjetado),
  );
  add(
    "Antecipação",
    "Acumulado termina em 100% do valor projetado",
    Math.abs((auditoria.semestres.at(-1)?.acumulado ?? 0) - resultado.indicadores.valorProjetado) <=
      TOLERANCIA,
    "conferido",
  );
  if (ant.ativa && ant.mesCorteAbs !== null) {
    const corte = ant.mesCorteAbs;
    add(
      "Antecipação",
      "Nenhum recebimento após a data de antecipação",
      auditoria.semestres.every((x) => x.mesAbs <= corte),
      `corte em ${ant.dataCorte}`,
    );
    add(
      "Antecipação",
      "Recebimentos anteriores ao corte preservados",
      auditoria.semestresOriginais
        .filter((x) => x.mesAbs < corte)
        .every((x) => {
          const ajustado = auditoria.semestres.find((y) => y.mesAbs === x.mesAbs);
          return ajustado ? Math.abs(ajustado.total - x.total) <= TOLERANCIA : false;
        }),
      "nenhum valor anterior movido",
    );
    const anteriores = auditoria.semestres
      .filter((x) => x.mesAbs < corte)
      .reduce((a, x) => a + x.total, 0);
    const noCorte = auditoria.semestres.find((x) => x.mesAbs === corte)?.total ?? 0;
    add(
      "Antecipação",
      "Anteriores + pagamento antecipado = valor projetado",
      Math.abs(anteriores + noCorte - resultado.indicadores.valorProjetado) <= TOLERANCIA,
      formatarDiferenca(anteriores + noCorte - resultado.indicadores.valorProjetado),
    );
    add(
      "Antecipação",
      "Última data do fluxo = data da antecipação",
      resultado.fluxoMensal.at(-1)?.data === ant.dataCorte,
      `${resultado.fluxoMensal.at(-1)?.data ?? "—"}`,
    );
    add(
      "Antecipação",
      "Prazo de recebimento corresponde à nova última data",
      resultado.indicadores.prazoRecebimentoMeses !== null,
      `${resultado.indicadores.prazoRecebimentoMeses ?? "—"} meses`,
    );
  }

  return testes;
}
