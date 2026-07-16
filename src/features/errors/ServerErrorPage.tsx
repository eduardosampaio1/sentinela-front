import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ServerErrorPage() {
  const error = useRouteError();

  const status = isRouteErrorResponse(error) ? error.status : 500;
  const technicalDetail = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
    ? error.message
    : null;

  return (
    <div className="min-h-screen bg-[#070C18] flex flex-col items-center justify-center text-center px-6">
      <div className="max-w-lg mx-auto">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.12)] flex items-center justify-center mx-auto mb-8">
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
              d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 6 0m-6 0H3m16.5 0a3 3 0 0 0 3-3m-3 3a3 3 0 1 1-6 0m6 0h1.5m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
            />
          </svg>
        </div>

        <p className="text-xs font-mono text-[#F87171] mb-3 tracking-widest uppercase">
          Error {status}
        </p>

        <h1 className="text-2xl font-bold text-[#F1F5F9] mb-3">
          An unexpected server error occurred
        </h1>

        <p className="text-sm text-[#94A3B8] leading-relaxed mb-3">
          The platform encountered an internal error processing this request.
          Your data and analysis history are unaffected — this is an infrastructure
          issue, not a data loss event.
        </p>

        <p className="text-xs text-[#475569] mb-8">
          If this error repeats after reloading, it may indicate a temporary service
          disruption. Try again in a few minutes or navigate back to the Launchpad.
        </p>

        {technicalDetail && (
          <p className="text-xs text-[#475569] font-mono bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-3 mb-8 text-left break-words">
            {technicalDetail}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            size="sm"
            className="rounded-xl bg-[#4F5AE8] text-[#070C18] font-semibold hover:bg-[#3E48C4]"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
          <Link to="/home">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]"
            >
              Back to Launchpad
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
