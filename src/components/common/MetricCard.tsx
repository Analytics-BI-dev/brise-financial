import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  valor: string;
  detalhe?: string;
  icon?: LucideIcon;
  destaque?: boolean;
  tom?: "neutro" | "positivo" | "negativo";
  index?: number;
}

export function MetricCard({
  label,
  valor,
  detalhe,
  icon: Icon,
  destaque = false,
  tom = "neutro",
  index = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
      className={cn(
        "surface-card relative overflow-hidden px-6 py-7",
        destaque && "border-primary/25",
      )}
    >
      {destaque ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "var(--gradient-brand)" }}
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <span className="kicker text-muted-foreground">{label}</span>
        {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.25} /> : null}
      </div>
      <p
        className={cn(
          "numeric mt-6 text-[2rem] leading-none font-light tracking-tight",
          destaque && "text-primary",
          tom === "positivo" && "text-positive",
          tom === "negativo" && "text-negative",
        )}
      >
        {valor}
      </p>
      {detalhe ? (
        <p className="mt-3 text-xs font-light text-muted-foreground">{detalhe}</p>
      ) : null}
    </motion.div>
  );
}
