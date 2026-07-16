import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function SessionExpiredPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070C18] px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[rgba(252,211,77,0.08)] border border-[rgba(252,211,77,0.15)] flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-[#FCD34D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[#F1F5F9]">Session expired</h1>
          <p className="text-[#94A3B8] text-sm leading-relaxed">
            Your session expired due to inactivity. Sign in again to continue your work — your analysis data is still saved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link to="/login">
            <Button className="w-full h-11 rounded-xl bg-[#4F5AE8] text-[#070C18] font-semibold hover:bg-[#3E48C4]">
              Sign in again
            </Button>
          </Link>
          <Button
            onClick={() => navigate(0)}
            variant="outline"
            className="w-full h-10 rounded-xl border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.06)]"
          >
            Reload the page
          </Button>
        </div>
      </div>
    </div>
  );
}
