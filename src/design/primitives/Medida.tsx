// MEDIDA — quatro formas para quatro fatos que não são a mesma coisa.
//
// ## O eixo que faltava
//
// `patterns/estados.ts` já traduz o estado de um PROCESSO: preparando, na fila, correndo,
// concluído, falho. Este arquivo traduz o outro eixo, que nunca teve tradução: o **valor de uma
// medida**. Os dois são ortogonais — um processo concluído com sucesso pode devolver uma medida
// ausente, e isso não é falha de nada.
//
//   • MEDIDO      — foi calculado e tem valor.
//   • ZERO        — foi calculado e deu zero. É um DADO, tão medido quanto qualquer outro.
//   • AUSENTE     — existe no contrato e não veio: suprimido, grosseirizado, sem massa.
//   • NÃO MEDIDO  — ninguém tentou. Não é falha, não é zero, não é ausência.
//
// ## Por que isto não podia continuar sendo `if (valor == null)`
//
// Porque as quatro coisas colapsam em duas na hora de desenhar, e o colapso mente nas duas
// direções. `Bar` (M10) já tinha visto metade do problema e escrito a regra certa — "uma barra
// vazia e uma barra de valor zero são indistinguíveis, e as duas afirmam coisas opostas" — e
// resolveu não desenhando nada quando suprimida. Só que trilho vazio é a MESMA imagem de
// `width: 0`, então a distinção continuava valendo só para quem lesse o rótulo ao lado.
//
// Aqui ausência ganha textura, e a textura é o que sobrevive à escala de cinza.
//
// ## Julgamento
//
// Cor semântica é uma AFIRMAÇÃO, e só entra quando existe faixa esperada publicada. Uma medida
// sem faixa fica na cor de ação — descrita, não julgada. Isto não é excesso de zelo: é a
// diferença entre "99% está dentro do esperado" e "99% parece alto para mim", e a segunda não é
// coisa que uma superfície deva dizer no lugar de quem publicou a métrica.

// Os tipos e as regras puras moram em `valorDaMedida.ts`, ao lado. Aqui ficam só as formas.
import { leituraDaMedida, tomPelaFaixa } from "./valorDaMedida";
import type { FaixaEsperada, TomDaMedida, ValorDaMedida } from "./valorDaMedida";

const PINTURA: Readonly<Record<TomDaMedida, string>> = {
  neutro: "bg-primary",
  dentro: "bg-success",
  borda: "bg-warning",
  fora: "bg-destructive",
};

const TINTA: Readonly<Record<TomDaMedida, string>> = {
  neutro: "text-foreground",
  dentro: "text-success",
  borda: "text-warning",
  fora: "text-destructive",
};

const pct = (n: number) => `${Math.max(0, Math.min(1, n)) * 100}%`;

/**
 * O trilho: faixa esperada ao fundo, valor à frente.
 *
 * Decorativo por definição (`aria-hidden`). O fato é o texto ao lado, e leitor de tela recebe o
 * fato — nunca a geometria. É a mesma regra que faz o número ficar sempre escrito: quem não
 * distingue comprimento continua lendo o valor.
 */
export function TrilhoDeMedida({
  valor,
  faixa,
  tom,
}: {
  valor: ValorDaMedida;
  faixa?: FaixaEsperada;
  tom?: TomDaMedida;
}) {
  if (valor.tipo === "naoMedida") {
    return <span className="medida-nao-medida block h-2 w-full rounded-full" aria-hidden="true" />;
  }

  if (valor.tipo === "ausente") {
    // Hachura no trilho INTEIRO. Ausência não tem magnitude, então não tem comprimento: pintar
    // parte do trilho sugeriria um valor parcial que ninguém mediu.
    return <span className="medida-ausente block h-2 w-full rounded-full" aria-hidden="true" />;
  }

  const efetivo = tom ?? (valor.tipo === "medido" ? tomPelaFaixa(valor.fracao, faixa) : "neutro");

  return (
    <span className="relative block h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      {faixa && (
        <span
          className="absolute inset-y-0 bg-success/20"
          style={{ left: pct(faixa.de), right: pct(1 - faixa.ate) }}
        />
      )}
      <span
        data-revelar="barra"
        className={`absolute inset-y-0 left-0 rounded-full ${PINTURA[efetivo]} ${
          // ZERO recebe traço mínimo VISÍVEL. Trilho vazio afirmaria ausência, que é outro fato.
          valor.tipo === "zero" ? "min-w-[0.1875rem]" : ""
        }`}
        style={{ width: valor.tipo === "zero" ? undefined : pct(valor.fracao) }}
      />
    </span>
  );
}

/**
 * Uma medida por inteiro: rótulo, valor, trilho e a régua que autoriza (ou não) o julgamento.
 *
 * A régua fica SEMPRE escrita embaixo, inclusive quando não existe. "sem faixa publicada" é
 * informação: diz a quem lê que o número não está sendo julgado, em vez de deixar a pessoa
 * supor que o cinza significa "mediano".
 */
export function Medida({
  rotulo,
  valor,
  faixa,
  regua,
}: {
  rotulo: string;
  valor: ValorDaMedida;
  faixa?: FaixaEsperada;
  /** O que escrever sobre a régua. Vem do produto: esta camada não traduz. */
  regua: string;
}) {
  const tom = valor.tipo === "medido" ? tomPelaFaixa(valor.fracao, faixa) : "neutro";
  const leitura = leituraDaMedida(valor);

  return (
    <div data-revelar className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{rotulo}</span>
        <span
          className={
            leitura.semNumero
              ? "text-sm text-muted-foreground"
              : `tabular text-lg font-medium ${TINTA[tom]}`
          }
        >
          {leitura.texto}
        </span>
      </div>
      <TrilhoDeMedida valor={valor} faixa={faixa} tom={tom} />
      <span className="text-xs text-muted-foreground">{faixa ? faixa.rotulo : regua}</span>
    </div>
  );
}
