import { useEffect, useMemo, useState } from "react";
import { simular } from "@/financial-engine";
import { useSimulationStore } from "@/store/simulation-store";
import type { ResultadoSimulacao } from "@/types";

/** Rehydrates the persisted store on the client only (SSR-safe). */
export function useHidratarSimulacao() {
  const [hidratado, setHidratado] = useState(false);
  useEffect(() => {
    void useSimulationStore.persist.rehydrate();
    setHidratado(true);
  }, []);
  return hidratado;
}

/**
 * The one bridge between the UI and the financial engine.
 * Components never compute anything themselves — they read this result.
 */
export function useSimulacao(): ResultadoSimulacao {
  const premissas = useSimulationStore((s) => s.premissas);
  const empreendimentos = useSimulationStore((s) => s.empreendimentos);
  const cenarios = useSimulationStore((s) => s.cenarios);

  return useMemo(
    () =>
      simular({
        premissas,
        empreendimentos,
        cenario: cenarios[premissas.cenarioAtivo],
      }),
    [premissas, empreendimentos, cenarios],
  );
}

/** Runs the engine for every scenario — used by the comparison views. */
export function useSimulacaoPorCenario(): Record<string, ResultadoSimulacao> {
  const premissas = useSimulationStore((s) => s.premissas);
  const empreendimentos = useSimulationStore((s) => s.empreendimentos);
  const cenarios = useSimulationStore((s) => s.cenarios);

  return useMemo(() => {
    const saida: Record<string, ResultadoSimulacao> = {};
    for (const cenario of Object.values(cenarios)) {
      saida[cenario.id] = simular({ premissas, empreendimentos, cenario });
    }
    return saida;
  }, [premissas, empreendimentos, cenarios]);
}
