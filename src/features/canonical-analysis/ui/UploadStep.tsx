// Passo de upload da base (Onda 6 E2, item 5). O `File` é transmitido DIRETO ao cliente `/v1`:
// NADA de FileReader/.text()/.arrayBuffer()/JSON.parse/hash/record_count/cópia integral no browser.
// Dropzone acessível (input nativo + label), cancel por AbortController, retry MANUAL.

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CanonicalScope } from "@/lib/v1";
import { useUploadData } from "../data/analysis";
import { ProblemNotice } from "./notices";

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
  const abortRef = useRef<AbortController | null>(null);
  const upload = useUploadData();
  const enviando = upload.isPending;
  // Após o sucesso, o status ainda está `preparing` até o refetch avançar p/ `receiving` (quando
  // este passo desmonta). Nessa janela o botão fica BLOQUEADO p/ não reenviar o dataset (Codex R5).
  const bloqueado = enviando || upload.isSuccess;

  function enviar() {
    if (!file || bloqueado) return;
    const ac = new AbortController();
    abortRef.current = ac;
    // File direto — sem leitura/cópia no navegador. O backend valida a base canonicamente.
    upload.mutate({ analysisId, scope, body: file, signal: ac.signal }, { onSuccess: onUploaded });
  }

  function cancelar() {
    abortRef.current?.abort();
  }

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

      <ProblemNotice error={upload.error} />

      <div className="flex flex-wrap gap-2">
        {!enviando && (
          <Button onClick={enviar} disabled={!file || bloqueado}>
            {upload.isError ? t("canonicalAnalysis.upload.retry") : t("canonicalAnalysis.upload.send")}
          </Button>
        )}
        {enviando && (
          <Button variant="outline" onClick={cancelar}>
            {t("canonicalAnalysis.upload.cancel")}
          </Button>
        )}
      </div>
    </section>
  );
}
