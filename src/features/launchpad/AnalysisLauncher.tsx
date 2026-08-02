import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/shared/states/ErrorState";

// O Launchpad NAO executa mais analise inline, e NAO oferece mais colar JSON.
//
// Achado de review (Alta): o modo `paste` levava so `{ modo: 'paste' }` no state do router,
// e a jornada canonica NAO le esse state -- a `StartAnalysisPage` faz `prepare` e o
// `UploadStep` aceita apenas `File`. O texto colado era descartado em silencio: perda da
// entrada do usuario.
//
// A caixa de colar saiu em vez de ganhar um mecanismo de rascunho entre paginas. Um controle
// que promete aceitar conteudo e o joga fora e pior que a ausencia do controle -- a mesma
// razao pela qual os filtros de risco e score sairam do historico.
//
// O caminho antigo (`handleFileUpload`/`handlePasteAnalysis` -> `runAnalysis` -> /api/analyze)
// exige project_id + environment_id: o Gateway recusa sem os tres. Esse eixo perde dono quando
// a identidade vira workspace-only, e dar a ele uma fonte propria seria persistencia paralela
// sem dono arquitetural.
//
// A jornada canonica NAO aceita prefill: `StartAnalysisPage` e um botao que faz `prepare` e
// navega para a identidade duravel; o `UploadStep` recebe o `File` so depois. Entao o launcher
// leva apenas o MODO pretendido, em `state` do router -- nunca na URL, que fica registrada em
// historico, log de proxy e Referer. Conteudo de dataset nao entra em URL.
//
// Nao ha upload antecipado: enviar bytes antes de a analise existir criaria artefato sem dono.


// ── Dataset size estimation ────────────────────────────────────────────────────

interface DatasetEta {
  count: number;
  approxLabel: string;
  eta: string;
  isHeavy: boolean;
}

function estimateRecordCount(text: string): number {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.length;
    } catch {
      // fall through to line count
    }
  }
  return trimmed.split("\n").filter((l) => l.trim().length > 0).length;
}

function getDatasetEta(count: number): DatasetEta | null {
  if (count >= 100_000) return { count, approxLabel: `~${Math.round(count / 1000)}K conversations`, eta: "30–90 min", isHeavy: true };
  if (count >= 50_000)  return { count, approxLabel: `~${Math.round(count / 1000)}K conversations`, eta: "15–40 min", isHeavy: true };
  if (count >= 10_000)  return { count, approxLabel: `~${Math.round(count / 1000)}K conversations`, eta: "3–8 min",   isHeavy: true };
  if (count >= 5_000)   return { count, approxLabel: `~${Math.round(count / 1000)}K conversations`, eta: "30 s–2 min", isHeavy: false };
  return null;
}

export function AnalysisLauncher() {
  const navigate = useNavigate();
  // Nao existe mais operacao longa nesta tela: a acao navega. Sem estado de carregamento.
  const loading = false;
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [datasetEta, setDatasetEta] = useState<DatasetEta | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Leva a jornada canonica com o modo pretendido. Nada de conteudo, nada de rede. */
  function irParaJornadaCanonica(modo: "file" | "paste") {
    navigate("/canonical/analyses/new", { state: { modo } });
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.endsWith(".json") && !file.name.endsWith(".jsonl")) {
      setValidationError("Only .json and .jsonl files are accepted.");
      return;
    }
    setValidationError(null);
    setDatasetEta(null);
    irParaJornadaCanonica("file");
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError(null);
    setDatasetEta(null);
    // Reset input so same file can be re-selected
    e.target.value = "";
    irParaJornadaCanonica("file");
  }

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#F1F5F9]">New analysis</h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">Upload or paste a conversation dataset to begin</p>
        </div>

      </div>

      {validationError && (
        <InlineError
          message={validationError}
          onDismiss={() => setValidationError(null)}
          className="mb-4"
        />
      )}

      {datasetEta && loading && (
        <div
          className={cn(
            "mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 border",
            datasetEta.isHeavy
              ? "bg-[rgba(252,211,77,0.06)] border-[rgba(252,211,77,0.12)]"
              : "bg-[rgba(79,90,232,0.06)] border-[rgba(79,90,232,0.12)]"
          )}
        >
          <svg
            className={cn("w-4 h-4 flex-shrink-0 mt-0.5", datasetEta.isHeavy ? "text-[#FCD34D]" : "text-[#4F5AE8]")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div>
            <p className={cn("text-xs font-semibold", datasetEta.isHeavy ? "text-[#FCD34D]" : "text-[#4F5AE8]")}>
              Large dataset detected — {datasetEta.approxLabel}
            </p>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Estimated processing time: {datasetEta.eta}
            </p>
          </div>
        </div>
      )}

<div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed min-h-[180px] cursor-pointer transition-all group",
          dragging
            ? "border-[#4F5AE8] bg-[rgba(79,90,232,0.06)]"
            : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(79,90,232,0.4)] hover:bg-[rgba(79,90,232,0.03)]",
          loading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jsonl"
          onChange={handleFileChange}
          className="sr-only"
          disabled={loading}
          aria-label="Upload dataset file"
        />

        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
            dragging
              ? "bg-[rgba(79,90,232,0.15)] text-[#4F5AE8]"
              : "bg-[rgba(255,255,255,0.04)] text-[#94A3B8] group-hover:text-[#4F5AE8] group-hover:bg-[rgba(79,90,232,0.08)]"
          )}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-[#94A3B8]">
            {dragging ? "Drop file to analyze" : "Drop file here or click to browse"}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">Accepts .json and .jsonl files</p>
        </div>
      </div>
    </div>
  );
}
