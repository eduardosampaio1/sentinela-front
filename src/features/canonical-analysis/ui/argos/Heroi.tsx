// O protagonista da Visão geral.
//
// ## O que ele conserta
//
// A tela abria com dezoito números do mesmo tamanho, na mesma cor. O `behavior_score` — a saída
// número 1 do catálogo congelado, o resumo do comportamento — aparecia como uma linha entre as
// outras. Quem abria o laudo não tinha onde pousar o olho primeiro.
//
// Um número muito maior que os outros é hierarquia por TIPOGRAFIA, não por decoração: nada aqui
// depende de cor, sombra ou brilho, e a informação não muda — só o peso com que ela é dita.
//
// ## O que ele NÃO tem, e por que a ausência é a decisão certa
//
// **~~Sem medidor com faixa esperada~~ — a premissa caiu, e o medidor entrou.** A recusa dizia
// "não há faixa esperada em contrato nenhum", e estava certa quando foi escrita. Duas fatias de
// backend a derrubaram: `PublicMeasurement.thresholds` publica os dois cortes que o motor APLICA
// (`THR_WARN=75` / `THR_CRIT=60`), em campo próprio — nunca em `Scale`, que é a régua.
//
// O bullet não inventa: ele desenha o que veio, e **só aparece quando o limiar veio**. Sem
// `thresholds` não há barra — é o caso das outras 36 saídas, e uma régua cinza "só para mostrar
// a escala" convidaria a leitura de posição que nada sustenta.
//
// A outra metade da recusa CONTINUA valendo: a marca do período anterior segue sem publicação, e
// o `analysis-result-v3` não tem campo de comparação. O bullet não a desenha.
//
// **Sem vão de delta.** A tentação era mostrar um espaço hachurado dizendo "sem comparação". Mas
// hachura é para o que ESTÁ ausente, e comparação não é um campo ausente deste documento — é um
// conceito que ele não tem. Um vão prometeria que algum dia um número aparece ali, e não vai.
//
// **Sem herói substituto.** Se `behavior_score` não veio, não há herói. Promover outro escore ao
// posto trocaria silenciosamente qual número a tela apresenta como resumo — e ninguém saberia
// que a manchete mudou de assunto.

import { useLanguage } from "@/contexts/LanguageContext";
import { Bullet, Explicacao, Text, zonaDoValor } from "@/design/primitives";
import { explicacaoDe } from "../../result/catalogoArgos";
import type { PublicScore } from "@/lib/v1/contract/public-v3.types";
import {
  apresentacaoDaMedicao,
  coberturaEscrita,
  confiancaEscrita,
  escalaEscrita,
  motivoRelevante,
  unidadeInforma,
  valorEscrito,
} from "../../result/medicaoV3";

// `ID_DO_HEROI` MUDOU para `catalogoArgos.ts`.
//
// O cadeado da jornada canônica proíbe o literal do id neste arquivo — ele está na lista de
// "indicador analítico inventado", escrita quando o nome não existia em contrato nenhum. O catálogo
// é o lugar certo por dois motivos: é onde os ids publicados moram, e é o único arquivo isento
// daquele cadeado, com a isenção justificada e guardada contra orfandade.

/**
 * O VEREDITO em palavra — o achado mais grave da avaliação da primeira vista.
 *
 * A tela mostrava `80,36` em 104px, com uma barra de três cores embaixo, e NUNCA dizia se
 * aquilo era bom. A conclusão existia no produto — o motor publica os cortes e a barra já os
 * desenha —, mas chegar nela exigia decodificar cor. É a pergunta que a régua desta casa manda
 * eliminar: *"e daí?"*.
 *
 * A frase NÃO é juízo da tela: ela nomeia a zona em que o valor caiu segundo os cortes
 * PUBLICADOS, que é a mesma conta que pinta o marcador. Nenhuma informação nova entra aqui — o
 * que entra é a palavra que faltava.
 *
 * Sem limiar, a tela DIZ que não há faixa em vez de calar: número grande sem veredito e sem
 * explicação é o que produz a dúvida que esta linha existe para fechar.
 *
 * `switch` com chave LITERAL, e não `t(mapa[zona])`: o gate de i18n congela o número de chamadas
 * opacas numa catraca DESCENDENTE, e a primeira versão disto a fez subir de 9 para 10 — que é
 * exatamente o que ela existe para impedir.
 */
function veredito(
  t: (k: string) => string,
  valor: number,
  limiar: { readonly warn: number; readonly critical: number } | null | undefined,
) {
  if (!limiar) {
    // Sem faixa publicada não há ponto de estado: um ponto neutro ao lado de uma frase de
    // ausência sugeriria um estado que ninguém declarou. E o texto fica menor, porque aqui
    // ele não é veredito — é a explicação de por que não há um.
    return (
      <span className="text-base font-normal text-muted-foreground">
        {t("canonicalAnalysis.argos.verdictNone")}
      </span>
    );
  }
  switch (zonaDoValor(valor, limiar.warn, limiar.critical)) {
    case "ok":
      return (
        <>
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--ds-success))]"
          />
          <span className="text-[hsl(var(--ds-success))]">
            {t("canonicalAnalysis.argos.verdictOk")}
          </span>
        </>
      );
    case "atencao":
      return (
        <>
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--ds-warning))]"
          />
          <span className="text-[hsl(var(--ds-warning))]">
            {t("canonicalAnalysis.argos.verdictWarn")}
          </span>
        </>
      );
    default:
      return (
        <>
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-[hsl(var(--ds-danger))]"
          />
          <span className="text-[hsl(var(--ds-danger))]">
            {t("canonicalAnalysis.argos.verdictCritical")}
          </span>
        </>
      );
  }
}

export function Heroi({ escore, rotulo }: { readonly escore: PublicScore; readonly rotulo: string }) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const m = escore.measurement;
  const valor = valorEscrito(m, locale);
  const apresentacao = apresentacaoDaMedicao(m);
  const cobertura = coberturaEscrita(m.data_coverage, locale);
  const escala = escalaEscrita(m.scale, locale);
  // D5 — a confianca DESTA medicao. Rotulo proprio, e nao "Confianca" seco, porque a lista de
  // escores logo abaixo publica `Global confidence`, que e outra coisa: um escore sobre a
  // analise inteira. Dois numeros com o mesmo nome na mesma tela seria a confusao que o campo
  // foi criado para desfazer.
  const confianca = confiancaEscrita(m.confidence, locale);

  return (
    <section
      data-revelar
      data-heroi="true"
      aria-labelledby="argos-heroi"
      className="rounded-lg border border-border bg-card p-6"
    >
      <h3
        id="argos-heroi"
        className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[hsl(var(--ds-accent-ink))]"
      >
        <span className="inline-flex items-center gap-1.5">
          {rotulo}
          {/* A EXPLICAÇÃO ao lado do nome. O owner reparou que a avaliação não a pedira, e o
              protótipo tem o padrão desde sempre. Aqui ela importa mais que em qualquer outro
              lugar: este é o número que a tela apresenta como resposta, e o nome dele está em
              inglês por decisão registrada de não traduzir métrica. */}
          <Explicacao
            texto={explicacaoDe(t, m.id)}
            rotuloDoGatilho={t("canonicalAnalysis.argos.explainMetric", { rotulo })}
          />
        </span>
      </h3>

      <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
        {valor !== null ? (
          // O papel `heroi` mora no sistema, não aqui. Ele é fluido de propósito — 104px do
          // protótipo não cabe em 375px de viewport — e traz peso médio e numerais tabulares:
          // número grande em peso pesado vira cartaz, e dígito de largura variável destrói leitura.
          <Text papel="heroi" numerico>
            {valor}
          </Text>
        ) : (
          // Sem valor, o ESTADO ocupa o lugar do número, no tamanho do texto — nunca um zero
          // grande, nunca um travessão do tamanho de um número.
          <span className="text-lg font-medium text-muted-foreground" data-sem-valor="true">
            {t(`canonicalAnalysis.argos.availability.${m.availability}`)}
          </span>
        )}
        {valor !== null && unidadeInforma(m.unit, m.scale) ? (
          <span className="pb-2 text-sm text-muted-foreground">{m.unit}</span>
        ) : null}
      </div>
      {/* O VEREDITO EM DESTAQUE — dois pedidos do owner, e o segundo mudou a hierarquia.

          Primeiro: a tela mostrava `80,36` em 104px, com uma barra de três cores embaixo, e
          NUNCA dizia se aquilo era bom. A conclusão existia no produto, mas chegar nela exigia
          decodificar COR.

          Depois: *"precisa ganhar destaque, é bater o olho e saber se está ruim ou não"*.

          E ele tem razão sobre a hierarquia, não só sobre o tamanho. O número é PRECISO; o
          veredito é a RESPOSTA. Quem abre a tela quer saber se está bom antes de saber quanto —
          o `80,36` responde "quanto", e só o veredito responde "e daí".

          Por isso ele sobe de `text-sm` para `text-xl`/620 e ganha um ponto de estado à
          esquerda: em uma olhada, cor e forma dizem a mesma coisa que a palavra, e a palavra
          continua lá para quem não distingue as cores. */}
      {m.value !== null && m.value !== undefined ? (
        // A CONFIANÇA sobe para esta linha, e isso fecha o buraco que encurtar a régua abriu.
        //
        // Com a barra em 384px num cartão de 447px úteis, sobravam ~60px de nada à direita
        // dela e uma linha inteira embaixo só para a confiança. Pondo os dois na mesma faixa,
        // o veredito ocupa a esquerda, a confiança a direita, e some uma linha inteira.
        //
        // Elas pertencem juntas: uma diz o veredito, a outra diz o quanto se pode confiar
        // nele. Lidas em sequência vertical pareciam fatos separados.
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="flex items-center gap-2 text-xl font-[620] leading-tight">
            {veredito(t, m.value, m.thresholds)}
          </p>
          {confianca !== null ? (
            <p className="text-xs text-muted-foreground">
              {t("canonicalAnalysis.argos.measurementConfidence")}:{" "}
              <span className="tabular-nums text-foreground">{confianca}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* O BULLET, e só quando o produtor declarou os cortes. `thresholds` ausente devolve
          `null` aqui mesmo — a tela não desenha régua sem zona, e o número segue sendo o fato. */}
      {m.thresholds ? (
        <div className="mt-4">
          <Bullet
            valor={m.value ?? null}
            warn={m.thresholds.warn}
            critical={m.thresholds.critical}
            // A régua vem da ESCALA, não do limiar: `score_100` vive em 0..100. Deduzir os
            // extremos dos próprios cortes encolheria o eixo até as zonas, e a posição do
            // marcador passaria a exagerar toda variação.
            piso={0}
            teto={m.scale.kind === "ratio_unit" ? 1 : 100}
            // `null`: o valor já está acima, em 104px. Repeti-lo em 11px sob a barra faz o
            // olho conferir duas vezes o mesmo número.
            rotuloDoValor={null}
            descricao={t("canonicalAnalysis.argos.bulletDescription", {
              rotulo,
              valor: valor ?? "—",
              warn: String(m.thresholds.warn),
              critical: String(m.thresholds.critical),
            })}
          />
        </div>
      ) : null}


      {/* Um valor parcial apresentado como completo é pior que ausência, porque ninguém desconfia
          dele. A ressalva vem junto do número, não numa nota de pé. */}
      {apresentacao === "ressalvada" ? (
        <p className="mt-2 text-xs text-amber-900 dark:text-amber-200">
          {t(`canonicalAnalysis.argos.availability.${m.availability}`)}
        </p>
      ) : null}
      {motivoRelevante(m.reason) ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t(`canonicalAnalysis.argos.reason.${m.reason}`)}
        </p>
      ) : null}

      {/* Os fatos do próprio número, na régua pequena: o herói não é isento de dizer de onde veio. */}
      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        {cobertura !== null ? (
          <div className="flex gap-1">
            <dt>{t("canonicalAnalysis.argos.coverage")}:</dt>
            <dd className="tabular-nums">{cobertura}</dd>
          </div>
        ) : null}
        {/* A CONFIANÇA saiu daqui e subiu para a linha do veredito. Ela ficou nos dois lugares
            por uma passagem minha, e o mesmo número apareceu duas vezes no mesmo cartão — o
            defeito exato que eu tinha acabado de remover ao tirar o `80,36` de baixo da régua. */}
        {escala !== null ? (
          <div className="flex gap-1">
            <dt>{t("canonicalAnalysis.argos.scale")}:</dt>
            <dd>{escala}</dd>
          </div>
        ) : null}
        {escore.composite_of && escore.composite_of.length > 0 ? (
          <div className="flex gap-1">
            <dt>{t("canonicalAnalysis.argos.compositeOf")}:</dt>
            <dd>{escore.composite_of.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
