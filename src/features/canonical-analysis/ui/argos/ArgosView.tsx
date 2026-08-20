// F3 — a visão ARGOS. Fonte ÚNICA: `analysis-result-v3`.
//
// ## O que esta tela não faz
//
// Não chama `/analytics`. Não lê o bloco analítico do v2. Não calcula escore, faixa de risco,
// Drift nem delta. Não normaliza escala, não converte moeda, não soma projeção. Tudo o que ela
// mostra foi decidido pelo produtor; o que sobra aqui é agrupar, ordenar quando o contrato
// autoriza, e **dizer o que o produtor disse** sobre cada medição.
//
// ## Família omitida ≠ família vazia
//
// A distinção mais importante da tela, e a mais fácil de perder. Campo AUSENTE significa que a
// capacidade não foi produzida neste documento; `[]` significa que ela existe, rodou e não
// encontrou item. Materializar a ausente como seção vazia faria a tela afirmar "procuramos e não
// há" — afirmação que ninguém fez.
//
// Por isso a seção só existe quando a família foi produzida, e quando ela veio vazia a tela diz
// isso com palavra própria.
//
// ## Sem queda para o v1
//
// O documento é pedido com `?result_schema_version=3`. Análise antiga sem v3 recebe
// indisponibilidade explícita — nunca o v1 com cara de resultado completo, que faria dez
// famílias ausentes parecerem "o ARGOS não produziu nada".

import { useLocation, useParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import type { EstadoPublico } from "@/design/patterns/estados";
import { useRevelacao } from "@/design/motion";
import type {
  AnalysisResultV3Document,
  PublicAlert,
  PublicIndicatorV3,
  PublicIssue,
} from "@/lib/v1/contract/public-v3.types";
import { useAnalysisArgos } from "../../data/argos";
import { resolverLeituraArgos } from "../../result/adapterV3";
import { useAnalysisStatus } from "../../data/analysis";
import { familiaFoiProduzida, type FamiliaArgos } from "../../result/contratoV3";
import { ID_DO_HEROI, nomeadoPeloCatalogo } from "../../result/catalogoArgos";
import {
  agruparPorPorta,
  contagemPorPorta,
  portaDaUrl,
  recortarPorPorta,
} from "../../result/portasDoArgos";
import { valorEscrito } from "../../result/medicaoV3";
import { descriptorDe } from "../../result/descriptors";
import { formatarNumero } from "../../result/formatacao";
import { AbasDePorta } from "./AbasDePorta";
import { BarraDeComposicao, Disclosure } from "@/design/primitives";
import { Heroi } from "./Heroi";
import { Intencoes } from "./Intencoes";
import { Portas } from "./Portas";
import { Satelites } from "./Satelites";
import { BarraDeReferencia } from "./BarraDeReferencia";
import { AnalysisShell } from "../AnalysisShell";
import { PaletaDeComandos } from "../PaletaDeComandos";
import { ProblemFeedback, problemCodeOf } from "../notices";
import { useCanonicalScope } from "../scope";
import { Indicador, Medicao } from "./Medicao";

/** Uma região da visão. O `id` é a âncora, e o título é o que o índice usaria. */
function Secao({
  id,
  titulo,
  nivel,
  children,
}: {
  readonly id: string;
  readonly titulo: string;
  /** 2 no topo do documento, 3 dentro de um `Grupo`. Sem padrão: a hierarquia é afirmação. */
  readonly nivel: 2 | 3;
  readonly children: React.ReactNode;
}) {
  const H = nivel === 2 ? "h2" : "h3";
  // `data-revelar` aqui cobre TODAS as seções desta visão de uma vez, e elas entram na ordem do
  // documento — que aqui é a ordem de leitura do laudo. O movimento é deslocamento puro: a regra
  // que a matriz transversal impôs depois de reprovar contraste em vinte jornadas é que entrada
  // com opacidade deixa texto abaixo de 4,5:1 enquanto roda.
  return (
    <section data-revelar aria-labelledby={id} className="space-y-1">
      <H id={id} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </H>
      {children}
    </section>
  );
}

/**
 * Os dois grupos do laudo: o que o ARGOS **concluiu** e o que o ARGOS **mediu**.
 *
 * ## Por que agrupar é legítimo e ordenar por gravidade não é
 *
 * Esta tela tinha dez famílias empilhadas com o mesmo peso, e quem abria lia seis blocos de número
 * antes de descobrir que havia alerta. A conclusão vinha depois da evidência.
 *
 * A correção óbvia seria colorir por severidade e subir o mais grave. Ela é proibida, e não por
 * gosto: `severity`, `priority` e `band` são **string aberta** no contrato — não há enum em lugar
 * nenhum, e o exemplo real do v3 traz as dez famílias ausentes. Ordenar `critical` acima de `info`
 * exigiria uma escada que o produtor não publicou, inventada aqui. Dois testes desta casa já
 * travam isso: a severidade que sai é a que entrou, e a ordem dos itens é a do documento.
 *
 * O que sobra é o que o Front realmente pode decidir: a **ordem de leitura**. Conclusão antes de
 * evidência é editorial, vale para qualquer documento, e não depende de saber qual severidade é
 * pior. Nenhum item muda de lugar dentro da sua família.
 *
 * O grupo só existe quando tem conteúdo: cartão com título e nada dentro afirmaria que o ARGOS
 * concluiu algo — a mesma afirmação que a seção vazia faria, e que esta tela recusa.
 */
function Grupo({
  id,
  titulo,
  destaque,
  children,
}: {
  readonly id: string;
  readonly titulo: string;
  /** O grupo das conclusões ganha superfície própria; o das medições fica na régua. */
  readonly destaque: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={
        destaque ? "space-y-6 rounded-lg border border-border bg-card p-5" : "space-y-6"
      }
    >
      <h2 id={id} className="text-xs font-semibold uppercase tracking-widest text-accent-ink">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** "A capacidade rodou e não encontrou nada" — dito com palavra, não com espaço em branco. */
function Vazia() {
  const { t } = useLanguage();
  return (
    <p className="py-3 text-sm text-muted-foreground" data-familia-vazia="true">
      {t("canonicalAnalysis.argos.familyEmpty")}
    </p>
  );
}

/**
 * Renderiza a família SOMENTE se ela foi produzida.
 *
 * O `null` de saída é a diferença entre "o ARGOS não avalia risco nesta análise" e "avaliou e
 * não encontrou risco nenhum". Nenhuma seção nasce para preencher layout.
 */
function Familia<T>({
  documento,
  familia,
  id,
  titulo,
  itens,
  children,
}: {
  readonly documento: AnalysisResultV3Document;
  readonly familia: FamiliaArgos;
  readonly id: string;
  readonly titulo: string;
  readonly itens: readonly T[] | null | undefined;
  readonly children: (itens: readonly T[]) => React.ReactNode;
}) {
  if (!familiaFoiProduzida(documento, familia)) return null;
  const lista = itens ?? [];
  return (
    // Toda família vive dentro de um `Grupo`, então o nível é sempre 3.
    <Secao id={id} titulo={titulo} nivel={3}>
      {lista.length === 0 ? <Vazia /> : children(lista)}
    </Secao>
  );
}

/** "Esta análise não tem documento ARGOS" — e o que ainda está disponível. */
function SemDocumentoArgos() {
  const { t } = useLanguage();
  return (
    // `status`, não `alert`: é conclusão sobre disponibilidade, não falha. A casa já usa essa
    // distinção, e transformá-la em alerta ensinaria a ignorar alertas.
    <div role="status" className="space-y-2 rounded-md border border-border p-4">
      <p className="text-sm font-medium">{t("canonicalAnalysis.argos.noDocumentTitle")}</p>
      <p className="text-sm text-muted-foreground">
        {t("canonicalAnalysis.argos.noDocumentBody")}
      </p>
    </div>
  );
}

function Achados({
  itens,
  rotuloSeveridade,
}: {
  readonly itens: readonly (PublicAlert | PublicIssue)[];
  readonly rotuloSeveridade: string;
}) {
  return (
    <ul className="space-y-2">
      {itens.map((item) => (
        <li key={item.id} className="border-b border-border/60 py-2 last:border-b-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{item.title}</span>
            {/* A severidade é DADO do produtor: nenhuma faixa é calculada aqui. */}
            <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
              <span className="sr-only">{rotuloSeveridade}: </span>
              {item.severity}
            </span>
            <code className="text-xs text-muted-foreground">{item.code}</code>
          </div>
          {/* O `detail` do alerta NÃO é apresentado. O cadeado da jornada canônica proíbe
              `.detail` na UI — ele existe contra o detalhe cru de `problem+json`, e não sabe
              distinguir daquele campo homônimo que o v3 publica como conteúdo. Afrouxá-lo
              abriria justamente a porta que ele fecha. Lacuna declarada no DOC-CLOSE, e o
              alerta segue com título, código e severidade publicados. */}
        </li>
      ))}
    </ul>
  );
}

export function ArgosView() {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const params = useParams();
  const analysisId = params.analysisId ?? null;
  const scope = useCanonicalScope();
  // O status alimenta o shell — a leitura é a mesma da jornada, deduplicada pela `queryKey`.
  const status = useAnalysisStatus(scope, analysisId);
  const argos = useAnalysisArgos(scope, analysisId);
  // A PORTA pedida pela URL. `null` = Visão geral, que é a AUSÊNCIA do parâmetro — assim todo
  // link para `/argos` que já existe abre exatamente onde abria antes.
  //
  // O `?dominio=` antigo NÃO é traduzido para porta, e a decisão é medida: o parâmetro nasceu
  // em 17/08 e o commit nunca saiu desta máquina, então existem ZERO links salvos. Mapear
  // `economic` → `economia` afirmaria uma equivalência falsa — o domínio mostrava UMA métrica,
  // a porta mostra dezoito —, e o link passaria a apontar para outra coisa em silêncio.
  const { search } = useLocation();
  const porta = portaDaUrl(search);
  // A chave junta as duas leituras E o domínio: o documento chega depois do status, e um observador
  // montado sobre a árvore de carregamento não observa seção nenhuma — o laudo apareceria parado.
  // Sem o domínio na chave, trocar de aba trocaria o conteúdo sem movimento, e a tela pareceria
  // ter piscado em vez de ter navegado.
  const raiz = useRevelacao<HTMLDivElement>(
    `${argos.dataUpdatedAt}|${argos.isPending}|${porta ?? "geral"}`,
  );

  const titulo = t("canonicalAnalysis.argos.title");

  /**
   * O rótulo de uma medida, por DUAS fontes e nesta ordem.
   *
   * O contrato não publica rótulo humano no payload, e inventar tradução seria adivinhar. Mas
   * "não vem no payload" nunca quis dizer "não existe": o `argos-catalog-1.0` congelou os 39
   * outputs COM o nome de cada um, e este arquivo lia só o registro de economia, que cobre 14.
   *
   * Resultado medido antes desta correção: 15 identificadores chegavam crus à tela, entre eles
   * `ai_health_score` e `behavior_score` — os dois números que são a manchete do produto.
   *
   * 1. `descriptorDe` primeiro, porque ele é mais rico: além do nome, carrega a descrição e o
   *    campo do código analítico que sustenta o valor.
   * 2. `chaveDoCatalogo` depois, para os que o catálogo nomeia e o registro de economia não.
   * 3. Sem nenhum dos dois, sai o `id` cru — e este terceiro caso CONTINUA sendo o cadeado:
   *    output novo no backend não aparece com rótulo adivinhado.
   *
   * Os dois conjuntos são disjuntos por construção, e o teste prova. Um id nos dois teria dois
   * nomes livres para divergir.
   */
  function rotuloDe(id: string): string {
    if (descriptorDe(id)) return t(`canonicalAnalysis.result.indicator.${id}.label`);
    // Caminho LITERAL de propósito: `t(variavel)` seria opaco para o gate de i18n, e uma chave
    // ausente sairia na tela como a própria chave — pior que o id cru, porque parece um rótulo.
    if (nomeadoPeloCatalogo(id)) return t(`canonicalAnalysis.argos.output.${id}`);
    return id;
  }

  function corpo() {
    if (!scope) {
      return (
        <p role="alert" className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.entry.workspaceMissing")}
        </p>
      );
    }
    if (argos.isLoading) {
      return <LoadingState message={t("canonicalAnalysis.argos.loading")} size="md" />;
    }
    if (argos.isError) {
      // O caso da análise histórica merece palavra PRÓPRIA.
      //
      // `result_not_available` genérico diz "não há resultado para esta análise" — e para uma
      // análise antiga isso é falso pelo lado que importa: o resultado histórico existe e
      // continua acessível; o que não existe é o documento ARGOS. A primeira versão desta tela
      // reusava a mensagem genérica, e a captura do browser é que denunciou o entendimento
      // errado que ela produzia.
      //
      // Isto é explicar disponibilidade — trabalho do Front —, não inventar dado.
      if (problemCodeOf(argos.error) === "result_not_available") {
        return <SemDocumentoArgos />;
      }
      // Qualquer outro problema é apresentado pelo código, nunca substituído por um v1 parecido.
      return (
        <ProblemFeedback
          error={argos.error}
          onRetry={() => void argos.refetch()}
          retryDisabled={argos.isFetching}
        />
      );
    }
    if (!argos.data) return null;

    const leitura = resolverLeituraArgos(argos.data);
    if (leitura.estado === "recusado") {
      // O produtor respondeu, mas não com um v3. Dizer isso é a única saída honesta: adaptar o
      // que veio seria a queda silenciosa que o contrato inteiro existe para impedir.
      //
      // `status`, e não `alert` — corrigido na M45.4. Este bloco era o irmão desalinhado de
      // `SemDocumentoArgos`: as duas telas entregam ao usuário a MESMA conclusão ("o documento
      // ARGOS não está disponível para esta análise", que é literalmente o título aqui), e uma
      // anunciava com interrupção e a outra não. A justificativa escrita doze linhas acima vale
      // igual para os dois: é conclusão sobre disponibilidade, não falha, e alertar por ausência
      // ensina a ignorar alertas.
      //
      // A diferença entre os dois casos é de ENGENHARIA (404 do produtor vs. 200 com esquema
      // que não é v3 — o segundo cheira a drift), e `role` não mede gravidade de engenharia:
      // mede se a pessoa precisa ser interrompida. Ela não precisa, e não pode agir diferente
      // num caso ou no outro. O drift é problema de quem opera, e tem outro canal.
      return (
        <div role="status" className="space-y-2 rounded-md border border-border p-4">
          <p className="text-sm font-medium">{t("canonicalAnalysis.argos.unavailableTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t(`canonicalAnalysis.argos.refused.${leitura.reason}`)}
          </p>
          {/* O que RESTA acessível — a frase que só o estado irmão tinha.
              `noDocumentBody` termina dizendo que o resultado histórico segue disponível, e a
              recusa não dizia nada: a pessoa saía achando que a análise inteira se perdeu. É o
              mesmo alívio, e é verdade nos dois casos — o documento histórico continua na rota
              sem versão. */}
          <p className="text-sm text-muted-foreground">
            {t("canonicalAnalysis.argos.stillAvailable")}
          </p>
        </div>
      );
    }

    const completo = leitura.documento;
    const agrupamento = agruparPorPorta(completo);

    /**
     * ## A aba é FILTRO, não portão
     *
     * O protótipo tinha uma Visão geral que mostrava quatro respostas e escondia trinta números
     * atrás de três portas. Aqui a Visão geral mostra tudo, e a aba NARROWS.
     *
     * A diferença importa: uma aba que esconde faz a pessoa caçar. Quem chega por deep link antigo,
     * ou quem só quer conferir um número, continua vendo o laudo inteiro sem descobrir primeiro em
     * qual domínio o produtor pôs aquele indicador — informação que ela não tem por que saber de
     * cabeça. A aba serve para quem já sabe onde quer olhar.
     *
     * `recortarPorPorta` devolve `null` — não `[]` — para a família sem item no corte, e é o que
     * impede a aba de dizer "rodou e não achou" sobre algo que está na aba vizinha.
     */
    const d = porta ? recortarPorPorta(completo, porta) : completo;

    // O grupo só nasce com conteúdo. `familiaFoiProduzida` é a MESMA pergunta que cada `Familia`
    // faz — perguntá-la aqui antes evita o cartão com título e nada dentro, que afirmaria que o
    // ARGOS concluiu algo quando ele não produziu conclusão nenhuma.
    //
    // As CONCLUSÕES não se recortam por domínio: alerta, achado e recomendação não publicam
    // `domain`, e o resumo executivo é sobre o documento inteiro. Elas vivem na Visão geral.
    const temConclusao =
      porta === null &&
      (Boolean(completo.executive_summary) ||
        familiaFoiProduzida(completo, "alerts") ||
        familiaFoiProduzida(completo, "issues") ||
        familiaFoiProduzida(completo, "recommendations"));
    const temMedicao = (
      ["scores", "dimensions", "indicators", "intents", "risks", "projections", "evidence"] as const
    ).some((f) => familiaFoiProduzida(d, f));
    // O protagonista sai do documento COMPLETO e só aparece na Visão geral: ele é o resumo do
    // comportamento inteiro, não de um domínio. Sem `behavior_score` publicado, não há herói —
    // promover outro escore ao posto trocaria em silêncio qual número é a manchete.
    const heroi =
      porta === null
        ? (completo.scores ?? []).find((s) => s.measurement.id === ID_DO_HEROI) ?? null
        : null;
    return (
      <div className="space-y-8">
        {/* Parcialidade é declaração do produtor sobre o documento inteiro. Vem primeiro porque
            é ela que explica por que o resto pode estar incompleto. */}
        {d.partiality && !d.partiality.complete ? (
          <div
            role="status"
            className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          >
            <p className="font-medium">{t("canonicalAnalysis.argos.partialTitle")}</p>
            {/* A FRASE, e o código atrás de um gatilho.

                A tela mostrava `indicator_not_measured` cru, logo abaixo do título. É nome de
                campo do contrato: quem lê não tem como saber se é erro, aviso ou detalhe
                técnico — e o aviso ficava sendo a única coisa da tela escrita em linguagem de
                máquina.

                O código NÃO some: ele é o que serve para abrir um chamado, e some seria pior.
                Ele vai para onde detalhe técnico pertence — atrás de um gatilho, para quem
                estiver investigando. */}
            <p className="mt-1 text-xs text-muted-foreground">
              {t("canonicalAnalysis.argos.partialBody")}
            </p>
            {d.partiality.reasons.length > 0 ? (
              <div className="mt-2">
                <Disclosure gatilho={t("canonicalAnalysis.argos.partialCodes")}>
                  <ul className="list-inside list-disc font-mono text-xs text-muted-foreground">
                    {d.partiality.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </Disclosure>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* A REFERENCIA vem antes das abas: ela e contexto da analise inteira, nao de um corte por
            dominio. E vem antes do heroi porque e ela que explica por que nao ha comparacao ao
            lado do numero grande. */}
        <BarraDeReferencia scope={scope} instanceId={status.data?.instance_id ?? null} />

        {/* As abas ficam ACIMA de tudo e fora dos grupos: elas dizem qual corte está na tela, e um
            controle de navegação abaixo do conteúdo que ele controla não é encontrado. */}
        <AbasDePorta
          contagens={contagemPorPorta(agrupamento)}
          semPorta={agrupamento.semPorta.length}
        />

        {/* O herói ANTES das conclusões, e isto foi uma escolha contra o meu próprio instinto.
            A ordem "conclusão antes de evidência" que esta tela adotou vale entre CONCLUSÃO e
            MEDIÇÃO. O protagonista não é medição avulsa: ele é o resumo do comportamento, a mesma
            natureza do resumo executivo. Ele abre a leitura, e o texto explica o que o número quer
            dizer logo abaixo. */}
        {/* A PRIMEIRA DOBRA do protótipo: protagonista à esquerda, satélites à direita.
            A proporção era `1.35fr / 1fr`, herdada do protótipo — lá o herói carrega mais coisa.
            Aqui ela abriu um buraco: com a régua encurtada a 384px, a TINTA VISÍVEL do cartão
            parava ali e sobravam ~180px de nada à direita, embora o cabeçalho ocupasse a largura
            inteira e a medição de caixa não acusasse vão nenhum.

            `1fr / 1.8fr` foi onde parou, e a proporção agora vem do CONTEÚDO em vez do
            protótipo. O herói mostra um número, um veredito, uma régua de 208px e uma linha de
            confiança — cabe em um terço. Os quatro satélites 2×2 precisam do resto para o
            rótulo e o denominador não quebrarem em duas linhas.

            Abaixo de 1024px vira uma coluna só: dois cartões em 375px dariam 160px úteis cada.

            `items-start` veio depois, e consertou o defeito que a proporção sozinha criava.
            MEDIDO: o cartão do herói tinha 562px — **62% da altura da janela** — e **62% dele
            era vão vazio**. Os cinco blocos dentro dele somam 216px; o resto era a grade
            esticando os dois lados até a altura da coluna de satélites.

            O protótipo tem a MESMA estrutura de duas colunas e não sofre disso, e a diferença é
            a contagem: lá são TRÊS satélites, aqui quatro. Copiar a proporção sem copiar a
            contagem produziu um cartão que estica sem ter o que mostrar.

            A correção foi em DUAS etapas, e a segunda desfaz metade da primeira de propósito.

            `items-start` matou o esticamento, e os satélites passaram a 2×2 — a coluna deles
            caiu de ~500px para 321px. Aí o herói ficou 46px MAIS BAIXO que ela, e as duas
            colunas terminavam desalinhadas: o desenho pedia um bloco, e a tela entregava um
            degrau.

            Com a coluna curta, esticar de volta custa esses 46px e nada mais — o vão que
            sobrava eram 346px, e ele veio da coluna LONGA, não do esticamento em si. Então o
            esticamento volta, e o que fica corrigido é a causa.

            O herói segue o maior elemento da dobra por TAMANHO DE TIPO, que é onde ele deve
            vencer — não por metros de vão. */}
        {heroi ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
            <Heroi escore={heroi} rotulo={rotuloDe(ID_DO_HEROI)} />
            <Satelites
              escores={completo.scores ?? []}
              idDoHeroi={ID_DO_HEROI}
              denominador={formatarNumero(completo.summary.record_count, locale, 0)}
              rotuloDe={rotuloDe}
            />
          </div>
        ) : (
          /* A AUSÊNCIA DO RESUMO, dita em vez de silenciada.

             Antes o ramo era `: null` — a primeira dobra simplesmente não existia, e quem abria
             o laudo via o documento começar pelas conclusões sem nada explicando que faltava um
             número. Ausência silenciosa é a que o leitor atribui a si mesmo: "não achei onde
             está o resumo".

             ## Por que NÃO é `EmptyState`

             O padrão de estado vazio é para tela vazia, e esta está cheia — dimensões,
             indicadores, conclusões e procedência estão todos abaixo. Um bloco de vazio aqui
             diria que a análise não tem nada, quando o que ela não tem é UMA coisa.

             ## Por que não reusa `familyEmpty` nem `notMeasurableHere`

             As duas afirmam outra coisa. `familyEmpty` é "rodou e não achou item" — falso aqui.
             `notMeasurableHere` é sobre recorte de domínio: a medida existe, só não pertence à
             aba aberta. Esta é a terceira ausência, e ela precisava de palavra própria.

             E o texto NÃO promete que o número vem depois: prometer roadmap na tela é dívida
             que o produto paga sem ter assinado. Ele diz o que falta, e aponta para o que há. */
          <section
            aria-labelledby="argos-sem-resumo"
            className="space-y-2 rounded-lg border border-border bg-card p-5"
          >
            <h2
              id="argos-sem-resumo"
              className="text-xs font-semibold uppercase tracking-widest text-accent-ink"
            >
              {t("canonicalAnalysis.argos.noSummaryTitle")}
            </h2>
            {/* HTML cru com Tailwind, e não a primitiva `Text`: este arquivo inteiro é assim,
                e importar a primitiva só aqui criaria dois idiomas na mesma tela. A `Vazia()`
                logo acima é a vizinha exata — mesma classe de corpo secundário. */}
            <p className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.argos.noSummaryBody")}
            </p>
          </section>
        )}

        {/* AS PORTAS — o "onde investigar" do protótipo, e só na Visão geral.
            Dentro de uma aba de domínio elas seriam um menu apontando para onde a pessoa já está. */}
        {porta === null ? <Portas agrupamento={agrupamento} rotuloDe={rotuloDe} /> : null}

        {temConclusao ? (
          <Grupo
            id="argos-conclusoes"
            titulo={t("canonicalAnalysis.argos.groupConclusions")}
            destaque
          >
            {d.executive_summary ? (
              <Secao
                id="argos-sumario"
                titulo={t("canonicalAnalysis.argos.executiveSummary")}
                nivel={3}
              >
                <p className="whitespace-pre-line py-2 text-sm">{d.executive_summary.text}</p>
              </Secao>
            ) : null}

            <Familia
              documento={d}
              familia="alerts"
              id="argos-alerts"
              titulo={t("canonicalAnalysis.argos.alerts")}
              itens={d.alerts}
            >
              {(itens) => (
                <Achados itens={itens} rotuloSeveridade={t("canonicalAnalysis.argos.severity")} />
              )}
            </Familia>

            <Familia
              documento={d}
              familia="issues"
              id="argos-issues"
              titulo={t("canonicalAnalysis.argos.issues")}
              itens={d.issues}
            >
              {(itens) => (
                <Achados itens={itens} rotuloSeveridade={t("canonicalAnalysis.argos.severity")} />
              )}
            </Familia>

            <Familia
              documento={d}
              familia="recommendations"
              id="argos-recommendations"
              titulo={t("canonicalAnalysis.argos.recommendations")}
              itens={d.recommendations}
            >
              {(itens) => (
                <ul className="space-y-2">
                  {itens.map((r) => (
                    <li key={r.id} className="border-b border-border/60 py-2 last:border-b-0">
                      <span className="text-sm">{r.title}</span>
                      {/* O leitor de tela ouvia "Reduzir custo P1" e não tinha como saber que
                          `P1` era prioridade: o irmão `Achados` já rotulava a severidade e este
                          não rotulava nada. Mesma assimetria, mesma correção. */}
                      <span className="ml-2 text-xs text-muted-foreground">
                        <span className="sr-only">{t("canonicalAnalysis.argos.priority")}: </span>
                        {r.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Familia>
          </Grupo>
        ) : null}

        {temMedicao ? (
        <Grupo
          id="argos-medicoes"
          titulo={t("canonicalAnalysis.argos.groupMeasurements")}
          destaque={false}
        >
        {/* Escores globais. `composite_of` é RESPEITADO: um composto declara as partes que o
            formam, e é isso que impede alguém somar o agregado junto delas. */}
        <Familia
          documento={d}
          familia="scores"
          id="argos-scores"
          titulo={t("canonicalAnalysis.argos.scores")}
          itens={d.scores}
        >
          {(itens) => (
            <div>
              {itens.map((s) => (
                <div key={s.measurement.id}>
                  <Medicao
                    medicao={s.measurement}
                    rotulo={rotuloDe(s.measurement.id)}
                  />
                  {s.composite_of && s.composite_of.length > 0 ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                      {t("canonicalAnalysis.argos.compositeOf")}: {s.composite_of.join(", ")}
                    </p>
                  ) : null}
                  {/* A janela é obrigatória em drift, e é ela que impede dois valores de
                      análises diferentes parecerem série. Quando vem, aparece. */}
                  {s.window_kind ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                      {t("canonicalAnalysis.argos.window")}: {s.window_kind}
                      {s.window_size ? ` (${s.window_size})` : ""}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Familia>

        {/* As QUATRO dimensões de saúde. Não existe quinta, e o AI Health NÃO é uma delas: ele é
            escore composto e vive acima, com `composite_of` declarando estas quatro. */}
        <Familia
          documento={d}
          familia="dimensions"
          id="argos-dimensions"
          titulo={t("canonicalAnalysis.argos.dimensions")}
          itens={d.dimensions}
        >
          {(itens) => (
            <div>
              {itens.map((m) => (
                <Medicao
                  key={m.id}
                  medicao={m}
                  // As quatro dimensoes sao conjunto FECHADO do contrato — rotulo proprio e
                  // legitimo. Um id fora delas nao chega aqui sem o contrato mudar.
                  rotulo={t(`canonicalAnalysis.argos.dimension.${m.id}`)}
                />
              ))}
            </div>
          )}
        </Familia>

        <Familia
          documento={d}
          familia="indicators"
          id="argos-indicators"
          titulo={t("canonicalAnalysis.argos.indicators")}
          itens={d.indicators}
        >
          {(itens) => (
            <div>
              {/* A COMPOSIÇÃO DO CUSTO, antes da lista — a gramática "parte-do-todo" do
                  protótipo (`.stack`). Quatro números soltos obrigam quem lê a fazer a divisão
                  de cabeça para saber o que pesa; uma barra responde antes da leitura.

                  Ela só aparece quando o TOTAL veio: total não se infere somando partes, e uma
                  barra montada sobre uma soma seria um todo que ninguém declarou.

                  A transferência chega `null` HOJE — não medida, não zero. É exatamente o caso
                  que a hachura existe para dizer, e por isso ele vem antes da lista em vez de
                  depois: a diferença entre "não custou" e "não medimos" muda a decisão. */}
              <ComposicaoDoCusto itens={itens} rotuloDe={rotuloDe} locale={locale} />
              {itens.map((i) => (
                <Indicador
                  key={i.id}
                  indicador={i}
                  rotulo={rotuloDe(i.id)}
                />
              ))}
            </div>
          )}
        </Familia>

        {/* Intenções preservam identidade e suporte publicados. Nenhuma vira indicador
            sintético: `intent_id` é dado do tenant, não do registro canônico. */}
        <Familia
          documento={d}
          familia="intents"
          id="argos-intents"
          titulo={t("canonicalAnalysis.argos.intents")}
          itens={d.intents}
        >
          {(itens) => (
            // O suporte passa a ser dito por COMPRIMENTO, e três campos publicados que ninguém
            // lia entram: `response_variance`, `method.min_samples_per_intent` e a marca
            // `underrepresented` como selo próprio em vez de pedaço de frase.
            <Intencoes intents={itens} pisoDeAmostra={completo.method.min_samples_per_intent ?? null} />
          )}
        </Familia>

        {/* `band` quando vier. Sem band, NENHUM threshold nasce aqui. */}
        <Familia
          documento={d}
          familia="risks"
          id="argos-risks"
          titulo={t("canonicalAnalysis.argos.risks")}
          itens={d.risks}
        >
          {(itens) => (
            <div>
              {itens.map((r) => (
                <div key={r.id}>
                  <Medicao
                    medicao={r.measurement}
                    rotulo={rotuloDe(r.id)}
                  />
                  {r.band ? (
                    <p className="pb-2 text-xs text-muted-foreground" data-band={r.band}>
                      {t("canonicalAnalysis.argos.band")}: {r.band}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Familia>

        {/* Horizonte é DADO. Nada é somado, nada é convertido de moeda. */}
        <Familia
          documento={d}
          familia="projections"
          id="argos-projections"
          titulo={t("canonicalAnalysis.argos.projections")}
          itens={d.projections}
        >
          {(itens) => (
            <div>
              {itens.map((p) => (
                <div key={`${p.id}:${p.horizon}`}>
                  <Medicao
                    medicao={{ ...p.measurement, unit: p.currency ?? p.measurement.unit }}
                    // O horizonte e DADO e entra no rotulo — nunca inferido do nome do id.
                    //
                    // A BARRA e o separador OFICIAL, nao escolha de estilo: o nome registrado e
                    // `Projected token cost / month`. Com `·` a tela mostrava as duas partes certas
                    // e o nome oficial nenhum — e a Regra de Ouro de nomes manda o oficial vencer.
                    rotulo={`${rotuloDe(p.id)} / ${p.horizon}`}
                  />
                  {p.basis ? (
                    <p className="pb-2 text-xs text-muted-foreground">
                      {t("canonicalAnalysis.argos.basis")}: {p.basis}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Familia>

        <Familia
          documento={d}
          familia="evidence"
          id="argos-evidence"
          titulo={t("canonicalAnalysis.argos.evidence")}
          itens={d.evidence}
        >
          {(itens) => (
            <ul className="space-y-1">
              {itens.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 py-1 text-sm">
                  <span>{e.label ?? e.kind}</span>
                  <span className="tabular-nums text-muted-foreground">{e.observed_count}</span>
                </li>
              ))}
            </ul>
          )}
        </Familia>
        </Grupo>
        ) : null}

        {/* Procedência da montagem. Não é decoração: é o que explica um output que aparece ou
            some entre duas execuções. Fica FORA dos dois grupos porque não é nem conclusão nem
            medição: é o que diz sob qual registro e catálogo as duas foram produzidas. */}
        <Secao id="argos-provenance" titulo={t("canonicalAnalysis.argos.provenance")} nivel={2}>
          <dl className="grid gap-x-6 gap-y-1 py-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.registryVersion")}:</dt>
              <dd>{d.indicator_registry_version}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.catalogVersion")}:</dt>
              <dd>{d.argos_catalog_version}</dd>
            </div>
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.records")}:</dt>
              <dd className="tabular-nums">{d.summary.record_count}</dd>
            </div>
            {d.method.currency ? (
              <div className="flex gap-1">
                <dt>{t("canonicalAnalysis.argos.currency")}:</dt>
                <dd>
                  {d.method.currency}
                  {d.method.currency_source ? ` (${d.method.currency_source})` : ""}
                </dd>
              </div>
            ) : null}
          </dl>
        </Secao>
      </div>
    );
  }

  return (
    <AppShell topBarTitle={titulo}>
      <PageFrame maxWidth="lg">
        <div ref={raiz} className="space-y-6" data-testid="argos-view">
          <AnalysisShell
            analysisId={analysisId ?? ""}
            estado={status.data?.status as EstadoPublico | undefined}
            titulo={titulo}
          />
          {/* NAV-01 — acelerador, nunca o único caminho. Ela indexa as regiões que ESTIVEREM
              dentro de `raiz`, então vem depois do shell e antes do corpo: assim o gatilho fica
              na altura do título, e a varredura alcança tudo que o corpo renderizou. */}
          <PaletaDeComandos raiz={raiz} />
          {corpo()}
        </div>
      </PageFrame>
    </AppShell>
  );
}

export default ArgosView;


/**
 * A composição do custo — o TOTAL e de onde ele veio.
 *
 * Fica neste arquivo, e não numa primitiva, porque a escolha de QUAIS indicadores compõem o
 * custo é conhecimento de produto, não de desenho. A primitiva sabe desenhar parte-do-todo; ela
 * não sabe que `token_cost_total` e `handoff_cost_total` somam `total_estimated_cost`.
 *
 * Nenhuma conta acontece aqui além da que a barra precisa: os valores vêm do documento, e o
 * total é o publicado — jamais a soma das partes.
 */
function ComposicaoDoCusto({
  itens,
  rotuloDe,
  locale,
}: {
  readonly itens: readonly PublicIndicatorV3[];
  readonly rotuloDe: (id: string) => string;
  readonly locale: string;
}) {
  const { t } = useLanguage();
  const de = (id: string) => itens.find((i) => i.id === id) ?? null;
  const total = de("total_estimated_cost");
  if (!total || total.value === null || total.value === undefined) return null;

  const partes = (["token_cost_total", "handoff_cost_total"] as const)
    .map((id) => {
      const ind = de(id);
      if (!ind) return null;
      return {
        id,
        rotulo: rotuloDe(id),
        valor: ind.value ?? null,
        escrito: valorEscrito(ind, locale, ind.display_precision ?? 2) ?? "—",
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (partes.length === 0) return null;

  return (
    <div className="mb-4">
      <BarraDeComposicao
        partes={partes}
        total={total.value}
        rotuloAusente={t("canonicalAnalysis.argos.notMeasuredShort")}
        descricao={t("canonicalAnalysis.argos.costCompositionDescription", {
          total: valorEscrito(total, locale, total.display_precision ?? 2) ?? "—",
        })}
      />
    </div>
  );
}
