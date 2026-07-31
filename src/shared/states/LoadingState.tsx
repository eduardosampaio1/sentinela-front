import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
}

export function LoadingState({
  message = "Preparing data",
  description,
  className,
  size = "md",
  inline = false,
}: LoadingStateProps) {
  const spinnerSize = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-base" : "text-sm";

  if (inline) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <span
          className={cn("spinner", spinnerSize)}
          role="status"
          aria-label={message}
        />
        <span className={cn(textSize, "text-muted-foreground")}>{message}</span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 px-6",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <div className={cn("spinner", spinnerSize)} aria-hidden="true" />
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-20 bg-primary blur-xl",
          )}
          aria-hidden="true"
        />
      </div>
      <div className="text-center space-y-1">
        <p className={cn(textSize, "font-medium text-foreground")}>{message}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Sentinel worker messages ─────────────────────────────────────────────────

const SENTINEL_WATCH_MESSAGES = [
  "Sentinel is on watch. Scanning the data perimeter...",
  "Patrolling your dataset for hidden anomalies...",
  "Sentinel's gaze is fixed on your records. Analyzing...",
  "Deep-scanning the horizon. Sentinel is mapping your data...",
  "Sentinel is securing the perimeter. Processing high-volume logs...",
  "Calibrating sensors. Sentinel is pinpointing insights...",
];

// ─── Full-screen overlay (during analysis processing) ─────────────────────────

interface LoadingOverlayProps {
  message?: string;
  steps?: string[];
  currentStep?: number;
  progress?: number;
}

export function LoadingOverlay({
  message = "Processing dataset",
  steps,
  currentStep = 0,
  progress,
}: LoadingOverlayProps) {
  const isWaitingForWorker = currentStep >= 3;

  const [watchIndex, setWatchIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  // Cycle messages with fade while waiting for worker
  useEffect(() => {
    if (!isWaitingForWorker) return;

    const cycle = setInterval(() => {
      setFadeIn(false);
      const timer = setTimeout(() => {
        setWatchIndex((i) => (i + 1) % SENTINEL_WATCH_MESSAGES.length);
        setFadeIn(true);
      }, 400);
      return () => clearTimeout(timer);
    }, 3500);

    return () => clearInterval(cycle);
  }, [isWaitingForWorker]);

  // Reset on entering worker wait stage
  useEffect(() => {
    if (isWaitingForWorker) {
      setWatchIndex(0);
      setFadeIn(true);
    }
  }, [isWaitingForWorker]);

  const displayMessage = isWaitingForWorker
    ? SENTINEL_WATCH_MESSAGES[watchIndex]
    : (message ?? steps?.[currentStep] ?? "Processing dataset");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/92 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full px-8">

        {/* Spinner */}
        <div className="relative">
          <div className="w-14 h-14 spinner" />
          <div
            className="absolute inset-0 rounded-full bg-primary opacity-10 blur-2xl"
            aria-hidden="true"
          />
        </div>

        {/* Dynamic message with fade transition */}
        <div className="text-center space-y-1.5 min-h-[3.5rem] flex flex-col items-center justify-center">
          <p
            className="text-base font-semibold text-foreground"
            style={{
              opacity: isWaitingForWorker ? (fadeIn ? 1 : 0) : 1,
              transition: "opacity 400ms ease-in-out",
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {displayMessage}
          </p>
          {isWaitingForWorker ? (
            <p
              className="text-xs text-muted-foreground"
              style={{
                opacity: fadeIn ? 1 : 0,
                transition: "opacity 400ms ease-in-out",
              }}
            >
              This may take a minute — hang tight.
            </p>
          ) : (
            steps && steps[currentStep] && (
              <p className="text-sm text-muted-foreground">{steps[currentStep]}</p>
            )
          )}
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
            <div
              className="progress-bar h-full transition-all duration-300"
              style={{ width: `${Math.max(4, progress)}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Analysis progress: ${progress}%`}
            />
          </div>
        )}

        {/* Step checklist */}
        {steps && steps.length > 0 && (
          <ul className="w-full space-y-1.5" aria-label="Analysis steps">
            {steps.map((step, index) => (
              <li
                key={step}
                className={cn(
                  "text-xs flex items-center gap-2.5 transition-colors",
                  index < currentStep
                    ? "text-success"
                    : index === currentStep
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border flex-shrink-0",
                    index < currentStep
                      ? "border-success text-success"
                      : index === currentStep
                        ? "border-primary text-primary"
                        : "border-border text-border"
                  )}
                  aria-hidden="true"
                >
                  {index < currentStep ? "✓" : index + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
