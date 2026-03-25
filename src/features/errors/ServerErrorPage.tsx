import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ServerErrorPage() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? error.statusText || "An unexpected error occurred."
    : error instanceof Error
    ? error.message
    : "An unexpected error occurred.";

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

        {/* Status */}
        <p className="text-xs font-mono text-[#F87171] mb-3 tracking-widest uppercase">
          Error
        </p>

        <h1 className="text-2xl font-bold text-[#F1F5F9] mb-3">
          Something went wrong
        </h1>

        <p className="text-sm text-[#475569] leading-relaxed mb-4">
          {message}
        </p>

        <p className="text-xs text-[#2D3748] mb-8">
          If the problem persists, please refresh the page or contact support.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button
            size="sm"
            className="rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4]"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
          <Link to="/home">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-[#475569] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]"
            >
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
