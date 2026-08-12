import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatarMoeda, parseNumeroInput } from "@/utils/format";

interface BaseProps {
  label: string;
  hint?: string;
  className?: string;
}

export function CampoNumero({
  label,
  hint,
  valor,
  onChange,
  min = 0,
  step = 1,
  sufixo,
  className,
}: BaseProps & {
  valor: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  sufixo?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          className="numeric pr-12"
          value={Number.isFinite(valor) ? valor : 0}
          min={min}
          step={step}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
        />
        {sufixo ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {sufixo}
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CampoMoeda({
  label,
  hint,
  valor,
  onChange,
  className,
}: BaseProps & { valor: number; onChange: (v: number) => void }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        inputMode="numeric"
        className="numeric"
        value={formatarMoeda(valor)}
        onChange={(e) => onChange(parseNumeroInput(e.target.value))}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CampoPercentual({
  label,
  hint,
  valor,
  onChange,
  max = 100,
  className,
}: BaseProps & { valor: number; onChange: (v: number) => void; max?: number }) {
  return (
    <CampoNumero
      label={label}
      hint={hint}
      className={className}
      valor={Number((valor * 100).toFixed(2))}
      min={0}
      step={0.5}
      sufixo="%"
      onChange={(v) => onChange(Math.min(max, Math.max(0, v)) / 100)}
    />
  );
}

export function CampoTexto({
  label,
  hint,
  valor,
  onChange,
  className,
  tipo = "text",
}: BaseProps & { valor: string; onChange: (v: string) => void; tipo?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ValorDerivado({
  label,
  valor,
  hint,
  className,
}: BaseProps & { valor: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="numeric flex h-9 items-center rounded-md border border-dashed border-border bg-muted/40 px-3 text-sm font-medium">
        {valor}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
