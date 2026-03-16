import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileJson2,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  Play,
  WandSparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { parseConversationsInput } from "@/lib/api";

interface AnalysisIngestionCardProps {
  loading: boolean;
  hasResult: boolean;
  onFileUpload: (file: File) => void;
  onRunFromPaste: (text: string) => void;
  onImportResult: (text: string) => void;
  onLoadDemo?: () => void;
}

const EXAMPLE_DATASET = `[
  {
    "conversation_id": "1",
    "intent": "billing",
    "user": "I need a duplicate",
    "assistant": "I can help you with that."
  }
]`;

export default function AnalysisIngestionCard({
  loading,
  hasResult,
  onFileUpload,
  onRunFromPaste,
  onImportResult,
  onLoadDemo,
}: AnalysisIngestionCardProps) {
  const [rawInput, setRawInput] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(hasResult);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [editorFocused, setEditorFocused] = useState(false);

  useEffect(() => {
    if (hasResult && !loading) setCollapsed(true);
  }, [hasResult, loading]);

  useEffect(() => {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      setValidationError(null);
      setParsedCount(0);
      return;
    }

    try {
      const parsed = parseConversationsInput(trimmed);
      setValidationError(null);
      setParsedCount(parsed.length);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : "Invalid dataset input.");
      setParsedCount(0);
    }
  }, [rawInput]);

  const resizeEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.style.height = "auto";
    const targetHeight = Math.min(500, Math.max(300, editor.scrollHeight));
    editor.style.height = `${targetHeight}px`;
    editor.style.overflowY = editor.scrollHeight > 500 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    if (collapsed) return;
    resizeEditor();
  }, [collapsed, rawInput, resizeEditor]);

  const closeComposer = () => setCollapsed(true);
  const openComposer = () => setCollapsed(false);

  const handleFileSelected = (file: File) => {
    setSelectedFileName(file.name);
    setRawInput("");
    closeComposer();
    onFileUpload(file);
  };

  const canRun = useMemo(
    () => rawInput.trim().length > 0 && !validationError,
    [rawInput, validationError],
  );

  return (
    <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
              First analysis
            </Badge>
            {selectedFileName ? <Badge variant="secondary">{selectedFileName}</Badge> : null}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Upload or paste your dataset
            </h2>
            <p className="text-sm text-muted-foreground">
              Supported formats: `.json`, `.jsonl`, `.ndjson`. Paste supports JSON arrays,
              JSONL, and NDJSON.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onLoadDemo ? (
            <Button variant="outline" onClick={onLoadDemo} disabled={loading}>
              <WandSparkles className="mr-2 h-4 w-4" /> Load sample analysis
            </Button>
          ) : null}
          {collapsed ? (
            <Button variant="secondary" onClick={openComposer} disabled={loading}>
              <ChevronDown className="mr-2 h-4 w-4" /> Open input options
            </Button>
          ) : (
            <Button variant="ghost" onClick={closeComposer} disabled={loading}>
              <ChevronUp className="mr-2 h-4 w-4" /> Hide input options
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-all duration-300",
          collapsed ? "mt-0 grid-rows-[0fr] opacity-0" : "mt-5 grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-5 text-left transition hover:border-primary/50 hover:bg-primary/10"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-background/60 text-primary">
                <Upload className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  Upload JSON, JSONL or NDJSON datasets
                </div>
                <p className="text-sm text-muted-foreground">
                  Analysis starts automatically right after upload and validation.
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <FileJson2 className="h-3.5 w-3.5" /> Accepts `.json`, `.jsonl`, `.ndjson`
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json,.jsonl,.ndjson"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
            </button>

            <div className="rounded-3xl border border-border bg-background/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <ClipboardPaste className="h-4 w-4 text-primary" /> Paste JSON / JSONL / NDJSON
              </div>

              <div className="mt-3 flex items-center gap-2">
                {parsedCount > 0 && !validationError ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Valid input ({parsedCount} records)
                  </span>
                ) : null}
              </div>

              <div className="relative mt-3">
                <Textarea
                  ref={editorRef}
                  value={rawInput}
                  onChange={(event) => setRawInput(event.target.value)}
                  onFocus={() => setEditorFocused(true)}
                  onBlur={() => {
                    if (!rawInput.trim()) {
                      setEditorFocused(false);
                    }
                  }}
                  placeholder=""
                  className="min-h-[300px] max-h-[500px] resize-none border-border/60 bg-card font-mono text-xs"
                />

                {!editorFocused && !rawInput.trim() ? (
                  <pre className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] whitespace-pre-wrap text-xs text-muted-foreground/50">
                    {EXAMPLE_DATASET}
                  </pre>
                ) : null}
              </div>

              {validationError ? (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {validationError}
                  </span>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    closeComposer();
                    onRunFromPaste(rawInput);
                    setRawInput("");
                  }}
                  disabled={loading || !canRun}
                >
                  <Play className="mr-2 h-4 w-4" /> Analyze pasted dataset
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    closeComposer();
                    onImportResult(rawInput);
                    setRawInput("");
                  }}
                  disabled={loading || !rawInput.trim()}
                >
                  <WandSparkles className="mr-2 h-4 w-4" /> Open saved analysis result
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
