// BARRA DE COMPOSIÇÃO — uma barra, e de onde o todo veio.
//
// A gramática "parte-do-todo" do protótipo (`.stack` + `.keys`). Ela existe porque quatro
// números soltos — total, token, transferência, desperdício — obrigam quem lê a fazer a divisão
// de cabeça para saber o que pesa. Uma barra responde antes da leitura.
//
// ## A hachura de ausência, e por que ela é o ponto
//
// O protótipo comenta a própria regra: *"a hachura de ausência é independente de contexto...
// ausência tem textura em todo lugar"*. Aqui isso é a diferença entre três afirmações que a
// tela pode fazer sobre um pedaço do custo:
//
//   medido e vale X   → fatia colorida, com o valor escrito ao lado
//   medido e vale 0   → fatia colorida de largura zero, e o `0` escrito na legenda
//   NÃO medido        → fatia com TEXTURA, e "não medido" escrito na legenda
//
// Sem a terceira, "não medimos a transferência" e "a transferência não custou nada" viram a
// mesma barra — e são conclusões opostas para quem decide.
//
// ## Não depende de cor
//
// A legenda escreve o nome e o valor de cada parte. Quem não distingue as cores lê a mesma
// informação; a barra é o atalho, não o único caminho.

import { fatiasDaComposicao, type ParteDaComposicao } from "./composicao";

/** Tons das partes, na ordem em que elas chegam. Papel visual, não semântica de estado. */
const TONS = [
  "hsl(var(--ds-accent))",
  "hsl(var(--ds-accent) / 0.62)",
  "hsl(var(--ds-accent) / 0.38)",
] as const;

export function BarraDeComposicao({
  partes,
  total,
  rotuloAusente,
  descricao,
}: {
  readonly partes: readonly ParteDaComposicao[];
  /** O TODO declarado pelo produtor. `null` não desenha barra — não se infere total somando. */
  readonly total: number | null;
  /** O que escrever na legenda de uma parte não medida. Vem do produto; esta camada não traduz. */
  readonly rotuloAusente: string;
  /** Frase pronta para leitor de tela. */
  readonly descricao: string;
}) {
  const fatias = fatiasDaComposicao(partes, total);
  // Sem total, ou com partes que somam mais que ele, NÃO há barra. Uma barra plausível e errada
  // é pior que nenhuma: ela é lida como fato.
  if (fatias === null) return null;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={descricao}
        className="flex h-6 overflow-hidden rounded border border-border"
      >
        {fatias.map((f, i) => (
          <span
            key={f.id}
            aria-hidden="true"
            style={{
              width: f.largura,
              ...(f.ausente
                ? {
                    // Textura, nunca cor de valor: a fatia precisa se ler como "não sabemos"
                    // mesmo em escala de cinza, e é por isso que ela é padrão e não tom.
                    backgroundImage:
                      "repeating-linear-gradient(45deg, hsl(var(--border)) 0 2px, transparent 2px 6px)",
                    backgroundColor: "hsl(var(--muted))",
                  }
                : { backgroundColor: TONS[i % TONS.length] }),
            }}
          />
        ))}
      </div>
      {/* A legenda é o canal que não depende de cor — e é onde a ausência ganha PALAVRA. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-muted-foreground">
        {partes.map((p, i) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-[2px]"
              style={
                p.valor === null
                  ? {
                      backgroundImage:
                        "repeating-linear-gradient(45deg, hsl(var(--border)) 0 1px, transparent 1px 4px)",
                      backgroundColor: "hsl(var(--muted))",
                    }
                  : { backgroundColor: TONS[i % TONS.length] }
              }
            />
            <span>{p.rotulo}</span>
            <span className="tabular-nums text-foreground">
              {p.valor === null ? rotuloAusente : p.escrito}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
