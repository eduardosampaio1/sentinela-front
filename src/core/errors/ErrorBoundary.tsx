import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Future: send to error monitoring (Sentry, DataDog)
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
    window.location.href = "/home";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}

// ─── Fallback UI ──────────────────────────────────────────────────────────────

function ErrorFallback({
  error,
  onReset,
  onReload,
}: {
  error: Error;
  onReset: () => void;
  onReload: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#070C18] flex flex-col items-center justify-center text-center px-6">
      <div className="max-w-md mx-auto">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] flex items-center justify-center mx-auto mb-8">
          <svg
            className="w-8 h-8 text-[#F87171]"
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

        <p className="text-xs font-mono text-[#F87171] mb-3 tracking-widest uppercase">
          Rendering error
        </p>

        <h1 className="text-2xl font-bold text-[#F1F5F9] mb-3">
          The interface encountered an unexpected problem
        </h1>

        <p className="text-sm text-[#94A3B8] leading-relaxed mb-2">
          A component failed to render correctly. Your data is safe — this is a display
          error, not a data loss event.
        </p>

        {error.message && (
          <p className="text-xs text-[#475569] font-mono bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 mb-8 text-left break-words">
            {error.message}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={onReset}
            size="sm"
            className="rounded-xl bg-[#4F5AE8] text-[#070C18] font-semibold hover:bg-[#3E48C4]"
          >
            Back to Launchpad
          </Button>
          <Button
            onClick={onReload}
            size="sm"
            variant="ghost"
            className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]"
          >
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
