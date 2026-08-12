import { SectionCard } from "@/components/common/SectionCard";
import {
  CampoMoeda,
  CampoNumero,
  CampoTexto,
  ValorDerivado,
} from "@/components/common/Campos";
import { mesDeEntrega } from "@/financial-engine";
import { useSimulacao } from "@/hooks/useSimulacao";
import { useSimulationStore } from "@/store/simulation-store";
import { formatarMoeda } from "@/utils/format";
import { rotuloMes } from "@/utils/date";

/**
 * Editable portfolio cards. Units, average unit price and the launch month are
 * editable — VGV, delivery (launch + 36 months) and the investor return are
 * always derived by the financial engine.
 */
export function CardsEmpreendimentos() {
  const empreendimentos = useSimulationStore((s) => s.empreendimentos);
  const atualizar = useSimulationStore((s) => s.atualizarEmpreendimento);
  const resultado = useSimulacao();

  const retornoPorId = new Map<string, number>(
    resultado.empreendimentos.map((e) => [e.id, e.retornoInvestidor] as const),
  );
  const vgvPorId = new Map<string, number>(
    resultado.empreendimentos.map((e) => [e.id, e.vgv] as const),
  );

  return (
    <div className="space-y-4">
      {empreendimentos.map((e) => (
        <SectionCard key={e.id} titulo={e.nome}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <CampoNumero
              label="Unidades"
              valor={e.numeroUnidades}
              min={0}
              onChange={(v) => atualizar(e.id, { numeroUnidades: v })}
            />
            <CampoMoeda
              label="Valor médio da unidade"
              valor={e.valorMedioUnidade}
              onChange={(v) => atualizar(e.id, { valorMedioUnidade: v })}
            />
            <CampoTexto
              label="Lançamento"
              tipo="month"
              valor={e.dataLancamento}
              onChange={(v) => atualizar(e.id, { dataLancamento: v || e.dataLancamento })}
              hint={`Entrega: ${rotuloMes(mesDeEntrega(e.dataLancamento))}`}
            />
            <ValorDerivado
              label="VGV"
              valor={formatarMoeda(vgvPorId.get(e.id) ?? 0)}
              hint="Unidades × valor médio corrigido"
            />
            <ValorDerivado
              label="Retorno do investidor"
              valor={formatarMoeda(retornoPorId.get(e.id) ?? 0)}
              hint="Permuta × participação"
            />
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
