/**
 * Financial indicators. Pure functions over an array of monthly cash flows.
 */

/** Net Present Value given an initial outflow and monthly inflows. */
export function calcularVpl(
  investimento: number,
  fluxos: number[],
  taxaMensal: number,
): number {
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
