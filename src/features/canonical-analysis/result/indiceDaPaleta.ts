// NAV-01 — o casamento de termo da paleta de comandos. Puro, e fora de `ui/`.
//
// ## Por que aqui e não ao lado do componente
//
// Casar termo é `filter`, e o cadeado `backend-first-result` proíbe aritmética em qualquer arquivo
// sob `canonical-analysis/ui/`. A regra é grossa de propósito, e a resposta certa a um gate grosso
// não é afiná-lo: é tirar a conta do lugar que ele protege. `barrasDaProjecao.ts` e
// `geometriaDoMapa.ts` já estabeleceram o precedente.
//
// E fora de `ui/` isto ficou testável sem renderizar nada.
//
// ## O que ele NÃO faz, e cada linha é uma decisão
//
// **Não ordena por relevância.** Ranking é aritmética E é priorização decidida no navegador — as
// duas coisas que o cadeado proíbe. A ordem da saída é a ordem da ENTRADA, que é a ordem do
// documento na tela. Quem lê o laudo de cima para baixo encontra a lista na ordem que já conhece.
//
// **Não pontua, não corta, não limita.** Sem `top N`: um corte silencioso faria a paleta afirmar
// que aquilo é tudo que casou.
//
// **Não traduz nome de métrica** (decisão congelada). Ele casa por APELIDO em português sem nunca
// exibi-lo: quem digita "custo" acha `Cost per Useful Outcome`, e o que aparece na lista continua
// sendo o nome publicado.

/** Uma entrada indexável. `destino` é âncora (`#id`) ou rota (`/algo`) — quem decide é o chamador. */
export interface EntradaDaPaleta {
  /** O que a pessoa lê. Já traduzido pelo chamador; esta camada não conhece i18n. */
  readonly rotulo: string;
  /** Âncora dentro da página, sem `#`, ou rota absoluta começando com `/`. */
  readonly destino: string;
  /** Em qual grupo a lista mostra. */
  readonly grupo: "aqui" | "ir";
  /**
   * Termos alternativos que também casam, e que NUNCA aparecem na tela.
   *
   * Existem porque nome de métrica não se traduz: sem eles, quem procura "custo" em português não
   * encontra `Cost per Useful Outcome`, e a decisão de não traduzir passa a custar a busca.
   */
  readonly apelidos?: readonly string[];
}

/**
 * Normaliza para comparação: minúsculas e sem acento.
 *
 * Sem isto, "intencoes" não acha "Intenções" — e digitar sem acento é o caso comum, não a
 * exceção, em quem está com as duas mãos no teclado.
 */
function chave(t: string): string {
  // Propriedade Unicode, e nao a faixa numerica de marcas combinantes: a faixa exige saber
  // de cor onde ela comeca, e escrita com os caracteres literais fica INVISIVEL no editor.
  return t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * As entradas que casam com `termo`, na ordem em que chegaram.
 *
 * Termo vazio devolve TUDO — a paleta aberta sem digitar é um índice, e um índice vazio esperando
 * digitação não responde "quais são minhas opções neste nível?".
 */
export function casar(
  entradas: readonly EntradaDaPaleta[],
  termo: string,
): readonly EntradaDaPaleta[] {
  const t = chave(termo.trim());
  if (t === "") return entradas;
  return entradas.filter(
    (e) =>
      chave(e.rotulo).includes(t) ||
      (e.apelidos ?? []).some((a) => chave(a).includes(t)),
  );
}

// ## O QUE NÃO ENTROU: a lista de apelidos
//
// A primeira versão trazia um mapa `id público → termos em português` — "custo" achando
// `Cost per Useful Outcome` —, porque nome de métrica não se traduz e sem apelido a busca custa a
// decisão de não traduzir.
//
// Ela saiu, por dois motivos que se somam:
//
//   1. **Não tinha consumidor.** O escopo (b) indexa REGIÕES, e região tem título traduzido. Nome
//      de métrica aparece DENTRO de uma região, não como âncora — então nenhuma entrada real
//      chegava a carregar apelido. Peça escrita e nunca ligada.
//   2. O gate `canonical-journey-boundary` reprovou, e com razão: um mapa com `behavior_score`
//      escrito à mão aqui é id de indicador nascendo fora do registro que o publica.
//
// O campo `apelidos` da entrada FICA, porque o mecanismo está certo e é barato. O dia em que a
// paleta indexar saídas individuais, os apelidos nascem de onde os nomes nascem — do catálogo — e
// não de uma lista paralela.
