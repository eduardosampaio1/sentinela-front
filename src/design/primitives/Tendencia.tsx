// TENDÊNCIA — a série curta que dá contexto a um número numa linha de lista.
//
// ## Por que uma lista precisa disto
//
// Uma coleção não é um índice de nomes: é uma fila de perguntas "devo abrir isto?". Um número
// sozinho não responde, porque 61 pode ser 61 subindo de 40 ou 61 caindo de 90 — e são decisões
// opostas. A série é o que separa as duas sem gastar uma tela.
//
// ## O que ela deliberadamente NÃO é
//
// Não é gráfico. Não tem eixo, escala publicada, tooltip nem valor legível, e por isso é
// `aria-hidden` inteira: quem usa leitor de tela recebe o número e o rótulo de tendência em
// texto, que é o fato. Uma sparkline que finge ser gráfico convida a leitura precisa que a
// geometria não sustenta — a última coluna tem 2px de largura.
//
// As alturas chegam PRONTAS, 0…1, relativas à própria série. Nenhuma conta acontece aqui.

/**
 * A última coluna recebe a cor de ação porque é o valor corrente — é o único ponto da série
 * sobre o qual a linha inteira está falando. As anteriores são contexto, e contexto não compete.
 */
export function Tendencia({
  pontos,
  ausente = false,
}: {
  pontos: readonly number[];
  /** Série que não veio. Recebe a hachura, nunca colunas de altura zero. */
  ausente?: boolean;
}) {
  if (ausente || pontos.length === 0) {
    return <span className="medida-ausente block h-6 w-full rounded-sm" aria-hidden="true" />;
  }

  return (
    <span className="flex h-6 w-full items-end gap-px" aria-hidden="true">
      {pontos.map((altura, i) => (
        <span
          key={i}
          data-revelar="coluna"
          className={`block flex-1 rounded-t-sm ${
            i === pontos.length - 1 ? "bg-primary" : "bg-secondary"
          }`}
          // Piso de 6% para que um ponto de valor zero continue sendo um ponto DESENHADO. Uma
          // coluna de altura literal zero desaparece, e a série passa a mentir sobre quantas
          // leituras existem.
          style={{ height: `${Math.max(6, Math.min(100, altura * 100))}%` }}
        />
      ))}
    </span>
  );
}
