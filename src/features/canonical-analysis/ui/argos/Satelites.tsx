// Os SATÉLITES — os cartões menores ao lado do herói.
//
// ## Quais métricas, e por que não é escolha minha
//
// O protótipo escolheu três: Semantic Drift, Cost per Useful Outcome, Global Confidence. A lógica
// dele estava escrita ao lado: a home responde quatro perguntas — *está saudável, mudou, quanto
// custa entregar valor, dá pra confiar* — e o herói responde a primeira.
//
// Só que "as três mais importantes" não é fato publicado. O produtor não emite relevância, e
// escolher a dedo seria a priorização decidida no navegador que esta visão já proíbe para
// severidade.
//
// A regra aqui é declarada e verificável: **os satélites são os OUTROS escores globais**, na ordem
// do documento, tirando o que virou herói. `scores` é família publicada e pequena — sete no
// catálogo congelado —, então "o resto dela" é um recorte honesto e estável, não um ranking.
//
// Se o produtor um dia publicar relevância, a regra troca e o resto do arquivo continua igual.
//
// ## O que cada satélite diz além do número
//
// O denominador. "medido sobre 12.480 conversas" vem de `summary.record_count`, e é o que separa
// um escore de 82% sobre doze mil conversas de um escore de 82% sobre nove — o segundo não deveria
// convencer ninguém, e sem o denominador os dois são idênticos na tela.
//
// E o MOTIVO, quando não há número. `reason` é tipado no contrato, então "não medível nesta
// análise" vem acompanhado de por quê — que é a diferença entre a pessoa esperar e a pessoa agir.

import { useLanguage } from "@/contexts/LanguageContext";
import { Explicacao, Text } from "@/design/primitives";
import { explicacaoDe } from "../../result/catalogoArgos";
import type { PublicScore } from "@/lib/v1/contract/public-v3.types";
import {
  coberturaEscrita,
  motivoRelevante,
  unidadeInforma,
  valorEscrito,
} from "../../result/medicaoV3";

function Satelite({
  escore,
  rotulo,
  denominador,
}: {
  readonly escore: PublicScore;
  readonly rotulo: string;
  /** `summary.record_count`. É o que dá peso ao número — ou o que o desmente. */
  readonly denominador: string;
}) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const m = escore.measurement;
  const valor = valorEscrito(m, locale);
  const cobertura = coberturaEscrita(m.data_coverage, locale);

  return (
    // `data-revelar` por cartão: eles entram em sequência com o herói e as portas, não em bloco.
    <li data-revelar className="rounded-lg border border-border bg-card p-5">
      {/* O nome e a EXPLICAÇÃO, juntos. Os quatro satélites são o primeiro écran junto do
          herói, e os quatro têm nome em inglês por decisão registrada — é aqui que a frase
          decide se a decisão de não traduzir se sustenta ou vira barreira. */}
      <Text papel="micro" tom="discreto" as="p" className="flex flex-wrap items-center gap-1.5">
        {rotulo}
        <Explicacao
          texto={explicacaoDe(t, m.id)}
          rotuloDoGatilho={t("canonicalAnalysis.argos.explainMetric", { rotulo })}
        />
      </Text>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {valor !== null ? (
          <>
            <Text numerico className="text-3xl font-medium leading-none tracking-tight">
              {valor}
            </Text>
            {unidadeInforma(m.unit, m.scale) ? (
              <Text papel="rotulo" tom="discreto">
                {m.unit}
              </Text>
            ) : null}
          </>
        ) : (
          // O léxico da casa: ausência tem forma PRÓPRIA — contorno tracejado, nunca um zero e
          // nunca um travessão que se lê como zero conforme quem olha.
          <span
            className="medida-nao-medida inline-block rounded-sm px-2 py-1"
            data-sem-valor="true"
          >
            <Text papel="rotulo" tom="discreto">
              {t("canonicalAnalysis.argos.notMeasurableHere")}
            </Text>
          </span>
        )}
      </div>

      {/* O MOTIVO, quando o produtor deu um. É ele que transforma "não medível" em algo acionável:
          `insufficient_sample` pede mais dado, `dependency_unavailable` pede outra análise. */}
      {motivoRelevante(m.reason) ? (
        <Text papel="rotulo" tom="discreto" as="p" className="mt-2">
          {t(`canonicalAnalysis.argos.reason.${m.reason}`)}
        </Text>
      ) : null}

      {/* O denominador só aparece quando HÁ número: dizer "medido sobre 12.480" ao lado de uma
          ausência afirmaria uma medição que não aconteceu. */}
      {valor !== null ? (
        <Text papel="rotulo" tom="discreto" as="p" className="mt-2">
          {t("canonicalAnalysis.argos.measuredOver", { n: denominador })}
        </Text>
      ) : null}

      {cobertura !== null ? (
        <Text papel="rotulo" tom="discreto" as="p" className="mt-1">
          {t("canonicalAnalysis.argos.coverage")}: <span className="tabular-nums">{cobertura}</span>
        </Text>
      ) : null}
    </li>
  );
}

export function Satelites({
  escores,
  idDoHeroi,
  denominador,
  rotuloDe,
}: {
  readonly escores: readonly PublicScore[];
  readonly idDoHeroi: string;
  readonly denominador: string;
  readonly rotuloDe: (id: string) => string;
}) {
  const { t } = useLanguage();
  // O herói sai da lista. Repeti-lo aqui seria o mesmo fato em dois pesos na mesma dobra.
  const restantes = escores.filter((s) => s.measurement.id !== idDoHeroi);
  if (restantes.length === 0) return null;

  return (
    <section aria-labelledby="argos-satelites" className="space-y-3">
      {/* O título é `sr-only`: visualmente os cartões se explicam ao lado do herói, mas uma região
          sem nome acessível não é anunciada e o leitor de tela perde a fronteira. */}
      <h3 id="argos-satelites" className="sr-only">
        {t("canonicalAnalysis.argos.otherScores")}
      </h3>
      {/* DUAS colunas a partir de `sm`, e não quatro empilhados.
          Quatro cartões numa pilha faziam uma coluna de ~500px ao lado de um herói de 216px de
          conteúdo. Em 2×2 a coluna cai pela metade e a dobra inteira encolhe junto.

          NENHUMA hierarquia entre eles, e isso é decisão: o produtor não publica ranking de
          importância, e dar tamanhos diferentes afirmaria uma que ninguém declarou. A crítica
          que eu mesmo escrevi ("quatro cartões iguais, sem ordem de leitura") estava errada
          neste ponto — tratamento idêntico é o que o dado sustenta. */}
      <ul className="grid gap-4 sm:grid-cols-2">
        {restantes.map((s) => (
          <Satelite
            key={s.measurement.id}
            escore={s}
            rotulo={rotuloDe(s.measurement.id)}
            denominador={denominador}
          />
        ))}
      </ul>
    </section>
  );
}
