import { MESES_ATE_ENTREGA } from "@/constants";
import type {
  Cenario,
  MarcoRetorno,
  Empreendimento,
  FluxoAnual,
  FluxoMensal,
  PremissasGlobais,
  ResultadoSimulacao,
  ResumoEmpreendimento,
} from "@/types";
import { anoDeIso, isoDeMesAbsoluto, mesAbsoluto } from "@/utils/date";
import { aplicarAntecipacao, type ResultadoAntecipacao } from "./antecipacao";
import { mesDePagamento } from "./calendario";
import { calcularPayback, calcularRoi, calcularTirMensal, calcularVpl } from "./metrics";
import { fatorCorrecao, taxaAnualParaMensal, taxaMensalParaAnual } from "./rates";
import { curvaDeVendas } from "./sales";
import { recebimentosDoLote } from "./rules";
import { calcularParticipacao, calcularValorInvestido, mesDeEntrega } from "./valuation";

export interface EntradaSimulacao {
  premissas: PremissasGlobais;
  empreendimentos: Empreendimento[];
  cenario: Cenario;
}

/**
 * The single entry point of the financial engine. Everything the UI displays
 * is derived from this function: sales curve → receipt rules → IPCA-indexed
 * sale prices → semiannual investor payments → indicators.
 */
export function simular({
  premissas,
  empreendimentos,
  cenario,
}: EntradaSimulacao): ResultadoSimulacao {
  const ativos = empreendimentos.filter((e) => e.ativo);

  const valorInvestido = calcularValorInvestido(premissas.valorCota, premissas.quantidadeCotas);
  const participacao = calcularParticipacao(valorInvestido, premissas.valorCaptacao);

  const resumos: ResumoEmpreendimento[] = [];
  if (!ativos.length) return vazio(valorInvestido, participacao, resumos);

  // IPCA indexes the unit price at the month of each sale.
  const ipcaMensal = premissas.aplicarIpca ? taxaAnualParaMensal(premissas.ipcaAnual) : 0;
  const mesBaseIpca = Math.min(...ativos.map((e) => mesAbsoluto(e.dataLancamento)));

  const curva = curvaDeVendas(cenario);

  /** Investor receipts (already semiannual) per empreendimento, by abs month. */
  const recebimentosOriginais = new Map<string, Map<number, number>>();
  const mesesEntrega: number[] = [];

  for (const e of ativos) {
    const lancamento = mesAbsoluto(e.dataLancamento);
    const mapa = new Map<number, number>();
    let vgvRealizado = 0;

    for (let mes = 0; mes < MESES_ATE_ENTREGA; mes++) {
      const unidades = Math.max(0, e.numeroUnidades) * (curva[mes] ?? 0);
      if (unidades <= 0) continue;

      const idade = lancamento + mes - mesBaseIpca;
      const valorUnitario =
        Math.max(0, e.valorMedioUnidade) * fatorCorrecao(ipcaMensal, Math.max(0, idade));
      vgvRealizado += unidades * valorUnitario;

      const lote = recebimentosDoLote(e.regraRecebimento, {
        mesVenda: mes,
        unidades,
        valorUnitario,
        mesEntrega: MESES_ATE_ENTREGA,
      });

      for (const [offset, valor] of lote) {
        // Monthly cash of the empreendimento → investor's permuta slice,
        // consolidated in the next semiannual payment date.
        const pagamento = mesDePagamento(lancamento + offset);
        const parcela = valor * Math.max(0, e.percentualPermuta) * participacao;
        mapa.set(pagamento, (mapa.get(pagamento) ?? 0) + parcela);
      }
    }

    recebimentosOriginais.set(e.id, mapa);
    mesesEntrega.push(lancamento + MESES_ATE_ENTREGA);
    resumos.push({
      id: e.id,
      nome: e.nome,
      vgv: vgvRealizado,
      valorPermuta: vgvRealizado * Math.max(0, e.percentualPermuta),
      retornoInvestidor: 0,
      dataLancamento: e.dataLancamento,
      dataEntrega: mesDeEntrega(e.dataLancamento),
      numeroUnidades: e.numeroUnidades,
    });
  }

  // Schedule transformation applied once, over the finished flow.
  const { fluxo: recebimentos, antecipacao } = aplicarAntecipacao(
    recebimentosOriginais,
    mesesEntrega,
    premissas.anteciparRecebimentos === true,
  );

  let mesInicio = Number.POSITIVE_INFINITY;
  let mesFim = Number.NEGATIVE_INFINITY;
  for (const mapa of recebimentos.values()) {
    for (const [mes, valor] of mapa) {
      if (valor === 0) continue;
      if (mes < mesInicio) mesInicio = mes;
      if (mes > mesFim) mesFim = mes;
    }
  }

  if (!Number.isFinite(mesInicio) || !Number.isFinite(mesFim)) {
    return vazio(valorInvestido, participacao, resumos, antecipacao);
  }

  const descontoMensal = taxaAnualParaMensal(premissas.taxaDescontoAnual);
  // Investment happens at the first launch of the portfolio.
  const mesInvestimento = mesBaseIpca;

  const fluxoMensal: FluxoMensal[] = [];
  let acumulado = 0;
  let receitaTotal = 0;
  let descontadoTotal = 0;
  const retornoPorId = new Map<string, number>();

  for (let mes = mesInicio; mes <= mesFim; mes++) {
    const indice = mes - mesInicio;
    const t = Math.max(1, mes - mesInvestimento);
    const porEmpreendimento: Record<string, number> = {};
    let receita = 0;

    for (const [id, mapa] of recebimentos) {
      const valor = mapa.get(mes) ?? 0;
      porEmpreendimento[id] = valor;
      retornoPorId.set(id, (retornoPorId.get(id) ?? 0) + valor);
      receita += valor;
    }

    const valorDescontado = receita / Math.pow(1 + descontoMensal, t);
    acumulado += receita;
    receitaTotal += receita;
    descontadoTotal += valorDescontado;

    fluxoMensal.push({
      indice,
      data: isoDeMesAbsoluto(mes),
      porEmpreendimento,
      receita,
      receitaCorrigida: receita,
      valorDescontado,
      acumulado,
      saldo: acumulado - valorInvestido,
    });
  }

  for (const resumo of resumos) {
    resumo.retornoInvestidor = retornoPorId.get(resumo.id) ?? 0;
  }

  // Investor flow for the IRR: t = 0 is the investment month and the idle
  // months before the first receipt are explicit zeros.
  const defasagem = Math.max(0, mesInicio - mesInvestimento - 1);
  const fluxos = [...Array<number>(defasagem).fill(0), ...fluxoMensal.map((f) => f.receita)];
  const tirMensal = calcularTirMensal(valorInvestido, fluxos);

  const marcos = calcularMarcos(fluxoMensal, receitaTotal, valorInvestido);

  // Full term: from the start of the simulation to the last receipt.
  const prazoRecebimentoMeses = receitaTotal > 0 ? mesFim - mesInvestimento : null;

  return {
    antecipacao,
    indicadores: {
      valorInvestido,
      participacao,
      valorProjetado: receitaTotal,
      lucro: receitaTotal - valorInvestido,
      roi: calcularRoi(valorInvestido, receitaTotal),
      tir: tirMensal === null ? null : taxaMensalParaAnual(tirMensal),
      tirMensal,
      paybackMeses: calcularPayback(valorInvestido, fluxos),
      prazoRecebimentoMeses,
      vpl: calcularVpl(valorInvestido, fluxos, descontoMensal),
      multiplo: valorInvestido > 0 ? receitaTotal / valorInvestido : 0,
      duracaoMeses: fluxoMensal.length,
    },
    fluxoMensal,
    fluxoAnual: agruparPorAno(fluxoMensal),
    marcos,
    empreendimentos: resumos,
    totais: {
      vgvTotal: resumos.reduce((a, r) => a + r.vgv, 0),
      permutaTotal: resumos.reduce((a, r) => a + r.valorPermuta, 0),
      receitaTotal,
      receitaCorrigidaTotal: receitaTotal,
      descontadoTotal,
    },
  };
}

/**
 * Milestones of the accumulated receipts: payback and the months where 50%,
 * 80% and 100% of the total return has been received.
 */
function calcularMarcos(
  fluxo: FluxoMensal[],
  total: number,
  valorInvestido: number,
): MarcoRetorno[] {
  const marcos: MarcoRetorno[] = [];
  if (!fluxo.length || total <= 0) return marcos;

  const payback = fluxo.find((m) => m.acumulado >= valorInvestido);
  if (payback) {
    marcos.push({
      tipo: "payback",
      rotulo: "Payback",
      data: payback.data,
      indice: payback.indice,
      percentual: payback.acumulado / total,
      acumulado: payback.acumulado,
    });
  }

  for (const alvo of [0.5, 1] as const) {
    const mes = fluxo.find((m) => m.acumulado >= total * alvo);
    if (!mes) continue;
    marcos.push({
      tipo: "percentual",
      rotulo: `${Math.round(alvo * 100)}% recebido`,
      data: mes.data,
      indice: mes.indice,
      percentual: alvo,
      acumulado: mes.acumulado,
    });
  }

  return marcos.sort((a, b) => a.indice - b.indice);
}

function agruparPorAno(fluxo: FluxoMensal[]): FluxoAnual[] {
  const mapa = new Map<number, FluxoAnual>();
  for (const mes of fluxo) {
    const ano = anoDeIso(mes.data);
    const atual =
      mapa.get(ano) ?? { ano, receita: 0, receitaCorrigida: 0, valorDescontado: 0, acumulado: 0 };
    atual.receita += mes.receita;
    atual.receitaCorrigida += mes.receitaCorrigida;
    atual.valorDescontado += mes.valorDescontado;
    atual.acumulado = mes.acumulado;
    mapa.set(ano, atual);
  }
  return [...mapa.values()].sort((a, b) => a.ano - b.ano);
}

function vazio(
  valorInvestido: number,
  participacao: number,
  empreendimentos: ResumoEmpreendimento[],
  antecipacao: ResultadoAntecipacao = antecipacaoVazia(),
): ResultadoSimulacao {
  return {
    antecipacao,
    indicadores: {
      valorInvestido,
      participacao,
      valorProjetado: 0,
      lucro: -valorInvestido,
      roi: valorInvestido > 0 ? -1 : 0,
      tir: null,
      tirMensal: null,
      paybackMeses: null,
      prazoRecebimentoMeses: null,
      vpl: -valorInvestido,
      multiplo: 0,
      duracaoMeses: 0,
    },
    fluxoMensal: [],
    fluxoAnual: [],
    marcos: [],
    empreendimentos,
    totais: {
      vgvTotal: empreendimentos.reduce((a, r) => a + r.vgv, 0),
      permutaTotal: empreendimentos.reduce((a, r) => a + r.valorPermuta, 0),
      receitaTotal: 0,
      receitaCorrigidaTotal: 0,
      descontadoTotal: 0,
    },
  };
}

function antecipacaoVazia(): ResultadoAntecipacao {
  return {
    ativa: false,
    mesUltimaEntregaAbs: null,
    dataUltimaEntrega: null,
    dataProximoPagamento: null,
    mesCorteAbs: null,
    dataCorte: null,
    mesUltimoOriginalAbs: null,
    dataUltimoOriginal: null,
    porEmpreendimento: {},
    totalAntecipado: 0,
    parcelasMovidas: 0,
    parcelas: [],
    valorNormalCorte: 0,
    valorFinalCorte: 0,
  };
}
