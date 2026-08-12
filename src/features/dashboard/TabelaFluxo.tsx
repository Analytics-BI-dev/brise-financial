import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ResultadoSimulacao } from "@/types";
import { formatarMoeda } from "@/utils/format";
import { rotuloMes } from "@/utils/date";
import { cn } from "@/lib/utils";

export function TabelaFluxo({
  resultado,
  limiteInicial = 12,
}: {
  resultado: ResultadoSimulacao;
  limiteInicial?: number;
}) {
  const [expandido, setExpandido] = useState(false);
  // Investors are paid every six months: only payment months are listed.
  const pagamentos = useMemo(
    () => resultado.fluxoMensal.filter((m) => m.receita > 0),
    [resultado.fluxoMensal],
  );
  const linhas = useMemo(
    () => (expandido ? pagamentos : pagamentos.slice(0, limiteInicial)),
    [pagamentos, expandido, limiteInicial],
  );

  if (!pagamentos.length) {
    return <p className="text-sm text-muted-foreground">Sem fluxo projetado.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[560px] overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="min-w-24">Pagamento</TableHead>
              {resultado.empreendimentos.map((e) => (
                <TableHead key={e.id} className="min-w-32 text-right">
                  {e.nome}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Corrigido</TableHead>
              <TableHead className="text-right">Acumulado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((mes) => (
              <TableRow key={mes.data}>
                <TableCell className="font-medium">{rotuloMes(mes.data)}</TableCell>
                {resultado.empreendimentos.map((e) => (
                  <TableCell key={e.id} className="numeric text-right text-muted-foreground">
                    {mes.porEmpreendimento[e.id]
                      ? formatarMoeda(mes.porEmpreendimento[e.id])
                      : "—"}
                  </TableCell>
                ))}
                <TableCell className="numeric text-right">{formatarMoeda(mes.receita)}</TableCell>
                <TableCell className="numeric text-right">
                  {formatarMoeda(mes.receitaCorrigida)}
                </TableCell>
                <TableCell className="numeric text-right font-medium">
                  {formatarMoeda(mes.acumulado)}
                </TableCell>
                <TableCell
                  className={cn(
                    "numeric text-right font-medium",
                    mes.saldo >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {formatarMoeda(mes.saldo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              {resultado.empreendimentos.map((e) => (
                <TableCell key={e.id} className="numeric text-right font-semibold">
                  {formatarMoeda(e.retornoInvestidor)}
                </TableCell>
              ))}
              <TableCell className="numeric text-right font-semibold">
                {formatarMoeda(resultado.totais.receitaTotal)}
              </TableCell>
              <TableCell className="numeric text-right font-semibold">
                {formatarMoeda(resultado.totais.receitaCorrigidaTotal)}
              </TableCell>
              <TableCell className="numeric text-right font-semibold">
                {formatarMoeda(resultado.totais.receitaCorrigidaTotal)}
              </TableCell>
              <TableCell className="numeric text-right font-semibold text-positive">
                {formatarMoeda(resultado.indicadores.lucro)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {pagamentos.length > limiteInicial ? (
        <Button variant="outline" size="sm" onClick={() => setExpandido((v) => !v)}>
          {expandido
            ? "Mostrar menos"
            : `Ver todos os ${pagamentos.length} pagamentos`}
        </Button>
      ) : null}
    </div>
  );
}
