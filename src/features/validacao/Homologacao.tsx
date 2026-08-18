import { useMemo, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CampoMoeda, CampoNumero, CampoPercentual, CampoTexto } from "@/components/common/Campos";
import { Rolagem, StatusPill, Td, Th } from "./comum";
import { auditar, statusDaDiferenca } from "@/financial-engine/audit";
import { taxaAnualParaMensal } from "@/financial-engine";
import { PREMISSAS_INICIAIS } from "@/constants";
import type { Cenario, Empreendimento, PremissasGlobais, RegraRecebimentoId } from "@/types";
import { formatarMoeda, formatarPercentual } from "@/utils/format";
import { rotuloMes } from "@/utils/date";

interface Config {
  regra: RegraRecebimentoId;
  nome: string;
  unidades: number;
  valorUnidade: number;
  lancamento: string;
  distribuicao: [number, number, number];
  aplicarIpca: boolean;
  ipcaAnual: number;
  valorInvestido: number;
  permuta: number;
  captacao: number;
}

const PADRAO: Config = {
  regra: "brise",
  nome: "Brise",
  unidades: 120,
  valorUnidade: 600_000,
  lancamento: "2027-02",
  distribuicao: [0.5, 0.35, 0.15],
  aplicarIpca: false,
  ipcaAnual: 0.045,
  valorInvestido: PREMISSAS_INICIAIS.valorCota * PREMISSAS_INICIAIS.quantidadeCotas,
  permuta: 0.264,
  captacao: PREMISSAS_INICIAIS.valorCaptacao,
};

const TESTES_RAPIDOS: { nome: string; config: Config; esperado: number }[] = [
  {
    nome: "Teste Brise",
    config: { ...PADRAO },
    esperado: 7445,
  },
  {
    nome: "Teste Coliv",
    config: {
      ...PADRAO,
      regra: "coliv",
      nome: "Coliv",
      valorUnidade: 1_500_000,
      lancamento: "2030-02",
      permuta: 0.1056,
    },
    esperado: 7278,
  },
];

function rodar(config: Config) {
  const premissas: PremissasGlobais = {
    ...PREMISSAS_INICIAIS,
    valorCaptacao: config.captacao,
    valorCota: config.valorInvestido,
    quantidadeCotas: 1,
    aplicarIpca: config.aplicarIpca,
    ipcaAnual: config.ipcaAnual,
  };
  const empreendimento: Empreendimento = {
    id: "homologacao",
    nome: config.nome,
    numeroUnidades: config.unidades,
    valorMedioUnidade: config.valorUnidade,
    percentualPermuta: config.permuta,
    dataLancamento: config.lancamento,
    regraRecebimento: config.regra,
    ativo: true,
  };
  const cenario: Cenario = {
    id: "esperado",
    nome: "Homologação",
    descricao: "Cenário de teste",
    distribuicaoAnual: config.distribuicao,
  };
  return auditar({ premissas, empreendimentos: [empreendimento], cenario });
}

export function Homologacao() {
  const [config, setConfig] = useState<Config>(PADRAO);
  const [esperado, setEsperado] = useState<number>(7445);
  const [executado, setExecutado] = useState<{ calculado: number; esperado: number } | null>(null);

  const auditoria = useMemo(() => rodar(config), [config]);
  const primeiroSemestre = auditoria.semestres[0];

  const set = <K extends keyof Config>(chave: K, valor: Config[K]) =>
    setConfig((c) => ({ ...c, [chave]: valor }));

  return (
    <SectionCard
      titulo="Cenário de homologação"
      descricao="Substitui temporariamente as premissas apenas para teste. As configurações oficiais do simulador não são alteradas."
      acao={
        <div className="flex gap-2">
          {TESTES_RAPIDOS.map((t) => (
            <Button
              key={t.nome}
              variant="outline"
              size="sm"
              onClick={() => {
                setConfig(t.config);
                setEsperado(t.esperado);
                setExecutado(null);
              }}
            >
              {t.nome}
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Regra / empreendimento
          </Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={config.regra}
            onChange={(e) => set("regra", e.target.value as RegraRecebimentoId)}
          >
            <option value="brise">Brise</option>
            <option value="coliv">Coliv</option>
            <option value="antes-da-entrega">Alento / Miradas</option>
          </select>
        </div>
        <CampoNumero
          label="Unidades"
          valor={config.unidades}
          onChange={(v) => set("unidades", v)}
        />
        <CampoMoeda
          label="Valor da unidade"
          valor={config.valorUnidade}
          onChange={(v) => set("valorUnidade", v)}
        />
        <CampoTexto
          label="Lançamento"
          tipo="month"
          valor={config.lancamento}
          onChange={(v) => set("lancamento", v || config.lancamento)}
        />
        {[0, 1, 2].map((i) => (
          <CampoPercentual
            key={i}
            label={`Ano ${i + 1}`}
            valor={config.distribuicao[i]}
            onChange={(v) => {
              const d = [...config.distribuicao] as [number, number, number];
              d[i] = v;
              set("distribuicao", d);
            }}
          />
        ))}
        <CampoPercentual
          label="Permuta"
          valor={config.permuta}
          onChange={(v) => set("permuta", v)}
        />
        <CampoMoeda
          label="Valor investido"
          valor={config.valorInvestido}
          onChange={(v) => set("valorInvestido", v)}
        />
        <CampoMoeda
          label="Captação (participação)"
          valor={config.captacao}
          onChange={(v) => set("captacao", v)}
        />
        <CampoPercentual
          label="IPCA anual"
          valor={config.ipcaAnual}
          max={200}
          onChange={(v) => set("ipcaAnual", v)}
        />
        <div className="flex items-end gap-3 pb-2">
          <Switch
            checked={config.aplicarIpca}
            onCheckedChange={(v) => set("aplicarIpca", v)}
            id="ipca-homologacao"
          />
          <Label htmlFor="ipca-homologacao" className="text-xs uppercase tracking-wider">
            Aplicar IPCA
          </Label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <CampoMoeda
          label="Resultado esperado (1º semestre)"
          valor={esperado}
          onChange={setEsperado}
          className="w-64"
        />
        <Button
          className="mt-5"
          onClick={() => setExecutado({ calculado: primeiroSemestre?.total ?? 0, esperado })}
        >
          Executar teste
        </Button>
      </div>

      {executado ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Resultado rotulo="Esperado" valor={formatarMoeda(executado.esperado, true)} />
          <Resultado rotulo="Calculado" valor={formatarMoeda(executado.calculado, true)} />
          <Resultado
            rotulo="Diferença"
            valor={formatarMoeda(executado.calculado - executado.esperado, true)}
          />
          <div className="flex items-center rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
            <StatusPill
              status={
                Math.abs(executado.calculado - executado.esperado) <= 1
                  ? "ok"
                  : statusDaDiferenca(executado.calculado - executado.esperado)
              }
            />
          </div>
        </div>
      ) : null}

      <p className="numeric mt-6 text-xs text-muted-foreground">
        Primeiro pagamento simulado: {primeiroSemestre ? rotuloMes(primeiroSemestre.data) : "—"} ·{" "}
        {formatarMoeda(primeiroSemestre?.total ?? 0, true)} · participação{" "}
        {formatarPercentual(auditoria.contexto.participacao, 4)}
      </p>
    </SectionCard>
  );
}

function Resultado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{rotulo}</p>
      <p className="numeric mt-1 text-sm">{valor}</p>
    </div>
  );
}

/** Dedicated IPCA test: Alento, 12 units, 100k, all sales in year 3. */
export function TesteIpca() {
  const [ipca, setIpca] = useState(0.12);

  const auditoria = useMemo(
    () =>
      rodar({
        ...PADRAO,
        regra: "antes-da-entrega",
        nome: "Alento",
        unidades: 12,
        valorUnidade: 100_000,
        lancamento: "2027-01",
        distribuicao: [0, 0, 1],
        aplicarIpca: ipca > 0,
        ipcaAnual: ipca,
      }),
    [ipca],
  );

  const memoria = auditoria.memorias[0];
  const taxaMensal = ipca > 0 ? taxaAnualParaMensal(ipca) : 0;

  return (
    <SectionCard
      titulo="Teste de correção monetária"
      descricao="Alento · 12 unidades · R$ 100.000 por unidade · lançamento jan/27 · vendas 0% / 0% / 100%. Referência: jan/29 → R$ 100.000 × 1,12² = R$ 125.440."
      acao={
        <div className="flex gap-2">
          {[0, 0.12, 1].map((v) => (
            <Button
              key={v}
              size="sm"
              variant={ipca === v ? "default" : "outline"}
              onClick={() => setIpca(v)}
            >
              IPCA {Math.round(v * 100)}%
            </Button>
          ))}
        </div>
      }
    >
      <p className="numeric mb-4 text-xs text-muted-foreground">
        Taxa mensal equivalente = (1 + {formatarPercentual(ipca, 2)}) ^ (1/12) − 1 ={" "}
        {formatarPercentual(taxaMensal, 4)}
      </p>
      <Rolagem altura="max-h-[420px]">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr>
              <Th>Mês</Th>
              <Th>Meses decorridos</Th>
              <Th>Valor-base</Th>
              <Th>Fator acumulado</Th>
              <Th>Valor esperado</Th>
              <Th>Valor calculado</Th>
              <Th>Diferença</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {memoria?.lotes.map((l) => {
              const esperadoValor = l.valorBase * Math.pow(1 + taxaMensal, l.mesesCorrecao);
              const diff = l.valorCorrigido - esperadoValor;
              return (
                <tr key={l.mes} className="hover:bg-muted/30">
                  <Td>{rotuloMes(l.data)}</Td>
                  <Td>{l.mesesCorrecao}</Td>
                  <Td>{formatarMoeda(l.valorBase, true)}</Td>
                  <Td>{l.fator.toFixed(6).replace(".", ",")}</Td>
                  <Td>{formatarMoeda(esperadoValor, true)}</Td>
                  <Td>{formatarMoeda(l.valorCorrigido, true)}</Td>
                  <Td negativo={Math.abs(diff) > 0.05}>{formatarMoeda(diff, true)}</Td>
                  <Td>
                    <StatusPill status={statusDaDiferenca(diff)} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Rolagem>
    </SectionCard>
  );
}
