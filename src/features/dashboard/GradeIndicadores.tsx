import {
  Banknote,
  CalendarClock,
  Hourglass,
  Gauge,
  Percent,
  PieChart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MetricCard } from "@/components/common/MetricCard";
import { useSimulationStore } from "@/store/simulation-store";
import type { IndicadoresInvestimento } from "@/types";
import { formatarMeses, formatarMoeda, formatarPercentual } from "@/utils/format";

export function GradeIndicadores({ indicadores }: { indicadores: IndicadoresInvestimento }) {
  const aplicarIpca = useSimulationStore((s) => s.premissas.aplicarIpca);
  const notaIpca = aplicarIpca ? "Retorno acrescido do IPCA" : "Valores nominais";

  const cards = [
    {
      label: "Valor investido",
      valor: formatarMoeda(indicadores.valorInvestido),
      detalhe: undefined,
      icon: Wallet,
    },
    {
      label: "Valor projetado",
      valor: formatarMoeda(indicadores.valorProjetado),
      detalhe: undefined,
      icon: Banknote,
      destaque: true,
    },
    {
      label: "Lucro",
      valor: formatarMoeda(indicadores.lucro),
      detalhe: `Múltiplo de ${indicadores.multiplo.toFixed(2).replace(".", ",")}x`,
      icon: TrendingUp,
      tom: indicadores.lucro >= 0 ? ("positivo" as const) : ("negativo" as const),
    },
    {
      label: "ROI",
      valor: formatarPercentual(indicadores.roi),
      detalhe: "Sobre o capital aportado",
      icon: Gauge,
      tom: indicadores.roi >= 0 ? ("positivo" as const) : ("negativo" as const),
    },
    {
      label: "TIR anual",
      valor: `${formatarPercentual(indicadores.tir, 2)} a.a.`,
      detalhe: notaIpca,
      icon: PieChart,
    },
    {
      label: "TIR mensal",
      valor: `${formatarPercentual(indicadores.tirMensal, 3)} a.m.`,
      detalhe: notaIpca,
      icon: Percent,
    },
    {
      label: "Payback",
      valor: formatarMeses(indicadores.paybackMeses),
      detalhe: "Até recuperar o aporte",
      icon: CalendarClock,
    },
    {
      label: "Prazo de recebimento",
      valor: formatarMeses(indicadores.prazoRecebimentoMeses),
      detalhe: "Tempo previsto para o recebimento integral do retorno projetado.",
      icon: Hourglass,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <MetricCard key={card.label} index={i} {...card} />
      ))}
    </div>
  );
}
