import { Fragment, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Rolagem, Td, Th } from "./comum";
import { baixarCsv } from "./csv";
import type { Auditoria } from "@/financial-engine/audit";
import { formatarMoeda } from "@/utils/format";
import { rotuloMes } from "@/utils/date";

export function Consolidacao({ auditoria }: { auditoria: Auditoria }) {
  const [aberto, setAberto] = useState<number | null>(null);
  const nomes = auditoria.memorias.map((m) => ({ id: m.id, nome: m.nome }));

  const exportar = () => {
    const cabecalho = [
      "Pagamento",
      "Início do período",
      "Fim do período",
      "Meses incluídos",
      ...nomes.map((n) => n.nome),
      "Total",
      "Acumulado",
    ];
    const corpo = auditoria.semestres.map((s) => [
      s.data,
      s.inicio,
      s.fim,
      s.meses.length,
      ...nomes.map((n) => s.porEmpreendimento[n.id] ?? 0),
      s.total,
      s.acumulado,
    ]);
    baixarCsv("consolidacao-semestral", [cabecalho, ...corpo]);
  };

  return (
    <SectionCard
      titulo="Consolidação dos recebimentos do investidor"
      descricao="Os recebimentos mensais são acumulados e pagos no fechamento semestral seguinte (janeiro ou julho). Clique em um semestre para ver os meses que o compõem."
      acao={
        <Button variant="outline" size="sm" onClick={exportar}>
          Exportar CSV
        </Button>
      }
    >
      <Rolagem>
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            <tr>
              <Th>Semestre</Th>
              <Th>Período</Th>
              <Th>Meses</Th>
              {nomes.map((n) => (
                <Th key={n.id}>{n.nome}</Th>
              ))}
              <Th>Total</Th>
              <Th>Acumulado</Th>
            </tr>
          </thead>
          <tbody>
            {auditoria.semestres.map((s) => (
              <Fragment key={s.mesAbs}>
                <tr
                  key={s.mesAbs}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setAberto(aberto === s.mesAbs ? null : s.mesAbs)}
                >
                  <Td>{rotuloMes(s.data)}</Td>
                  <Td>
                    {rotuloMes(s.inicio)} → {rotuloMes(s.fim)}
                  </Td>
                  <Td>{s.meses.length}</Td>
                  {nomes.map((n) => (
                    <Td key={n.id}>{formatarMoeda(s.porEmpreendimento[n.id] ?? 0)}</Td>
                  ))}
                  <Td className="text-primary">{formatarMoeda(s.total, true)}</Td>
                  <Td>{formatarMoeda(s.acumulado)}</Td>
                </tr>
                {aberto === s.mesAbs ? (
                  <tr key={`${s.mesAbs}-d`} className="bg-muted/20">
                    <td colSpan={4 + nomes.length + 1} className="px-4 py-3">
                      <table className="w-full">
                        <tbody>
                          {s.meses.map((m) => (
                            <tr key={m.data}>
                              <Td className="w-24">{rotuloMes(m.data)}</Td>
                              {nomes.map((n) => (
                                <Td key={n.id}>{formatarMoeda(m.porEmpreendimento[n.id] ?? 0, true)}</Td>
                              ))}
                              <Td className="text-foreground">{formatarMoeda(m.total, true)}</Td>
                            </tr>
                          ))}
                          <tr>
                            <Td className="text-muted-foreground">Soma do semestre</Td>
                            {nomes.map((n) => (
                              <Td key={n.id}>{formatarMoeda(s.porEmpreendimento[n.id] ?? 0, true)}</Td>
                            ))}
                            <Td className="text-primary">{formatarMoeda(s.total, true)}</Td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Pagamento ao investidor em {rotuloMes(s.data)}.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Rolagem>
    </SectionCard>
  );
}
