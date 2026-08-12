import type { ReactNode } from "react";
import type { StatusValidacao } from "@/financial-engine/audit";
import { cn } from "@/lib/utils";

const CLASSES: Record<StatusValidacao, string> = {
  ok: "border-emerald-500/40 text-emerald-500",
  arredondamento: "border-amber-500/40 text-amber-500",
  divergencia: "border-red-500/50 text-red-500",
};

const ROTULOS: Record<StatusValidacao, string> = {
  ok: "OK",
  arredondamento: "Arredondamento",
  divergencia: "Divergência",
};

export function StatusPill({ status }: { status: StatusValidacao }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
        CLASSES[status],
      )}
    >
      {ROTULOS[status]}
    </span>
  );
}

export function Dado({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className="space-y-1 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{rotulo}</p>
      <p className={cn("numeric text-sm", destaque && "text-primary")}>{valor}</p>
    </div>
  );
}

/** Horizontally scrollable table shell with a sticky header. */
export function Rolagem({
  children,
  altura = "max-h-[560px]",
}: {
  children: ReactNode;
  altura?: string;
}) {
  return (
    <div className={cn("overflow-auto rounded-md border border-border/60", altura)}>{children}</div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-background px-3 py-2 text-left text-[10px] font-normal uppercase tracking-[0.12em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  negativo,
}: {
  children: ReactNode;
  className?: string;
  negativo?: boolean;
}) {
  return (
    <td
      className={cn(
        "numeric whitespace-nowrap border-b border-border/40 px-3 py-1.5 text-xs",
        negativo && "text-red-500",
        className,
      )}
    >
      {children}
    </td>
  );
}
