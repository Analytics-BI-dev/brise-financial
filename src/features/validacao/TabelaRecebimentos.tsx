import { useMemo, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Rolagem, Td, Th } from "./comum";
import { baixarCsv } from "./csv";
import type { DetalheRecebimento, MemoriaEmpreendimento } from "@/financial-engine/audit";
import { formatarMoeda, formatarPercentual } from "@/utils/format";
import { rotuloMes } from "@/utils/date";

/**
 * Receipt-by-receipt audit of Brise and Coliv: it shows the unit price at the
 * sale, the post-sale IPCA of each installment and the payment date already
 * respecting the investor entry.
 */

const ROTULO_TIPO: Record<string, string> = {
  "a-vista": "Unidade à vista",
  entrada: "Entrada (10%)",
  parcela: "Parcela",
  entrega: "Entrega",
};

function rotuloComponente(d: DetalheRecebimento): string {
  if (d.regra === "brise") {
    if (d.tipo === "a-vista") return "Unidade à vista (10% das unidades)";
    return "Parcela do financiamento (unidades financiadas)";
  }
  if (d.regra === "coliv") {
    if (d.tipo === "entrada") return "10% entrada";
    if (d.tipo === "parcela") return "20% durante a obra";
    if (d.tipo === "entrega") return "70% na entrega";
  }
  return ROTULO_TIPO[d.tipo] ?? d.tipo;
}

const un = (v: number) => v.toFixed(4).replace(".", ",");

export function TabelaRecebimentos({ memoria }: { memoria: MemoriaEmpreendimento }) {
  const [limite, setLimite] = useState(300);
  const [somenteHistorico, setSomenteHistorico] = useState(false);

  const detalhes = useMemo(() => {
    const lista = somenteHistorico
      ? memoria.detalhes.filter((d) => d.historico)
      : memoria.detalhes;
    return [...lista].sort(
      (a, b) => a.dataOriginal.localeCompare(b.dataOriginal) || a.dataVenda.localeCompare(b.dataVenda),
    );
  }, [memoria, somenteHistorico]);

  const visiveis = detalhes.slice(0, limite);
  const totalHistorico = memoria.detalhes
    .filter((d) => d.historico)
    .reduce((a, d) => a + d.valorCorrigido, 0);

  return (
    <SectionCard
      titulo="Auditoria dos recebimentos"
      descricao="Cada componente gerado pela regra do empreendimento, com o valor da unidade na venda, a correção pós-venda e a data em que o investidor recebe."
      acao={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setSomenteHistorico((v) => !v)}>
            {somenteHistorico ? "Ver todos" : "Somente histórico"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              baixarCsv(
                `recebimentos-${memoria.id}.csv`,
                [[
                  "Empreendimento",
                  "Mês da venda",
                  "Unidades vendidas",
                  "Valor-base da unidade",
                  "IPCA até a venda",
                  "Valor da unidade na venda",
                  "Tipo de recebimento",
                  "Valor-base do recebimento",
                  "Data original",
                  "Meses pós-venda",
                  "IPCA pós-venda",
                  "Valor final corrigido",
                  "Pagamento ao investidor",
                  "Histórico",
                ],
                ...detalhes.map((d) => [
                  d.empreendimento,
                  d.dataVenda,
                  d.unidades,
                  d.valorBaseUnidade,
                  d.fatorVenda - 1,
                  d.valorUnidadeNaVenda,
                  rotuloComponente(d),
                  d.valorBaseRecebimento,
                  d.dataOriginal,
                  d.mesesPosVenda,
                  d.fatorPosVenda - 1,
                  d.valorCorrigido,
                  d.dataPagamento,
                  d.historico ? "sim" : "não",
                ])],
              )
            }
          >
            Exportar CSV
          </Button>
        </div>
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {detalhes.length.toLocaleString("pt-BR")} recebimentos ·{" "}
        {memoria.detalhes.filter((d) => d.historico).length.toLocaleString("pt-BR")} anteriores à
        entrada do investidor, somando {formatarMoeda(totalHistorico)} no empreendimento e pagos no
        primeiro fechamento semestral posterior ao investimento.
      </p>

      <Rolagem>
        <table className="w-full min-w-[1200px] text-xs">
          <thead>
            <tr>
              <Th>Empreendimento</Th>
              <Th>Mês da venda</Th>
              <Th className="text-right">Unidades</Th>
              <Th className="text-right">Valor-base da unidade</Th>
              <Th className="text-right">IPCA até a venda</Th>
              <Th className="text-right">Unidade na venda</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Valor-base</Th>
              <Th>Data original</Th>
              <Th className="text-right">Meses pós-venda</Th>
              <Th className="text-right">IPCA pós-venda</Th>
              <Th className="text-right">Valor corrigido</Th>
              <Th>Pagamento</Th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((d, i) => (
              <tr key={i} className={d.historico ? "bg-muted/30" : undefined}>
                <Td>{d.empreendimento}</Td>
                <Td>{rotuloMes(d.dataVenda)}</Td>
                <Td className="text-right">{un(d.unidades)}</Td>
                <Td className="text-right">{formatarMoeda(d.valorBaseUnidade)}</Td>
                <Td className="text-right">{formatarPercentual(d.fatorVenda - 1, 2)}</Td>
                <Td className="text-right">{formatarMoeda(d.valorUnidadeNaVenda)}</Td>
                <Td>
                  {rotuloComponente(d)}
                  {d.historico ? (
                    <span className="ml-2 rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      histórico
                    </span>
                  ) : null}
                </Td>
                <Td className="text-right">{formatarMoeda(d.valorBaseRecebimento)}</Td>
                <Td>{rotuloMes(d.dataOriginal)}</Td>
                <Td className="text-right">{d.mesesPosVenda}</Td>
                <Td className="text-right">{formatarPercentual(d.fatorPosVenda - 1, 2)}</Td>
                <Td className="text-right">{formatarMoeda(d.valorCorrigido)}</Td>
                <Td>{rotuloMes(d.dataPagamento)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Rolagem>

      {detalhes.length > visiveis.length ? (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimite((l) => l + 500)}>
            Mostrar mais ({(detalhes.length - visiveis.length).toLocaleString("pt-BR")} restantes)
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}
