import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070C18] flex flex-col">
      {/* Nav */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[rgba(34,211,238,0.12)] border border-[rgba(34,211,238,0.2)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#F1F5F9]">Sentinela</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="rounded-xl text-[#94A3B8] hover:text-[#F1F5F9]">
              Sign in
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4]">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.15)] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
            <span className="text-xs font-semibold text-[#22D3EE]">Enterprise AI observability</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-[#F1F5F9] mb-6 leading-[1.1]">
            Know if your AI is
            <br />
            <span className="text-gradient-primary">healthy or failing</span>
          </h1>

          <p className="text-lg text-[#94A3B8] mb-10 leading-relaxed max-w-xl mx-auto">
            Analyze conversation datasets, detect behavioral degradation, measure economic impact, and act before your users notice the difference.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register">
              <Button size="lg" className="rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4] h-12 px-8 text-base">
                Start analyzing
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="rounded-xl border-[rgba(255,255,255,0.1)] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.05)] h-12 px-8 text-base">
                Sign in to workspace
              </Button>
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto w-full">
          {[
            {
              icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
              title: "AI health score",
              description: "One number that tells you if your system is operating safely or degrading.",
            },
            {
              icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z",
              title: "Risk detection",
              description: "Identify the dominant risk with severity, evidence, and impact before it escalates.",
            },
            {
              icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3",
              title: "Economic impact",
              description: "Measure cost per useful outcome and identify where money is being wasted.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="card-base p-5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.12)] flex items-center justify-center mb-4">
                <svg className="w-4.5 h-4.5 text-[#22D3EE]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[#F1F5F9] mb-1">{feature.title}</h3>
              <p className="text-xs text-[#475569] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 flex items-center justify-center border-t border-[rgba(255,255,255,0.04)]">
        <p className="text-xs text-[#2D3748]">Sentinela · Enterprise AI observability platform</p>
      </footer>
    </div>
  );
}
