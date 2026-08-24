import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CENARIOS_ORDEM } from "@/constants";
import { useSimulationStore } from "@/store/simulation-store";
import { cn } from "@/lib/utils";
import { formatarMoeda, formatarPercentual, parseNumeroInput } from "@/utils/format";
import { calcularValorInvestido } from "@/financial-engine";

export function PainelInvestimento() {
  const premissas = useSimulationStore((s) => s.premissas);
  const cenarios = useSimulationStore((s) => s.cenarios);
  const atualizarPremissas = useSimulationStore((s) => s.atualizarPremissas);

  const valorInvestido = calcularValorInvestido(premissas.valorCota, premissas.quantidadeCotas);
  const maxCotas = Math.max(1, Math.floor(premissas.valorCaptacao / premissas.valorCota));
  const cotasInteiras = Number.isInteger(premissas.quantidadeCotas) && premissas.quantidadeCotas > 0;

  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) inputRef.current?.select();
  }, [editando]);

  function iniciarEdicao() {
    setRascunho(formatarMoeda(valorInvestido));
    setEditando(true);
  }

  function confirmarEdicao() {
    const bruto = parseNumeroInput(rascunho);
    const limitado = Math.min(premissas.valorCaptacao, Math.max(0, bruto));
    if (limitado > 0) {
      atualizarPremissas({ quantidadeCotas: limitado / premissas.valorCota });
    }
    setEditando(false);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="surface-card grid gap-8 p-6 lg:grid-cols-[1.4fr_1fr]"
    >
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quanto você deseja investir
            </p>
            {editando ? (
              <input
                ref={inputRef}
                inputMode="numeric"
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onBlur={confirmarEdicao}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmarEdicao();
                  if (e.key === "Escape") setEditando(false);
                }}
                className="numeric mt-2 w-full max-w-[16ch] border-0 border-b border-primary/40 bg-transparent p-0 text-4xl font-light text-foreground outline-none focus:border-primary"
              />
            ) : (
              <button
                type="button"
                onClick={iniciarEdicao}
                title="Clique para digitar outro valor"
                className="numeric mt-2 block text-left text-4xl font-light text-gradient-brand transition-opacity hover:opacity-80"
              >
                {formatarMoeda(valorInvestido)}
              </button>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {cotasInteiras
                ? `${premissas.quantidadeCotas} ${premissas.quantidadeCotas === 1 ? "cota" : "cotas"} de ${formatarMoeda(premissas.valorCota)}`
                : "Valor de investimento personalizado"}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Slider
            value={[Math.min(Math.max(1, Math.round(premissas.quantidadeCotas)), maxCotas)]}
            min={1}
            max={maxCotas}
            step={1}
            onValueChange={([v]) => atualizarPremissas({ quantidadeCotas: v })}
          />
        </div>
      </div>


      <div className="space-y-5 lg:border-l lg:border-border lg:pl-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Cenário de vendas
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {CENARIOS_ORDEM.map((id) => {
              const ativo = premissas.cenarioAtivo === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => atualizarPremissas({ cenarioAtivo: id })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-all",
                    ativo
                      ? "border-primary/50 bg-primary/10 font-medium text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {cenarios[id].nome}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {cenarios[premissas.cenarioAtivo].descricao}
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <Label className="text-sm">Aplicar IPCA</Label>
            <p className="text-xs text-muted-foreground">
              {premissas.aplicarIpca
                ? `Correção de ${formatarPercentual(premissas.ipcaAnual)} a.a.`
                : "Fluxo em valores nominais"}
            </p>
          </div>
          <Switch
            checked={premissas.aplicarIpca}
            onCheckedChange={(v) => atualizarPremissas({ aplicarIpca: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <div>
            <Label className="text-sm">Antecipar recebimentos</Label>
            <p className="text-xs text-muted-foreground">
              Antecipa todos os recebimentos futuros para o primeiro pagamento semestral após a
              entrega do último empreendimento.
            </p>
          </div>
          <Switch
            checked={premissas.anteciparRecebimentos === true}
            onCheckedChange={(v) => atualizarPremissas({ anteciparRecebimentos: v })}
          />
        </div>
      </div>
    </motion.section>
  );
}
