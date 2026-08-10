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
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CanonicalScope } from "@/lib/v1";
import { useUploadData } from "../data/analysis";
import { ProblemFeedback } from "./notices";
import { ehFalhaDeTransporte } from "./falhaDeTransporte";

const ACEITOS = ".jsonl,.ndjson,application/x-ndjson,application/jsonl";

export function UploadStep({
  analysisId,
  scope,
  onUploaded,
}: {
  analysisId: string;
  scope: CanonicalScope;
  onUploaded: () => void;
}) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadData();
  const enviando = upload.isPending;
  // Após o sucesso, o status ainda está `preparing` até o refetch avançar p/ `receiving` (quando
  // este passo desmonta). Nessa janela o botão fica BLOQUEADO p/ não reenviar o dataset (Codex R5).
  const bloqueado = enviando || upload.isSuccess;

  function enviar() {
    if (!file || bloqueado) return;
    // File direto — sem leitura/cópia no navegador. O backend valida a base canonicamente.
    upload.mutate({ analysisId, scope, body: file }, { onSuccess: onUploaded });
  }

  // O erro do upload tem DOIS desfechos, e a tela não pode colapsá-los: o backend respondeu e
  // recusou (envelope público), ou a requisição não chegou a ter resposta (transporte).
  const transporte = ehFalhaDeTransporte(upload.error);

  return (
    <section aria-labelledby="canonical-upload-title" className="space-y-4">
      <div>
        <h2 id="canonical-upload-title" className="text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.upload.title")}
        </h2>
        <p id="canonical-upload-help" className="mt-1 text-sm text-muted-foreground">
          {t("canonicalAnalysis.upload.help")}
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
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {bloqueado && (
        <p role="status" aria-live="polite" aria-busy="true" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("canonicalAnalysis.upload.sending")}
        </p>
      )}

      {transporte ? (
        <div role="alert" className="space-y-2 rounded-md border border-border bg-card p-4 text-sm">
          {/* Sem `destructive`: não é o backend recusando, é a conversa que caiu. Pintar de erro
              faria a pessoa procurar defeito na base dela. */}
          <p className="font-medium text-foreground">{t("canonicalAnalysis.upload.transport.title")}</p>
          {/* O que isto significa para a análise. `POST /data` não exige `Idempotency-Key` no
              contrato, então NÃO afirmamos que o dado não chegou — nem que chegou. */}
          <p className="text-muted-foreground">{t("canonicalAnalysis.upload.transport.meaning")}</p>
          {/* A ação possível é PERGUNTAR, não adivinhar: o estado público é o oráculo, e lê-lo é
              operação que existe e não muda nada. Reenviar às cegas seria inventar repetição
              segura onde o contrato não a publica. */}
          <div className="pt-1">
            <Button variant="outline" onClick={onUploaded}>
              {t("canonicalAnalysis.upload.transport.check")}
            </Button>
          </div>
        </div>
      ) : (
        // Envelope público: o backend viu a base e respondeu. `invalid_input` não consome a
        // operação — a análise segue em `preparing`, e escolher outro arquivo continua possível.
        <ProblemFeedback error={upload.error} />
      )}

      <div className="flex flex-wrap gap-2">
        {!enviando && (
          <Button onClick={enviar} disabled={!file || bloqueado}>
            {upload.isError ? t("canonicalAnalysis.upload.retry") : t("canonicalAnalysis.upload.send")}
          </Button>
        )}
      </div>
    </section>
  );
}
