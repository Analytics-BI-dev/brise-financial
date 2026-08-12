import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MarcoRetorno, ResultadoSimulacao } from "@/types";
import { formatarCompacto } from "@/utils/format";
import { rotuloMes } from "@/utils/date";
import { TooltipGrafico } from "./TooltipGrafico";
import { SemDados } from "./GraficoFluxoMensal";
import { agruparSemestres, semestreDoMarco, type SemestreFluxo } from "./semestres";

/**
 * Accumulated return in semester steps (investors are paid every 6 months).
 * Presentation only: the curve shows the entire schedule, up to the last
 * receipt (100% of the projected return).
 */
export function GraficoAcumulado({ resultado }: { resultado: ResultadoSimulacao }) {
  const { dados, marcos } = useMemo(() => {
    const semestres = agruparSemestres(resultado);
    if (!semestres.length) return { dados: [], marcos: [] };

    const serie = semestres.map((s) => ({
      mes: s.rotulo,
      acumulado: s.acumulado,
    }));

    const primeiro = semestres[0];
    const inicio: MarcoRetorno = {
      tipo: "percentual",
      rotulo: "Início dos recebimentos",
      data: primeiro.data,
      indice: primeiro.indiceFim,
      percentual: 0,
      acumulado: primeiro.acumulado,
    };

    const visiveis = [inicio, ...resultado.marcos]
      .filter((m) => !(m.tipo === "percentual" && m.percentual === 0.8)) // sem o marco de 80%
      .map((m) => ({ marco: m, semestre: semestreDoMarco(semestres, m) }))
      .filter(
        (item): item is { marco: MarcoRetorno; semestre: SemestreFluxo } => Boolean(item.semestre),
      );

    // Marcos próximos ou no mesmo semestre recebem deslocamento vertical e
    // horizontal no rótulo para nunca se sobreporem.
    const ocupados = new Map<string, number>();
    const comOffset = visiveis.map((item) => {
      const chave = item.semestre.rotulo;
      const ordem = ocupados.get(chave) ?? 0;
      ocupados.set(chave, ordem + 1);
      return { ...item, offset: ordem * -18, offsetX: ordem % 2 === 0 ? 0 : 26 };
    });

    return { dados: serie, marcos: comOffset };
  }, [resultado]);

  if (!dados.length) return <SemDados />;

  const cor = (m: MarcoRetorno) => (m.tipo === "payback" ? "var(--color-primary)" : "var(--color-foreground)");

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={dados} margin={{ top: 28, right: 46, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="var(--color-border)" strokeOpacity={0.8} />
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
          <Tooltip content={<TooltipGrafico />} />
          <ReferenceLine
            y={resultado.indicadores.valorInvestido}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="2 5"
            strokeOpacity={0.7}
            label={{
              value: "Capital investido",
              position: "insideTopLeft",
              fill: "var(--color-muted-foreground)",
              fontFamily: "var(--font-numeric)",
              fontSize: 12,
            }}
          />
          <Area
            type="stepAfter"
            dataKey="acumulado"
            name="Retorno acumulado"
            stroke="var(--color-chart-1)"
            strokeWidth={1.25}
            fill="url(#gradAcumulado)"
            dot={{ r: 2, strokeWidth: 0, fill: "var(--color-chart-1)" }}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
          />
          {marcos.map(({ marco, semestre }) => (
            <ReferenceLine
              key={`linha-${marco.tipo}-${marco.rotulo}`}
              x={semestre.rotulo}
              stroke={cor(marco)}
              strokeDasharray="2 5"
              strokeOpacity={marco.tipo === "payback" ? 0.75 : 0.35}
            />
          ))}
          {marcos.map(({ marco, semestre, offset, offsetX }) => (
            <ReferenceDot
              key={`${marco.tipo}-${marco.rotulo}`}
              x={semestre.rotulo}
              y={semestre.acumulado}
              r={3.5}
              fill={cor(marco)}
              stroke="var(--color-background)"
              strokeWidth={2}
              label={{
                value:
                  marco.tipo === "payback"
                    ? "Payback"
                    : marco.rotulo.replace(" recebido", "").replace("Início dos recebimentos", "Início"),
                position: "top",
                dy: offset,
                dx: offsetX,
                fontSize: 11.5,
                fontFamily: "var(--font-numeric)",
                fill: cor(marco),
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-[13px] font-light leading-relaxed text-muted-foreground">.</p>

      {marcos.length ? (
        <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] font-light text-muted-foreground">
          {marcos.map(({ marco }) => (
            <li key={`legenda-${marco.rotulo}`} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: cor(marco) }} />
              <span>
                {marco.rotulo} · <span className="numeric text-foreground">{rotuloMes(marco.data)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
