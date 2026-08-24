import { Dado, Rolagem, StatusPill, Td, Th } from "./comum";
import { statusDaDiferenca, type Auditoria } from "@/financial-engine/audit";
import type { ResultadoSimulacao } from "@/types";
import { formatarMeses, formatarMoeda, formatarNumero, formatarPercentual } from "@/utils/format";
import { rotuloDia, rotuloMes } from "@/utils/date";

/**
 * Calculation memory of the antecipation: which receipts were moved, to which
 * date, and the reconciliation proving no value was created or lost.
 */
export function MemoriaAntecipacao({
  auditoria,
  resultado,
}: {
  auditoria: Auditoria;
  resultado: ResultadoSimulacao;
}) {
  const ant = auditoria.antecipacao;
  const nomes = new Map(auditoria.memorias.map((m) => [m.id, m.nome]));

  const totalOriginal = auditoria.semestresOriginais.reduce((a, s) => a + s.total, 0);
  const totalAjustado = auditoria.semestres.reduce((a, s) => a + s.total, 0);
  const corte = ant.mesCorteAbs;
  const anteriores =
    corte === null
      ? totalAjustado
      : auditoria.semestres.filter((s) => s.mesAbs < corte).reduce((a, s) => a + s.total, 0);
  const noCorte =
    corte === null ? 0 : (auditoria.semestres.find((s) => s.mesAbs === corte)?.total ?? 0);

  const ultimoOriginal = auditoria.semestresOriginais.at(-1)?.data ?? null;
  const ultimoAjustado = auditoria.semestres.at(-1)?.data ?? null;
  const diferencaPrazoMeses =
    ant.ativa && ant.mesUltimoOriginalAbs !== null && ant.mesCorteAbs !== null
      ? ant.mesUltimoOriginalAbs - ant.mesCorteAbs
      : 0;

  const correcaoRetirada = ant.totalRenunciado;
  const diferencaTotal = totalOriginal - correcaoRetirada - totalAjustado;
  const tir = resultado.tirDetalhe;
  const diferencaReconciliacao = anteriores + noCorte - resultado.indicadores.valorProjetado;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dado
          rotulo="Estado da opção"
          valor={ant.ativa ? "Ativo" : "Inativo"}
          destaque={ant.ativa}
        />
        <Dado
          rotulo="Última entrega"
          valor={ant.dataUltimaEntrega ? rotuloMes(ant.dataUltimaEntrega) : "—"}
        />
        <Dado
          rotulo="Primeiro recebimento após a entrega"
          valor={ant.dataProximoPagamento ? rotuloMes(ant.dataProximoPagamento) : "—"}
        />
        <Dado
          rotulo="Data efetiva da antecipação (+6 meses)"
          valor={ant.dataCorte ? rotuloMes(ant.dataCorte) : "Sem antecipação"}
        />
        <Dado
          rotulo="Valor normal do semestre da antecipação"
          valor={formatarMoeda(ant.valorNormalCorte, true)}
        />
        <Dado
          rotulo="Total dos recebimentos futuros (corrigidos)"
          valor={formatarMoeda(ant.totalOriginalDosAntecipados, true)}
        />
        <Dado
          rotulo="Retorno total sem IPCA (referência)"
          valor={formatarMoeda(ant.retornoTotalSemIpca, true)}
        />
        <Dado rotulo="% Capital" valor={formatarPercentual(ant.percentualCapital, 2)} />
        <Dado rotulo="% Lucro" valor={formatarPercentual(ant.percentualLucro, 2)} />
        <Dado
          rotulo="Percentual do lucro pago"
          valor={formatarPercentual(ant.percentual, 0)}
          destaque
        />
        <Dado
          rotulo="Fator aplicado (capital + 50% lucro)"
          valor={formatarPercentual(ant.fatorAntecipacao, 2)}
        />
        <Dado
          rotulo="Recebimentos futuros sem IPCA"
          valor={formatarMoeda(ant.totalBaseFuturo, true)}
        />
        <Dado
          rotulo="Capital dos futuros (100% pago)"
          valor={formatarMoeda(ant.totalCapitalFuturo, true)}
        />
        <Dado
          rotulo="Lucro dos futuros (50% pago)"
          valor={formatarMoeda(ant.totalLucroFuturo, true)}
        />
        <Dado
          rotulo="Valor efetivamente antecipado"
          valor={formatarMoeda(ant.totalAntecipado, true)}
        />
        <Dado
          rotulo="Valor renunciado"
          valor={formatarMoeda(ant.totalRenunciado, true)}
        />

        <Dado
          rotulo="Valor final recebido na data"
          valor={formatarMoeda(ant.valorFinalCorte, true)}
          destaque={ant.valorFinalCorte > 0}
        />
        <Dado
          rotulo="Último recebimento original"
          valor={ultimoOriginal ? rotuloMes(ultimoOriginal) : "—"}
        />
        <Dado
          rotulo="Último recebimento atual"
          valor={ultimoAjustado ? rotuloMes(ultimoAjustado) : "—"}
        />
        <Dado rotulo="Recebimentos movidos" valor={formatarNumero(ant.parcelasMovidas)} />
        <Dado
          rotulo="Novo prazo de recebimento"
          valor={formatarMeses(resultado.indicadores.prazoRecebimentoMeses)}
        />
        <Dado
          rotulo="Diferença de prazo"
          valor={diferencaPrazoMeses > 0 ? `− ${formatarMeses(diferencaPrazoMeses)}` : "—"}
        />
        <Dado
          rotulo="Semestres no fluxo (antes → depois)"
          valor={`${auditoria.semestresOriginais.length} → ${auditoria.semestres.length}`}
        />
        <Dado
          rotulo="Valor projetado antes da antecipação"
          valor={formatarMoeda(totalOriginal, true)}
        />
        <Dado rotulo="Valor renunciado" valor={formatarMoeda(correcaoRetirada, true)} />
        <Dado
          rotulo="Valor projetado depois da antecipação"
          valor={formatarMoeda(totalAjustado, true)}
          destaque
        />
        <Dado
          rotulo="Valor-base dos antecipados (sem IPCA)"
          valor={formatarMoeda(
            ant.parcelas.reduce((a, p) => a + p.valorBase, 0),
            true,
          )}
        />

      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Valor futuro por empreendimento
        </p>
        <Rolagem altura="max-h-[280px]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Empreendimento</Th>
                <Th className="text-right">Valor antecipado</Th>
                <Th className="text-right">Total do empreendimento</Th>
              </tr>
            </thead>
            <tbody>
              {auditoria.memorias.map((m) => (
                <tr key={m.id}>
                  <Td>{m.nome}</Td>
                  <Td className="text-right">
                    {formatarMoeda(ant.porEmpreendimento[m.id] ?? 0, true)}
                  </Td>
                  <Td className="text-right">{formatarMoeda(m.totais.investidor, true)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Rolagem>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Parcelas movidas
        </p>
        {ant.parcelas.length ? (
          <Rolagem altura="max-h-[360px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Empreendimento</Th>
                  <Th>Data original</Th>
                  <Th className="text-right">Valor-base</Th>
                  <Th className="text-right">Valor corrigido</Th>
                  <Th className="text-right">Antecipado (50%)</Th>
                  <Th className="text-right">Renunciado (50%)</Th>
                  <Th>Data antecipada</Th>
                </tr>
              </thead>
              <tbody>
                {ant.parcelas.map((p, i) => (
                  <tr key={`${p.empreendimentoId}-${p.dataOriginal}-${i}`}>
                    <Td>{nomes.get(p.empreendimentoId) ?? p.empreendimentoId}</Td>
                    <Td>{rotuloMes(p.dataOriginal)}</Td>
                    <Td className="text-right">{formatarMoeda(p.valorBase, true)}</Td>
                    <Td className="text-right">{formatarMoeda(p.valorOriginalCorrigido, true)}</Td>
                    <Td className="text-right">{formatarMoeda(p.valorAntecipado, true)}</Td>
                    <Td className="text-right text-muted-foreground">
                      − {formatarMoeda(p.valorRenunciado, true)}
                    </Td>
                    <Td>{ant.dataCorte ? rotuloMes(ant.dataCorte) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Rolagem>
        ) : (
          <p className="text-sm font-light text-muted-foreground">
            {ant.ativa
              ? "Nenhum recebimento em aberto após a data de corte."
              : "Antecipação desativada: o cronograma original é mantido integralmente."}
          </p>
        )}
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-4">
        <p className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Reconciliação
        </p>
        <ul className="space-y-1.5 text-sm font-light">
          <li className="flex justify-between gap-6">
            <span className="text-muted-foreground">Recebimentos anteriores à data de corte</span>
            <span className="numeric">{formatarMoeda(anteriores, true)}</span>
          </li>
          <li className="flex justify-between gap-6">
            <span className="text-muted-foreground">
              + Pagamento na data de corte {ant.dataCorte ? `(${rotuloMes(ant.dataCorte)})` : ""}
            </span>
            <span className="numeric">{formatarMoeda(noCorte, true)}</span>
          </li>
          <li className="flex justify-between gap-6 border-t border-border/60 pt-1.5">
            <span>= Valor projetado total</span>
            <span className="numeric">
              {formatarMoeda(resultado.indicadores.valorProjetado, true)}
            </span>
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <StatusPill status={statusDaDiferenca(diferencaReconciliacao)} />
          <span className="numeric">
            Diferença da reconciliação: R$ {diferencaReconciliacao.toFixed(4)}
          </span>
          <StatusPill status={statusDaDiferenca(diferencaTotal)} />
          <span className="numeric">
            Antes − renunciado vs. depois: R$ {diferencaTotal.toFixed(4)}
          </span>
          <StatusPill
            status={statusDaDiferenca(
              ant.totalOriginalDosAntecipados - ant.totalAntecipado - ant.totalRenunciado,
            )}
          />
          <span className="numeric">
            Futuro original = antecipado + renunciado: R${" "}
            {(
              ant.totalOriginalDosAntecipados -
              ant.totalAntecipado -
              ant.totalRenunciado
            ).toFixed(4)}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-4">
        <p className="mb-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          Memória da TIR
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Dado rotulo="Data inicial (hoje)" valor={rotuloDia(tir.dataInicio)} />
          <Dado
            rotulo="Investimento na data inicial"
            valor={`− ${formatarMoeda(tir.valorInvestido, true)}`}
          />
          <Dado
            rotulo="Recebimentos considerados"
            valor={formatarNumero(tir.quantidadeRecebimentos)}
          />
          <Dado rotulo="Total recebido" valor={formatarMoeda(tir.totalRecebido, true)} />
          <Dado
            rotulo="Primeiro recebimento"
            valor={tir.dataPrimeiroRecebimento ? rotuloMes(tir.dataPrimeiroRecebimento) : "—"}
          />
          <Dado
            rotulo="Último recebimento"
            valor={tir.dataUltimoRecebimento ? rotuloMes(tir.dataUltimoRecebimento) : "—"}
          />
          <Dado
            rotulo="TIR anual (XIRR)"
            valor={tir.tirAnual === null ? "—" : formatarPercentual(tir.tirAnual, 3)}
            destaque
          />
          <Dado
            rotulo="TIR mensal (derivada da anual)"
            valor={tir.tirMensal === null ? "—" : formatarPercentual(tir.tirMensal, 3)}
          />
        </div>
      </div>
    </div>
  );
}
