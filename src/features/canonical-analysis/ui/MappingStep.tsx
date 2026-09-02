// O editor de mapeamento — o que tirou `needs_mapping` de beco sem saída.
//
// Até aqui esta superfície dizia, no ar, a frase mais honesta que se podia dizer: *a operação
// que resolve isto ainda não está exposta no contrato público*. Ela foi exposta
// (`GET`/`POST /v1/analyses/{id}/mapping`), e esta tela é o que a torna falsa.
//
// ## O que a pessoa está fazendo aqui
//
// Ela subiu um arquivo de conversas e o serviço leu as colunas. Para a maioria delas ele
// reconheceu sozinho o que era o quê. Para uma ou duas, empatou — duas colunas plausíveis para
// o mesmo campo — ou não achou nenhuma. É só isso que sobra para decidir.
//
// Então esta tela é de CONFIRMAÇÃO, não de configuração. O trabalho já foi quase todo feito, e
// o desenho precisa dizer isso: a pessoa não deve sentir que está montando um mapeamento do
// zero, porque não está.
//
// ## Por que a evidência de cada coluna aparece
//
// A pessoa não pode ver o conteúdo do arquivo — e a ausência é decisão medida no dono do
// Ingestion, que removeu a amostra do próprio contrato quando ela devolveu nome, telefone e CPF
// ao chamador.
//
// Sem o conteúdo, reconhecer a coluna depende do que sobrou: o tipo, quantos registros a têm
// preenchida, e quantos valores distintos existem. Uma coluna com 118 valores distintos em 120
// registros é um identificador; uma com 3 é uma categoria. **Este é o material de
// reconhecimento**, e por isso ele fica ao lado do seletor e não escondido num tooltip.
//
// ## Por que o CTA não desabilita quando falta campo
//
// Botão desabilitado não diz por quê — quem clica recebe silêncio. Habilitado, ele responde com
// a frase que nomeia o que falta. É a mesma decisão de `CriarPorNome`, pelo mesmo motivo.

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, Stack, Text } from "@/design/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProblemError } from "@/lib/v1";
import type { ColunaDoArquivo, MappingView, OutcomeMappingInput } from "@/lib/v1";
import { motivoDeImplausibilidade } from "./plausibilidadeDoMapeamento";
import { cn } from "@/lib/utils";

const PROPORCAO_MINIMA_DE_REGISTROS_ANALISAVEIS = 0.95;

/**
 * O rótulo humano de cada campo canônico, em chave de texto LITERAL.
 *
 * `switch` e não `t(\`campo.${nome}\`)`: chave montada é chamada OPACA, e o gate de orfandade do
 * i18n deixa de saber se ela ainda tem consumidor. Um campo que o backend publique e esta lista
 * não conheça cai no próprio identificador — inventar rótulo para o desconhecido seria pior que
 * mostrar o nome técnico.
 */
function rotuloDoCampo(campo: string, t: (k: string) => string): string {
  switch (campo) {
    case "conversation_id":
      return t("canonicalAnalysis.mapping.field.conversationId");
    case "assistant_text":
      return t("canonicalAnalysis.mapping.field.assistantText");
    case "user_text":
      return t("canonicalAnalysis.mapping.field.userText");
    case "intent":
      return t("canonicalAnalysis.mapping.field.intent");
    case "timestamp":
      return t("canonicalAnalysis.mapping.field.timestamp");
    case "session_id":
      return t("canonicalAnalysis.mapping.field.sessionId");
    case "channel":
      return t("canonicalAnalysis.mapping.field.channel");
    case "model":
      return t("canonicalAnalysis.mapping.field.model");
    case "turns":
      return t("canonicalAnalysis.mapping.field.turns");
    case "source_type":
      return t("canonicalAnalysis.mapping.field.sourceType");
    case "policy":
      return t("canonicalAnalysis.mapping.field.policy");
    default:
      return campo;
  }
}

/** A evidência que substitui ver o conteúdo. Sem ela o seletor é um chute com nome bonito. */
function Evidencia({ coluna }: { coluna: ColunaDoArquivo | undefined }) {
  const { t, language } = useLanguage();
  if (!coluna) return null;

  const partes: string[] = [];
  if (coluna.types.length) partes.push(coluna.types.join(" · "));
  if (typeof coluna.coverage === "number") {
    partes.push(
      t("canonicalAnalysis.mapping.evidence.coverage", {
        pct: new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US", {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(coluna.coverage),
      }),
    );
  }
  if (typeof coluna.distinct_values === "number") {
    partes.push(
      t("canonicalAnalysis.mapping.evidence.distinct", {
        n: new Intl.NumberFormat(language === "pt" ? "pt-BR" : "en-US").format(
          coluna.distinct_values,
        ),
      }),
    );
  }
  if (!partes.length) return null;

  return (
    <p className="text-xs text-muted-foreground">
      {partes.join(" · ")}
      {coluna.name_redacted ? ` · ${t("canonicalAnalysis.mapping.evidence.redacted")}` : ""}
    </p>
  );
}

export function MappingStep({
  mapa,
  aoConfirmar,
}: {
  mapa: MappingView;
  /**
   * Recebe as regras prontas. Lançar é o sinal de falha.
   *
   * O componente NÃO conhece `analysisId` nem escopo: quem sabe onde a confirmação vai é o pai,
   * e recebê-los aqui seria pedir o que não se usa. Esta tela decide o QUE confirmar; para onde
   * mandar é assunto de quem a montou.
   */
  aoConfirmar: (
    regras: Record<string, { source: string }>,
    agrupamento: string[],
    minimoDeValidos: number | undefined,
    optOutDoCatalogo: { measureIds: string[]; dimensionIds: string[] },
    outcome: OutcomeMappingInput | undefined,
  ) => Promise<void>;
}) {
  const { t } = useLanguage();

  // O QUE FAZER COM REGISTROS QUE NAO SERVEM.
  //
  // A pergunta deixou de ser configuracao da pessoa. Depois que `missing_assistant_text` virou
  // metrica em Medidas, "recusar o arquivo inteiro" deixou de ser uma escolha util no fluxo:
  // conversa sem resposta nao vai para o motor, mas tambem nao deve sumir. O front confirma o
  // limite de produto e explica o destino: motor recebe o canonico; Medidas recebe a qualidade
  // da base.

  // A escolha começa na SUGESTÃO, não vazia. A máquina já decidiu quase tudo, e obrigar a
  // pessoa a reconfirmar o que ela acertou transformaria confirmação em digitação.
  const inicial = useMemo(() => {
    const escolhas: Record<string, string> = {};
    for (const [campo, sugestao] of Object.entries(mapa.suggestion)) {
      const origem = sugestao?.source;
      if (origem) escolhas[campo] = origem;
    }
    return escolhas;
  }, [mapa.suggestion]);

  const [escolhas, setEscolhas] = useState<Record<string, string>>(inicial);
  // Nada vem marcado. Agrupar é uma decisão, e pré-marcar faria a pessoa publicar uma dimensão
  // que ela não escolheu — pelo mesmo motivo por que a sugestão de coluna precisa de
  // confirmação humana antes de virar verdade.
  const [agrupar, setAgrupar] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Marca a TENTATIVA, e não a ausência.
  //
  // Antes disto o campo obrigatório vazio nascia com borda de erro na primeira pintura: a
  // tela abria acusando quem nem tinha tocado nela. E a acusação era falsa duas vezes —
  // ninguém errou nada ainda, e o campo está vazio porque a MÁQUINA não conseguiu decidir,
  // não porque a pessoa deixou em branco.
  //
  // Depois de clicar em confirmar com campo faltando, aí sim é erro: a pessoa pediu para
  // seguir e não dá.
  const [tentou, setTentou] = useState(false);
  const ativacoesDoCatalogo = mapa.catalog_activation ?? [];
  const chavesElegiveis = useMemo(
    () =>
      new Set(
        (mapa.catalog_activation ?? [])
          .filter((item) => item.status === "eligible")
          .map((item) => `${item.kind}:${item.catalog_id}`),
      ),
    [mapa.catalog_activation],
  );
  const [catalogoAtivo, setCatalogoAtivo] = useState<Set<string>>(chavesElegiveis);
  const [temOutcome, setTemOutcome] = useState(false);
  const [outcomeSource, setOutcomeSource] = useState("");
  const [outcomeKind, setOutcomeKind] = useState<"boolean" | "categorical">("categorical");
  const [successValues, setSuccessValues] = useState("");
  const [failureValues, setFailureValues] = useState("");

  useEffect(() => {
    setEscolhas(inicial);
    setAgrupar([]);
    setErro(null);
    setTentou(false);
    setCatalogoAtivo(chavesElegiveis);
    setTemOutcome(false);
    setOutcomeSource("");
    setOutcomeKind("categorical");
    setSuccessValues("");
    setFailureValues("");
  }, [inicial, chavesElegiveis]);

  const porNome = useMemo(
    () => new Map(mapa.columns.map((c) => [c.name, c])),
    [mapa.columns],
  );
  const nomesDeColunas = useMemo(() => new Set(mapa.columns.map((c) => c.name)), [mapa.columns]);
  const camposPermitidos = useMemo(
    () => new Set([...mapa.required_fields, ...mapa.optional_fields]),
    [mapa.required_fields, mapa.optional_fields],
  );

  const faltando = mapa.required_fields.filter((c) => !nomesDeColunas.has(escolhas[c] ?? ""));
  const jaResolvidos = mapa.required_fields.length - faltando.length;
  // Agrupável E mapeado. A interseção muda enquanto a pessoa escolhe colunas, e é por isso que
  // ela é derivada a cada render em vez de guardada: um campo desmapeado depois de marcado
  // desapareceria da lista mas continuaria no envio.
  const podeAgrupar = (mapa.groupable_fields ?? []).filter((c) => Boolean(escolhas[c]));
  const agrupamentoEfetivo = agrupar.filter((c) => podeAgrupar.includes(c));

  const separarValores = (texto: string): string[] =>
    [...new Set(texto.split(/[\n,]/).map((valor) => valor.trim()).filter(Boolean))];

  async function confirmar() {
    if (enviando) return;
    setTentou(true);
    if (faltando.length) {
      setErro(
        t("canonicalAnalysis.mapping.missing", {
          fields: faltando.map((c) => rotuloDoCampo(c, t)).join(", "),
        }),
      );
      return;
    }
    const sucessos = separarValores(successValues);
    const fracassos = separarValores(failureValues);
    if (
      temOutcome &&
      (!nomesDeColunas.has(outcomeSource) ||
        (outcomeKind === "categorical" && (!sucessos.length || !fracassos.length)))
    ) {
      setErro(t("canonicalAnalysis.mapping.outcome.missing"));
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const regras: Record<string, { source: string }> = {};
      for (const [campo, origem] of Object.entries(escolhas)) {
        if (camposPermitidos.has(campo) && nomesDeColunas.has(origem)) {
          regras[campo] = { source: origem };
        }
      }
      const desativadas = ativacoesDoCatalogo.filter(
        (item) =>
          item.status === "eligible" &&
          !catalogoAtivo.has(`${item.kind}:${item.catalog_id}`),
      );
      await aoConfirmar(
        regras,
        agrupamentoEfetivo,
        PROPORCAO_MINIMA_DE_REGISTROS_ANALISAVEIS,
        {
          measureIds: desativadas
            .filter((item) => item.kind === "measure")
            .map((item) => item.catalog_id),
          dimensionIds: desativadas
            .filter((item) => item.kind === "dimension")
            .map((item) => item.catalog_id),
        },
        temOutcome
          ? {
              source_column: outcomeSource,
              value_kind: outcomeKind,
              success_values: outcomeKind === "boolean" ? ["true"] : sucessos,
              failure_values: outcomeKind === "boolean" ? ["false"] : fracassos,
              case_sensitive: false,
            }
          : undefined,
      );
    } catch (falha) {
      // A mensagem é NOSSA. O corpo do servidor pode carregar detalhe interno, e ecoá-lo faria
      // a tela repetir vocabulário que ninguém escreveu para ser lido.
      setErro(
        falha instanceof ProblemError && falha.problem.code === "invalid_input"
          ? t("canonicalAnalysis.mapping.invalid")
          : t("canonicalAnalysis.mapping.failed"),
      );
      setEnviando(false);
    }
  }

  const linha = (campo: string, obrigatorio: boolean) => {
    const empatados = mapa.ambiguous[campo] ?? [];
    const escolhidoBruto = escolhas[campo] ?? "";
    const escolhido = nomesDeColunas.has(escolhidoBruto) ? escolhidoBruto : "";
    // Duas coisas diferentes, e o vermelho só pertence à segunda.
    const aguardando = obrigatorio && !escolhido;
    const reprovado = aguardando && tentou;
    const idCampo = `mapping-${campo}`;

    // A DÚVIDA sobre a escolha, no instante em que corrigi-la é barato.
    //
    // Medido em homologação: a coluna `canal` foi mapeada em "Date and time" e a ingestão
    // recusou os 360 registros com `invalid_field_type` — a tela disse só "Couldn't complete".
    // O erro custou um ciclo inteiro, e a mensagem não ajudava a consertá-lo.
    //
    // AVISO, e nunca bloqueio: o perfil da Ingestão é "descrição, nunca julgamento" por decisão
    // registrada. Barrar com base nele impediria um dataset legítimo de forma incomum.
    const motivo = escolhido
      ? motivoDeImplausibilidade(
          campo,
          mapa.columns.find((c) => c.name === escolhido),
          mapa.records_observed,
        )
      : null;
    const idAviso = `${idCampo}-aviso`;

    return (
      <div key={campo} className="flex flex-col gap-1.5">
        <label htmlFor={idCampo} className="flex items-center gap-2 text-sm font-medium">
          {rotuloDoCampo(campo, t)}
          {obrigatorio ? (
            <span className="text-xs font-normal text-muted-foreground">
              {t("canonicalAnalysis.mapping.required")}
            </span>
          ) : null}
        </label>

        <select
          id={idCampo}
          value={escolhido}
          disabled={enviando}
          // A borda vermelha só existe para quem enxerga. Sem isto, o resumo de erro nomeia
          // o campo e o campo não se assume.
          aria-invalid={reprovado || undefined}
          // O aviso é LIDO junto do campo, não só visto ao lado dele.
          aria-describedby={motivo ? idAviso : undefined}
          onChange={(e) => {
            setEscolhas((atual) => ({ ...atual, [campo]: e.target.value }));
            setErro(null);
          }}
          className={cn(
            // 44px: o piso de alvo de toque. Um seletor de 36px é confortável no mouse e
            // escorregadio no polegar.
            "h-11 rounded-md border bg-background px-3 text-sm text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-60",
            reprovado ? "border-destructive" : "",
            // Âmbar, e não vermelho: a escolha é suspeita, não inválida. Vermelho aqui diria
            // "isto está errado" sobre algo que pode estar certo.
            !reprovado && motivo ? "border-warning" : "",
            !reprovado && !motivo ? "border-border" : "",
          )}
        >
          <option value="">{t("canonicalAnalysis.mapping.chooseColumn")}</option>
          {mapa.columns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Por que ESTE campo veio vazio enquanto os outros vieram preenchidos.

            Três situações, e cada uma pede coisa diferente da pessoa:

              - EMPATE: a máquina achou candidatos e não soube escolher. Ela os nomeia, e a
                pessoa desempata.
              - SEM CANDIDATO: a máquina não reconheceu coluna nenhuma para o papel. Não há o
                que nomear, e a pessoa escolhe do zero. Medido no arquivo real de homologação:
                os DOIS campos obrigatórios caíram aqui, e a tela ficava muda — dois seletores
                vazios sem explicação, que lê como defeito da tela.
              - ESCOLHIDO: a evidência da coluna, que é o material de reconhecimento.

            Colapsar as duas primeiras faria a tela dizer "mais de uma coluna serve" quando
            nenhuma serviu. */}
        {!escolhido && empatados.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            {t("canonicalAnalysis.mapping.ambiguous", { columns: empatados.join(", ") })}
          </p>
        ) : !escolhido && obrigatorio ? (
          <p className="text-xs text-muted-foreground">
            {t("canonicalAnalysis.mapping.noCandidate")}
          </p>
        ) : (
          <Evidencia coluna={porNome.get(escolhido)} />
        )}

        {/* A DÚVIDA fica ABAIXO da evidência, e a ordem importa.

            A evidência é o material de reconhecimento — "string · 3 valores distintos". O aviso
            é a leitura dela: "3 valores é pouco para data e hora". Invertidos, a tela acusaria
            antes de mostrar em quê se baseia.

            `role="status"` e não `alert`: alerta interrompe, e isto não é urgente nem bloqueia.
            É uma dúvida oferecida a quem sabe a resposta. */}
        {motivo ? (
          <p id={idAviso} role="status" className="text-xs text-warning">
            {t(`canonicalAnalysis.mapping.implausible.${motivo}`)}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <Panel como="section" titulo={t("canonicalAnalysis.mapping.title")}>
      <Stack espaco="md">
        {/* O estado do sistema antes do trabalho: quanto já está pronto. Sem isto a tela parece
            pedir tudo, quando pede quase nada. */}
        <Text as="p" papel="micro">
          {t("canonicalAnalysis.mapping.explain", {
            done: String(jaResolvidos),
            total: String(mapa.required_fields.length),
          })}
        </Text>

        <div className="flex flex-col gap-4">
          {mapa.required_fields.map((campo) => linha(campo, true))}
        </div>

        {mapa.optional_fields.length ? (
          // Os opcionais em `details`: eles existem, e mostrá-los abertos faria uma tela de duas
          // decisões parecer uma de onze. Divulgação progressiva, não omissão.
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              {t("canonicalAnalysis.mapping.optionalToggle")}
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              {mapa.optional_fields.map((campo) => linha(campo, false))}
            </div>
          </details>
        ) : null}

        {ativacoesDoCatalogo.length ? (
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("canonicalAnalysis.mapping.catalog.title")}
            </summary>
            <Text as="p" papel="micro" className="mt-2">
              {t("canonicalAnalysis.mapping.catalog.explain")}
            </Text>
            <div className="mt-3 flex flex-col gap-2">
              {ativacoesDoCatalogo.map((item) => {
                const chave = `${item.kind}:${item.catalog_id}`;
                const id = `catalog-${item.kind}-${item.catalog_id}`;
                const elegivel = item.status === "eligible";
                return (
                  <div
                    key={chave}
                    className="flex flex-col gap-1 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <label htmlFor={id} className="flex items-start gap-2 text-sm font-medium">
                        {elegivel ? (
                          <input
                            id={id}
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                            checked={catalogoAtivo.has(chave)}
                            disabled={enviando}
                            onChange={(evento) =>
                              setCatalogoAtivo((atual) => {
                                const proximo = new Set(atual);
                                if (evento.target.checked) proximo.add(chave);
                                else proximo.delete(chave);
                                return proximo;
                              })
                            }
                          />
                        ) : null}
                        <span className="break-words">{item.catalog_id}</span>
                      </label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {elegivel
                          ? t("canonicalAnalysis.mapping.catalog.eligible", {
                              source: item.source,
                            })
                          : t("canonicalAnalysis.mapping.catalog.rejectedType", {
                              expected: item.expected_value_type,
                              observed: item.observed_types.join(", ") || "—",
                            })}
                      </p>
                    </div>
                    <span className="self-start rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {item.kind === "measure"
                        ? t("canonicalAnalysis.mapping.catalog.measure")
                        : t("canonicalAnalysis.mapping.catalog.dimension")}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("canonicalAnalysis.mapping.catalog.version", {
                version: mapa.catalog_version ?? "—",
              })}
            </p>
          </details>
        ) : null}

        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            {t("canonicalAnalysis.mapping.outcome.title")}
          </summary>
          <Text as="p" papel="micro" className="mt-2">
            {t("canonicalAnalysis.mapping.outcome.explain")}
          </Text>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              checked={temOutcome}
              disabled={enviando}
              onChange={(evento) => {
                setTemOutcome(evento.target.checked);
                setErro(null);
              }}
            />
            <span>{t("canonicalAnalysis.mapping.outcome.enable")}</span>
          </label>
          {temOutcome ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("canonicalAnalysis.mapping.outcome.column")}
                <select
                  value={outcomeSource}
                  disabled={enviando}
                  onChange={(evento) => {
                    setOutcomeSource(evento.target.value);
                    setErro(null);
                  }}
                  className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("canonicalAnalysis.mapping.chooseColumn")}</option>
                  {mapa.columns.map((coluna) => (
                    <option key={coluna.name} value={coluna.name}>{coluna.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {t("canonicalAnalysis.mapping.outcome.kind")}
                <select
                  value={outcomeKind}
                  disabled={enviando}
                  onChange={(evento) =>
                    setOutcomeKind(evento.target.value as "boolean" | "categorical")
                  }
                  className="h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="categorical">{t("canonicalAnalysis.mapping.outcome.categorical")}</option>
                  <option value="boolean">{t("canonicalAnalysis.mapping.outcome.boolean")}</option>
                </select>
              </label>
              {outcomeKind === "categorical" ? (
                <>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    {t("canonicalAnalysis.mapping.outcome.success")}
                    <textarea
                      rows={2}
                      value={successValues}
                      disabled={enviando}
                      onChange={(evento) => setSuccessValues(evento.target.value)}
                      placeholder={t("canonicalAnalysis.mapping.outcome.successExample")}
                      className="min-h-20 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    {t("canonicalAnalysis.mapping.outcome.failure")}
                    <textarea
                      rows={2}
                      value={failureValues}
                      disabled={enviando}
                      onChange={(evento) => setFailureValues(evento.target.value)}
                      placeholder={t("canonicalAnalysis.mapping.outcome.failureExample")}
                      className="min-h-20 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </>
              ) : null}
              <p className="text-xs text-muted-foreground md:col-span-2">
                {t("canonicalAnalysis.mapping.outcome.boundary")}
              </p>
            </div>
          ) : null}
        </details>

        {podeAgrupar.length ? (
          // Aparece só quando há por onde agrupar. Uma seção vazia com um texto explicando que
          // está vazia é a mesma armadilha que a visão Medidas: parece defeito quando está
          // certa. Aqui o silêncio é honesto — não há decisão a tomar.
          <fieldset className="rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-medium">
              {t("canonicalAnalysis.mapping.groupTitle")}
            </legend>
            <Text as="p" papel="micro">
              {t("canonicalAnalysis.mapping.groupExplain")}
            </Text>
            <div className="mt-3 flex flex-col gap-2">
              {podeAgrupar.map((campo) => {
                const id = `group-${campo}`;
                return (
                  <label key={campo} htmlFor={id} className="flex items-center gap-2 text-sm">
                    <input
                      id={id}
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={agrupar.includes(campo)}
                      onChange={(e) =>
                        setAgrupar((atual) =>
                          e.target.checked
                            ? [...atual, campo]
                            : atual.filter((c) => c !== campo),
                        )
                      }
                    />
                    {rotuloDoCampo(campo, t)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {erro ? (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="max-w-xl rounded-md border border-border p-4">
            <p className="text-sm font-medium">
              {t("canonicalAnalysis.mapping.acceptance.legend")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("canonicalAnalysis.mapping.acceptance.help")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("canonicalAnalysis.mapping.acceptance.tolerateSummary")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("canonicalAnalysis.mapping.acceptance.policy")}
            </p>
          </div>
          <Button
            onClick={() => void confirmar()}
            disabled={enviando}
            aria-busy={enviando}
          >
            {enviando
              ? t("canonicalAnalysis.mapping.confirming")
              : t("canonicalAnalysis.mapping.confirm")}
          </Button>
          <Text as="span" papel="micro">
            {t("canonicalAnalysis.mapping.afterConfirm")}
          </Text>
        </div>
      </Stack>
    </Panel>
  );
}
