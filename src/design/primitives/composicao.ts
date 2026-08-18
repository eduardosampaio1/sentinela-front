// A aritmética da barra de COMPOSIÇÃO. Pura, fora do componente.
//
// Separada pelo mesmo motivo de `zonaDoBullet.ts`: um arquivo que exporta componente E valor
// quebra o fast refresh, o lint reprova, e a catraca tem teto. A razão melhor é a outra —
// lógica pura em arquivo de componente é lógica que ninguém testa sem montar árvore de React.

/** Uma parte do todo. `valor` `null` = NÃO MEDIDO, e isso é diferente de zero. */
export interface ParteDaComposicao {
  readonly id: string;
  readonly rotulo: string;
  /** `null` quando o produtor não mediu. Nunca convertido em zero. */
  readonly valor: number | null;
  /** Texto já formatado pela camada de produto — esta não formata moeda. */
  readonly escrito: string;
}

export interface FatiaDaBarra {
  readonly id: string;
  /** `"37.4%"`, pronto para CSS. */
  readonly largura: string;
  /** Ausente = desenhada com textura, nunca com cor de valor. */
  readonly ausente: boolean;
}

/**
 * As fatias, e o RESTO que a soma não explica.
 *
 * ## Três decisões, e cada uma existe por um jeito de mentir
 *
 * **A ausência não some e não vira zero.** Uma parte com `valor: null` recebe largura do que
 * SOBRA depois das medidas — e é desenhada com textura. Omiti-la faria a barra parecer completa
 * quando ela não é; dar-lhe zero afirmaria "medimos e não custou nada", que é falso.
 *
 * **O total manda, não a soma das partes.** Quando as partes medidas somam menos que o total, o
 * que falta é o pedaço não atribuído — e ele aparece. Escalar as partes para preencher 100%
 * esconderia exatamente a diferença que o leitor precisa ver.
 *
 * **Soma maior que o total não é normalizada.** Ela é sinal de erro no produtor, e devolver
 * `null` faz a tela não desenhar barra nenhuma em vez de desenhar uma barra plausível e errada.
 */
export function fatiasDaComposicao(
  partes: readonly ParteDaComposicao[],
  total: number | null,
): readonly FatiaDaBarra[] | null {
  if (total === null || !Number.isFinite(total) || total <= 0) return null;

  const medidas = partes.filter((p) => p.valor !== null && Number.isFinite(p.valor));
  const somaMedida = medidas.reduce((s, p) => s + (p.valor as number), 0);
  // Partes que somam mais que o todo: o produtor está incoerente, e desenhar seria inventar.
  if (somaMedida > total + 1e-9) return null;

  const naoMedidas = partes.filter((p) => p.valor === null || !Number.isFinite(p.valor));
  const sobra = Math.max(0, total - somaMedida);

  const pct = (v: number) => `${((v / total) * 100).toFixed(2)}%`;
  const fatias: FatiaDaBarra[] = medidas.map((p) => ({
    id: p.id,
    largura: pct(p.valor as number),
    ausente: false,
  }));

  // A sobra é dividida entre as não medidas — ou, se não houver nenhuma, vira uma fatia própria
  // de "não atribuído". Dos dois jeitos ela APARECE: um todo que não fecha é informação.
  if (sobra > 1e-9) {
    if (naoMedidas.length > 0) {
      const cada = sobra / naoMedidas.length;
      for (const p of naoMedidas) fatias.push({ id: p.id, largura: pct(cada), ausente: true });
    } else {
      fatias.push({ id: "__nao_atribuido", largura: pct(sobra), ausente: true });
    }
  }

  return fatias;
}
