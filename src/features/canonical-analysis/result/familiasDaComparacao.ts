// M39 — quais famílias do ARGOS podem ser comparadas, e o que impede as outras.
//
// **Isto é AUTORIDADE em código, não implementação de comparação.** Nenhuma função compara nada
// aqui; o que existe é a classificação congelada, fechada sobre as onze famílias do
// `analysis-result-v3`, e é sobre ela que a catraca (`evo02-m39-freeze.test.ts`) prova que
// `comparacao.ts` não cresceu sem autoridade.
//
// ## Por que uma lista em código, e não só uma frase no PLAN
//
// Até este checkpoint a M39 estava congelada por DECISÃO: nada impedia a regra de comparação de
// ganhar `scores` numa tarde. O que separava "congelado" de "ninguém mexeu ainda" era memória.
// Uma lista fechada torna a expansão uma mudança VISÍVEL — quem quiser comparar uma família nova
// precisa mudar este arquivo, e mudá-lo reprova até que a autoridade decida.
//
// ## Por que a classificação cobre as ONZE, e não só as duas autorizadas
//
// Listar só o que entra deixaria o que fica de fora sem motivo escrito, e "não está na lista"
// não diz se é por decisão, por falta de contrato ou por esquecimento. Cada família carrega o
// seu porquê, e a diferença entre os estados é o que orienta a reentrada.

import { FAMILIAS_ARGOS, type FamiliaArgos } from "./contratoV3";

/**
 * O que a M39 V1 faz — ou não faz — com cada família.
 *
 *     PAIR                  compara par a par, por identidade contratual
 *     OUT_OF_M39_V1         semântica conhecida, sem scenario/gate suficientes para a V1
 *     BLOCKED_BY_CONTRACT   falta identidade longitudinal PÚBLICA; nenhuma decisão de tela resolve
 *     SIDE_BY_SIDE_ONLY     não é coleção pareável; no máximo os dois lados um ao lado do outro
 */
export type EstadoDeComparacao =
  | "PAIR"
  | "OUT_OF_M39_V1"
  | "BLOCKED_BY_CONTRACT"
  | "SIDE_BY_SIDE_ONLY";

export interface ClassificacaoDaFamilia {
  readonly estado: EstadoDeComparacao;
  /** Identidade contratual do item, quando existe. `null` quando o contrato não a declara. */
  readonly identidade: string | null;
  /** Por que este estado — em uma frase, para quem reabrir a decisão. */
  readonly porque: string;
}

/**
 * A classificação congelada. **Fechada sobre `FAMILIAS_ARGOS`** — o gate prova que nenhuma
 * família do contrato ficou sem classificação e que nenhuma inventada entrou.
 */
export const CLASSIFICACAO_M39: Readonly<Record<FamiliaArgos, ClassificacaoDaFamilia>> = {
  indicators: {
    estado: "PAIR",
    identidade: "id",
    porque:
      "`id` é do registro canônico de indicadores, versionado por `indicator_registry_version`. " +
      "É a única identidade que a regra atual já usa, e a única com scenario existente.",
  },
  dimensions: {
    estado: "PAIR",
    identidade: "measurement.id",
    porque:
      "As quatro dimensões de saúde são conjunto FECHADO do contrato (semantic, behavioral, " +
      "structural, economic). Não existe quinta, e o `ai_health_score` NÃO é uma delas: ele é " +
      "escore composto e declara estas quatro em `composite_of`.",
  },
  // O caso do escore de janela merece a explicação inteira, e ela mora AQUI, em comentário, por
  // uma razão que não é estilo: o cadeado da jornada proíbe o termo do domínio em código da
  // feature, porque o Product Freeze §4 mantém essa métrica FORA da V1 enquanto não houver
  // referência, limiar e owner canônico. O catálogo do ARGOS publicá-la não revoga a decisão de
  // produto — e nomeá-la num campo de dado a faria circular como conceito de tela.
  //
  // O que o produtor diz, e que basta para a classificação: a métrica é medida DENTRO de uma
  // análise; sem a janela declarada, dois valores de análises diferentes pareceriam série.
  scores: {
    estado: "OUT_OF_M39_V1",
    identidade: "measurement.id",
    porque:
      "`PublicScore` não tem `id` próprio — a identidade vive dentro da medição. E há escore de " +
      "janela, medido DENTRO de uma análise: sem `window_kind`/`window_size` coincidentes, dois " +
      "valores de análises diferentes PARECERIAM série. A semântica é conhecida; faltam " +
      "scenario e gate.",
  },
  projections: {
    estado: "OUT_OF_M39_V1",
    identidade: "id + horizon",
    porque:
      "O produtor declara que `projected_token_cost@month` e `@year` são a MESMA métrica em " +
      "horizontes diferentes. Parear só por `id` cruzaria horizontes. Exige ainda `currency` " +
      "igual — não há câmbio no Front — e `basis`.",
  },
  risks: {
    estado: "OUT_OF_M39_V1",
    identidade: "id",
    porque:
      "O valor pode parear com `scale` e `method_version` coincidentes. `band` é produtor-only: " +
      "escolher onde termina 'moderado' é decisão de produto, e tomá-la na apresentação a " +
      "esconderia de quem a revisa.",
  },
  intents: {
    estado: "BLOCKED_BY_CONTRACT",
    identidade: null,
    porque:
      "`intent_id` NÃO é identidade longitudinal canônica: o catálogo registra MÉTRICAS, e " +
      "`intents[]` é declarado como grão fino da mesma métrica, não entrada nova do catálogo. " +
      "Duas análises podem atribuir o mesmo id a intenções diferentes, e a mesma intenção pode " +
      "receber ids diferentes. Sem identidade pública, nenhum pareamento — e nunca por texto.",
  },
  recommendations: {
    estado: "BLOCKED_BY_CONTRACT",
    identidade: null,
    porque:
      "D27 exige identidade canônica para qualquer afirmação de persistiu/apareceu/sumiu, e " +
      "proíbe parear por título, texto ou similaridade. O v3 traz um campo `id`, mas nenhuma " +
      "autoridade o declara durável ENTRE análises — campo presente não é identidade declarada.",
  },
  alerts: {
    estado: "OUT_OF_M39_V1",
    identidade: null,
    porque:
      "O produtor decidiu: a CONTAGEM de alertas críticos é métrica (`critical_alert_count`, no " +
      "catálogo) e o alerta é conteúdo — 'só a primeira é comparável entre análises'. `code` é " +
      "estável para máquina, não declarado longitudinal.",
  },
  issues: {
    estado: "OUT_OF_M39_V1",
    identidade: null,
    porque:
      "Mesma razão dos alertas, com menos ainda: `code` aqui nem sequer traz a nota de " +
      "estabilidade que o alerta traz.",
  },
  evidence: {
    estado: "OUT_OF_M39_V1",
    identidade: null,
    porque:
      "`id` e `kind` existem; durabilidade entre análises não é declarada. `observed_count` é " +
      "contagem sobre a análise, não série.",
  },
  executive_summary: {
    estado: "SIDE_BY_SIDE_ONLY",
    identidade: null,
    porque:
      "Singleton textual. Não é coleção, não pareia, e diff/similaridade/NLP no Front " +
      "produziria uma afirmação que nenhum produtor fez.",
  },
};

/**
 * As famílias que a M39 V1 compara. **Derivada**, nunca escrita à mão.
 *
 * Duas listas — uma de classificação e outra de autorizadas — divergiriam no primeiro ajuste, e
 * a errada seria a que alguém leu.
 */
export const FAMILIAS_COMPARAVEIS_M39: readonly FamiliaArgos[] = FAMILIAS_ARGOS.filter(
  // `?.` de propósito. Sem ele, uma família sem classificação quebra este módulo NO IMPORT, e o
  // gate inteiro morre com `TypeError` em vez de apontar qual família ficou de fora. Foi o que a
  // campanha de mutação mostrou: proteção existia, diagnóstico não.
  (f) => CLASSIFICACAO_M39[f]?.estado === "PAIR",
);

/**
 * Pré-condições de PAR, por família. Documento compatível (D26) não basta: um par ainda pode ser
 * incomparável por metadado próprio, e o v3 é o primeiro contrato capaz de expressar isso —
 * `method_version` viaja POR MEDIÇÃO, não só por documento.
 *
 * O par que falhar qualquer uma sai `NOT_COMPARABLE`. Nunca um valor derivado, nunca uma
 * conversão: `ratio_unit` × `score_100` e BRL × USD são incompatíveis, não convertíveis.
 */
export const PRECONDICOES_DE_PAR: Readonly<Record<string, readonly string[]>> = {
  indicators: ["scale.kind", "unit", "currency", "state"],
  dimensions: ["scale.kind", "method_version"],
};

/** Pré-condição de DOCUMENTO (D26). Divergiu, nenhum par é comparável. */
export const PRECONDICOES_DE_DOCUMENTO: readonly string[] = [
  "indicator_registry_version",
  "argos_catalog_version",
  "measurement_contract_version",
];
