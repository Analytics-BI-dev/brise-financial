/**
 * Financial indicators. Pure functions over an array of monthly cash flows.
 */

/** Net Present Value given an initial outflow and monthly inflows. */
export function calcularVpl(investimento: number, fluxos: number[], taxaMensal: number): number {
  let vpl = -investimento;
  for (let t = 0; t < fluxos.length; t++) {
    vpl += fluxos[t] / Math.pow(1 + taxaMensal, t + 1);
  }
  return vpl;
}

/**
 * Internal rate of return (monthly), via bisection over the NPV function.
 * Returns null when the flows have no sign change (no solution).
 */
export function calcularTirMensal(investimento: number, fluxos: number[]): number | null {
  if (investimento <= 0) return null;
  const soma = fluxos.reduce((a, b) => a + b, 0);
  if (soma <= 0) return null;

  const npv = (taxa: number) => {
    let v = -investimento;
    for (let t = 0; t < fluxos.length; t++) {
      v += fluxos[t] / Math.pow(1 + taxa, t + 1);
    }
    return v;
  };

  let baixo = -0.9999;
  let alto = 1;
  let fBaixo = npv(baixo);
  let fAlto = npv(alto);

  let expansoes = 0;
  while (fBaixo * fAlto > 0 && expansoes < 60) {
    alto *= 2;
    fAlto = npv(alto);
    expansoes++;
  }
  if (fBaixo * fAlto > 0) return null;

  for (let i = 0; i < 200; i++) {
    const meio = (baixo + alto) / 2;
    const fMeio = npv(meio);
    if (Math.abs(fMeio) < 1e-7) return meio;
    if (fBaixo * fMeio < 0) {
      alto = meio;
      fAlto = fMeio;
    } else {
      baixo = meio;
      fBaixo = fMeio;
    }
  }
  return (baixo + alto) / 2;
}

/** First month (1-based) in which the accumulated return covers the investment. */
export function calcularPayback(investimento: number, fluxos: number[]): number | null {
  let acumulado = 0;
  for (let t = 0; t < fluxos.length; t++) {
    acumulado += fluxos[t];
    if (acumulado >= investimento) return t + 1;
  }
  return null;
}

export function calcularRoi(investimento: number, retornoTotal: number): number {
  if (investimento <= 0) return 0;
  return (retornoTotal - investimento) / investimento;
}

export interface FluxoDatado {
  data: Date;
  valor: number;
}

const DIAS_ANO = 365;

/**
 * XIRR: effective ANNUAL internal rate of return over cash flows with real
 * dates. 0 = Σ valor_i / (1 + taxa)^(dias_i / 365).
 */
export function calcularXirr(fluxos: FluxoDatado[]): number | null {
  if (fluxos.length < 2) return null;
  const ordenado = [...fluxos].sort((a, b) => a.data.getTime() - b.data.getTime());
  const positivo = ordenado.some((f) => f.valor > 0);
  const negativo = ordenado.some((f) => f.valor < 0);
  if (!positivo || !negativo) return null;

  const inicio = ordenado[0].data.getTime();
  const anos = ordenado.map((f) => (f.data.getTime() - inicio) / (1000 * 60 * 60 * 24 * DIAS_ANO));

  const vpl = (taxa: number) =>
    ordenado.reduce((soma, f, i) => soma + f.valor / Math.pow(1 + taxa, anos[i]), 0);

  let baixo = -0.9999;
  let alto = 1;
  let fBaixo = vpl(baixo);
  let fAlto = vpl(alto);
  let expansoes = 0;
  while (fBaixo * fAlto > 0 && expansoes < 60) {
    alto *= 2;
    fAlto = vpl(alto);
    expansoes++;
  }
  if (fBaixo * fAlto > 0) return null;

  for (let i = 0; i < 200; i++) {
    const meio = (baixo + alto) / 2;
    const fMeio = vpl(meio);
    if (Math.abs(fMeio) < 1e-9) return meio;
    if (fBaixo * fMeio < 0) {
      alto = meio;
      fAlto = fMeio;
    } else {
      baixo = meio;
      fBaixo = fMeio;
    }
  }
  return (baixo + alto) / 2;
}
