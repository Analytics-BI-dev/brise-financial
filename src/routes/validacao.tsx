import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/layouts/AppLayout";
import { SectionCard } from "@/components/common/SectionCard";
import { Label } from "@/components/ui/label";
import { Dado } from "@/features/validacao/comum";
import { CardRegra, AuditoriaLotes } from "@/features/validacao/AuditoriaLotes";
import { TabelaMemoria } from "@/features/validacao/TabelaMemoria";
import { TabelaRecebimentos } from "@/features/validacao/TabelaRecebimentos";
import { Consolidacao } from "@/features/validacao/Consolidacao";
import { Reconciliacao, TestesAutomaticos } from "@/features/validacao/Reconciliacao";
import { Homologacao, TesteIpca } from "@/features/validacao/Homologacao";
import { Formulas } from "@/features/validacao/Formulas";
import { MemoriaAntecipacao } from "@/features/validacao/MemoriaAntecipacao";
import {
  auditar,
  consolidarLinhas,
  executarTestes,
  reconciliar,
} from "@/financial-engine/audit";
import { simular, taxaAnualParaMensal } from "@/financial-engine";
import { ROTULOS_REGRA } from "@/financial-engine/rules";
import { useHidratarSimulacao } from "@/hooks/useSimulacao";
import { useSimulationStore } from "@/store/simulation-store";
import { CENARIOS_ORDEM } from "@/constants";
import type { CenarioId } from "@/types";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/utils/format";
import { mesAbsoluto, rotuloMes } from "@/utils/date";

export const Route = createFileRoute("/validacao")({
  head: () => ({
    meta: [
      { title: "Validação dos cálculos — Simulador Antologia" },
      {
        name: "description",
        content:
          "Auditoria completa do motor financeiro: memória de cálculo mensal, regras de recebimento, consolidação semestral e reconciliação com o dashboard.",
      },
      { property: "og:title", content: "Validação dos cálculos — Simulador Antologia" },
      {
        property: "og:description",
        content: "Homologue cada valor do simulador de permutas, mês a mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ValidacaoPage,
});

type Escopo = string;

function ValidacaoPage() {
  const hidratado = useHidratarSimulacao();
  const premissas = useSimulationStore((s) => s.premissas);
  const empreendimentos = useSimulationStore((s) => s.empreendimentos);
  const cenarios = useSimulationStore((s) => s.cenarios);

  const [escopo, setEscopo] = useState<Escopo>("consolidado");
  const [cenarioId, setCenarioId] = useState<CenarioId>(premissas.cenarioAtivo);
  const [ipcaFiltro, setIpcaFiltro] = useState<"herdar" | "ligado" | "desligado">("herdar");
  const [visao, setVisao] = useState<"empreendimento" | "investidor">("investidor");
  const [granularidade, setGranularidade] = useState<"mensal" | "semestral">("mensal");
  const [ano, setAno] = useState<string>("todos");
  const [mesInicial, setMesInicial] = useState("");
  const [mesFinal, setMesFinal] = useState("");

  const entrada = useMemo(() => {
    const cenario = cenarios[cenarioId] ?? cenarios[premissas.cenarioAtivo];
    return {
      premissas: {
        ...premissas,
        aplicarIpca: ipcaFiltro === "herdar" ? premissas.aplicarIpca : ipcaFiltro === "ligado",
      },
      empreendimentos,
      cenario,
    };
  }, [premissas, empreendimentos, cenarios, cenarioId, ipcaFiltro]);

  const auditoria = useMemo(() => auditar(entrada), [entrada]);
  const resultado = useMemo(() => simular(entrada), [entrada]);
  const testes = useMemo(() => executarTestes(auditoria, resultado), [auditoria, resultado]);
  const reconciliacao = useMemo(() => reconciliar(auditoria, resultado), [auditoria, resultado]);

  const memoria = auditoria.memorias.find((m) => m.id === escopo) ?? null;

  const linhas = useMemo(() => {
    const base = memoria ? memoria.linhas : consolidarLinhas(auditoria.memorias);
    const inicio = mesInicial ? mesAbsoluto(mesInicial) : -Infinity;
    const fim = mesFinal ? mesAbsoluto(mesFinal) : Infinity;
    return base.filter((l) => {
      if (l.mesAbs < inicio || l.mesAbs > fim) return false;
      if (ano !== "todos" && memoria) {
        const anoObra = Math.floor(l.offset / 12) + 1;
        if (String(anoObra) !== ano) return false;
      }
      return true;
    });
  }, [memoria, auditoria, mesInicial, mesFinal, ano]);

  const empreendimentoBase = empreendimentos.find((e) => e.id === escopo);
  const cenarioAtual = cenarios[cenarioId];
  const ipcaAtivo = entrada.premissas.aplicarIpca;
  const taxaMensal = ipcaAtivo ? taxaAnualParaMensal(entrada.premissas.ipcaAnual) : 0;

  if (!hidratado) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground">Carregando premissas…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Homologação
            </p>
            <h1 className="font-display text-3xl font-normal">Validação dos cálculos</h1>
            <p className="mt-2 max-w-3xl text-sm font-light text-muted-foreground">
              Visão transparente do motor financeiro. Nenhum cálculo é refeito aqui: a página
              reproduz as mesmas funções usadas pelo Dashboard e pelo Fluxo de caixa, expondo cada
              etapa intermediária.
            </p>
          </div>
          <Formulas />
        </header>

        <SectionCard
          titulo="Premissas da simulação"
          descricao="A participação financeira interna é usada nos cálculos mesmo quando não aparece no Dashboard."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Dado rotulo="Empreendimento selecionado" valor={memoria ? memoria.nome : "Consolidado geral"} />
            <Dado rotulo="Cenário" valor={cenarioAtual?.nome ?? "—"} />
            <Dado rotulo="Valor investido" valor={formatarMoeda(auditoria.contexto.valorInvestido)} />
            <Dado rotulo="Valor da cota" valor={formatarMoeda(premissas.valorCota)} />
            <Dado rotulo="Quantidade de cotas" valor={formatarNumero(premissas.quantidadeCotas)} />
            <Dado rotulo="Captação total interna" valor={formatarMoeda(premissas.valorCaptacao)} />
            <Dado
              rotulo="Participação interna"
              destaque
              valor={formatarPercentual(auditoria.contexto.participacao, 4)}
            />
            <Dado rotulo="Correção monetária pelo IPCA" valor={ipcaAtivo ? "Ligada" : "Desligada"} />
            <Dado rotulo="IPCA anual" valor={formatarPercentual(premissas.ipcaAnual, 2)} />
            <Dado rotulo="Taxa mensal equivalente" valor={formatarPercentual(taxaMensal, 4)} />
            <Dado
              rotulo="Percentuais de venda"
              valor={(cenarioAtual?.distribuicaoAnual ?? [0, 0, 0])
                .map((v) => formatarPercentual(v, 0))
                .join(" · ")}
            />
            {memoria ? (
              <>
                <Dado rotulo="Unidades" valor={formatarNumero(memoria.numeroUnidades)} />
                <Dado
                  rotulo="Valor médio inicial da unidade"
                  valor={formatarMoeda(memoria.valorMedioUnidade)}
                />
                <Dado rotulo="Lançamento" valor={rotuloMes(memoria.dataLancamento)} />
                <Dado rotulo="Entrega" valor={rotuloMes(memoria.dataEntrega)} />
                <Dado
                  rotulo="Percentual de permuta"
                  valor={formatarPercentual(memoria.percentualPermuta, 2)}
                />
                <Dado rotulo="Regra de recebimento" valor={ROTULOS_REGRA[memoria.regra]} />
              </>
            ) : (
              <>
                <Dado
                  rotulo="Unidades (portfólio)"
                  valor={formatarNumero(
                    auditoria.memorias.reduce((a, m) => a + m.numeroUnidades, 0),
                  )}
                />
                <Dado
                  rotulo="Empreendimentos ativos"
                  valor={auditoria.memorias.map((m) => m.nome).join(", ")}
                />
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard titulo="Filtros da validação">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Seletor
              label="Empreendimento"
              valor={escopo}
              onChange={setEscopo}
              opcoes={[
                ...auditoria.memorias.map((m) => ({ valor: m.id, rotulo: m.nome })),
                { valor: "consolidado", rotulo: "Consolidado geral" },
              ]}
            />
            <Seletor
              label="Cenário"
              valor={cenarioId}
              onChange={(v) => setCenarioId(v as CenarioId)}
              opcoes={CENARIOS_ORDEM.map((id) => ({ valor: id, rotulo: cenarios[id].nome }))}
            />
            <Seletor
              label="Ano da obra"
              valor={ano}
              onChange={setAno}
              opcoes={[
                { valor: "todos", rotulo: "Todos" },
                { valor: "1", rotulo: "Ano 1" },
                { valor: "2", rotulo: "Ano 2" },
                { valor: "3", rotulo: "Ano 3" },
              ]}
            />
            <Seletor
              label="Correção pelo IPCA"
              valor={ipcaFiltro}
              onChange={(v) => setIpcaFiltro(v as typeof ipcaFiltro)}
              opcoes={[
                { valor: "herdar", rotulo: "Como nas premissas" },
                { valor: "ligado", rotulo: "Ligado" },
                { valor: "desligado", rotulo: "Desligado" },
              ]}
            />
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Mês inicial
              </Label>
              <input
                type="month"
                value={mesInicial}
                onChange={(e) => setMesInicial(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Mês final
              </Label>
              <input
                type="month"
                value={mesFinal}
                onChange={(e) => setMesFinal(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              />
            </div>
            <Seletor
              label="Exibir valores"
              valor={visao}
              onChange={(v) => setVisao(v as typeof visao)}
              opcoes={[
                { valor: "investidor", rotulo: "Do investidor" },
                { valor: "empreendimento", rotulo: "Do empreendimento" },
              ]}
            />
            <Seletor
              label="Granularidade"
              valor={granularidade}
              onChange={(v) => setGranularidade(v as typeof granularidade)}
              opcoes={[
                { valor: "mensal", rotulo: "Mensal" },
                { valor: "semestral", rotulo: "Semestral" },
              ]}
            />
          </div>
        </SectionCard>

        {memoria ? <CardRegra memoria={memoria} /> : null}

        {granularidade === "mensal" ? (
          <TabelaMemoria linhas={linhas} memoria={memoria} visao={visao} />
        ) : null}

        {memoria ? <AuditoriaLotes memoria={memoria} /> : null}
        {memoria && (memoria.regra === "brise" || memoria.regra === "coliv") ? (
          <TabelaRecebimentos memoria={memoria} />
        ) : null}

        <Consolidacao auditoria={auditoria} />
        <SectionCard
          titulo="Memória de cálculo da antecipação"
          descricao="Transferência dos recebimentos em aberto para o primeiro pagamento semestral após a última entrega. Nenhum desconto é aplicado: apenas as datas mudam."
        >
          <MemoriaAntecipacao auditoria={auditoria} resultado={resultado} />
        </SectionCard>
        <Reconciliacao linhas={reconciliacao} auditoria={auditoria} testes={testes} />
        <TestesAutomaticos testes={testes} />
        <Homologacao />
        <TesteIpca />

        {empreendimentoBase ? null : null}
      </div>
    </AppLayout>
  );
}

function Seletor({
  label,
  valor,
  onChange,
  opcoes,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
