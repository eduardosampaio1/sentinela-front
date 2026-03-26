import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useAnalysis } from "@/hooks/useAnalysis";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InlineError } from "@/shared/states/ErrorState";

type Mode = "upload" | "paste";

export function AnalysisLauncher() {
  const { handleFileUpload, handlePasteAnalysis, loading } = useAnalysis();
  const [mode, setMode] = useState<Mode>("upload");
  const [pastedText, setPastedText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    handleFileUpload(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidationError(null);
    handleFileUpload(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handlePasteSubmit() {
    if (!pastedText.trim()) {
      setValidationError("Paste your dataset content first.");
      return;
    }
    setValidationError(null);
    handlePasteAnalysis(pastedText);
  }

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#F1F5F9]">New analysis</h2>
          <p className="text-xs text-[#475569] mt-0.5">Upload or paste a conversation dataset to begin</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-[rgba(255,255,255,0.04)] rounded-lg p-0.5 border border-[rgba(255,255,255,0.06)]">
          {(["upload", "paste"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setValidationError(null); }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                mode === m
                  ? "bg-[#0D1525] text-[#F1F5F9] shadow-sm"
                  : "text-[#475569] hover:text-[#94A3B8]"
              )}
              disabled={loading}
            >
              {m === "upload" ? "Upload file" : "Paste JSON"}
            </button>
          ))}
        </div>
      </div>

      {validationError && (
        <InlineError
          message={validationError}
          onDismiss={() => setValidationError(null)}
          className="mb-4"
        />
      )}

      {mode === "upload" ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !loading && fileInputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed min-h-[180px] cursor-pointer transition-all group",
            dragging
              ? "border-[#22D3EE] bg-[rgba(34,211,238,0.06)]"
              : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(34,211,238,0.4)] hover:bg-[rgba(34,211,238,0.03)]",
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
                ? "bg-[rgba(34,211,238,0.15)] text-[#22D3EE]"
                : "bg-[rgba(255,255,255,0.04)] text-[#475569] group-hover:text-[#22D3EE] group-hover:bg-[rgba(34,211,238,0.08)]"
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
            <p className="text-xs text-[#475569] mt-1">Accepts .json and .jsonl files</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder='[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]'
            rows={8}
            disabled={loading}
            className="bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] placeholder:text-[#2D3748] focus:border-[#22D3EE] resize-none font-mono text-xs rounded-xl leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#475569]">
              Paste a JSON array of conversation objects
            </p>
            <Button
              onClick={handlePasteSubmit}
              disabled={loading || !pastedText.trim()}
              size="sm"
              className="rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4] min-w-[120px]"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 spinner" />
                  Analyzing...
                </span>
              ) : (
                "Analyze dataset"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
