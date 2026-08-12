import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/AppLayout";
import { SectionCard } from "@/components/common/SectionCard";
import { TabelaFluxo } from "@/features/dashboard/TabelaFluxo";
import { GraficoAcumulado } from "@/features/charts/GraficoAcumulado";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHidratarSimulacao, useSimulacao } from "@/hooks/useSimulacao";
import { formatarMoeda } from "@/utils/format";

const titulo = "Fluxo de caixa projetado | Permuta Capital";
const descricao =
  "Fluxo mensal e anual dos recebimentos do investidor, corrigidos pelo IPCA, em permutas imobiliárias.";

export const Route = createFileRoute("/fluxo")({
  head: () => ({
    meta: [
      { title: titulo },
      { name: "description", content: descricao },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descricao },
    ],
  }),
  component: FluxoPage,
});

function FluxoPage() {
  useHidratarSimulacao();
  const resultado = useSimulacao();

  return (
    <AppLayout>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-semibold">Fluxo de caixa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projeção completa da sua participação ao longo de {resultado.indicadores.duracaoMeses}{" "}
            meses.
          </p>
        </header>

        <SectionCard titulo="Evolução patrimonial">
          <GraficoAcumulado resultado={resultado} />
        </SectionCard>

        <SectionCard titulo="Consolidado anual">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ano</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Corrigida</TableHead>
                  <TableHead className="text-right">Acumulado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.fluxoAnual.map((ano) => (
                  <TableRow key={ano.ano}>
                    <TableCell className="font-medium">{ano.ano}</TableCell>
                    <TableCell className="numeric text-right">
                      {formatarMoeda(ano.receita)}
                    </TableCell>
                    <TableCell className="numeric text-right">
                      {formatarMoeda(ano.receitaCorrigida)}
                    </TableCell>
                    <TableCell className="numeric text-right font-medium">
                      {formatarMoeda(ano.acumulado)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard titulo="Detalhamento mensal">
          <TabelaFluxo resultado={resultado} limiteInicial={36} />
        </SectionCard>
      </div>
    </AppLayout>
  );
}
