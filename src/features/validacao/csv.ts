/** CSV helpers for the validation page. Values keep full decimal precision. */

function escapar(valor: string | number): string {
  const texto = typeof valor === "number" ? String(valor) : valor;
  return `"${texto.replace(/"/g, '""')}"`;
}

export function gerarCsv(linhas: (string | number)[][]): string {
  return linhas.map((l) => l.map(escapar).join(";")).join("\n");
}

export function baixarCsv(nome: string, linhas: (string | number)[][]) {
  const blob = new Blob(["\uFEFF" + gerarCsv(linhas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome.endsWith(".csv") ? nome : `${nome}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copiar(texto: string) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    /* clipboard indisponível */
  }
}
