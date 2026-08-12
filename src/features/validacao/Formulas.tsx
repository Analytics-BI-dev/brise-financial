import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BRISE_PARCELAS } from "@/financial-engine/rules";

const FORMULAS: { titulo: string; formula: string }[] = [
  { titulo: "Taxa mensal do IPCA", formula: "taxa mensal = (1 + IPCA anual) ^ (1/12) − 1" },
  {
    titulo: "Valor corrigido da unidade",
    formula: "valor corrigido = valor-base × (1 + taxa mensal) ^ meses decorridos",
  },
  {
    titulo: "Unidades vendidas por mês",
    formula: "unidades do mês = unidades totais × (percentual do ano ÷ 12)",
  },
  { titulo: "VGV mensal", formula: "VGV corrigido = unidades do mês × valor corrigido da unidade" },
  { titulo: "Permuta", formula: "permuta = recebimento do empreendimento × percentual de permuta" },
  {
    titulo: "Participação do investidor",
    formula: "participação = valor investido ÷ captação total",
  },
  { titulo: "Brise · à vista", formula: "à vista = unidades × 10% × valor corrigido da unidade" },
  {
    titulo: "Brise · financiado",
    formula: `parcela = unidades × 90% × valor corrigido ÷ ${BRISE_PARCELAS}`,
  },
  { titulo: "Coliv · entrada", formula: "entrada = valor vendido × 10% (no mês da venda)" },
  {
    titulo: "Coliv · durante a obra",
    formula: "parcela = (valor vendido × 20%) ÷ meses entre a venda e a entrega",
  },
  { titulo: "Coliv · entrega", formula: "entrega = valor vendido × 70% (no mês 36)" },
  {
    titulo: "Alento e Miradas",
    formula: "parcela = valor vendido ÷ (36 − mês da venda), do mês da venda até a entrega",
  },
  {
    titulo: "Consolidação semestral",
    formula: "cada recebimento mensal é pago no próximo fechamento de janeiro ou julho",
  },
  { titulo: "Recebimento do investidor", formula: "investidor = permuta × participação" },
  { titulo: "Lucro", formula: "lucro = valor projetado − valor investido" },
  { titulo: "ROI", formula: "ROI = lucro ÷ valor investido" },
  {
    titulo: "Payback",
    formula: "primeiro mês em que o recebimento acumulado ≥ valor investido",
  },
  {
    titulo: "Prazo de recebimento",
    formula: "meses entre o início da simulação e a data do último recebimento previsto",
  },
];

export function Formulas() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          Fórmulas utilizadas
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-normal">Fórmulas utilizadas</SheetTitle>
          <SheetDescription>
            Descrição em linguagem simples das mesmas funções aplicadas pelo motor financeiro.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {FORMULAS.map((f) => (
            <div key={f.titulo} className="rounded-md border border-border/60 bg-muted/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {f.titulo}
              </p>
              <p className="numeric mt-1 text-sm">{f.formula}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
