import { BrainCircuit, LoaderCircle, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalysisLoadingOverlayProps {
  open: boolean;
  message: string;
  progress: number;
}

const bullets = [
  "Scoring prompt discipline",
  "Checking stability within each intent",
  "Detecting cross-intent reuse",
  "Estimating waste and savings opportunity",
];

export default function AnalysisLoadingOverlay({ open, message, progress }: AnalysisLoadingOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card/95 p-6 shadow-2xl shadow-black/30 animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-5 flex items-start gap-4">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Sentinela is reading the run
            </div>
            <p className="text-sm text-muted-foreground">
              {message}. This animation is informative only — the real analysis comes from the backend response.
            </p>
          </div>
        </div>

        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              {bullet}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
