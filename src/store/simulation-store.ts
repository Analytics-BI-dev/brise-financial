import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CENARIOS_INICIAIS,
  EMPREENDIMENTOS_INICIAIS,
  PREMISSAS_INICIAIS,
} from "@/constants";
import type { Cenario, CenarioId, Empreendimento, PremissasGlobais } from "@/types";

interface SimulationState {
  premissas: PremissasGlobais;
  empreendimentos: Empreendimento[];
  cenarios: Record<CenarioId, Cenario>;
  atualizarPremissas: (patch: Partial<PremissasGlobais>) => void;
  atualizarEmpreendimento: (id: string, patch: Partial<Empreendimento>) => void;
  atualizarCenario: (id: CenarioId, patch: Partial<Cenario>) => void;
  atualizarDistribuicao: (id: CenarioId, ano: 0 | 1 | 2, valor: number) => void;
  restaurarPadrao: () => void;
}

const estadoInicial = () => ({
  premissas: { ...PREMISSAS_INICIAIS },
  empreendimentos: EMPREENDIMENTOS_INICIAIS.map((e) => ({ ...e })),
  cenarios: {
    otimista: {
      ...CENARIOS_INICIAIS.otimista,
      distribuicaoAnual: [...CENARIOS_INICIAIS.otimista.distribuicaoAnual] as [
        number,
        number,
        number,
      ],
    },
    esperado: {
      ...CENARIOS_INICIAIS.esperado,
      distribuicaoAnual: [...CENARIOS_INICIAIS.esperado.distribuicaoAnual] as [
        number,
        number,
        number,
      ],
    },
    pessimista: {
      ...CENARIOS_INICIAIS.pessimista,
      distribuicaoAnual: [...CENARIOS_INICIAIS.pessimista.distribuicaoAnual] as [
        number,
        number,
        number,
      ],
    },
  },
});

export const useSimulationStore = create<SimulationState>()(
  persist(
    (set) => ({
      ...estadoInicial(),

      atualizarPremissas: (patch) =>
        set((s) => ({ premissas: { ...s.premissas, ...patch } })),

      atualizarEmpreendimento: (id, patch) =>
        set((s) => ({
          empreendimentos: s.empreendimentos.map((e) =>
            e.id === id ? { ...e, ...patch, id: e.id, nome: e.nome } : e,
          ),
        })),

      atualizarCenario: (id, patch) =>
        set((s) => ({ cenarios: { ...s.cenarios, [id]: { ...s.cenarios[id], ...patch } } })),

      atualizarDistribuicao: (id, ano, valor) =>
        set((s) => {
          const atual = [...s.cenarios[id].distribuicaoAnual] as [number, number, number];
          atual[ano] = Math.min(1, Math.max(0, valor));
          return { cenarios: { ...s.cenarios, [id]: { ...s.cenarios[id], distribuicaoAnual: atual } } };
        }),

      restaurarPadrao: () => set(estadoInicial()),
    }),
    { name: "permuta-simulador-v5", skipHydration: true },
  ),
);
