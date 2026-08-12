import type { MarcoRetorno, ResultadoSimulacao } from "@/types";
import { parseMes, rotuloMes } from "@/utils/date";

/**
 * Presentation-only aggregation: investors are paid every 6 months, so the
 * monthly flow is consolidated into semester buckets closing on jan/jul.
 * No financial rule changes — values are simply summed.
 */
export interface SemestreFluxo {
  data: string;
  rotulo: string;
  indiceFim: number;
  porEmpreendimento: Record<string, number>;
  total: number;
  acumulado: number;
}

export function agruparSemestres(resultado: ResultadoSimulacao): SemestreFluxo[] {
  const fluxo = resultado.fluxoMensal;
  const semestres: SemestreFluxo[] = [];
  let acumuladoPorEmp: Record<string, number> = {};
  let total = 0;

  fluxo.forEach((mes, i) => {
    for (const [chave, valor] of Object.entries(mes.porEmpreendimento)) {
      acumuladoPorEmp[chave] = (acumuladoPorEmp[chave] ?? 0) + valor;
    }
    total += mes.receitaCorrigida;

    const numeroMes = parseMes(mes.data).mes;
    const fecha = numeroMes === 0 || numeroMes === 6 || i === fluxo.length - 1;
    if (!fecha) return;

    semestres.push({
      data: mes.data,
      rotulo: rotuloMes(mes.data),
      indiceFim: mes.indice,
      porEmpreendimento: acumuladoPorEmp,
      total,
      acumulado: mes.acumulado,
    });
    acumuladoPorEmp = {};
    total = 0;
  });

  return semestres.filter((s) => s.total > 0);
}

/** Label of the semester in which a milestone is actually paid. */
export function semestreDoMarco(
  semestres: SemestreFluxo[],
  marco: MarcoRetorno,
): SemestreFluxo | undefined {
  return semestres.find((s) => s.indiceFim >= marco.indice);
}
