// Formatação de número. **A única coisa que o navegador tem permissão de fazer com um valor.**
//
// A regra da plataforma é backend-first: todo número exibido foi decidido no backend. O que sobra
// para cá é escolher como escrevê-lo — separador de milhar, casas decimais, símbolo de moeda,
// escala percentual QUANDO a origem declarou que o valor é uma razão.
//
// Mora num lugar só de propósito. O comentário original de `coverageDisplay` já dizia por quê:
// multiplicar por 100 dentro de um componente "vira o primeiro passo para o cálculo migrar para a
// UI". Com dois adapters (v1 e v2) e várias áreas analíticas, a mesma multiplicação espalhada em
// oito arquivos deixaria de ser formatação e viraria cálculo distribuído, sem ninguém decidir.

/** Formata um número preservando precisão significativa (sub-centavo não vira 0). */
export function formatarNumero(valor: number, locale: string, casasDeclaradas: number): string {
  const abs = Math.abs(valor);
  let casas = casasDeclaradas;
  // Sub-centavo: usa casas suficientes para o valor não colapsar em zero na exibição.
  if (abs > 0 && abs < 0.01) {
    casas = Math.max(casas, Math.min(6, Math.ceil(-Math.log10(abs)) + 1));
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarMoeda(
  valor: number,
  moeda: string | null,
  locale: string,
  casasDeclaradas: number,
): string {
  if (!moeda) {
    // Sem moeda declarada pela origem: NÃO assumir BRL/USD — número puro, sem símbolo inventado.
    return formatarNumero(valor, locale, casasDeclaradas);
  }
  const abs = Math.abs(valor);
  const casas = abs > 0 && abs < 0.01 ? Math.min(6, Math.ceil(-Math.log10(abs)) + 1) : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: moeda,
      minimumFractionDigits: 2,
      maximumFractionDigits: casas,
    }).format(valor);
  } catch {
    return formatarNumero(valor, locale, casas);
  }
}

/**
 * Uma fração 0..1 escrita como percentual.
 *
 * **Só pode ser chamada sobre um valor que a ORIGEM declarou ser fração.** O contrato analítico
 * declara isso pelo nome do campo (`true_rate`, `..._share`) e pelo próprio vocabulário das
 * estatísticas de concentração — não é inferência da UI.
 *
 * O valor NÃO é limitado a 100%: um `share` fora de 0..1 é defeito da origem, e escondê-lo com
 * um `Math.min` faria a tela mentir bonito. Quem chama decide como sinalizar.
 */
export function formatarPercentual(fracao: number, locale: string, casas = 1): string {
  return `${formatarNumero(fracao * 100, locale, casas)}%`;
}

/**
 * Data/hora vinda do backend, escrita no locale. **Nunca `new Date()` sem argumento.**
 *
 * Entrada inválida devolve o texto original em vez de "Invalid Date": o que o backend mandou é
 * mais informativo para quem depura do que a confissão de fracasso do `Intl`.
 */
export function formatarInstante(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

/**
 * O início de uma janela temporal, escrito conforme a granularidade DECLARADA pela série.
 *
 * O contrato manda o instante inteiro em RFC 3339 justamente para não depender de quem lê; a
 * granularidade vem no mesmo documento (`effective_granularity`), e é ela que decide se o rótulo
 * útil é o dia, o mês ou a hora. Escolher o formato por conta própria aqui inventaria uma
 * precisão que a série não tem.
 */
export function formatarJanela(iso: string, granularidade: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const opcoes: Intl.DateTimeFormatOptions =
    granularidade === "month"
      ? { year: "numeric", month: "short", timeZone: "UTC" }
      : granularidade === "week" || granularidade === "day"
        ? { year: "numeric", month: "short", day: "2-digit", timeZone: "UTC" }
        : { dateStyle: "short", timeStyle: "short", timeZone: "UTC" };
  return new Intl.DateTimeFormat(locale, opcoes).format(d);
}
