// REVELAÇÃO — o motor de entrada do sistema, e as cinco regras que ele materializa.
//
// ## Por que existe um motor, e não `animate-fade-in` em cada superfície
//
// A folha global já tinha `.animate-fade-in` e cinco classes `.stagger-N`. Elas resolvem uma
// superfície e falham no sistema por três motivos que só aparecem juntos:
//
//   • `.stagger-N` para no quinto item. Uma lista tem N itens, e o sexto em diante entra junto
//     com o quinto — o escalonamento vira um degrau.
//   • `animation-delay` com `forwards` deixa o elemento no estado INICIAL durante o atraso. Se a
//     animação não roda (aba oculta, `content-visibility`, erro antes do paint), o elemento fica
//     invisível para sempre. É a regra 01 sendo violada por construção.
//   • Classe CSS não reanima. Remover e recolocar a classe no mesmo quadro é coalescido pelo
//     navegador e nada acontece — o que faz "voltar a rolar para cima" mostrar a tela parada.
//
// ## As cinco regras
//
//   01. **O movimento nunca decide se o conteúdo existe.** Todo crescimento é `transform` com
//       `fill: "none"`. Uma animação que trave, nunca rode ou seja cancelada no meio deixa a
//       barra CHEIA e o bloco VISÍVEL — nunca o contrário.
//   02. **Uma animação por elemento.** Toda entrada começa cancelando o que estava rodando ali.
//       Sem isso, duas revelações concorrentes empilham e a que segura o `transform` inicial
//       pode vencer, prendendo o elemento em escala zero.
//   03. **Movimento informativo pode gastar a duração mais longa do vocabulário.** A barra que
//       cresce MOSTRA a escala; ela não está transicionando entre dois estados de interface.
//       Por isso usa `deliberate`, que a Constituição reserva para "onde a demora COMUNICA".
//   04. **Repetível.** A revelação é disparada por `IntersectionObserver`, não uma vez ao montar.
//   05. **Menos movimento não é menos informação.** Sob `prefers-reduced-motion` o motor não
//       roda — e, pela regra 01, o estado final já é o padrão do documento.
//
// ## De onde vêm os números
//
// De lugar nenhum deste arquivo. Duração e curva são lidas do vocabulário canônico em runtime,
// via `getComputedStyle`. É o que impede este motor de virar um sexto valor de motion: se a
// Constituição mudar `deliberate`, o crescimento muda junto, e nenhuma linha aqui é tocada.
//
// O passo do escalonamento é DERIVADO, não declarado: um terço da duração de transição de
// estado. Derivar mantém o vocabulário em cinco durações; declarar abriria a sexta.

/** Os quatro papéis de entrada. Cada forma entra pela sua natureza — ver `formaDe`. */
export type PapelDeRevelacao = "bloco" | "barra" | "coluna" | "ponto";

const ATRIBUTO = "data-revelar";
const SELETOR = `[${ATRIBUTO}]`;

/** Fração da duração de transição que separa dois itens vizinhos no escalonamento. */
const DIVISOR_DO_PASSO = 3;

/** Quantos itens ainda escalonam antes de o atraso saturar. Além disso o último item de uma
 *  lista longa esperaria mais que a paciência de quem chegou — e escalonamento que ninguém
 *  espera até o fim não é ordem de leitura, é atraso. */
const TETO_DO_ESCALONAMENTO = 12;

function ehReduzido(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Web Animations API não existe em jsdom, e `IntersectionObserver` também não. O motor precisa
 *  ser inerte nesses ambientes em vez de derrubar a árvore — o conteúdo já está no estado final. */
function podeAnimar(alvo: Element): alvo is HTMLElement {
  return typeof (alvo as HTMLElement).animate === "function";
}

function valorDoToken(papel: string): string {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return "";
  return window.getComputedStyle(document.documentElement).getPropertyValue(papel).trim();
}

function duracaoDoToken(papel: string): number {
  const bruto = Number.parseFloat(valorDoToken(papel));
  return Number.isFinite(bruto) ? bruto : 0;
}

interface Receita {
  quadros: Keyframe[];
  duracao: string;
  curva: string;
  origem?: string;
}

/**
 * A tradução de papel para gesto.
 *
 * Uma barra tem origem à esquerda porque é de lá que ela é medida; uma coluna se levanta do
 * eixo pelo mesmo motivo, com o eixo trocado. Um ponto — célula, marcador, pino de evidência —
 * não cresce: crescer daria a ele uma magnitude que ele não tem.
 */
function formaDe(papel: PapelDeRevelacao): Receita {
  switch (papel) {
    case "barra":
      return {
        quadros: [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        duracao: "--ds-duration-deliberate",
        curva: "--ds-easing-emphasis",
        origem: "left center",
      };
    case "coluna":
      return {
        quadros: [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
        duracao: "--ds-duration-deliberate",
        curva: "--ds-easing-emphasis",
        origem: "bottom center",
      };
    case "ponto":
      return {
        quadros: [{ opacity: 0 }, { opacity: 1 }],
        duracao: "--ds-duration-base",
        curva: "--ds-easing-enter",
      };
    case "bloco":
    default:
      return {
        quadros: [
          { opacity: 0, transform: "translateY(0.7rem)" },
          { opacity: 1, transform: "none" },
        ],
        duracao: "--ds-duration-slow",
        curva: "--ds-easing-enter",
      };
  }
}

function papelDe(alvo: Element): PapelDeRevelacao {
  const bruto = alvo.getAttribute(ATRIBUTO);
  if (bruto === "barra" || bruto === "coluna" || bruto === "ponto") return bruto;
  return "bloco";
}

/**
 * Revela um elemento.
 *
 * `fill` é `"none"` em TODOS os papéis, e essa é a regra 01 escrita em uma palavra. Com
 * `"backwards"` o elemento assume o primeiro quadro durante o atraso — e um atraso que nunca
 * termina deixa opacidade zero ou escala zero permanentes. Com `"none"` o pior caso é o
 * conteúdo aparecer sem gesto nenhum, que é exatamente o que se quer que aconteça quando o
 * movimento falha.
 */
export function revelarElemento(alvo: Element, indice = 0): void {
  if (ehReduzido() || !podeAnimar(alvo)) return;

  const receita = formaDe(papelDe(alvo));
  const passo = duracaoDoToken("--ds-duration-base") / DIVISOR_DO_PASSO;
  const atraso = Math.min(indice, TETO_DO_ESCALONAMENTO) * passo;

  if (receita.origem) alvo.style.transformOrigin = receita.origem;

  // Regra 02 — a nova cancela a anterior, sempre.
  alvo.getAnimations().forEach((anterior) => anterior.cancel());

  alvo.animate(receita.quadros, {
    duration: duracaoDoToken(receita.duracao),
    easing: valorDoToken(receita.curva) || "linear",
    delay: atraso,
    fill: "none",
  });
}

/**
 * Revela todos os elementos marcados dentro de uma raiz, escalonados na ordem do documento.
 *
 * O índice é a posição no DOM, que é a ordem de leitura — é isso que faz o escalonamento
 * comunicar hierarquia em vez de só espalhar o movimento no tempo.
 */
export function revelarConteudo(raiz: ParentNode | null): void {
  if (!raiz) return;
  const alvos = Array.from(raiz.querySelectorAll(SELETOR));
  alvos.forEach((alvo, i) => revelarElemento(alvo, i));
}

/**
 * Liga a revelação por proximidade da janela (regra 04) e devolve como desligar.
 *
 * Cada elemento é revelado toda vez que volta a entrar na tela. Quem rola para baixo e volta vê
 * de novo — que é a diferença entre movimento que explica a chegada do conteúdo e movimento que
 * aconteceu uma vez, antes de a pessoa estar olhando.
 */
export function observarRevelacao(raiz: ParentNode | null): () => void {
  if (!raiz || ehReduzido()) return () => {};
  if (typeof window === "undefined" || typeof window.IntersectionObserver !== "function") {
    // Sem observador não há como saber quando o conteúdo chega à tela. Revela uma vez: melhor
    // um gesto perdido do que a tela inteira parada.
    revelarConteudo(raiz);
    return () => {};
  }

  const posicoes = new WeakMap<Element, number>();
  Array.from(raiz.querySelectorAll(SELETOR)).forEach((alvo, i) => posicoes.set(alvo, i));

  const observador = new IntersectionObserver(
    (entradas) => {
      // Reagrupa por lote: dois elementos que entram no mesmo quadro precisam escalonar entre
      // SI, não herdar o índice global — senão o item 40 de uma lista longa esperaria o teto
      // inteiro para aparecer, mesmo sendo o primeiro que a pessoa vê ao rolar até ele.
      const visiveis = entradas
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (posicoes.get(a.target) ?? 0) - (posicoes.get(b.target) ?? 0));
      visiveis.forEach((entrada, i) => revelarElemento(entrada.target, i));
    },
    { threshold: 0.2 },
  );

  Array.from(raiz.querySelectorAll(SELETOR)).forEach((alvo) => observador.observe(alvo));
  return () => observador.disconnect();
}
