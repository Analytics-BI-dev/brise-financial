import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-card p-6 sm:p-8", className)}>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-normal">{titulo}</h2>
          {descricao ? (
            <p className="mt-2 max-w-2xl text-sm font-light text-muted-foreground">{descricao}</p>
          ) : null}
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}
