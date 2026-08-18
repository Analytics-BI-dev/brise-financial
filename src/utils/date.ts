/** Date helpers working on ISO months (YYYY-MM). Pure, no dependencies. */

export function parseMes(iso: string): { ano: number; mes: number } {
  const [ano, mes] = iso.split("-").map(Number);
  return { ano, mes: (mes || 1) - 1 };
}

export function mesAbsoluto(iso: string): number {
  const { ano, mes } = parseMes(iso);
  return ano * 12 + mes;
}

export function isoDeMesAbsoluto(abs: number): string {
  const ano = Math.floor(abs / 12);
  const mes = abs % 12;
  return `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function rotuloMes(iso: string): string {
  const { ano, mes } = parseMes(iso);
  return `${MESES_CURTOS[mes]}/${String(ano).slice(2)}`;
}

export function anoDeIso(iso: string): number {
  return parseMes(iso).ano;
}

/** Date object of the first day of an ISO month (YYYY-MM), in local time. */
export function dataDoMes(iso: string): Date {
  const { ano, mes } = parseMes(iso);
  return new Date(ano, mes, 1);
}

/** ISO day (YYYY-MM-DD) of a Date, in local time. */
export function isoDoDia(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Human label of an ISO day: dd/mm/aaaa. */
export function rotuloDia(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
