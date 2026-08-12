import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Rolagem, StatusPill, Td, Th } from "./comum";
import { baixarCsv } from "./csv";
import {
  statusDaDiferenca,
  type MemoriaEmpreendimento,
  TOLERANCIA,
} from "@/financial-engine/audit";
import { BRISE_PARCELAS, DESCRICAO_REGRA } from "@/financial-engine/rules";
import { formatarMoeda, formatarPercentual } from "@/utils/format";
import { rotuloMes } from "@/utils/date";

const un = (v: number) => v.toFixed(4).replace(".", ",");

/** Rule summary card — text and numbers change with the empreendimento. */
export function CardRegra({ memoria }: { memoria: MemoriaEmpreendimento }) {
  const primeiro = memoria.lotes[0];
  const meta = primeiro?.detalhe.meta ?? {};

  return (
    <SectionCard titulo="Regra aplicada" descricao={DESCRICAO_REGRA[memoria.regra]}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {memoria.regra === "brise" ? (
          <>
            <Item rotulo="Unidades vendidas no 1º mês" valor={un(primeiro?.unidades ?? 0)} />
            <Item rotulo="Unidades à vista (10%)" valor={un(meta.unidadesAVista ?? 0)} />
            <Item rotulo="Unidades financiadas (90%)" valor={un(meta.unidadesFinanciadas ?? 0)} />
            <Item rotulo="Recebido à vista" valor={formatarMoeda(meta.valorAVista ?? 0)} />
            <Item rotulo="Valor financiado" valor={formatarMoeda(meta.valorFinanciado ?? 0)} />
            <Item rotulo="Parcela mensal gerada" valor={formatarMoeda(meta.parcela ?? 0, true)} />
            <Item rotulo="Prazo do financiamento" valor={`${BRISE_PARCELAS} meses`} />
            <Item
              rotulo="Parcelas restantes do 1º lote"
              valor={`${BRISE_PARCELAS} de ${BRISE_PARCELAS}`}
            />
          </>
        ) : null}

        {memoria.regra === "coliv" ? (
          <>
            <Item rotulo="Entrada (10%)" valor={formatarMoeda(meta.entrada ?? 0)} />
            <Item rotulo="Parcelado na obra (20%)" valor={formatarMoeda(meta.parcelado ?? 0)} />
            <Item rotulo="Meses restantes até a entrega" valor={String(meta.meses ?? 0)} />
            <Item rotulo="Parcela mensal" valor={formatarMoeda(meta.parcela ?? 0, true)} />
            <Item rotulo="Reservado para a entrega (70%)" valor={formatarMoeda(meta.naEntrega ?? 0)} />
            <Item rotulo="Data da entrega" valor={rotuloMes(memoria.dataEntrega)} />
          </>
        ) : null}

        {memoria.regra === "antes-da-entrega" ? (
          <>
            <Item rotulo="Valor vendido no 1º mês" valor={formatarMoeda(meta.total ?? 0)} />
            <Item rotulo="Meses restantes" valor={String(meta.meses ?? 0)} />
            <Item rotulo="Valor mensal distribuído" valor={formatarMoeda(meta.parcela ?? 0, true)} />
            <Item
              rotulo="Último mês do recebimento"
              valor={primeiro?.ultimoRecebimento ? rotuloMes(primeiro.ultimoRecebimento) : "—"}
            />
          </>
        ) : null}
      </div>
      <p className="mt-4 text-xs font-light text-muted-foreground">
        O cálculo utiliza equivalência proporcional de unidades para manter a distribuição exata do
        cenário — as unidades não são arredondadas.
      </p>
    </SectionCard>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{rotulo}</p>
      <p className="numeric mt-1 text-sm">{valor}</p>
    </div>
  );
}

/** Per-batch audit table — the shape depends on the rule. */
export function AuditoriaLotes({ memoria }: { memoria: MemoriaEmpreendimento }) {
  const titulo =
    memoria.regra === "brise"
      ? "Auditoria das vendas do Brise"
      : memoria.regra === "coliv"
        ? "Auditoria das vendas do Coliv"
        : `Auditoria das vendas de ${memoria.nome}`;

  const exportar = () => {
    const cabecalho = [
      "Mês da venda",
      "Unidades",
      "Valor corrigido da unidade",
      "Valor total vendido",
      "Componente 1",
      "Componente 2",
      "Componente 3",
      "Soma dos componentes",
      "Diferença",
    ];
    const corpo = memoria.lotes.map((l) => [
      l.data,
      l.unidades,
      l.valorCorrigido,
      l.vgvCorrigido,
      l.detalhe.meta.valorAVista ?? l.detalhe.meta.entrada ?? l.detalhe.meta.total ?? 0,
      l.detalhe.meta.valorFinanciado ?? l.detalhe.meta.parcelado ?? l.detalhe.meta.parcela ?? 0,
      l.detalhe.meta.naEntrega ?? 0,
      l.somaComponentes,
      l.somaComponentes - l.vgvCorrigido,
    ]);
    baixarCsv(`auditoria-${memoria.id}`, [cabecalho, ...corpo]);
  };

  return (
    <SectionCard
      titulo={titulo}
      descricao={
        memoria.regra === "brise"
          ? "Unidades à vista = unidades × 10% · Unidades financiadas = unidades × 90% · Parcela do lote = unidades financiadas × valor corrigido ÷ 180."
          : memoria.regra === "coliv"
            ? "Entrada = 10% · Durante a obra = 20% ÷ meses restantes · Entrega = 70%."
            : "Valor mensal = valor total vendido ÷ meses entre a venda e a entrega."
      }
      acao={
        <Button variant="outline" size="sm" onClick={exportar}>
          Exportar CSV
        </Button>
      }
    >
      <Rolagem altura="max-h-[520px]">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead>
            <tr>
              <Th>Mês da venda</Th>
              <Th>Unidades</Th>
              {memoria.regra === "brise" ? (
                <>
                  <Th>Unid. à vista (10%)</Th>
                  <Th>Unid. financiadas (90%)</Th>
                </>
              ) : null}
              <Th>Valor corrigido da unid.</Th>
              <Th>Valor total vendido</Th>
              {memoria.regra === "brise" ? (
                <>
                  <Th>Recebido à vista</Th>
                  <Th>Valor financiado</Th>
                  <Th>Prazo</Th>
                  <Th>Parcela do lote</Th>
                  <Th>Contratos ativos no mês</Th>
                  <Th>Parcelas recebidas no mês</Th>
                  <Th>Recebimento total do mês</Th>
                </>
              ) : null}
              {memoria.regra === "coliv" ? (
                <>
                  <Th>Entrada (10%)</Th>
                  <Th>Obra (20%)</Th>
                  <Th>Meses p/ parcelar</Th>
                  <Th>Parcela mensal</Th>
                  <Th>Entrega (70%)</Th>
                  <Th>Data da entrega</Th>
                </>
              ) : null}
              {memoria.regra === "antes-da-entrega" ? (
                <>
                  <Th>Meses até a entrega</Th>
                  <Th>Valor mensal</Th>
                  <Th>1º recebimento</Th>
                  <Th>Último recebimento</Th>
                </>
              ) : null}
              <Th>Total distribuído</Th>
              <Th>Diferença</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {memoria.lotes.map((l) => {
              const diff = l.somaComponentes - l.vgvCorrigido;
              const linhaMes = memoria.linhas.find((x) => x.data === l.data);
              const ativos = memoria.lotes.filter(
                (x) => x.mes <= l.mes && l.mes < x.mes + BRISE_PARCELAS,
              ).length;
              return (
                <tr key={l.mes} className="hover:bg-muted/30">
                  <Td>{rotuloMes(l.data)}</Td>
                  <Td>{un(l.unidades)}</Td>
                  {memoria.regra === "brise" ? (
                    <>
                      <Td>{un(l.detalhe.meta.unidadesAVista ?? 0)}</Td>
                      <Td>{un(l.detalhe.meta.unidadesFinanciadas ?? 0)}</Td>
                    </>
                  ) : null}
                  <Td>{formatarMoeda(l.valorCorrigido, true)}</Td>
                  <Td>{formatarMoeda(l.vgvCorrigido)}</Td>
                  {memoria.regra === "brise" ? (
                    <>
                      <Td>{formatarMoeda(l.detalhe.meta.valorAVista ?? 0)}</Td>
                      <Td>{formatarMoeda(l.detalhe.meta.valorFinanciado ?? 0)}</Td>
                      <Td>{BRISE_PARCELAS} meses</Td>
                      <Td>{formatarMoeda(l.detalhe.meta.parcela ?? 0, true)}</Td>
                      <Td>{ativos}</Td>
                      <Td>{formatarMoeda(linhaMes?.parcelas ?? 0, true)}</Td>
                      <Td>{formatarMoeda(linhaMes?.recebimento ?? 0, true)}</Td>
                    </>
                  ) : null}
                  {memoria.regra === "coliv" ? (
                    <>
                      <Td>{formatarMoeda(l.detalhe.meta.entrada ?? 0)}</Td>
                      <Td>{formatarMoeda(l.detalhe.meta.parcelado ?? 0)}</Td>
                      <Td>{l.detalhe.meta.meses ?? 0}</Td>
                      <Td>{formatarMoeda(l.detalhe.meta.parcela ?? 0, true)}</Td>
                      <Td>{formatarMoeda(l.detalhe.meta.naEntrega ?? 0)}</Td>
                      <Td>{rotuloMes(memoria.dataEntrega)}</Td>
                    </>
                  ) : null}
                  {memoria.regra === "antes-da-entrega" ? (
                    <>
                      <Td>{l.detalhe.meta.meses ?? 0}</Td>
                      <Td>{formatarMoeda(l.detalhe.meta.parcela ?? 0, true)}</Td>
                      <Td>{l.primeiroRecebimento ? rotuloMes(l.primeiroRecebimento) : "—"}</Td>
                      <Td>{l.ultimoRecebimento ? rotuloMes(l.ultimoRecebimento) : "—"}</Td>
                    </>
                  ) : null}
                  <Td>{formatarMoeda(l.somaComponentes, true)}</Td>
                  <Td negativo={Math.abs(diff) > TOLERANCIA}>{formatarMoeda(diff, true)}</Td>
                  <Td>
                    <StatusPill status={statusDaDiferenca(diff)} />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Rolagem>
      <p className="mt-4 text-xs font-light text-muted-foreground">
        Validação por lote: a soma de todos os componentes deve corresponder a 100% do valor
        vendido ({formatarPercentual(1, 0)}). Tolerância de arredondamento: R$ 0,05.
      </p>
    </SectionCard>
  );
}
