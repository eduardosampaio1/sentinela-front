// Passo de upload da base (Onda 6 E2, item 5). O `File` é transmitido DIRETO ao cliente `/v1`:
// NADA de FileReader/.text()/.arrayBuffer()/JSON.parse/hash/record_count/cópia integral no browser.
// Dropzone acessível (input nativo + label), retry MANUAL.
//
// ## M33 — o cancelamento SAIU
//
// Havia um `AbortController` e um botão "Cancelar" durante o envio. **D15 põe cancelar fora da V1,
// e é literal: nenhum CTA pode sugerir.** Abortar a requisição no navegador não cancela nada no
// backend — a análise permanece onde está, e o dado pode ter chegado. O botão prometia uma
// operação que não existe, que é a definição de CTA sem owner.
//
// Sair da página continua possível, como em qualquer página; isso não é apresentado como
// cancelamento porque não é.
//
// ## M33 — a falha de transporte deixou de ser silenciosa
//
// `ProblemNotice` devolve `null` quando o erro não é envelope do contrato. Numa queda de rede o
// upload falhava sem uma frase sequer. Agora transporte tem estado próprio — ver
// `falhaDeTransporte.ts` para por que ele não pode afirmar que o dado não chegou.

import { useState } from "react";
import { Check, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CanonicalScope } from "@/lib/v1";
import { useUploadData, type UploadProgress } from "../data/analysis";
import { ProblemFeedback } from "./notices";
import { ehFalhaDeTransporte } from "./falhaDeTransporte";
import { AvisoDaJornada } from "./AvisoDaJornada";

// Os CINCO formatos que o serviço de ingestão tem adapter para ler. A lista estava em dois,
// e a diferença não era invisível: `accept` e uma SUGESTÃO do navegador, então quem escolhia
// "todos os arquivos" subia um CSV e o backend o processava normalmente. A tela recusava na
// vitrine o que o produto aceita na porta.
const ACEITOS = [
  ".csv",
  ".jsonl",
  ".ndjson",
  ".parquet",
  ".xlsx",
  "text/csv",
  "application/x-ndjson",
  "application/jsonl",
].join(",");

export function UploadStep({
  analysisId,
  scope,
  onUploaded,
  onProgressChange,
}: {
  analysisId: string;
  scope: CanonicalScope;
  onUploaded: () => void;
  onProgressChange?: (progress: UploadProgress | null) => void;
}) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const upload = useUploadData();
  const enviando = upload.isPending;
  const enviado = upload.isSuccess;
  // O botão fica bloqueado nas DUAS situações — enviando e já enviado —, e isso continua certo:
  // reenviar o mesmo dataset duplicaria a ingestão (Codex R5).
  //
  // O que MUDOU é a frase deixar de acompanhar o bloqueio. Ela dizia *enviando* nas duas, sob
  // a premissa escrita aqui de que a janela seria curta — *"até o refetch avançar p/
  // `receiving`, quando este passo desmonta"*. Quando a ingestão para em `needs_mapping` e
  // ninguém propaga esse estado, a análise fica em `preparing` e a janela vira PERMANENTE: o
  // envio funcionou e a tela girava um spinner para sempre, dizendo que ainda estava enviando.
  //
  // Duas verdades diferentes, dois textos.
  const bloqueado = enviando || enviado;

  function publicarProgresso(proximo: UploadProgress | null) {
    setProgress(proximo);
    onProgressChange?.(proximo);
  }

  function enviar() {
    if (!file || bloqueado) return;
    publicarProgresso(null);
    // File direto — sem leitura/cópia no navegador. O backend valida a base canonicamente.
    upload.mutate(
      {
        analysisId,
        scope,
        body: file,
        onProgress: publicarProgresso,
      },
      {
        onSuccess: () => {
          // O POST simples (<5 MB) não oferece eventos intermediários, mas sua resposta confirma
          // que todos os bytes chegaram. O multipart já terá publicado este mesmo 100%.
          publicarProgresso({
            sentBytes: file.size,
            totalBytes: file.size,
            percent: 100,
            currentPart: progress?.totalParts,
            totalParts: progress?.totalParts,
            state: "completing",
          });
          onUploaded();
        },
      },
    );
  }

  // O erro do upload tem DOIS desfechos, e a tela não pode colapsá-los: o backend respondeu e
  // recusou (envelope público), ou a requisição não chegou a ter resposta (transporte).
  const transporte = ehFalhaDeTransporte(upload.error);
  const percentual = enviado ? 100 : Math.max(0, Math.min(100, progress?.percent ?? (enviando ? 1 : 0)));
  const detalheDoProgresso =
    progress?.state === "retrying"
      ? t("canonicalAnalysis.upload.retryingPart", {
          current: progress.currentPart ?? 0,
          total: progress.totalParts ?? 0,
        })
      : progress?.state === "completing"
        ? t("canonicalAnalysis.upload.completing")
        : progress?.currentPart && progress?.totalParts
          ? t("canonicalAnalysis.upload.uploadingPart", {
              current: progress.currentPart,
              total: progress.totalParts,
            })
          : t("canonicalAnalysis.upload.progressHint");

  return (
    <section aria-labelledby="canonical-upload-title" className="space-y-4">
      <div>
        <h2 id="canonical-upload-title" className="text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.upload.title")}
        </h2>
        <p id="canonical-upload-help" className="mt-1 text-sm text-muted-foreground">
          {t("canonicalAnalysis.upload.help")}
        </p>
        {/* M33 — ONDE a pessoa está, e QUAL análise ela está preenchendo.
            Medido: vindo de `/analyses/new` nada confirmava que a análise fora criada, e por deep
            link ou refresh a tela não dizia a que ela pertencia. Não é stepper nem wizard: é o
            estado público `preparing` dito em palavras.

            O IDENTIFICADOR SAIU DAQUI e subiu para o cabeçalho da página. Ele estava neste ramo
            porque `preparing` era o único estado que o mostrava — os outros sete não diziam qual
            análise era. Agora a identidade existe uma vez, para os oito, e repeti-la aqui daria
            duas respostas para a mesma pergunta na mesma tela.

            A frase fica: ela é sobre o ESTADO (a análise foi reservada), não sobre a identidade. */}
        <p className="mt-2 text-sm text-muted-foreground">
          {t("canonicalAnalysis.upload.journeyReserved")}
        </p>
      </div>

      <label
        htmlFor="canonical-file"
        className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring"
      >
        <UploadCloud className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {file ? `${t("canonicalAnalysis.upload.selectedFile")}: ${file.name}` : t("canonicalAnalysis.upload.dropHint")}
        </span>
      </label>
      <input
        id="canonical-file"
        type="file"
        accept={ACEITOS}
        className="sr-only"
        aria-describedby="canonical-upload-help"
        disabled={enviando}
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          publicarProgresso(null);
          upload.reset();
        }}
      />

      {bloqueado && (
        <div
          role="status"
          aria-live="polite"
          // `aria-busy` só enquanto algo de fato corre. Mantê-lo depois do envio faria o leitor
          // de tela anunciar trabalho em curso sobre uma operação que terminou.
          aria-busy={enviando}
          className="space-y-2 text-sm text-muted-foreground"
        >
          <p className="flex items-center gap-2">
            {/* Duas chaves LITERAIS, e nao `t(condicao ? a : b)`: chamada opaca cega o rastreador
                de orfandade do i18n, que deixa de saber se a chave ainda tem consumidor. O gate da
                M14 conta essas chamadas justamente para que elas nao cresçam sem decisao. */}
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("canonicalAnalysis.upload.sending")}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                {t("canonicalAnalysis.upload.sent")}
              </>
            )}
          </p>
          {enviando && (
            <div className="space-y-1">
              <div
                role="progressbar"
                aria-label={t("canonicalAnalysis.upload.progressLabel")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentual}
                aria-valuetext={t("canonicalAnalysis.upload.progressValue", {
                  percent: percentual,
                })}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <span
                  aria-hidden="true"
                  className="block h-full w-full origin-left rounded-full bg-primary/80 transition-transform motion-reduce:transition-none"
                  style={{
                    transform: `scaleX(${percentual / 100})`,
                    transitionDuration: "var(--ds-duration-base)",
                    transitionTimingFunction: "var(--ds-easing-standard)",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {detalheDoProgresso}
              </p>
            </div>
          )}
        </div>
      )}

      {transporte ? (
        <AvisoDaJornada
          titulo={t("canonicalAnalysis.upload.transport.title")}
          // `POST /data` não exige `Idempotency-Key` no contrato: sem repetição segura publicada,
          // não afirmamos que o dado não chegou — nem que chegou.
          significado={t("canonicalAnalysis.upload.transport.meaning")}
          acao={
            // Verificar LIMPA o erro além de revalidar: sem isso o botão seguiria rotulado
            // "tentar de novo" depois da consulta, e a pessoa reenviaria sem ler a resposta.
            <Button
              variant="outline"
              onClick={() => {
                upload.reset();
                onUploaded();
              }}
            >
              {t("canonicalAnalysis.upload.transport.check")}
            </Button>
          }
        />
      ) : (
        // Envelope público: o backend viu a base e respondeu. `invalid_input` não consome a
        // operação — a análise segue em `preparing`, e escolher outro arquivo continua possível.
        <ProblemFeedback error={upload.error} />
      )}

      {/* Durante o estado de transporte o envio NÃO é oferecido ao lado da consulta. Reenviar sem
          saber se a base chegou é a ação arriscada — `POST /data` não publica repetição segura —, e
          oferecê-la com o mesmo peso da consulta convidaria justamente a ela. Depois de verificar,
          o erro é limpo e o envio volta, se a análise ainda estiver esperando base. */}
      <div className="flex flex-wrap gap-2">
        {!transporte && (
          <Button onClick={enviar} disabled={!file || bloqueado}>
            {upload.isError ? t("canonicalAnalysis.upload.retry") : t("canonicalAnalysis.upload.send")}
          </Button>
        )}
      </div>
    </section>
  );
}
