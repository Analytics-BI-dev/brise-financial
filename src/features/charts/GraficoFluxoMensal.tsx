import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CORES_SERIES } from "@/constants";
import type { ResultadoSimulacao } from "@/types";
import { formatarCompacto, formatarMoeda } from "@/utils/format";
import { rotuloMes } from "@/utils/date";
import { TooltipGrafico } from "./TooltipGrafico";
import { agruparSemestres } from "./semestres";

export function GraficoFluxoMensal({ resultado }: { resultado: ResultadoSimulacao }) {
  const { dados, rotuloAntecipacao } = useMemo(() => {
    const semestres = agruparSemestres(resultado);
    const alvo = resultado.antecipacao?.ativa ? resultado.antecipacao.dataCorte : null;
    return {
      dados: semestres.map((s) => ({
        mes: s.rotulo,
        antecipado: alvo !== null && s.data === alvo,
        ...s.porEmpreendimento,
      })),
      rotuloAntecipacao: alvo ? rotuloMes(alvo) : null,
    };
  }, [resultado]);

  if (!dados.length) return <SemDados />;

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="18%">
          <CartesianGrid
            strokeDasharray="2 6"
            vertical={false}
            stroke="var(--color-border)"
            strokeOpacity={0.8}
          />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 12, fontFamily: "var(--font-numeric)", fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={12}
          />
          <YAxis
            tickFormatter={(v) => formatarCompacto(Number(v))}
            tick={{ fontSize: 12, fontFamily: "var(--font-numeric)", fill: "var(--color-muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={86}
          />
          <Tooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.35 }}
            content={({ active, payload, label }) => (
              <TooltipGrafico
                active={active}
                payload={payload as never}
                label={label as never}
                rodape={(p) => (
                  <div className="space-y-1">
                    <div className="flex justify-between gap-6 text-xs">
                      <span className="text-muted-foreground">Total do semestre</span>
                      <span className="numeric font-medium">
                        {formatarMoeda(p.reduce((a, i) => a + Number(i.value), 0))}
                      </span>
                    </div>
                    {rotuloAntecipacao && label === rotuloAntecipacao ? (
                      <p className="text-xs text-primary">Inclui recebimentos futuros antecipados.</p>
                    ) : null}
                  </div>
                )}
              />
            )}
          />
          <Legend
            wrapperStyle={{ fontSize: 13, paddingTop: 18, letterSpacing: "0.04em" }}
            iconType="square"
            iconSize={7}
          />
          {resultado.empreendimentos.map((e, i) => (
            <Bar
              key={e.id}
              dataKey={e.id}
              name={e.nome}
              stackId="fluxo"
              fill={CORES_SERIES[i % CORES_SERIES.length]}
            >
              {dados.map((d, j) => (
                <Cell
                  key={j}
                  fill={CORES_SERIES[i % CORES_SERIES.length]}
                  fillOpacity={d.antecipado ? 1 : 0.85}
                  stroke={d.antecipado ? "var(--color-primary)" : undefined}
                  strokeWidth={d.antecipado ? 1 : 0}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {rotuloAntecipacao ? (
        <p className="text-[13px] font-light text-muted-foreground">
          O pagamento de <span className="numeric text-foreground">{rotuloAntecipacao}</span> inclui
          todos os recebimentos futuros antecipados.
        </p>
      ) : null}
    </div>
  );
}

export function SemDados() {
  return (
    <div className="flex h-[320px] items-center justify-center text-sm font-light text-muted-foreground">
      Sem fluxo projetado para as premissas atuais.
    </div>
  );
}
