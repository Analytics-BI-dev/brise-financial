import { CENARIOS_ORDEM } from "@/constants";
import { useSimulacaoPorCenario } from "@/hooks/useSimulacao";
import { useSimulationStore } from "@/store/simulation-store";
import { cn } from "@/lib/utils";
import { formatarMeses, formatarMoeda, formatarPercentual } from "@/utils/format";

export function ComparativoCenarios() {
  const cenarios = useSimulationStore((s) => s.cenarios);
  const ativo = useSimulationStore((s) => s.premissas.cenarioAtivo);
  const resultados = useSimulacaoPorCenario();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {CENARIOS_ORDEM.map((id) => {
        const r = resultados[id];
        const selecionado = id === ativo;
        return (
          <div
            key={id}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              selecionado ? "border-primary/50 bg-primary/5" : "border-border",
            )}
          >
            <p className="font-display text-sm font-semibold">{cenarios[id].nome}</p>
            <p className="mt-1 text-xs text-muted-foreground">{cenarios[id].descricao}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <Linha rotulo="Projetado" valor={formatarMoeda(r.indicadores.valorProjetado)} />
              <Linha rotulo="ROI" valor={formatarPercentual(r.indicadores.roi)} />
              <Linha rotulo="TIR" valor={formatarPercentual(r.indicadores.tir)} />
              <Linha rotulo="Payback" valor={formatarMeses(r.indicadores.paybackMeses)} />
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="numeric font-medium">{valor}</dd>
    </div>
  );
}
