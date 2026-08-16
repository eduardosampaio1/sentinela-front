import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const location = useLocation();

  return (
    <main className="min-h-screen bg-[#070C18] flex flex-col items-center justify-center text-center px-6">
      <div className="max-w-md mx-auto">

        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mx-auto mb-8">
          <svg
            className="w-8 h-8 text-[#94A3B8]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        <p className="text-xs font-mono text-[#7C86E0] mb-3 tracking-widest uppercase">
          404 — Not found
        </p>

        <h1 className="text-2xl font-bold text-[#F1F5F9] mb-3">
          This page doesn't exist
        </h1>

        <p className="text-sm text-[#94A3B8] leading-relaxed mb-3">
          The URL{" "}
          <span className="font-mono text-[#71809A] text-xs">{location.pathname}</span>{" "}
          could not be matched to any page in Sentinela. It may have been moved,
          renamed, or the link may be broken.
        </p>

        <p className="text-xs text-[#71809A] mb-8">
          Your analyses, workspace, and account data are unaffected.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link to="/home">
            <Button
              size="sm"
              className="rounded-xl bg-[#4F5AE8] text-white font-semibold hover:bg-[#3E48C4]"
            >
              Go to Launchpad
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]"
            >
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
