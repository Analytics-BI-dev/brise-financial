import type { ReactNode } from "react";
import { formatarMoeda } from "@/utils/format";

interface Item {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

export function TooltipGrafico({
  active,
  payload,
  label,
  formatar = (v: number) => formatarMoeda(v),
  rodape,
}: {
  active?: boolean;
  payload?: Item[];
  label?: ReactNode;
  formatar?: (v: number) => string;
  rodape?: (payload: Item[]) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  const visiveis = payload.filter((p) => Number(p.value) !== 0);
  if (!visiveis.length) return null;

  return (
    <div className="rounded-lg border border-primary/40 bg-neutral-950/95 p-3.5 text-[13px] shadow-xl backdrop-blur">
      <p className="font-display mb-2.5 text-sm tracking-wide text-neutral-100">{label}</p>
      <ul className="space-y-1.5">
        {visiveis.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-neutral-400">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: p.color ?? "var(--color-primary)" }}
              />
              {p.name}
            </span>
            <span className="numeric font-medium text-neutral-50">
              {formatar(Number(p.value))}
            </span>
          </li>
        ))}
      </ul>
      {rodape ? <div className="mt-2.5 border-t border-primary/25 pt-2.5 text-neutral-300">{rodape(visiveis)}</div> : null}
    </div>
  );
}
