// O agrupamento por DOMÍNIO — e ele não é meu, é do produtor.
//
// ## O campo que estava publicado e ninguém lia
//
// `PublicMeasurement.domain` e `PublicIndicatorV3.domain` são campos TIPADOS, com vocabulário
// fechado de quatro valores: `semantic`, `behavioral`, `structural`, `economic`. Varri o produto
// antes de escrever isto: **nenhum consumidor**. A única ocorrência de `domain` em `src/` era uma
// string sem relação, dentro do adaptador da superfície congelada.
//
// Isso importa porque o protótipo aprovado propunha navegação por domínio, e eu tinha registrado
// no discovery que aquilo era "agrupamento editorial" — decisão minha, portanto opcional. Estava
// errado: o produtor **declara** a que domínio cada número pertence. A navegação que o protótipo
// desenhou já existia no contrato.
//
// ## O que este módulo NÃO faz
//
// Não infere domínio. Um número sem `domain` declarado não entra em domínio nenhum — nem no mais
// parecido, nem no primeiro, nem num "outros" que finja ser um quinto domínio. Ele sai em
// `semDominio`, e a tela o apresenta dizendo isso.
//
// Esconder os sem-domínio seria pior que qualquer palpite: a tela mostraria quatro abas somando
// menos números do que o documento traz, sem nada denunciando a diferença. É a mesma regra que
// separa "família ausente" de "família vazia".
//
// ## A exceção que não é exceção: as dimensões
//
// Os ids das quatro dimensões de saúde SÃO os quatro domínios — `semantic`, `behavioral`,
// `structural`, `economic`. Colocar a dimensão `semantic` na aba `semantic` não é inferência: é
// identidade, e o registro do backend declara que o conjunto é fechado nesses quatro. Elas entram
// pelo `id` quando não trazem `domain` próprio.

import type {
  AnalysisResultV3Document,
  Domain,
  PublicIndicatorV3,
  PublicMeasurement,
  PublicProjection,
  PublicRisk,
  PublicScore,
} from "@/lib/v1/contract/public-v3.types";

/** Os quatro, na ordem em que a tela os apresenta. Conjunto FECHADO do contrato. */
export const DOMINIOS: readonly Domain[] = ["semantic", "behavioral", "structural", "economic"];

const CONHECIDOS = new Set<string>(DOMINIOS);

/**
 * O nome do parâmetro de URL. Um só, e mora aqui — quem lê e quem escreve usam a mesma constante.
 *
 * Ele começou dentro do componente das abas, e o lint estava certo em reclamar: arquivo que exporta
 * componente E constante quebra o fast refresh, e lógica pura em arquivo de componente é lógica que
 * ninguém testa sem montar árvore.
 */
export const PARAM_DOMINIO = "dominio";

/**
 * O domínio pedido pela URL, ou `null` para a Visão geral.
 *
 * Valor fora do vocabulário devolve `null` em vez de erro: uma URL editada à mão não deve quebrar a
 * tela, e cair na Visão geral é a degradação que não esconde nada.
 */
export function dominioDaUrl(busca: string): Domain | null {
  const pedido = new URLSearchParams(busca).get(PARAM_DOMINIO);
  return DOMINIOS.find((d) => d === pedido) ?? null;
}

/**
 * Uma linha do laudo, com a família preservada.
 *
 * A família não é decoração: ela decide COMO o item é desenhado — um escore declara `composite_of`,
 * um risco declara `band`, uma projeção declara `horizon` e `basis`. Achatar tudo em "medição"
 * apagaria justamente o que cada família publica de próprio.
 */
export type ItemDeDominio =
  | { readonly familia: "scores"; readonly item: PublicScore }
  | { readonly familia: "dimensions"; readonly item: PublicMeasurement }
  | { readonly familia: "indicators"; readonly item: PublicIndicatorV3 }
  | { readonly familia: "risks"; readonly item: PublicRisk }
  | { readonly familia: "projections"; readonly item: PublicProjection };

export interface AgrupamentoPorDominio {
  /** Por domínio DECLARADO. Um domínio sem itens fica com lista vazia — a aba dirá isso. */
  readonly porDominio: Readonly<Record<Domain, readonly ItemDeDominio[]>>;
  /** Publicados sem `domain`. Não somem, e não viram um quinto domínio. */
  readonly semDominio: readonly ItemDeDominio[];
}

/** O domínio declarado, ou `null`. Valor fora do vocabulário é tratado como AUSENTE, não como novo. */
function dominioDeclarado(valor: string | null | undefined): Domain | null {
  // Um domínio novo no backend não pode abrir aba sozinho: a tela tem quatro títulos traduzidos e
  // um quinto sairia como a chave de i18n crua. Cai em `semDominio`, que é honesto e visível.
  return valor && CONHECIDOS.has(valor) ? (valor as Domain) : null;
}

export function agruparPorDominio(d: AnalysisResultV3Document): AgrupamentoPorDominio {
  const porDominio: Record<Domain, ItemDeDominio[]> = {
    semantic: [],
    behavioral: [],
    structural: [],
    economic: [],
  };
  const semDominio: ItemDeDominio[] = [];

  const colocar = (dom: Domain | null, entrada: ItemDeDominio) => {
    if (dom) porDominio[dom].push(entrada);
    else semDominio.push(entrada);
  };

  // A ordem de varredura é a ordem de leitura dentro da aba: escore, dimensão, indicador, risco,
  // projeção. Dentro de cada família a ordem é a do DOCUMENTO — reordenar por valor seria
  // priorização decidida no navegador, que esta visão já proíbe para severidade.
  for (const s of d.scores ?? []) {
    colocar(dominioDeclarado(s.measurement.domain), { familia: "scores", item: s });
  }
  for (const m of d.dimensions ?? []) {
    // `domain` próprio quando vier; senão o `id`, que para as quatro dimensões É o domínio.
    colocar(dominioDeclarado(m.domain ?? m.id), { familia: "dimensions", item: m });
  }
  for (const i of d.indicators ?? []) {
    colocar(dominioDeclarado(i.domain), { familia: "indicators", item: i });
  }
  for (const r of d.risks ?? []) {
    colocar(dominioDeclarado(r.measurement.domain), { familia: "risks", item: r });
  }
  for (const p of d.projections ?? []) {
    colocar(dominioDeclarado(p.measurement.domain), { familia: "projections", item: p });
  }

  return { porDominio, semDominio };
}

/**
 * O documento RECORTADO por um domínio, para a tela renderizar a mesma árvore sobre menos itens.
 *
 * ## `null`, não `[]` — e essa é a decisão que evita uma mentira
 *
 * `familiaFoiProduzida` distingue duas coisas por presença de campo: `null` significa "esta
 * capacidade não foi produzida", `[]` significa "rodou e não encontrou item". A tela usa isso para
 * omitir a seção no primeiro caso e escrever "rodou e não achou nada" no segundo.
 *
 * Se o recorte devolvesse `[]` para uma família que existe mas não tem item NESTE domínio, a tela
 * afirmaria "procuramos e não há" — quando a verdade é "há, em outra aba". Devolvendo `null`, a
 * seção simplesmente não aparece naquele corte, que é o que é verdade.
 *
 * A família ORIGINALMENTE ausente continua ausente: `null` recortado de `null` segue `null`.
 */
export function recortarPorDominio(
  d: AnalysisResultV3Document,
  dominio: Domain,
): AnalysisResultV3Document {
  const { porDominio } = agruparPorDominio(d);
  const itens = porDominio[dominio];
  // `ou nada` traduz "vazio neste corte" para o `null` que a tela já sabe ler como "não está aqui".
  const ouNada = <T,>(lista: T[]): T[] | null => (lista.length > 0 ? lista : null);
  const daFamilia = <F extends ItemDeDominio["familia"]>(familia: F) =>
    itens.filter((i) => i.familia === familia).map((i) => i.item);

  return {
    ...d,
    scores: ouNada(daFamilia("scores") as PublicScore[]),
    dimensions: ouNada(daFamilia("dimensions") as PublicMeasurement[]),
    indicators: ouNada(daFamilia("indicators") as PublicIndicatorV3[]),
    risks: ouNada(daFamilia("risks") as PublicRisk[]),
    projections: ouNada(daFamilia("projections") as PublicProjection[]),
  };
}

/** Quantos itens o documento colocou em cada domínio — o número que a aba mostra ao lado do nome. */
export function contagemPorDominio(a: AgrupamentoPorDominio): Readonly<Record<Domain, number>> {
  return {
    semantic: a.porDominio.semantic.length,
    behavioral: a.porDominio.behavioral.length,
    structural: a.porDominio.structural.length,
    economic: a.porDominio.economic.length,
  };
}
