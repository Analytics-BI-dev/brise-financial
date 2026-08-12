import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Rolagem, StatusPill, Td, Th } from "./comum";
import { baixarCsv } from "./csv";
import type { Auditoria, LinhaReconciliacao, TesteValidacao } from "@/financial-engine/audit";
import { formatarMoeda } from "@/utils/format";

export function Reconciliacao({
  linhas,
  auditoria,
  testes,
}: {
  linhas: LinhaReconciliacao[];
  auditoria: Auditoria;
  testes: TesteValidacao[];
}) {
  const exportar = () => {
    const cabecalho = ["Métrica", "Valor calculado", "Valor exibido", "Diferença", "Status"];
    const corpo = linhas.map((l) => [l.metrica, l.calculado, l.exibido, l.diferenca, l.status]);
    const testesCsv = testes.map((t) => [t.grupo, t.nome, t.status, t.detalhe]);
    baixarCsv("relatorio-validacao", [
      cabecalho,
      ...corpo,
      [],
      ["Grupo", "Teste", "Status", "Detalhe"],
      ...testesCsv,
    ]);
  };

  return (
    <SectionCard
      titulo="Reconciliação"
      descricao="Comparação entre os valores recalculados nesta página e os valores exibidos no Dashboard, nos gráficos e no fluxo de caixa. Tolerância de arredondamento: R$ 0,05."
      acao={
        <Button variant="outline" size="sm" onClick={exportar}>
          Exportar relatório
        </Button>
      }
    >
      <Rolagem altura="max-h-[420px]">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <Th>Métrica</Th>
              <Th>Valor calculado</Th>
              <Th>Valor exibido</Th>
              <Th>Diferença</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.metrica} className="hover:bg-muted/30">
                <Td className="text-muted-foreground">{l.metrica}</Td>
                <Td>{formatarMoeda(l.calculado, true)}</Td>
                <Td>{formatarMoeda(l.exibido, true)}</Td>
                <Td negativo={l.status === "divergencia"}>{formatarMoeda(l.diferenca, true)}</Td>
                <Td>
                  <StatusPill status={l.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Rolagem>
      <p className="numeric mt-4 text-xs text-muted-foreground">
        Total recalculado do investidor: {formatarMoeda(auditoria.totalInvestidor, true)}
      </p>
    </SectionCard>
  );
}

export function TestesAutomaticos({ testes }: { testes: TesteValidacao[] }) {
  const grupos = [...new Set(testes.map((t) => t.grupo))];
  const falhas = testes.filter((t) => t.status === "divergencia").length;

  return (
    <SectionCard
      titulo="Validação automática das regras"
      descricao={
        falhas
          ? `${falhas} verificação(ões) com divergência.`
          : "Todas as verificações passaram com os parâmetros atuais."
      }
    >
      <div className="space-y-6">
        {grupos.map((grupo) => (
          <div key={grupo}>
            <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {grupo}
            </p>
            <div className="space-y-1.5">
              {testes
                .filter((t) => t.grupo === grupo)
                .map((t, i) => (
                  <div
                    key={`${t.nome}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/15 px-3 py-2"
                  >
                    <span className="text-xs font-light">{t.nome}</span>
                    <span className="flex items-center gap-3">
                      <span className="numeric text-[11px] text-muted-foreground">{t.detalhe}</span>
                      <StatusPill status={t.status} />
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
