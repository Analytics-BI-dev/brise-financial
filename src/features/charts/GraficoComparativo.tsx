import { Bar, BarChart, Cell, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CORES_SERIES } from "@/constants";
import type { ResultadoSimulacao } from "@/types";
import { formatarMoeda, formatarPercentual } from "@/utils/format";

const FONTE_NUM = "var(--font-numeric)";

export function GraficoComparativo({ resultado }: { resultado: ResultadoSimulacao }) {
  const total = resultado.empreendimentos.reduce((a, e) => a + e.retornoInvestidor, 0);
  const dados = resultado.empreendimentos.map((e) => ({
    nome: e.nome,
    retorno: e.retornoInvestidor,
    participacao: total > 0 ? e.retornoInvestidor / total : 0,
  }));

  if (!dados.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Nenhum empreendimento ativo.
      </div>
    );
  }

  const maximo = Math.max(...dados.map((d) => d.retorno));

  const Rotulo = (props: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    index?: number;
  }) => {
    const x = Number(props.x ?? 0) + Number(props.width ?? 0) + 14;
    const y = Number(props.y ?? 0) + Number(props.height ?? 0) / 2;
    const item = dados[Number(props.index ?? 0)];
    if (!item) return null;
    return (
      <g>
        <text
          x={x}
          y={y - 3}
          fontFamily={FONTE_NUM}
          fontSize={14}
          fontWeight={500}
          fill="var(--color-foreground)"
        >
          {formatarMoeda(item.retorno)}
        </text>
        <text
          x={x}
          y={y + 13}
          fontFamily={FONTE_NUM}
          fontSize={11.5}
          fill="var(--color-muted-foreground)"
        >
          {formatarPercentual(item.participacao)} do retorno
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={64 * dados.length + 60}>
      <BarChart
        data={dados}
        layout="vertical"
        margin={{ top: 8, right: 156, left: 0, bottom: 0 }}
        barCategoryGap="34%"
      >
        <CartesianGrid strokeDasharray="2 6" horizontal={false} stroke="var(--color-border)" strokeOpacity={0.6} />
        <XAxis type="number" hide domain={[0, maximo * 1.02]} />
        <YAxis
          type="category"
          dataKey="nome"
          width={104}
          tick={{ fontSize: 13, fill: "var(--color-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Bar dataKey="retorno" name="Retorno do investidor" radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {dados.map((_, i) => (
            <Cell key={i} fill={CORES_SERIES[i % CORES_SERIES.length]} />
          ))}
          <LabelList dataKey="retorno" content={<Rotulo />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
