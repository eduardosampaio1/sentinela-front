import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  description?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
}

export function LoadingState({
  message = "Loading",
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
        <span className={cn(textSize, "text-[#94A3B8]")}>{message}</span>
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
            "absolute inset-0 rounded-full",
            size === "lg" ? "w-10 h-10" : "w-8 h-8",
            "opacity-20 bg-[#22D3EE] blur-xl"
          )}
          aria-hidden="true"
        />
      </div>
      <div className="text-center space-y-1">
        <p className={cn(textSize, "font-medium text-[#F1F5F9]")}>{message}</p>
        {description && (
          <p className="text-xs text-[#475569]">{description}</p>
        )}
      </div>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  steps?: string[];
  currentStep?: number;
  progress?: number;
}

export function LoadingOverlay({
  message = "Processing",
  steps,
  currentStep = 0,
  progress,
}: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#070C18]/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full px-6">
        {/* Spinner */}
        <div className="relative">
          <div className="w-14 h-14 spinner" />
          <div
            className="absolute inset-0 rounded-full bg-[#22D3EE] opacity-10 blur-2xl"
            aria-hidden="true"
          />
        </div>

        {/* Message */}
        <div className="text-center space-y-1">
          <p className="text-base font-semibold text-[#F1F5F9]">{message}</p>
          {steps && steps[currentStep] && (
            <p className="text-sm text-[#94A3B8]">{steps[currentStep]}</p>
          )}
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="w-full bg-[rgba(255,255,255,0.06)] rounded-full h-1 overflow-hidden">
            <div
              className="progress-bar h-full"
              style={{ width: `${Math.max(4, progress)}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {/* Steps list */}
        {steps && steps.length > 0 && (
          <ul className="w-full space-y-1">
            {steps.map((step, index) => (
              <li
                key={step}
                className={cn(
                  "text-xs flex items-center gap-2 transition-colors",
                  index < currentStep
                    ? "text-[#34D399]"
                    : index === currentStep
                      ? "text-[#F1F5F9]"
                      : "text-[#475569]"
                )}
              >
                <span
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border",
                    index < currentStep
                      ? "border-[#34D399] text-[#34D399]"
                      : index === currentStep
                        ? "border-[#22D3EE] text-[#22D3EE]"
                        : "border-[#2D3748] text-[#2D3748]"
                  )}
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
