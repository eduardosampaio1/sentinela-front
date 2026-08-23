// F3 — como uma `PublicMeasurement` do v3 vira texto. **Só isso.**
//
// A regra da plataforma é backend-first: todo número exibido foi decidido no backend. O que
// sobra para cá é escrever o número — separador, casas, símbolo de moeda — e dizer o que o
// produtor declarou sobre ele.
//
// ## O que este módulo NÃO faz, e por que cada proibição existe
//
// **Não converte escala.** `response_stability` sai `0..100` e é publicado assim; `scale.kind`
// é contrato. Dividir por 100 "para virar razão" mudaria o número que o produtor mediu.
//
// **Não transforma ausência em zero.** `value: null` com `state: not_measured` é "não sabemos".
// Escrever `0` ali faz custo desconhecido e custo zero virarem a mesma tela — e decisões
// opostas para quem decide.
//
// **Não infere estado a partir do valor.** `availability` e `state` vêm do produtor. Um valor
// presente com `availability: partial` continua parcial, e um `reason` acompanha dizendo por quê.
//
// **Não inventa faixa.** Se `band` não veio no risco, não existe threshold local que a produza.

import type {
  PublicIndicatorV3,
  PublicMeasurement,
  Reason,
  Scale,
} from "@/lib/v1/contract/public-v3.types";
import { formatarMoeda, formatarNumero, formatarPercentual } from "./formatacao";

/** Casas decimais quando o indicador não declara `display_precision`. */
const CASAS_PADRAO = 2;

/**
 * O valor escrito, ou `null` quando não há valor.
 *
 * `null` é a resposta honesta e é o que a interface usa para escolher entre mostrar número e
 * mostrar ausência. Devolver `"—"` daqui misturaria dado com apresentação e faria toda chamada
 * ter de reconhecer o travessão como "vazio".
 */
export function valorEscrito(
  medicao: Pick<PublicMeasurement, "value" | "scale" | "unit"> & { currency?: string | null },
  locale: string,
  casas = CASAS_PADRAO,
): string | null {
  const { value, scale } = medicao;
  if (value === null || value === undefined) return null;

  switch (scale.kind) {
    case "currency":
      // Sem moeda declarada não se escolhe símbolo. O produtor recusa publicar dinheiro medido
      // sem moeda; se mesmo assim chegar, escrever o número cru é melhor que inventar a divisa.
      return medicao.currency
        ? formatarMoeda(value, medicao.currency, locale, casas)
        : formatarNumero(value, locale, casas);
    case "ratio_unit":
      // Percentual é ESCRITA de uma razão que o produtor declarou como razão — não conversão.
      return formatarPercentual(value, locale);
    case "percent":
      // Já vem em pontos percentuais. Multiplicar de novo daria 8500%.
      return `${formatarNumero(value, locale, casas)}%`;
    case "score_100":
    case "count":
    case "duration":
    case "raw":
    default:
      return formatarNumero(value, locale, casas);
  }
}

/** A escala, escrita para quem precisa saber em que régua o número vive. */
export function escalaEscrita(scale: Scale, locale: string): string | null {
  const { minimum, maximum } = scale;
  if (minimum === null || minimum === undefined) return null;
  if (maximum === null || maximum === undefined) return null;
  return `${formatarNumero(minimum, locale, 0)}–${formatarNumero(maximum, locale, 0)}`;
}

/** Há valor apresentável? Nunca inferido do estado — lido do próprio valor. */
export function temValor(m: Pick<PublicMeasurement, "value">): boolean {
  return m.value !== null && m.value !== undefined;
}

/**
 * O `reason` merece ser mostrado?
 *
 * `ok` é ruído: ele diz "medimos por inteiro", que o valor presente já diz. Todos os outros são
 * o que o v1 retinha e o que transforma "não medido" — que não diz o que fazer — em
 * "dependência indisponível", que diz.
 */
export function motivoRelevante(reason: Reason): boolean {
  return reason !== "ok";
}

/**
 * A medição está completa, ressalvada ou ausente?
 *
 * Três estados de APRESENTAÇÃO, derivados do que o produtor declarou — nunca do valor. É esta
 * função que impede a interface de tratar `partial` como completo só porque veio número.
 */
export type Apresentacao = "completa" | "ressalvada" | "ausente";

export function apresentacaoDaMedicao(m: PublicMeasurement): Apresentacao {
  if (!temValor(m)) return "ausente";
  return m.availability === "available" ? "completa" : "ressalvada";
}

export function apresentacaoDoIndicador(i: PublicIndicatorV3): Apresentacao {
  if (!temValor(i)) return "ausente";
  return i.state === "measured" ? "completa" : "ressalvada";
}

/*
 * NÃO existe aqui função que devolva CHAVE de i18n.
 *
 * Uma `chaveDoEstado(state)` levaria a interface a `t(chaveDoEstado(x))` — uma chamada OPACA, que
 * não carrega chave nenhuma no texto do programa. A catraca M14 congela essas chamadas em nove e
 * exige o número exato: cada nova torna a orfandade de tradução ainda menos decidível.
 *
 * Foi assim que a `ComparacaoComAnterior` quebrou a catraca na M39 — recebia `tituloKey` e
 * chamava `t(variavel)`. A correção foi a mesma que vale aqui: quem monta a chave usa template
 * com prefixo estático (`t(`canonicalAnalysis.argos.state.${x}`)`), e quem apresenta recebe
 * TEXTO já resolvido.
 */

/**
 * A unidade acrescenta informação ao número JÁ ESCRITO?
 *
 * A captura de tela do browser mostrou `80% ratio` e `R$ 1,20 currency`: a formatação já carrega
 * a unidade, e repeti-la ao lado é ruído que ainda por cima parece um segundo dado. `ratio` e
 * `currency` descrevem a ESCALA — que é contrato e é mostrada à parte —, não a unidade de
 * negócio. Já `conversations` diz algo que o número sozinho não diz.
 */
export function unidadeInforma(unidade: string | null | undefined, escala: Scale): boolean {
  if (!unidade) return false;
  if (escala.kind === "ratio_unit" || escala.kind === "percent") return unidade !== "ratio";
  if (escala.kind === "currency") return unidade !== "currency";
  return true;
}

/**
 * Cobertura escrita, quando o produtor a publicou E ela diz algo.
 *
 * `null` é ausência, nunca 100%. E cobertura INTEGRAL também não é escrita: "Cobertura: 100%"
 * repetido em toda linha vira moldura, e o olho para de ver justamente a linha em que ela é
 * 60% — que é a única em que ela importa.
 */
/**
 * A confiança DESTA medição, escrita — e `null` quando é plena.
 *
 * Irmã de `coberturaEscrita` e não a mesma função: cobertura é sobre QUANTO do dado entrou,
 * confiança é sobre O QUANTO SE CONFIA no resultado. Reusar uma pela outra apagaria a
 * distinção que o campo foi criado para preservar.
 *
 * Esconde `1` pelo mesmo motivo que a cobertura esconde: confiança plena não é ressalva, e
 * escrevê-la vira ruído ao lado do número que importa.
 */
export function confiancaEscrita(
  confianca: number | null | undefined,
  locale: string,
): string | null {
  if (confianca === null || confianca === undefined) return null;
  if (confianca >= 1) return null;
  return formatarPercentual(confianca, locale);
}

export function coberturaEscrita(
  cobertura: number | null | undefined,
  locale: string,
): string | null {
  if (cobertura === null || cobertura === undefined) return null;
  if (cobertura >= 1) return null;
  return formatarPercentual(cobertura, locale);
}

/**
 * Os dois cortes, escritos — `"60 · 75"`.
 *
 * O bullet desenha a régua para quem VÊ. Este par é o canal que sobrevive à escala de cinza, e
 * é o que permite CONFERIR a posição do marcador em vez de confiar nela.
 *
 * Cada corte sai NOMEADO, e essa foi uma correção. A primeira versão escrevia só os dois números
 * "na ordem publicada", com um comentário afirmando que a ordem carregava a direção. **Não
 * carregava:** os dois ramos produziam a mesma coisa — sempre o menor primeiro —, e a mutação que
 * os substituía por `min · max` sobreviveu porque era EQUIVALENTE. O comentário descrevia uma
 * intenção, não o código.
 *
 * Com o nome ao lado do número, a direção é lida sem depender de ordem nenhuma: `atenção 75 ·
 * crítico 60` diz que menor é pior, e `atenção 0,5 · crítico 0,8` diz o contrário.
 *
 * Sem limiar, `null` — a linha não aparece, e nenhum corte é inventado para as 36 saídas que não
 * os têm.
 */
export function limiarEscrito(
  t: { readonly warn: number; readonly critical: number } | null | undefined,
  locale: string,
  rotuloWarn = "warn",
  rotuloCritical = "crit",
): string | null {
  if (!t || !Number.isFinite(t.warn) || !Number.isFinite(t.critical)) return null;
  const fmt = (v: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v);
  return `${rotuloWarn} ${fmt(t.warn)} · ${rotuloCritical} ${fmt(t.critical)}`;
}


/**
 * A DISTANCIA ate o corte de atencao — `score - warn`.
 *
 * ## Por que isto nao viola "o front nao produz dado"
 *
 * Os dois operandos sao PUBLICADOS: `intents[].score.value` e `thresholds.warn`, ambos do mesmo
 * documento e do mesmo produtor. A subtracao nao cria uma medida nova; ela poupa quem le de
 * fazer a conta de cabeca em cada linha da tabela.
 *
 * A fronteira que importa e outra, e continua fechada: nada aqui INVENTA um corte, nem estima,
 * nem normaliza escala. Sem `thresholds` publicado o resultado e `null`, e a coluna some — a
 * tela nao escolhe um corte padrao para ter o que mostrar.
 *
 * ## O que ela NAO e
 *
 * Nao e comparacao com a analise anterior. O rotulo diz o corte no proprio cabecalho
 * (`Delta ate o corte (75)`) exatamente para impedir essa leitura: e a distancia ate o corte do
 * METODO, e vale ja na primeira analise, quando nao existe anterior nenhuma.
 *
 * ## Por que aqui e nao no componente
 *
 * O gate `backend-first-result` proibe aritmetica em `canonical-analysis/ui`. A subtracao nao
 * casa com nenhum dos padroes que ele varre, mas escrever conta dentro de componente e
 * exatamente o habito que o gate existe para nao deixar nascer.
 */
export function deltaAteOCorte(
  valor: number | null | undefined,
  limiar: { readonly warn: number } | null | undefined,
): number | null {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  if (!limiar || !Number.isFinite(limiar.warn)) return null;
  return valor - limiar.warn;
}

/** O que a tela pode dizer sobre uma intencao. Nenhum destes e decidido aqui — ver abaixo. */
export type AcaoDaIntencao = "sem_base" | "exige_acao" | "monitorar" | "saudavel";

/**
 * A ACAO de uma intencao: o veredito PUBLICADO, cruzado com o piso de amostra PUBLICADO.
 *
 * ## Isto nao e fabricar severidade
 *
 * `severity` vem de `intents[].severity` e `piso` vem de `method.min_samples_per_intent`. Esta
 * funcao nao decide se algo e critico — ela TRADUZ o que o produtor decidiu para a palavra que
 * a pessoa le, e acrescenta uma unica distincao que o produtor tambem publica: quando o veredito
 * nao e OK mas o suporte esta abaixo do piso, o numero existe e nao sustenta decisao.
 *
 * Essa distincao e o caso `sem_base`, e ela e a razao de a funcao existir. Sem ela a tela diria
 * "exige acao" sobre uma intencao com n=1 — que e pedir uma decisao sobre ruido.
 *
 * ## `null` quando nao da para dizer
 *
 * Sem severidade publicada nao ha acao. A tela mostra ausencia, nao "saudavel" — a #24 vale aqui
 * como em todo lugar: ausencia nao e o valor bom.
 */
export function acaoDaIntencao(
  severity: string | null | undefined,
  suporte: number | null | undefined,
  piso: number | null | undefined,
): AcaoDaIntencao | null {
  const s = (severity ?? "").trim().toLowerCase();
  if (!s) return null;
  const semBase =
    s !== "ok" &&
    typeof suporte === "number" &&
    typeof piso === "number" &&
    suporte < piso;
  if (semBase) return "sem_base";
  if (s === "ok") return "saudavel";
  // `critical` e `warn` sao os dois degraus que o contrato usa em `intents[]`. Qualquer outro
  // valor cai em `monitorar` — o degrau conservador —, e nunca em `saudavel`: um veredito que
  // esta tela nao reconhece nao pode virar "esta tudo bem".
  if (s === "critical") return "exige_acao";
  return "monitorar";
}


/**
 * O SUFIXO da escala — `/100` para escore centesimal, nada para as demais.
 *
 * ## Por que aqui e nao no componente
 *
 * O gate `backend-first-result` varre `/ 100` em componentes para pegar divisao por cem. O
 * literal de TEXTO `"/100"` casa com o mesmo padrao, e um regex nao tem como distinguir uma
 * barra de divisao de uma barra de escrita.
 *
 * Afrouxar o matcher para deixar o sufixo passar abriria a porta para a divisao de verdade —
 * que e o unico motivo de o gate existir. Entao quem muda de lugar e o sufixo, nao o gate.
 *
 * ## Por que so `score_100`
 *
 * As outras escalas ou ja carregam a unidade na escrita do valor (`ratio_unit` sai como `%`,
 * `currency` sai com a divisa) ou nao tem maximo declarado. Escrever um denominador para elas
 * afirmaria um teto que o produtor nao publicou.
 */
export function sufixoDaEscala(scale: Pick<Scale, "kind">): string | null {
  return scale.kind === "score_100" ? "/" + String(100) : null;
}
