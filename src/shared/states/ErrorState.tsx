import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string | number;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ErrorState({
  title = "Something went wrong",
  message,
  code,
  onRetry,
  onDismiss,
  className,
  size = "md",
}: ErrorStateProps) {
  const padding = size === "sm" ? "py-6 px-4" : size === "lg" ? "py-16 px-8" : "py-12 px-6";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        padding,
        className
      )}
      role="alert"
    >
      {/* Icon */}
      <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] mb-5">
        <svg
          className="w-5 h-5 text-[#F87171]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      {/* Text */}
      <h3 className="text-base font-semibold text-[#F1F5F9] mb-1">{title}</h3>
      {message && (
        <p className="text-sm text-[#94A3B8] max-w-sm leading-relaxed mb-1">{message}</p>
      )}
      {code !== undefined && (
        <p className="text-xs text-[#475569] font-mono mb-5">Error code: {code}</p>
      )}
      {!code && message && <div className="mb-4" />}

      {/* Actions */}
      {(onRetry || onDismiss) && (
        <div className="flex items-center gap-3">
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="rounded-xl border-[rgba(248,113,113,0.3)] text-[#F87171] hover:bg-[rgba(248,113,113,0.1)] hover:text-[#F87171]"
            >
              Try again
            </Button>
          )}
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="rounded-xl text-[#94A3B8] hover:text-[#F1F5F9]"
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function InlineError({ message, onDismiss, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)]",
        className
      )}
      role="alert"
    >
      <svg
        className="w-4 h-4 text-[#F87171] mt-0.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <p className="text-sm text-[#F87171] flex-1">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[#F87171] opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss error"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
