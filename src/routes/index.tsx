import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/AppLayout";
import { SectionCard } from "@/components/common/SectionCard";
import { GradeIndicadores } from "@/features/dashboard/GradeIndicadores";
import { PainelInvestimento } from "@/features/dashboard/PainelInvestimento";
import { TabelaFluxo } from "@/features/dashboard/TabelaFluxo";
import { ComparativoCenarios } from "@/features/dashboard/ComparativoCenarios";
import { GraficoFluxoMensal } from "@/features/charts/GraficoFluxoMensal";
import { GraficoAcumulado } from "@/features/charts/GraficoAcumulado";
import { GraficoComparativo } from "@/features/charts/GraficoComparativo";
import { useHidratarSimulacao, useSimulacao } from "@/hooks/useSimulacao";

const titulo = "Antologia · Simulador de Permutas Imobiliárias";
const descricao =
  "Plataforma de simulação de investimentos em permutas imobiliárias da Antologia Incorporadora: fluxo de caixa, TIR anual e mensal, ROI e payback em tempo real.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: titulo },
      { name: "description", content: descricao },
      { property: "og:title", content: titulo },
      { property: "og:description", content: descricao },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  useHidratarSimulacao();
  const resultado = useSimulacao();

  return (
    <AppLayout>
      <div className="space-y-16">
        <section id="investimento" className="scroll-mt-24">
          <PainelInvestimento />
        </section>

        <div className="space-y-6">
          <SectionHeading
            kicker="Indicadores"
            titulo="Retorno do investidor"
            descricao="Resultado consolidado da participação nas premissas selecionadas."
          />
          <GradeIndicadores indicadores={resultado.indicadores} />
        </div>

        <SectionCard
          titulo="Recebimentos semestrais por empreendimento"
          descricao="Cada barra é um pagamento semestral ao investidor."
        >
          <GraficoFluxoMensal resultado={resultado} />
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <SectionCard
            titulo="Retorno acumulado"
            descricao="Crescimento do patrimônio em degraus semestrais, com payback e marcos de 50% e 100%."
          >
            <GraficoAcumulado resultado={resultado} />
          </SectionCard>
          <SectionCard
            titulo="Comparativo de empreendimentos"
            descricao="Retorno total entregue por cada empreendimento ao investidor."
          >
            <GraficoComparativo resultado={resultado} />
          </SectionCard>
        </div>

        <SectionCard
          titulo="Cenários de venda"
          descricao="Impacto da velocidade de vendas sobre os indicadores."
        >
          <ComparativoCenarios />
        </SectionCard>

        <SectionCard
          titulo="Fluxo detalhado"
          descricao="Cada linha é um pagamento semestral; cada coluna, um empreendimento."
        >
          <TabelaFluxo resultado={resultado} />
        </SectionCard>
      </div>
    </AppLayout>
  );
}

function SectionHeading({
  kicker,
  titulo,
  descricao,
}: {
  kicker: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <div>
      <p className="kicker text-primary">{kicker}</p>
      <h2 className="mt-3 font-display text-2xl font-normal">{titulo}</h2>
      <p className="mt-2 text-sm font-light text-muted-foreground">{descricao}</p>
    </div>
  );
}
