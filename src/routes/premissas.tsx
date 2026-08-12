import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CampoPercentual } from "@/components/common/Campos";
import { CardsEmpreendimentos } from "@/features/empreendimentos/CardsEmpreendimentos";
import { useHidratarSimulacao } from "@/hooks/useSimulacao";
import { useSimulationStore } from "@/store/simulation-store";
import { CENARIOS_ORDEM } from "@/constants";
import { distribuicaoValida, taxaAnualParaMensal } from "@/financial-engine";
import { formatarPercentual } from "@/utils/format";

const titulo = "Premissas da simulação | Permuta Capital";
const descricao =
  "Ajuste unidades, valor médio, IPCA e cenários de venda do simulador de permutas Parque Brise.";

export const Route = createFileRoute("/premissas")({
  head: () => ({
    meta: [
      { title: titulo },
      { name: "description", content: descricao },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descricao },
    ],
  }),
  component: PremissasPage,
});

function PremissasPage() {
  useHidratarSimulacao();
  const premissas = useSimulationStore((s) => s.premissas);
  const cenarios = useSimulationStore((s) => s.cenarios);
  const atualizarPremissas = useSimulationStore((s) => s.atualizarPremissas);
  const atualizarDistribuicao = useSimulationStore((s) => s.atualizarDistribuicao);
  const restaurarPadrao = useSimulationStore((s) => s.restaurarPadrao);

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold">Premissas</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Toda alteração recalcula instantaneamente o motor financeiro.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={restaurarPadrao}>
            <RotateCcw className="size-4" />
            Restaurar padrão
          </Button>
        </header>

        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Empreendimentos</h2>
          <CardsEmpreendimentos />
        </section>

        <SectionCard titulo="Correção monetária">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 sm:col-span-2">
              <div>
                <Label className="text-sm">Aplicar IPCA ao fluxo</Label>
                <p className="text-xs text-muted-foreground">
                  Corrige todos os recebimentos futuros.
                </p>
              </div>
              <Switch
                checked={premissas.aplicarIpca}
                onCheckedChange={(v) => atualizarPremissas({ aplicarIpca: v })}
              />
            </div>
            <CampoPercentual
              label="IPCA anual"
              valor={premissas.ipcaAnual}
              onChange={(v) => atualizarPremissas({ ipcaAnual: v })}
              hint={`Equivale a ${formatarPercentual(
                taxaAnualParaMensal(premissas.ipcaAnual),
                3,
              )} ao mês`}
            />
          </div>
        </SectionCard>

        <SectionCard
          titulo="Cenários de venda"
          descricao="Distribuição das vendas nos três anos de obra. A soma deve ser exatamente 100%."
        >
          <div className="grid gap-5 lg:grid-cols-3">
            {CENARIOS_ORDEM.map((id) => {
              const cenario = cenarios[id];
              const soma = cenario.distribuicaoAnual.reduce((a, b) => a + (Number(b) || 0), 0);
              const valida = distribuicaoValida(cenario);
              return (
                <div key={id} className="space-y-4 rounded-xl border border-border p-4">
                  <div>
                    <p className="font-display text-sm font-semibold">{cenario.nome}</p>
                    <p className="text-xs text-muted-foreground">{cenario.descricao}</p>
                  </div>
                  {([0, 1, 2] as const).map((ano) => (
                    <CampoPercentual
                      key={ano}
                      label={`Ano ${ano + 1}`}
                      valor={cenario.distribuicaoAnual[ano]}
                      onChange={(v) => atualizarDistribuicao(id, ano, v)}
                    />
                  ))}
                  <p
                    className={
                      valida
                        ? "numeric text-xs text-muted-foreground"
                        : "numeric text-xs font-medium text-destructive"
                    }
                  >
                    Total: {formatarPercentual(soma, 1)}
                    {valida ? "" : " — a soma precisa ser 100%"}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </AppLayout>
  );
}
