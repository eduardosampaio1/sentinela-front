// A ALTURA DA MOLDURA DO MAPA DE PROCEDÊNCIA — derivação pura, fora do componente.
//
// ## Por que ela mora aqui e não ao lado do desenho
//
// O cadeado `backend-first-result` proíbe aritmética em qualquer arquivo sob
// `canonical-analysis/ui/`, e proíbe por `Math.max(` sem olhar o que está sendo maximizado. A
// regra é grossa de propósito: ela existe para impedir que a tela CALCULE um número analítico, e
// um matcher que tentasse distinguir "estatística" de "geometria" erraria nos dois sentidos.
//
// Isto aqui é geometria — a altura da caixa a partir das posições que o próprio desenho
// atribuiu, não um agregado sobre dado do produtor. Mas a resposta certa a um gate grosso não é
// afiná-lo: é tirar a conta do lugar que ele protege. `barrasDaProjecao.ts` já estabeleceu o
// precedente, calculando largura de barra aqui do lado.
//
// E há um ganho que não é sobre o gate: a conta ficou testável sozinha.
//
// ## O teto, e por que ele não é redondo
//
// `fitView` enquadra o desenho quando o navegador roda o passo de layout. Quando ele não roda —
// aba oculta, impressão, captura fora de tela — a moldura fica em escala 1, e uma altura fixa
// corta a última linha SEM AVISAR.
//
// O piso de 200 evita a moldura espremida de um desdobramento de dois nós. O teto de 480 cobre o
// pior caso REAL: seis filhos mais o nó do "não desenhados" pedem 468. Um teto abaixo disso
// voltaria a cortar em silêncio, que é o defeito que dimensionar pelo conteúdo existe para
// evitar.

/** Altura da caixa do nó, em px. Declarada, não medida — ver `MapaDeProcedencia.tsx`. */
export const ALTURA_DO_NO = 52;

/** Respiro abaixo da última linha, para a borda não encostar no nó. */
const RESPIRO = 20;

const PISO = 200;
const TETO = 480;

/**
 * A altura da moldura, a partir do `y` de cada nó já posicionado.
 *
 * Recebe as posições e não os nós para não conhecer o tipo do React Flow: a conta é sobre
 * números, e um dia o desenho pode trocar de biblioteca sem levar isto junto.
 */
export function alturaDoMapa(ys: readonly number[]): number {
  if (ys.length === 0) return PISO;
  let maior = ys[0];
  for (const y of ys) if (y > maior) maior = y;
  const fundo = maior + ALTURA_DO_NO + RESPIRO;
  return fundo < PISO ? PISO : fundo > TETO ? TETO : fundo;
}
