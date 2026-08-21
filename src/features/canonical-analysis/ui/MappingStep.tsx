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

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel, Stack, Text } from "@/design/primitives";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ColunaDoArquivo, MappingView } from "@/lib/v1";
import { cn } from "@/lib/utils";

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
  aoConfirmar: (regras: Record<string, { source: string }>) => Promise<void>;
}) {
  const { t } = useLanguage();

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

  const porNome = useMemo(
    () => new Map(mapa.columns.map((c) => [c.name, c])),
    [mapa.columns],
  );

  const faltando = mapa.required_fields.filter((c) => !escolhas[c]);
  const jaResolvidos = mapa.required_fields.length - faltando.length;

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
    setEnviando(true);
    setErro(null);
    try {
      const regras: Record<string, { source: string }> = {};
      for (const [campo, origem] of Object.entries(escolhas)) {
        if (origem) regras[campo] = { source: origem };
      }
      await aoConfirmar(regras);
    } catch {
      // A mensagem é NOSSA. O corpo do servidor pode carregar detalhe interno, e ecoá-lo faria
      // a tela repetir vocabulário que ninguém escreveu para ser lido.
      setErro(t("canonicalAnalysis.mapping.failed"));
      setEnviando(false);
    }
  }

  const linha = (campo: string, obrigatorio: boolean) => {
    const empatados = mapa.ambiguous[campo] ?? [];
    const escolhido = escolhas[campo] ?? "";
    // Duas coisas diferentes, e o vermelho só pertence à segunda.
    const aguardando = obrigatorio && !escolhido;
    const reprovado = aguardando && tentou;
    const idCampo = `mapping-${campo}`;

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
            reprovado ? "border-destructive" : "border-border",
          )}
        >
          <option value="">{t("canonicalAnalysis.mapping.chooseColumn")}</option>
          {mapa.columns.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        {/* O empate é dito, e não escondido: são os campos onde a máquina chegou até o fim e
            não conseguiu escolher. Sem a frase, a pessoa não sabe por que ESTE campo veio vazio
            enquanto os outros vieram preenchidos. */}
        {empatados.length > 1 && !escolhido ? (
          <p className="text-xs text-muted-foreground">
            {t("canonicalAnalysis.mapping.ambiguous", { columns: empatados.join(", ") })}
          </p>
        ) : (
          <Evidencia coluna={porNome.get(escolhido)} />
        )}
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

        {erro ? (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button onClick={() => void confirmar()} disabled={enviando} aria-busy={enviando}>
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

