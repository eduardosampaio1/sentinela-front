import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: ReactNode;
  /** Right side: form content */
  formContent?: ReactNode;
  /** Left side: value proposition */
  showValueProp?: boolean;
}

export function AuthShell({ children, showValueProp = true }: AuthShellProps) {
  return (
    <div className="min-h-screen flex bg-[#070C18]">
      {/* Left: Value Prop */}
      {showValueProp && (
        <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-12 bg-[#0D1525] border-r border-[rgba(255,255,255,0.06)] relative overflow-hidden">
          {/* Background decoration */}
          <div
            className="absolute top-0 right-0 w-96 h-96 opacity-5 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-64 h-64 opacity-5 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, #6366F1 0%, transparent 70%)" }}
            aria-hidden="true"
          />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-9 h-9 rounded-xl bg-[rgba(34,211,238,0.12)] border border-[rgba(34,211,238,0.2)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <span className="text-lg font-semibold tracking-tight text-[#F1F5F9]">Sentinela</span>
            </div>

            {/* Headline */}
            <h2 className="text-3xl font-bold tracking-tight text-[#F1F5F9] mb-4 leading-tight">
              The decision layer for your AI system
            </h2>
            <p className="text-[#94A3B8] text-base leading-relaxed mb-10">
              Upload conversation data and get an instant assessment — risk level,
              behavior score, economic impact, and prioritized actions. Built for
              teams running AI in production.
            </p>

            {/* Features */}
            <div className="space-y-5">
              {[
                {
                  icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
                  title: "System health in seconds",
                  description: "Know immediately if your AI is healthy, degraded, or at risk — before your users notice.",
                },
                {
                  icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5",
                  title: "Cost and efficiency analysis",
                  description: "Quantify cost per useful outcome, token waste, and the real economic impact of AI failures.",
                },
                {
                  icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z",
                  title: "Actionable, not just observational",
                  description: "Every finding comes with a ranked recommendation. Know what to fix and why.",
                },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.12)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#F1F5F9]">{feature.title}</p>
                    <p className="text-xs text-[#475569] leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-[#2D3748] relative z-10">
            AI observability · Built for production teams
          </p>
        </div>
      )}

      {/* Right: Form */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center p-6 sm:p-12",
          !showValueProp && "w-full"
        )}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[rgba(34,211,238,0.12)] border border-[rgba(34,211,238,0.2)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-[#F1F5F9]">Sentinela</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
