// As larguras de barra da visão Medidas, calculadas FORA da árvore de componentes.
//
// ## O que este arquivo resolve
//
// As três famílias — distribuição, concentração e série — publicam listas com contagem desde
// sempre, e a superfície congelada já as desenhava como barra. A visão Medidas nasceu sem, e
// mostrava as mesmas listas em texto puro: a pessoa lia dezoito números e tinha que descobrir
// sozinha qual era o maior.
//
// Nada aqui é dado novo. É a mesma contagem publicada, dita também por comprimento.
//
// ## Por que devolve só a largura
//
// Rótulo, formatação e tradução são trabalho da tela, e já existem lá. O que não pode acontecer
// na tela é a CONTA — e a conta é exatamente isto. Devolver a linha inteira arrastaria locale e
// dicionário para dentro de um módulo que não deveria conhecer nenhum dos dois.
//
// A ordem da saída é a ordem da entrada, sempre. Reordenar por tamanho seria priorização decidida
// no navegador, que é o que o ARGOS já proíbe para severidade — e vale igual aqui.

import { escalar } from "./escalaVisual";
import type {
  ResumoDeConcentracao,
  ResumoDeDistribuicao,
  SerieTemporal,
} from "./analyticsProjection";

/** Uma largura por grupo publicado, na ordem em que os grupos vieram. */
export function largurasDeDistribuicao(d: ResumoDeDistribuicao): string[] {
  // `other_count` fica FORA da escala. Ele é a soma do que não pôde ser publicado, não um grupo:
  // deixá-lo entrar faria a maior barra ser "todo o resto", e os grupos nomeados encolheriam
  // proporcionalmente a um valor que a tela nem desenha.
  const escala = escalar(d.groups.map((g) => g.count));
  return d.groups.map((g) => escala(g.count));
}

/** Uma largura por faixa de concentração, na ordem em que as faixas vieram. */
export function largurasDeConcentracao(c: ResumoDeConcentracao): string[] {
  // A faixa conta ENTIDADES, não valor. `total_volume` é de outra unidade e não serve de
  // denominador: misturar os dois faria uma barra que não corresponde a nada.
  const escala = escalar(c.bands.map((b) => b.entity_count));
  return c.bands.map((b) => escala(b.entity_count));
}

/** Uma largura por janela da série, na ordem cronológica em que as janelas vieram. */
export function largurasDeSerie(s: SerieTemporal): string[] {
  // Janela suprimida fica de fora da lista que define a escala.
  //
  // Registro honesto: **com escala por MÁXIMO isto não muda número nenhum** — acrescentar zeros
  // nunca abaixa um máximo. Eu escrevi aqui que mudaria, e a mutação provou que não: troquei o
  // filtro por `count ?? 0` e os oito casos continuaram verdes.
  //
  // O filtro FICA por dizer o que a lista é — suprimido não é um valor —, e porque a escala pode
  // deixar de ser por máximo (soma e média mudariam com os zeros). Mas ele não é a defesa: a
  // defesa é `suprimida` no `Bar`, que não desenha barra alguma, e essa sim é observável.
  const escala = escalar(
    s.windows.filter((j) => j.count !== null).map((j) => j.count as number),
  );
  // Suprimida devolve `"0%"`, e quem desenha não usa este valor: o `Bar` recebe `suprimida` e
  // não desenha barra nenhuma. Barra de largura zero e barra de valor zero são indistinguíveis,
  // e afirmam coisas opostas.
  return s.windows.map((j) => (j.count === null ? "0%" : escala(j.count)));
}
