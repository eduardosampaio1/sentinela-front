import { useEffect, useRef, useState } from "react";
import { Upload, FileJson2, ClipboardPaste, ChevronDown, ChevronUp, Play, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface AnalysisIngestionCardProps {
  loading: boolean;
  hasResult: boolean;
  onFileUpload: (file: File) => void;
  onRunFromPaste: (text: string) => void;
  onImportResult: (text: string) => void;
  onLoadDemo?: () => void;
}

export default function AnalysisIngestionCard({
  loading,
  hasResult,
  onFileUpload,
  onRunFromPaste,
  onImportResult,
  onLoadDemo,
}: AnalysisIngestionCardProps) {
  const { t } = useLanguage();
  const [rawInput, setRawInput] = useState("");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(hasResult);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (hasResult && !loading) setCollapsed(true);
  }, [hasResult, loading]);

  const closeComposer = () => setCollapsed(true);
  const openComposer = () => setCollapsed(false);

  const handleFileSelected = (file: File) => {
    setSelectedFileName(file.name);
    setRawInput("");
    closeComposer();
    onFileUpload(file);
  };

  const canRun = rawInput.trim().length > 0;

  return (
    <div className="rounded-3xl border border-border bg-card/70 p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">{t("dashboard.firstRunBadge")}</Badge>
            {selectedFileName ? <Badge variant="secondary">{selectedFileName}</Badge> : null}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("dashboard.firstRunTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.firstRunBody")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onLoadDemo ? (
            <Button variant="outline" onClick={onLoadDemo} disabled={loading}>
              <WandSparkles className="mr-2 h-4 w-4" /> {t("dashboard.loadSample")}
            </Button>
          ) : null}
          {collapsed ? (
            <Button variant="secondary" onClick={openComposer} disabled={loading}>
              <ChevronDown className="mr-2 h-4 w-4" /> {t("dashboard.openInput")}
            </Button>
          ) : (
            <Button variant="ghost" onClick={closeComposer} disabled={loading}>
              <ChevronUp className="mr-2 h-4 w-4" /> {t("dashboard.hideInput")}
            </Button>
          )}
        </div>
      </div>

      <div className={cn(
        "grid transition-all duration-300",
        collapsed ? "grid-rows-[0fr] opacity-0 mt-0" : "grid-rows-[1fr] opacity-100 mt-5",
      )}>
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
                <div className="text-sm font-semibold text-foreground">{t("dashboard.analyzeFile")}</div>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.analyzeFileBody")}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <FileJson2 className="h-3.5 w-3.5" /> {t("dashboard.fileHint")}
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
                <ClipboardPaste className="h-4 w-4 text-primary" /> {t("dashboard.pasteTitle")}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("dashboard.pasteBody")}
              </p>
              <Textarea
                value={rawInput}
                onChange={(event) => setRawInput(event.target.value)}
                placeholder={t("dashboard.pastePlaceholder")}
                className="min-h-[180px] resize-none border-border/60 bg-card"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    closeComposer();
                    onRunFromPaste(rawInput);
                    setRawInput("");
                  }}
                  disabled={loading || !canRun}
                >
                  <Play className="mr-2 h-4 w-4" /> {t("dashboard.analyzePasted")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    closeComposer();
                    onImportResult(rawInput);
                    setRawInput("");
                  }}
                  disabled={loading || !canRun}
                >
                  <WandSparkles className="mr-2 h-4 w-4" /> {t("dashboard.openSaved")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
