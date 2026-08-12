import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/common/SectionCard";
import { Rolagem, Td, Th } from "./comum";
import { baixarCsv, copiar } from "./csv";
import type { LinhaMemoria, MemoriaEmpreendimento } from "@/financial-engine/audit";
import { formatarMoeda, formatarNumero, formatarPercentual } from "@/utils/format";
import { rotuloMes } from "@/utils/date";

const numero4 = (v: number) => v.toFixed(4).replace(".", ",");

export function TabelaMemoria({
  linhas,
  memoria,
  visao,
}: {
  linhas: LinhaMemoria[];
  memoria: MemoriaEmpreendimento | null;
  visao: "empreendimento" | "investidor";
}) {
  const [aberta, setAberta] = useState<number | null>(null);

  const exportar = () => {
    const cabecalho = [
      "Mês",
      "Ano da obra",
      "Mês após lançamento",
      "Meses até a entrega",
      "% anual",
      "% mensal",
      "Unidades vendidas",
      "Unidades acumuladas",
      "Unidades restantes",
      "% acumulado vendido",
      "Valor-base da unidade",
      "Meses de correção",
      "Fator acumulado",
      "Valor corrigido da unidade",
      "Aumento por unidade",
      "Aumento %",
      "VGV-base vendido",
      "VGV corrigido vendido",
      "Recebimento à vista",
      "Entrada",
      "Parcelas",
      "Entrega",
      "Recebimento do mês",
      "Recebimento acumulado",
      "% permuta",
      "Permuta do mês",
      "Participação",
      "Recebimento do investidor",
      "Acumulado do investidor",
      "Semestre de pagamento",
    ];
    const corpo = linhas.map((l) => [
      l.data,
      l.venda ? l.venda.anoObra : "",
      l.offset,
      l.venda ? l.venda.mesesAteEntrega : "",
      l.venda ? l.venda.percentualAno : "",
      l.venda ? l.venda.percentualMes : "",
      l.venda ? l.venda.unidades : "",
      l.venda ? l.venda.unidadesAcumuladas : "",
      l.venda ? l.venda.unidadesRestantes : "",
      l.venda && memoria ? l.venda.unidadesAcumuladas / memoria.numeroUnidades : "",
      l.venda ? l.venda.valorBase : "",
      l.venda ? l.venda.mesesCorrecao : "",
      l.venda ? l.venda.fator : "",
      l.venda ? l.venda.valorCorrigido : "",
      l.venda ? l.venda.aumentoUnitario : "",
      l.venda ? l.venda.aumentoPercentual : "",
      l.venda ? l.venda.vgvBase : "",
      l.venda ? l.venda.vgvCorrigido : "",
      l.aVista,
      l.entrada,
      l.parcelas,
      l.entrega,
      l.recebimento,
      l.recebimentoAcumulado,
      l.percentualPermuta,
      l.permuta,
      l.participacao,
      l.investidor,
      l.investidorAcumulado,
      l.mesPagamento,
    ]);
    baixarCsv("memoria-de-calculo", [cabecalho, ...corpo]);
  };

  return (
    <SectionCard
      titulo="Memória de cálculo mensal"
      descricao="Cada linha é um mês do fluxo. Clique em uma linha para ver a origem completa do cálculo."
      acao={
        <Button variant="outline" size="sm" onClick={exportar}>
          Exportar CSV
        </Button>
      }
    >
      <Rolagem>
        <table className="w-full min-w-[2200px] border-collapse">
          <thead>
            <tr>
              <Th className="left-0 z-20 bg-background">Mês</Th>
              <Th>Ano obra</Th>
              <Th>Mês pós-lanç.</Th>
              <Th>Meses p/ entrega</Th>
              <Th>% ano</Th>
              <Th>% mês</Th>
              <Th>Unid. vendidas</Th>
              <Th>Unid. acum.</Th>
              <Th>Unid. restantes</Th>
              <Th>% acum. vendido</Th>
              <Th>Valor-base unid.</Th>
              <Th>Meses correção</Th>
              <Th>Fator IPCA</Th>
              <Th>Valor corrigido unid.</Th>
              <Th>Correção / unid.</Th>
              <Th>Correção %</Th>
              <Th>VGV-base</Th>
              <Th>VGV corrigido</Th>
              <Th>VGV acumulado</Th>
              <Th>À vista</Th>
              <Th>Entrada</Th>
              <Th>Parcelas</Th>
              <Th>Entrega</Th>
              <Th>Recebimento</Th>
              <Th>Receb. acumulado</Th>
              <Th>% permuta</Th>
              <Th>Permuta</Th>
              <Th>Participação</Th>
              <Th>Investidor</Th>
              <Th>Investidor acum.</Th>
              <Th>Semestre de pagto.</Th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const v = l.venda;
              const investidor = visao === "investidor";
              return (
                <Fragment key={l.mesAbs}>
                  <tr
                    key={l.mesAbs}
                    onClick={() => setAberta(aberta === l.mesAbs ? null : l.mesAbs)}
                    className="cursor-pointer transition-colors hover:bg-muted/30"
                  >
                    <Td className="sticky left-0 z-10 bg-background">{rotuloMes(l.data)}</Td>
                    <Td>{v ? v.anoObra : "—"}</Td>
                    <Td>{l.offset}</Td>
                    <Td>{v ? v.mesesAteEntrega : "—"}</Td>
                    <Td>{v ? formatarPercentual(v.percentualAno) : "—"}</Td>
                    <Td>{v ? formatarPercentual(v.percentualMes, 3) : "—"}</Td>
                    <Td>{v ? numero4(v.unidades) : "—"}</Td>
                    <Td>{v ? numero4(v.unidadesAcumuladas) : "—"}</Td>
                    <Td>{v ? numero4(v.unidadesRestantes) : "—"}</Td>
                    <Td>
                      {v && memoria
                        ? formatarPercentual(v.unidadesAcumuladas / memoria.numeroUnidades)
                        : "—"}
                    </Td>
                    <Td>{v ? formatarMoeda(v.valorBase, true) : "—"}</Td>
                    <Td>{v ? v.mesesCorrecao : "—"}</Td>
                    <Td>{v ? v.fator.toFixed(6).replace(".", ",") : "—"}</Td>
                    <Td>{v ? formatarMoeda(v.valorCorrigido, true) : "—"}</Td>
                    <Td>{v ? formatarMoeda(v.aumentoUnitario, true) : "—"}</Td>
                    <Td>{v ? formatarPercentual(v.aumentoPercentual, 3) : "—"}</Td>
                    <Td>{v ? formatarMoeda(v.vgvBase) : "—"}</Td>
                    <Td>{v ? formatarMoeda(v.vgvCorrigido) : "—"}</Td>
                    <Td>
                      {v && memoria
                        ? formatarMoeda(
                            memoria.lotes
                              .filter((x) => x.mes <= v.mes)
                              .reduce((a, x) => a + x.vgvCorrigido, 0),
                          )
                        : "—"}
                    </Td>
                    <Td>{formatarMoeda(l.aVista)}</Td>
                    <Td>{formatarMoeda(l.entrada)}</Td>
                    <Td>{formatarMoeda(l.parcelas)}</Td>
                    <Td>{formatarMoeda(l.entrega)}</Td>
                    <Td className={investidor ? "" : "text-foreground"} negativo={l.recebimento < 0}>
                      {formatarMoeda(l.recebimento)}
                    </Td>
                    <Td>{formatarMoeda(l.recebimentoAcumulado)}</Td>
                    <Td>{formatarPercentual(l.percentualPermuta, 2)}</Td>
                    <Td>{formatarMoeda(l.permuta)}</Td>
                    <Td>{formatarPercentual(l.participacao, 4)}</Td>
                    <Td
                      className={investidor ? "text-primary" : ""}
                      negativo={l.investidor < 0}
                    >
                      {formatarMoeda(l.investidor, true)}
                    </Td>
                    <Td>{formatarMoeda(l.investidorAcumulado, true)}</Td>
                    <Td>{rotuloMes(l.mesPagamento)}</Td>
                  </tr>
                  {aberta === l.mesAbs ? (
                    <tr key={`${l.mesAbs}-detalhe`} className="bg-muted/20">
                      <td colSpan={31} className="border-b border-border/40 px-4 py-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <Origem titulo="Vendas">
                            {v ? (
                              <>
                                <li>
                                  Unidades = {formatarNumero(memoria?.numeroUnidades ?? 0)} ×{" "}
                                  {formatarPercentual(v.percentualMes, 3)} = {numero4(v.unidades)}
                                </li>
                                <li>
                                  % mensal = % do ano {v.anoObra} (
                                  {formatarPercentual(v.percentualAno)}) ÷ 12
                                </li>
                              </>
                            ) : (
                              <li>Mês sem vendas — apenas recebimentos de lotes anteriores.</li>
                            )}
                          </Origem>
                          <Origem titulo="Correção monetária pelo IPCA">
                            {v ? (
                              <>
                                <li>Meses decorridos desde a base: {v.mesesCorrecao}</li>
                                <li>
                                  Fator = (1 + taxa mensal) ^ {v.mesesCorrecao} ={" "}
                                  {v.fator.toFixed(6).replace(".", ",")}
                                </li>
                                <li>
                                  Valor corrigido = {formatarMoeda(v.valorBase, true)} × fator ={" "}
                                  {formatarMoeda(v.valorCorrigido, true)}
                                </li>
                              </>
                            ) : (
                              <li>—</li>
                            )}
                          </Origem>
                          <Origem titulo="Recebimentos do mês">
                            <li>À vista: {formatarMoeda(l.aVista, true)}</li>
                            <li>Entrada: {formatarMoeda(l.entrada, true)}</li>
                            <li>Parcelas: {formatarMoeda(l.parcelas, true)}</li>
                            <li>Entrega: {formatarMoeda(l.entrega, true)}</li>
                            <li className="text-foreground">
                              Total: {formatarMoeda(l.recebimento, true)}
                            </li>
                          </Origem>
                          <Origem titulo="Permuta e investidor">
                            <li>
                              Permuta = {formatarMoeda(l.recebimento, true)} ×{" "}
                              {formatarPercentual(l.percentualPermuta, 2)} ={" "}
                              {formatarMoeda(l.permuta, true)}
                            </li>
                            <li>
                              Investidor = permuta × {formatarPercentual(l.participacao, 4)} ={" "}
                              {formatarMoeda(l.investidor, true)}
                            </li>
                            <li>Pago no semestre de {rotuloMes(l.mesPagamento)}</li>
                            <li>
                              <button
                                type="button"
                                className="text-primary underline underline-offset-4"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  void copiar(JSON.stringify(l, null, 2));
                                }}
                              >
                                Copiar dados da linha
                              </button>
                            </li>
                          </Origem>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </Rolagem>
      {!linhas.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum mês no intervalo selecionado.
        </p>
      ) : null}
    </SectionCard>
  );
}

function Origem({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{titulo}</p>
      <ul className="numeric space-y-1 text-xs text-muted-foreground">{children}</ul>
    </div>
  );
}
