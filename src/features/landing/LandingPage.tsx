import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// ─── Design tokens (local) ────────────────────────────────────────────────────

const C = {
  bg:        "#070C18",
  bgCard:    "rgba(255,255,255,0.025)",
  border:    "rgba(255,255,255,0.06)",
  borderHov: "rgba(255,255,255,0.12)",
  cyan:      "#22D3EE",
  cyanHov:   "#06B6D4",
  cyanBg:    "rgba(34,211,238,0.08)",
  cyanBord:  "rgba(34,211,238,0.15)",
  green:     "#34D399",
  amber:     "#FCD34D",
  red:       "#F87171",
  text:      "#F1F5F9",
  muted:     "#94A3B8",
  dim:       "#94A3B8",
  ghost:     "#475569",
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionBadge({ children, amber }: { children: React.ReactNode; amber?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-5"
      style={{ background: amber ? "rgba(252,211,77,0.08)" : C.cyanBg, borderColor: amber ? "rgba(252,211,77,0.18)" : C.cyanBord }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: amber ? C.amber : C.cyan }} aria-hidden="true" />
      <span className="text-xs font-semibold" style={{ color: amber ? C.amber : C.cyan }}>{children}</span>
    </div>
  );
}

function SectionHeading({ title, body, center = true }: { title: React.ReactNode; body?: string; center?: boolean }) {
  return (
    <div className={`max-w-3xl mb-14 ${center ? "mx-auto text-center" : ""}`}>
      {title}
      {body && <p className="text-lg leading-relaxed" style={{ color: C.muted }}>{body}</p>}
    </div>
  );
}

function FeatureIcon({ path }: { path: string }) {
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: C.cyanBg, border: `1px solid ${C.cyanBord}` }}>
      <svg className="w-5 h-5" style={{ color: C.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: "#problem",   label: "Why now" },
  { href: "#detection", label: "Detection" },
  { href: "#workflow",  label: "Workflow" },
  { href: "#security",  label: "Security" },
  { href: "#pricing",   label: "Pricing" },
];

function Navbar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 sm:px-8 border-b sticky top-0 z-40"
      style={{ background: `${C.bg}f0`, borderColor: C.border, backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(34,211,238,0.12)", border: `1px solid rgba(34,211,238,0.2)` }}>
            <svg className="w-4 h-4" style={{ color: C.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: C.text }}>Sentinela</span>
        </div>

        {/* Anchor nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:text-[#F1F5F9]"
              style={{ color: C.dim }}>
              {label}
            </a>
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: C.border }} aria-hidden="true" />
          <Link to="/aion" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors hover:text-[#F1F5F9]"
            style={{ color: "#14B8A6" }}>
            AION
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(234,179,8,0.15)", color: "#EAB308", border: "1px solid rgba(234,179,8,0.3)" }}>
              New
            </span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="rounded-xl" style={{ color: C.muted }}>
            Sign in
          </Button>
        </Link>
        <Link to="/register">
          <Button size="sm" className="rounded-xl font-semibold"
            style={{ background: C.cyan, color: C.bg }}>
            Get started
          </Button>
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="flex flex-col items-center justify-center text-center px-6 py-24 sm:py-32">
      <div className="max-w-2xl mx-auto">
        <SectionBadge>Enterprise AI observability</SectionBadge>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-[1.08]"
          style={{ color: C.text }}>
          Know if your AI is
          <br />
          <span className="text-gradient-primary">healthy or failing</span>
        </h1>

        <p className="text-lg mb-10 leading-relaxed max-w-xl mx-auto" style={{ color: C.muted }}>
          Analyze conversation datasets, detect behavioral degradation, measure economic impact, and act before your users notice the difference.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/login">
            <Button size="lg" className="rounded-xl font-semibold h-12 px-8 text-base"
              style={{ background: C.cyan, color: C.bg }}>
              Start analyzing
            </Button>
          </Link>
          <a href="#problem">
            <Button size="lg" variant="outline" className="rounded-xl h-12 px-8 text-base"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: C.muted }}>
              See how it works
            </Button>
          </a>
        </div>
      </div>

      {/* Feature tiles */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto w-full">
        {[
          { icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z", title: "AI health score", description: "One number that tells you if your system is operating safely or degrading." },
          { icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z", title: "Risk detection", description: "Identify the dominant risk with severity, evidence, and impact before it escalates." },
          { icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3", title: "Economic impact", description: "Measure cost per useful outcome and identify where money is being wasted." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border p-5 text-left transition-colors"
            style={{ background: C.bgCard, borderColor: C.border }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background: C.cyanBg, border: `1px solid ${C.cyanBord}` }}>
              <svg className="w-4 h-4" style={{ color: C.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
              </svg>
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: C.text }}>{f.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: C.dim }}>{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Problem / Why Now ────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    title: "Hidden cost leakage",
    description: "Token waste, unnecessary handoffs, and unhelpful responses accumulate silently — visible only when the bill arrives.",
  },
  {
    icon: "M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z",
    title: "Behavioral degradation goes unnoticed",
    description: "Model behavior shifts gradually — inconsistent answers, structural drift, semantic overlap — and teams only notice after user complaints.",
  },
  {
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z",
    title: "Risk without evidence",
    description: "Leadership asks about AI reliability. Engineering doesn't have structured metrics. Monitoring is reactive, not preventive.",
  },
  {
    icon: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
    title: "No systematic comparison across runs",
    description: "Without history and scoring, every deploy is a guess. There's no way to know if the latest update improved or degraded behavior.",
  },
];

function ProblemSection() {
  return (
    <section id="problem" className="py-20 sm:py-28 px-6 sm:px-8" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionBadge amber>Why now</SectionBadge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.text }}>
            AI teams are flying blind<br />on behavioral quality
          </h2>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: C.muted }}>
            Production AI systems degrade silently. By the time your metrics move, the damage is already in user sessions, costs, and trust.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-2xl border p-6 flex items-start gap-4 transition-colors"
              style={{ background: "rgba(252,211,77,0.02)", borderColor: "rgba(252,211,77,0.1)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(252,211,77,0.08)", border: "1px solid rgba(252,211,77,0.18)" }}>
                <svg className="w-5 h-5" style={{ color: C.amber }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1.5" style={{ color: C.text }}>{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.dim }}>{p.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border p-5 text-center"
          style={{ background: "rgba(34,211,238,0.04)", borderColor: C.cyanBord }}>
          <p className="text-base font-medium leading-relaxed" style={{ color: C.muted }}>
            Sentinela gives you structured visibility into AI behavior — measurable, comparable, and actionable before issues escalate.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Detection / Metrics ──────────────────────────────────────────────────────

const METRICS = [
  { title: "Consistency score", description: "Measures how stable answers remain across semantically similar conversations and repeated scenarios.", value: "78%", valueColor: C.cyan, bars: [32,38,42,48,58,54,61,68,72,78] },
  { title: "Structural drift index", description: "Highlights when the response format, ordering, or answer pattern starts deviating from the expected baseline.", value: "0.34", valueColor: C.amber, bars: [18,24,20,28,26,34,31,37,33,40] },
  { title: "Cross-intent overlap", description: "Flags when different intents begin producing near-identical outputs and weaker task separation.", value: "18%", valueColor: C.red, bars: [55,51,48,45,39,35,30,26,22,18] },
  { title: "Token efficiency", description: "Estimates whether answer length is justified by useful content, instead of verbosity or duplication.", value: "62%", valueColor: C.green, bars: [24,28,34,39,44,49,53,56,60,62] },
  { title: "Behavioral volatility", description: "Detects unstable swings in tone, length, confidence, or structure between similar sessions.", value: "3 flags", valueColor: C.amber, bars: [12,14,26,18,32,22,41,29,36,24] },
  { title: "Alert density", description: "Shows how concentrated high-severity findings are in a run, helping prioritize the most fragile areas first.", value: "4 high", valueColor: C.red, bars: [8,12,15,19,25,22,31,29,36,40] },
];

function DetectionSection() {
  return (
    <section id="detection" className="py-20 sm:py-28 px-6 sm:px-8" style={{ background: "rgba(255,255,255,0.015)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionBadge>What Sentinela detects</SectionBadge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.text }}>
            From raw conversations to operational signal
          </h2>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: C.muted }}>
            Sentinela turns conversation history into measurable indicators your team can act on: instability, wasted spend, overlap, drift, and emerging risk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {METRICS.map((m) => (
            <div key={m.title} className="rounded-2xl border p-6 transition-all group"
              style={{ background: C.bgCard, borderColor: C.border }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: C.cyanBg, border: `1px solid ${C.cyanBord}` }}>
                  <svg className="w-5 h-5" style={{ color: C.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                </div>
                <span className="font-mono text-2xl font-bold" style={{ color: m.valueColor }}>{m.value}</span>
              </div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: C.text }}>{m.title}</h3>
              <p className="text-xs leading-relaxed min-h-[60px]" style={{ color: C.dim }}>{m.description}</p>
              {/* Mini bar chart */}
              <div className="mt-5">
                <div className="flex h-12 items-end gap-1">
                  {m.bars.map((bar, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-colors"
                      style={{ height: `${bar}%`, background: `${C.cyan}30` }} />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between" style={{ color: C.ghost }}>
                  <span className="text-[10px] uppercase tracking-widest font-semibold">Baseline</span>
                  <span className="text-[10px] uppercase tracking-widest font-semibold">Latest run</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Workflow / How It Works ──────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    icon: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5",
    title: "Upload your conversation dataset",
    description: "Export conversations from your AI platform in JSON or JSONL format. Sentinela needs no code integration — just data.",
  },
  {
    num: "02",
    icon: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
    title: "Sentinela runs the analysis engine",
    description: "The engine scores consistency, detects drift, maps intents, estimates cost-per-outcome, and surfaces risk in seconds.",
  },
  {
    num: "03",
    icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3",
    title: "Act on structured, prioritized findings",
    description: "Your decision cockpit shows what's degrading, what it costs, and which action will have the highest operational impact.",
  },
];

function WorkflowSection() {
  return (
    <section id="workflow" className="py-20 sm:py-28 px-6 sm:px-8" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionBadge>Workflow</SectionBadge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.text }}>
            From data to decision in minutes
          </h2>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: C.muted }}>
            No infrastructure setup. No code integration. Upload, analyze, act.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="rounded-2xl border p-7 group transition-all"
              style={{ background: C.bgCard, borderColor: C.border }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-colors"
                style={{ background: C.cyanBg, border: `1px solid ${C.cyanBord}` }}>
                <svg className="w-6 h-6" style={{ color: C.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <div className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: C.ghost }}>{s.num}</div>
              <h3 className="text-base font-semibold mb-3" style={{ color: C.text }}>{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: C.dim }}>{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────

const SECURITY_FEATURES = [
  {
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    title: "Data minimization mindset",
    desc: "The analysis flow is designed to limit unnecessary retention and keep handling scoped to what the diagnostic needs.",
  },
  {
    icon: "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    title: "Privacy-conscious review",
    desc: "Built for teams that need visibility into model behavior without treating conversation data casually.",
  },
  {
    icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
    title: "Access-aware product design",
    desc: "Authentication, environment separation, and protected application areas help keep analysis access controlled.",
  },
  {
    icon: "M2.25 21 8.954 15 12.954 19 21.75 3",
    title: "Enterprise-ready direction",
    desc: "Sentinela is being shaped for organizations that need governance discipline, not just a prettier dashboard.",
  },
];

function SecuritySection() {
  return (
    <section id="security" className="py-20 sm:py-28 px-6 sm:px-8" style={{ background: "rgba(255,255,255,0.015)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionBadge>Security</SectionBadge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.text }}>
            Security and trust matter<br />as much as detection
          </h2>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: C.muted }}>
            Observability for AI only works when teams can evaluate behavior with discipline around privacy, access, and how sensitive data is handled.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {SECURITY_FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl border p-6"
              style={{ background: C.bgCard, borderColor: C.border }}>
              <FeatureIcon path={f.icon} />
              <div>
                <h3 className="text-sm font-semibold mb-1.5" style={{ color: C.text }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.dim }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const EARLY_ACCESS_FEATURES = [
  "Full conversation analysis",
  "Behavioral diagnostics (3 axes)",
  "Critical alerts & highlights",
  "History and run comparison",
  "Full dashboard with export",
  "No credit card required",
];

function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-28 px-6 sm:px-8" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionBadge>Pricing</SectionBadge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: C.text }}>
            Free while we validate together
          </h2>
          <p className="text-lg" style={{ color: C.muted }}>
            Get full access during our early validation phase. No time limit. No credit card.
          </p>
        </div>

        <div className="max-w-lg mx-auto space-y-4">
          {/* Single plan card */}
          <div className="relative rounded-2xl border p-8 flex flex-col"
            style={{
              background: "rgba(34,211,238,0.04)",
              borderColor: C.cyanBord,
              boxShadow: "0 0 32px rgba(34,211,238,0.08)",
            }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: C.cyanBg, color: C.cyan, border: `1px solid ${C.cyanBord}` }}>
                Early Access
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "rgba(52,211,153,0.08)", color: C.green, border: "1px solid rgba(52,211,153,0.2)" }}>
                Free
              </span>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-5xl font-bold" style={{ color: C.text }}>$0</span>
              <span className="pb-1.5 text-sm" style={{ color: C.dim }}>for now</span>
            </div>
            <p className="text-sm mb-8" style={{ color: C.muted }}>Full platform access. No strings attached.</p>
            <ul className="space-y-3 mb-8 flex-1">
              {EARLY_ACCESS_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: C.muted }}>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: C.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/register">
              <Button className="w-full rounded-xl font-semibold h-11"
                style={{ background: C.cyan, color: C.bg }}>
                Start for free
              </Button>
            </Link>
          </div>

          {/* AION teaser */}
          <div className="rounded-2xl border p-6 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ background: C.bgCard, borderColor: C.border }}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(20,184,166,0.1)", color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)" }}>
                  Runtime Control
                </span>
              </div>
              <p className="text-sm" style={{ color: C.muted }}>
                Building at scale? <span style={{ color: C.text }}>AION</span> brings real-time AI governance — policy enforcement, smart routing, and cost control.
              </p>
            </div>
            <Link to="/aion" className="shrink-0">
              <Button variant="ghost" size="sm" className="rounded-xl whitespace-nowrap"
                style={{ color: "#14B8A6", border: "1px solid rgba(20,184,166,0.2)" }}>
                Explore AION →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-24 px-6 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(34,211,238,0.07) 0%, transparent 70%), #070C18" }}>
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight" style={{ color: C.text }}>
          Stop guessing.<br />Start measuring AI behavior.
        </h2>
        <p className="text-lg mb-10 leading-relaxed max-w-xl mx-auto" style={{ color: C.muted }}>
          Upload your first dataset in minutes. No infrastructure. No integrations. Just answers.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="rounded-xl font-semibold h-12 px-10 text-base"
              style={{ background: C.cyan, color: C.bg }}>
              Start for free
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="rounded-xl h-12 px-10 text-base"
              style={{ borderColor: "rgba(255,255,255,0.1)", color: C.muted }}>
              Sign in to workspace
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── LandingPage ──────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.text }}>
      <Navbar />
      <Hero />
      <ProblemSection />
      <DetectionSection />
      <WorkflowSection />
      <SecuritySection />
      <PricingSection />
      <FinalCTA />
      <footer className="h-14 flex items-center justify-center border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <p className="text-xs" style={{ color: C.ghost }}>Sentinela · Enterprise AI observability platform</p>
      </footer>
    </div>
  );
}
