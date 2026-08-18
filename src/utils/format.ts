const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const brlPreciso = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatarMoeda(valor: number, preciso = false): string {
  if (!Number.isFinite(valor)) return "—";
  return preciso ? brlPreciso.format(valor) : brl.format(valor);
}

export function formatarCompacto(valor: number): string {
  if (!Number.isFinite(valor)) return "—";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000_000) return `R$ ${(valor / 1_000_000_000).toFixed(1).replace(".", ",")} bi`;
  if (abs >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1_000) return `R$ ${(valor / 1_000).toFixed(0)} mil`;
  return brl.format(valor);
}

export function formatarPercentual(valor: number | null, casas = 1): string {
  if (valor === null || !Number.isFinite(valor)) return "—";
  return `${(valor * 100).toFixed(casas).replace(".", ",")}%`;
}

export function formatarNumero(valor: number): string {
  if (!Number.isFinite(valor)) return "—";
  return numero.format(valor);
}

export function formatarMeses(meses: number | null): string {
  if (meses === null || !Number.isFinite(meses)) return "Não atingido";
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anos === 0) return `${resto} ${resto === 1 ? "mês" : "meses"}`;
  if (resto === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${resto} ${resto === 1 ? "mês" : "meses"}`;
}

export function parseNumeroInput(valor: string): number {
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}
