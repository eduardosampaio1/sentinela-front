import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { A, display, mono } from "./tokens";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Badge({ children, color = A.primary, bg }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-5"
      style={{ background: bg ?? `${color}18`, borderColor: `${color}33` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="text-xs font-semibold" style={{ color }}>{children}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: "11px", letterSpacing: "0.20em", fontWeight: 600, textTransform: "uppercase", color: A.muted, marginBottom: "12px" }}>
      {children}
    </p>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 sm:px-8 border-b sticky top-0 z-40"
      style={{ background: `${A.bg}f0`, borderColor: A.border, backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/sentinela-icon.svg" alt="" width="28" height="28" className="rounded-lg"
            style={{ boxShadow: `0 0 14px -6px ${A.primary}80` }} />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold" style={{ color: A.text, ...display }}>Sentinela</span>
            <span style={{ color: A.border }}>·</span>
            <span className="text-sm font-bold" style={{ color: A.primary, ...display }}>AION</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {[
            { href: "#problem",     label: "Why AION" },
            { href: "#modules",     label: "Modules" },
            { href: "#integration", label: "Integration" },
            { href: "#contact",     label: "Contact" },
          ].map(({ href, label }) => (
            <a key={href} href={href} className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: A.muted }}
              onMouseEnter={e => { e.currentTarget.style.color = A.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = A.muted; }}>
              {label}
            </a>
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: A.border }} aria-hidden="true" />
          <Link to="/" className="px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ color: A.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = A.text)}
            onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
            ← Sentinela
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="rounded-xl" style={{ color: A.muted }}>Sign in</Button>
        </Link>
        <a href="#contact">
          <Button size="sm" className="rounded-xl font-semibold" style={{ background: A.primary, color: A.bg }}>
            Request demo
          </Button>
        </a>
      </div>
    </header>
  );
}

// ─── Interactive demo ────────────────────────────────────────────────────────

const DEMO_CSS = `@keyframes fadeSlideIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`;

const SCENARIOS = [
  {
    id: "pii",
    label: "PII leak",
    accent: "#F87171",
    input: "Meu CPF é 123.456.789-00, pode me ajudar com minha conta?",
    steps: [
      { module: "Controls", tag: "BLOCKED", color: "#F87171", detail: "CPF detected — request blocked" },
    ],
    ms: "3",
  },
  {
    id: "cache",
    label: "Repeat query",
    accent: A.metis,
    input: "What is the capital of Brazil?",
    steps: [
      { module: "Controls",  tag: "PASS",   color: A.estixe, detail: "No violations found" },
      { module: "Optimizes", tag: "CACHED", color: A.metis,  detail: "Semantic match 94% — saved 0.003¢" },
    ],
    ms: "4",
  },
  {
    id: "route",
    label: "New request",
    accent: A.nomos,
    input: "Summarize this quarterly report and extract key KPIs.",
    steps: [
      { module: "Controls",  tag: "PASS",       color: A.estixe, detail: "Clean — no violations" },
      { module: "Decides",   tag: "ROUTED",      color: A.nomos,  detail: "→ gpt-4o-mini  (score 0.91)" },
      { module: "Optimizes", tag: "COMPRESSED",  color: A.metis,  detail: "Prompt −23% — 840→648 tokens" },
    ],
    ms: "11",
  },
];

type Phase = "idle" | "running" | "done";

function InteractiveDemo() {
  const [idx, setIdx]     = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function run(i: number) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setIdx(i);
    setPhase("running");
    setShown(0);
    SCENARIOS[i].steps.forEach((_, j) => {
      const t = setTimeout(() => {
        setShown(j + 1);
        if (j === SCENARIOS[i].steps.length - 1) setPhase("done");
      }, 380 * (j + 1));
      timers.current.push(t);
    });
  }

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const s = SCENARIOS[idx];

  return (
    <div className="max-w-xl mx-auto rounded-2xl overflow-hidden border text-left"
      style={{ background: "#0D1117", borderColor: `${A.primary}35`, boxShadow: `0 0 40px -8px ${A.primary}25` }}>
      <style>{DEMO_CSS}</style>

      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: A.border }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
        </div>
        <code className="text-xs ml-2 flex-1" style={{ color: A.muted, ...mono }}>
          POST aion.internal/v1/chat/completions
        </code>
        {phase === "done" && (
          <span className="text-xs font-semibold" style={{ color: A.primary, ...mono }}>{s.ms}ms</span>
        )}
      </div>

      {/* Scenario tabs */}
      <div className="flex gap-1 p-2 border-b" style={{ borderColor: A.border }}>
        {SCENARIOS.map((sc, i) => (
          <button key={sc.id}
            onClick={() => { setIdx(i); setPhase("idle"); setShown(0); timers.current.forEach(clearTimeout); }}
            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: idx === i ? `${sc.accent}18` : "transparent",
              color:      idx === i ? sc.accent : A.muted,
              border:     `1px solid ${idx === i ? `${sc.accent}30` : "transparent"}`,
            }}>
            {sc.label}
          </button>
        ))}
      </div>

      {/* Request content */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-xs mb-1.5" style={{ color: A.muted, ...mono }}>messages[0].content</p>
        <p className="text-xs leading-relaxed px-3 py-2 rounded-lg"
          style={{ color: "#94A3B8", background: `${A.primary}08`, border: `1px solid ${A.border}`, ...mono }}>
          "{s.input}"
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="px-4 pb-2 space-y-1.5" style={{ minHeight: "88px" }}>
        {phase === "idle" && (
          <p className="text-xs pt-2 pb-1" style={{ color: A.muted }}>
            Press <strong style={{ color: A.text }}>Run</strong> to simulate the request pipeline.
          </p>
        )}
        {phase === "running" && shown === 0 && (
          <div className="flex items-center gap-2 pt-2">
            <span className="inline-block w-3 h-3 rounded-full animate-pulse" style={{ background: A.primary }} />
            <span className="text-xs" style={{ color: A.muted }}>Entering pipeline…</span>
          </div>
        )}
        {s.steps.slice(0, shown).map((step, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
            style={{ background: `${step.color}0a`, border: `1px solid ${step.color}20`, animation: "fadeSlideIn .18s ease-out" }}>
            <span className="text-xs font-bold w-20 shrink-0" style={{ color: step.color, ...mono }}>{step.tag}</span>
            <span className="text-xs flex-1" style={{ color: A.muted }}>{step.detail}</span>
            <span className="text-xs shrink-0" style={{ color: A.muted, ...mono }}>{step.module}</span>
          </div>
        ))}
      </div>

      {/* Run button */}
      <div className="px-4 pb-4">
        <button onClick={() => run(idx)} disabled={phase === "running"}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all"
          style={{
            background: phase === "running" ? `${A.primary}50` : A.primary,
            color: A.bg,
            cursor: phase === "running" ? "not-allowed" : "pointer",
          }}>
          {phase === "running" ? "Running…" : "Run request →"}
        </button>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-20 sm:py-28"
      style={{
        background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${A.primary}14 0%, transparent 65%), ${A.bg}`,
        backgroundImage: `
          radial-gradient(ellipse 80% 60% at 50% -10%, ${A.primary}14 0%, transparent 65%),
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 48px 48px, 48px 48px",
      }}>
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <Badge color={A.amber}>AI Control Plane — Runtime</Badge>

        <h1 style={{ ...display, fontSize: "clamp(2.25rem, 5vw, 3.75rem)", fontWeight: 700, lineHeight: 1.1, marginBottom: "1.25rem", color: A.text }}>
          The proxy that thinks<br />
          <span style={{ color: A.primary }}>before it lets through</span>
        </h1>

        <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: A.muted }}>
          AION sits between your app and any LLM — enforcing policy, routing intelligently, and learning from every request. OpenAI-compatible. Up in one day.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <a href="#contact">
            <Button size="lg" className="rounded-xl font-semibold h-12 px-10 text-base"
              style={{ background: A.primary, color: A.bg }}>
              Request early access
            </Button>
          </a>
          <a href="#modules">
            <Button size="lg" variant="ghost" className="rounded-xl h-12 px-8 text-base"
              style={{ color: A.muted, border: `1px solid ${A.border}` }}>
              See how it works ↓
            </Button>
          </a>
        </div>

        <InteractiveDemo />
      </div>
    </section>
  );
}

// ─── Problem ──────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    title: "Unpredictable cost",
    desc: "Every request hits the LLM at full price. No cache, no routing, no control. Costs scale with traffic, not value.",
  },
  {
    icon: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
    title: "Sensitive data exposed",
    desc: "PII leaves your app boundary before you can inspect it. CPF, CNPJ, API keys — all heading straight to a third-party model.",
  },
  {
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z",
    title: "Zero runtime visibility",
    desc: "You see logs. You don't see decisions, routes, or risks. When something goes wrong at runtime, you're debugging blind.",
  },
];

function ProblemSection() {
  return (
    <section id="problem" className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.surface }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <SectionLabel>Why it matters</SectionLabel>
            <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, maxWidth: "400px", lineHeight: 1.15 }}>
              Flying blind<br />
              <span style={{ color: A.muted, fontWeight: 400 }}>at runtime</span>
            </h2>
          </div>
          <p style={{ maxWidth: "300px", color: A.muted, lineHeight: 1.75, fontSize: "0.9375rem" }}>
            Batch analysis tells you what happened. AION controls what happens next — before any token leaves your boundary.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-2xl border p-6"
              style={{ background: A.surfaceAlt, borderColor: A.border }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${A.primary}15`, border: `1px solid ${A.primary}25` }}>
                <svg className="w-5 h-5" style={{ color: A.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: A.text, ...display }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: A.muted }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

const METRIC_DATA = [
  { prefix: "<", value: 5,   suffix: "ms", label: "Proxy overhead",     sub: "p99 latency added",          color: A.primary },
  { prefix: "−", value: 30,  suffix: "%",  label: "LLM call reduction", sub: "via semantic cache",          color: A.metis   },
  { prefix: "",  value: 8,   suffix: "",   label: "PII types detected",  sub: "CPF · CNPJ · RG · PIX key…", color: A.estixe  },
  { prefix: "",  value: 100, suffix: "%",  label: "OpenAI compatible",   sub: "drop-in replacement",        color: A.nomos   },
];

function MetricsSection() {
  const [started, setStarted] = useState(false);
  const [counts, setCounts]   = useState(METRIC_DATA.map(() => 0));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); observer.disconnect(); } },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 1400;
    const start = Date.now();
    const tick = () => {
      const p    = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - (1 - p) ** 3;
      setCounts(METRIC_DATA.map(m => Math.round(m.value * ease)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started]);

  return (
    <section className="py-14 px-6 sm:px-8" style={{ background: A.bg, borderBottom: `1px solid ${A.border}` }}>
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {METRIC_DATA.map((m, i) => (
            <div key={m.label} className="text-center">
              <div className="font-bold mb-1.5 tabular-nums"
                style={{ ...display, fontSize: "clamp(2rem,4vw,3rem)", lineHeight: 1, color: m.color }}>
                {m.prefix}{counts[i]}{m.suffix}
              </div>
              <p className="text-sm font-semibold mb-0.5" style={{ color: A.text }}>{m.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: A.muted }}>{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Proxy flow animation ─────────────────────────────────────────────────────

const FLOW_CSS = `
  @keyframes dash-flow { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
  @keyframes dash-nemos { from { stroke-dashoffset: 16; } to { stroke-dashoffset: 0; } }
  @keyframes pkt-fade { 0%,100%{opacity:0} 15%,85%{opacity:1} }
  @keyframes node-glow { 0%,100%{opacity:.55} 50%{opacity:1} }
  @keyframes nemos-pulse { 0%,100%{filter:drop-shadow(0 0 6px #EAB30840)} 50%{filter:drop-shadow(0 0 14px #EAB30880)} }
  .dash-main  { stroke-dasharray:5 5; animation: dash-flow  .7s linear infinite; }
  .dash-nemos { stroke-dasharray:4 4; animation: dash-nemos 1.4s linear infinite; }
  .node-ctrl  { animation: node-glow 3s ease-in-out infinite 0s; }
  .node-dec   { animation: node-glow 3s ease-in-out infinite .8s; }
  .node-opt   { animation: node-glow 3s ease-in-out infinite 1.6s; }
  .nemos-box  { animation: nemos-pulse 2s ease-in-out infinite; }
`;

function ProxyFlowDiagram() {
  // viewBox: 760 × 210
  // Controls cx=145  Decides cx=380  Optimizes cx=615  Nemos cx=380,cy=168
  const box = (cx: number, cy: number, label: string, sub: string, color: string, cls: string) => (
    <g key={label} className={cls}>
      <rect x={cx - 72} y={cy - 26} width={144} height={52} rx={10}
        fill={`${color}12`} stroke={color} strokeWidth={1.2} strokeOpacity={.5} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
        style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', system-ui" }}>{label}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={A.muted}
        style={{ fontSize: "10px", fontFamily: "'Inter', system-ui" }}>{sub}</text>
    </g>
  );

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "#0C1528", borderColor: A.border }}>
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: A.border }}>
        <span className="text-xs font-semibold" style={{ color: A.muted, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Request flow
        </span>
        <span className="text-xs" style={{ color: A.muted }}>Every request · every token</span>
      </div>

      <svg viewBox="0 0 760 210" className="w-full" style={{ display: "block" }}>
        <style>{FLOW_CSS}</style>
        <defs>
          {/* Main horizontal path */}
          <path id="p-main"  d="M 16 80 H 744" />
          {/* NEMOS connections */}
          <path id="p-an"  d="M 145 106 C 145 145 308 168 308 168" />
          <path id="p-bn"  d="M 380 106 V 142" />
          <path id="p-cn"  d="M 615 106 C 615 145 452 168 452 168" />
          <path id="p-na"  d="M 308 168 C 308 168 145 145 145 106" />
          <path id="p-nb"  d="M 380 142 V 106" />
          <path id="p-nc"  d="M 452 168 C 452 168 615 145 615 106" />
          {/* Arrowhead */}
          <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={A.primary} opacity=".5"/>
          </marker>
        </defs>

        {/* ── Track lines ─────────────────────────────────── */}
        {/* Horizontal segments */}
        <line x1="16" y1="80" x2="73" y2="80" stroke={A.estixe} strokeWidth="1" strokeOpacity=".2"/>
        <line x1="217" y1="80" x2="308" y2="80" stroke={A.estixe} strokeWidth="1" strokeOpacity=".2" className="dash-main"/>
        <line x1="452" y1="80" x2="543" y2="80" stroke={A.nomos}  strokeWidth="1" strokeOpacity=".2" className="dash-main" style={{ animationDelay: "-.3s" }}/>
        <line x1="687" y1="80" x2="744" y2="80" stroke={A.metis}  strokeWidth="1" strokeOpacity=".2"/>

        {/* Animated flowing arrows between modules */}
        <line x1="217" y1="80" x2="308" y2="80" stroke={A.estixe} strokeWidth="1.5" strokeOpacity=".7" className="dash-main"/>
        <line x1="452" y1="80" x2="543" y2="80" stroke={A.nomos}  strokeWidth="1.5" strokeOpacity=".7" className="dash-main" style={{ animationDelay: "-.3s" }}/>

        {/* NEMOS connection tracks */}
        <path d="M 145 106 C 145 145 308 168 308 168" fill="none" stroke={A.nemos} strokeWidth="1" strokeOpacity=".15"/>
        <path d="M 380 106 V 142" fill="none" stroke={A.nemos} strokeWidth="1" strokeOpacity=".15"/>
        <path d="M 615 106 C 615 145 452 168 452 168" fill="none" stroke={A.nemos} strokeWidth="1" strokeOpacity=".15"/>
        {/* NEMOS animated feeds */}
        <path d="M 145 106 C 145 145 308 168 308 168" fill="none" stroke={A.nemos} strokeWidth="1.5" strokeOpacity=".5" className="dash-nemos"/>
        <path d="M 380 106 V 142"                     fill="none" stroke={A.nemos} strokeWidth="1.5" strokeOpacity=".5" className="dash-nemos" style={{ animationDelay: "-.5s" }}/>
        <path d="M 615 106 C 615 145 452 168 452 168" fill="none" stroke={A.nemos} strokeWidth="1.5" strokeOpacity=".5" className="dash-nemos" style={{ animationDelay: "-1s" }}/>
        {/* Feedback up */}
        <path d="M 308 168 C 308 168 145 145 145 106" fill="none" stroke={A.nemos} strokeWidth="1"   strokeOpacity=".3" className="dash-nemos" style={{ animationDelay: "-2s" }}/>
        <path d="M 452 168 C 452 168 615 145 615 106" fill="none" stroke={A.nemos} strokeWidth="1"   strokeOpacity=".3" className="dash-nemos" style={{ animationDelay: "-2.8s" }}/>

        {/* ── Moving packets on main flow ──────────────────── */}
        {[0, 0.9, 1.8].map((delay, i) => (
          <circle key={i} r="5" fill={A.primary} opacity="0">
            <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${delay}s`} calcMode="linear">
              <mpath href="#p-main"/>
            </animateMotion>
            <animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" begin={`${delay}s`}
              values="0;0;1;1;0;0" keyTimes="0;0.05;0.1;0.88;0.95;1"/>
          </circle>
        ))}

        {/* NEMOS downward packets (learning capture) */}
        {([["#p-an", 0], ["#p-bn", 1.1], ["#p-cn", 2.2]] as [string, number][]).map(([path, delay]) => (
          <circle key={path} r="3.5" fill={A.nemos} opacity="0">
            <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${delay}s`} calcMode="linear">
              <mpath href={path}/>
            </animateMotion>
            <animate attributeName="opacity" dur="3.5s" repeatCount="indefinite" begin={`${delay}s`}
              values="0;0;0.9;0.9;0;0" keyTimes="0;0.05;0.15;0.85;0.95;1"/>
          </circle>
        ))}

        {/* NEMOS feedback packets (going up) */}
        {([["#p-na", 1.8], ["#p-nb", 2.4], ["#p-nc", 3.0]] as [string, number][]).map(([path, delay]) => (
          <circle key={path + "r"} r="3" fill={A.nemos} opacity="0">
            <animateMotion dur="3.5s" repeatCount="indefinite" begin={`${delay}s`} calcMode="linear">
              <mpath href={path}/>
            </animateMotion>
            <animate attributeName="opacity" dur="3.5s" repeatCount="indefinite" begin={`${delay}s`}
              values="0;0;0.6;0.6;0;0" keyTimes="0;0.05;0.15;0.85;0.95;1"/>
          </circle>
        ))}

        {/* ── Module nodes ─────────────────────────────────── */}
        {/* Input label */}
        <text x="8" y="75" fill={A.muted} style={{ fontSize: "9px", fontFamily: "'Inter', system-ui" }}>Request</text>

        {box(145, 80, "Controls",  "Guard the gate",          A.estixe, "node-ctrl")}
        {box(380, 80, "Decides",   "Route intelligently",     A.nomos,  "node-dec")}
        {box(615, 80, "Optimizes", "Compress & cache",        A.metis,  "node-opt")}

        {/* NEMOS node */}
        <g className="nemos-box">
          <rect x={308} y={142} width={144} height={52} rx={10}
            fill={`${A.nemos}10`} stroke={A.nemos} strokeWidth={1.2} strokeOpacity={.4}/>
          <text x="380" y="163" textAnchor="middle" fill={A.nemos}
            style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Inter', system-ui" }}>Learning Engine</text>
          <text x="380" y="179" textAnchor="middle" fill={A.muted}
            style={{ fontSize: "10px", fontFamily: "'Inter', system-ui" }}>Learns from every request</text>
        </g>

        {/* Output label */}
        <text x="695" y="75" fill={A.muted} style={{ fontSize: "9px", fontFamily: "'Inter', system-ui" }}>LLM</text>
      </svg>
    </div>
  );
}

// ─── Modules ──────────────────────────────────────────────────────────────────

const PII_TYPES = ["CPF", "CNPJ", "RG", "PIX key", "API key", "Phone", "Email", "Card number"];

const MODULES = [
  {
    key: "estixe",
    role: "Controls",
    tagline: "Guard the gate",
    color: A.estixe,
    wide: true,
    iconPath: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
    features: [
      "Policy engine with automatic rollback",
      "Semantic intent classification",
      "Block / bypass / audit per policy",
      "PII action per tenant: allow / mask / block",
    ],
  },
  {
    key: "nomos",
    role: "Decides",
    tagline: "Route with intelligence",
    color: A.nomos,
    wide: false,
    iconPath: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
    features: [
      "Multi-factor scoring: cost × fit × latency × risk",
      "Risk tier per model (low / medium / high)",
      "Configurable weights via env vars",
      "ScoreBreakdown in every response",
    ],
  },
  {
    key: "metis",
    role: "Optimizes",
    tagline: "Compress, dial, deliver",
    color: A.metis,
    wide: false,
    iconPath: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    features: [
      "Prompt compression & filler removal",
      "Behavior Dial: temperature / top_p / max_tokens",
      "Semantic cache (20–30% LLM call reduction)",
      "Rule-based rewriting — intent preserved",
    ],
  },
];

function ModulesSection() {
  return (
    <section id="modules" className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.bg }}>
      <div className="max-w-6xl mx-auto">

        <div className="max-w-3xl mx-auto text-center mb-10">
          <Badge color={A.primary}>The engine</Badge>
          <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, marginBottom: "0.75rem", lineHeight: 1.15 }}>
            Three modules.<br />
            <span style={{ color: A.muted, fontWeight: 400 }}>One decision per request.</span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: A.muted }}>
            Controls guards, Decides routes, Optimizes compresses. Each independent. All coordinated by the Learning Engine.
          </p>
        </div>

        {/* Flow animation */}
        <div className="mb-10">
          <ProxyFlowDiagram />
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MODULES.map((mod) => (
            <div key={mod.key}
              className={`rounded-2xl border p-6 flex flex-col ${mod.wide ? "md:col-span-2" : ""}`}
              style={{
                background: `linear-gradient(135deg, ${mod.color}0d 0%, ${A.surface} 100%)`,
                borderColor: `${mod.color}30`,
                boxShadow: `0 0 0 1px ${mod.color}10`,
              }}>
              {mod.wide ? (
                <div className="flex gap-8 items-start h-full">
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}30` }}>
                      <svg className="w-5 h-5" style={{ color: mod.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={mod.iconPath} />
                      </svg>
                    </div>
                    <h3 style={{ ...display, fontSize: "1.125rem", fontWeight: 600, color: mod.color, marginBottom: "3px" }}>{mod.role}</h3>
                    <p className="text-sm mb-5" style={{ color: A.muted }}>{mod.tagline}</p>
                    <ul className="space-y-2.5 flex-1">
                      {mod.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: A.muted }}>
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: mod.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="w-48 xl:w-56 shrink-0">
                    <p style={{ ...mono, fontSize: "10px", color: A.muted, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                      PII Detection
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PII_TYPES.map((type) => (
                        <span key={type} className="text-xs px-2 py-1 rounded-md font-medium"
                          style={{ background: `${mod.color}12`, color: mod.color, border: `1px solid ${mod.color}25` }}>
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${mod.color}15`, border: `1px solid ${mod.color}30` }}>
                    <svg className="w-5 h-5" style={{ color: mod.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={mod.iconPath} />
                    </svg>
                  </div>
                  <h3 style={{ ...display, fontSize: "1.125rem", fontWeight: 600, color: mod.color, marginBottom: "3px" }}>{mod.role}</h3>
                  <p className="text-sm mb-5" style={{ color: A.muted }}>{mod.tagline}</p>
                  <ul className="space-y-2.5 flex-1">
                    {mod.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: A.muted }}>
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: mod.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Learning Engine ──────────────────────────────────────────────────────────

function NemosSection() {
  return (
    <section className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.surfaceAlt }}>
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl border p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
          style={{ background: A.surface, borderColor: `${A.nemos}30`, boxShadow: `0 0 40px -16px ${A.nemos}20` }}>
          <div>
            <Badge color={A.nemos}>Learning Engine</Badge>
            <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, marginBottom: "1rem", lineHeight: 1.15 }}>
              Gets smarter<br />
              <span style={{ color: A.muted, fontWeight: 400 }}>with every request</span>
            </h2>
            <p className="text-base leading-relaxed mb-4" style={{ color: A.muted }}>
              The Learning Engine feeds back into each module — better routes, smarter bypasses, tighter compression. All per-tenant. All with guardrails.
            </p>
            <p className="text-sm" style={{ color: A.muted }}>
              No module depends on another — learning flows only through the engine. Each tenant builds its own model. One bad actor can't influence another.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "EMA half-life",         value: "7 days" },
              { label: "Exploration budget",     value: "5%" },
              { label: "Rollback",               value: "Automatic" },
              { label: "Cooldown post-rollback", value: "Enforced" },
              { label: "LGPD erasure",           value: "DELETE /v1/data/{tenant}" },
              { label: "ActuationGuard",         value: "Active" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border p-4"
                style={{ background: A.surfaceAlt, borderColor: A.border }}>
                <p className="text-xs mb-1" style={{ color: A.muted }}>{label}</p>
                <p className="text-sm font-semibold" style={{ ...mono, color: A.nemos }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Integration ──────────────────────────────────────────────────────────────

function IntegrationSection() {
  return (
    <section id="integration" className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.bg }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <SectionLabel>Integration</SectionLabel>
            <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, maxWidth: "400px", lineHeight: 1.15 }}>
              Change one line.<br />
              <span style={{ color: A.muted, fontWeight: 400 }}>Get full control.</span>
            </h2>
          </div>
          <p style={{ maxWidth: "300px", color: A.muted, lineHeight: 1.75, fontSize: "0.9375rem" }}>
            100% OpenAI-compatible. No SDK changes. Point your existing client at AION and every request passes through the control plane.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border mb-10"
          style={{ background: "#0D1117", borderColor: A.border }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: A.border }}>
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs" style={{ color: A.muted, ...mono }}>client.ts</span>
          </div>
          <div className="p-6 overflow-x-auto" style={{ ...mono, fontSize: "0.875rem" }}>
            <div className="flex gap-3 py-1.5 px-3 -mx-3 mb-1"
              style={{ background: "rgba(239,68,68,0.08)", borderLeft: "2px solid #EF4444" }}>
              <span style={{ color: "#EF4444", userSelect: "none", flexShrink: 0 }}>-</span>
              <span style={{ color: "#94A3B8", whiteSpace: "pre" }}>
                {"const client = "}<span style={{ color: "#60A5FA" }}>new</span>{" "}<span style={{ color: "#34D399" }}>OpenAI</span>{"({ "}<span style={{ color: "#F59E0B" }}>baseURL</span>{": "}<span style={{ color: "#F87171" }}>{'"https://api.openai.com/v1"'}</span>{" });"}
              </span>
            </div>
            <div className="flex gap-3 py-1.5 px-3 -mx-3"
              style={{ background: `${A.primary}0d`, borderLeft: `2px solid ${A.primary}` }}>
              <span style={{ color: A.primary, userSelect: "none", flexShrink: 0 }}>+</span>
              <span style={{ color: "#94A3B8", whiteSpace: "pre" }}>
                {"const client = "}<span style={{ color: "#60A5FA" }}>new</span>{" "}<span style={{ color: "#34D399" }}>OpenAI</span>{"({ "}<span style={{ color: "#F59E0B" }}>baseURL</span>{": "}<span style={{ color: "#86EFAC" }}>{'"https://your-aion.internal/v1"'}</span>{" });"}
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute pointer-events-none"
            style={{ top: "2rem", left: "calc(33.3% + 1.5rem)", right: "calc(33.3% + 1.5rem)", height: 1, borderTop: `1px dashed ${A.primary}40` }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: 1, title: "Auth via header",   desc: "Pass your API key as Bearer token. Tenant resolved automatically." },
              { n: 2, title: "Tenant isolation",  desc: "Each tenant's data, limits, and learning are fully separated." },
              { n: 3, title: "Feature flags",     desc: "Toggle any module on or off at runtime. PUT /v1/modules/{name}/toggle" },
            ].map(({ n, title, desc }) => (
              <div key={n} className="rounded-xl border p-5" style={{ background: A.surface, borderColor: A.border }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: `${A.primary}18`, color: A.primary, border: `1px solid ${A.primary}30` }}>
                    {n}
                  </span>
                  <h4 className="text-sm font-semibold" style={{ color: A.text, ...display }}>{title}</h4>
                </div>
                <p className="text-sm" style={{ color: A.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Provider agnostic ────────────────────────────────────────────────────────

const PROVIDERS = ["OpenAI", "Azure OpenAI", "Anthropic", "Groq", "Together AI", "vLLM", "Ollama", "LM Studio"];

function AgnosticSection() {
  return (
    <section className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.surface }}>
      <div className="max-w-5xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge color={A.primary}>Provider Agnostic</Badge>
          <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, marginBottom: "0.75rem", lineHeight: 1.15 }}>
            Works with any LLM.<br />
            <span style={{ color: A.muted, fontWeight: 400 }}>Including yours.</span>
          </h2>
          <p className="text-base leading-relaxed" style={{ color: A.muted }}>
            If it has a /v1/chat/completions endpoint, AION controls it.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {PROVIDERS.map((p) => (
            <span key={p} className="px-4 py-2 rounded-full border text-sm font-medium"
              style={{ background: A.surfaceAlt, borderColor: A.border, color: A.text }}>
              {p}
            </span>
          ))}
        </div>

        <div className="rounded-2xl border p-6 sm:p-8"
          style={{ background: `${A.amber}08`, borderColor: `${A.amber}25` }}>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${A.amber}18`, border: `1px solid ${A.amber}30` }}>
              <svg className="w-4 h-4" style={{ color: A.amber }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            {/* M46 `min-w-0`: sem ele a página ROLA 226px no celular (flex não encolhe abaixo da
                palavra mais longa — aqui, `/v1/chat/completions`). */}
            <div className="min-w-0">
              <p className="text-sm font-semibold mb-1" style={{ color: A.amber }}>Your enterprise has its own AI?</p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: A.muted }}>
                Does it expose a <code style={{ ...mono, color: A.primary }}>/v1/chat/completions</code> endpoint?
                If yes — pass the URL. AION routes, controls, and monitors it. Data stays on-premise.{" "}
                <code style={{ ...mono, color: A.amber }}>risk_tier: high</code> applied automatically.
              </p>
              <div className="rounded-xl overflow-hidden border" style={{ background: "#0D1117", borderColor: A.border }}>
                <div className="px-4 py-2 border-b" style={{ borderColor: A.border }}>
                  <span className="text-xs" style={{ color: A.muted, ...mono }}>.env</span>
                </div>
                <pre className="px-4 py-4 text-sm overflow-x-auto" style={{ ...mono }}>
                  <span style={{ color: A.muted }}># Point AION at your internal LLM</span>{"\n"}
                  <span style={{ color: "#38BDF8" }}>AION_DEFAULT_PROVIDER</span><span style={{ color: A.muted }}>=</span><span style={{ color: "#86EFAC" }}>internal</span>{"\n"}
                  <span style={{ color: "#38BDF8" }}>AION_DEFAULT_BASE_URL</span><span style={{ color: A.muted }}>=</span><span style={{ color: "#86EFAC" }}>http://llm.yourcompany.com:8000/v1</span>{"\n"}
                  <span style={{ color: "#38BDF8" }}>AION_DEFAULT_API_KEY</span><span style={{ color: A.muted }}>=</span><span style={{ color: "#86EFAC" }}>sk-xxx</span>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Observability ────────────────────────────────────────────────────────────

const OBS_ITEMS = [
  { endpoint: "GET /metrics",                   desc: "Prometheus-compatible scrape endpoint" },
  { endpoint: "GET /v1/economics",              desc: "Cost breakdown per tenant and per model" },
  { endpoint: "GET /v1/explain/{id}",           desc: "Full decision explainability for any request" },
  { endpoint: "GET /v1/recommendations/{t}",    desc: "Learning Engine-generated optimization suggestions" },
  { endpoint: "SAFE_MODE",                      desc: "Kill switch with reason logged + state transition audit" },
  { endpoint: "DELETE /v1/data/{tenant}",       desc: "LGPD right-to-erasure — purges all tenant data" },
];

function ObservabilitySection() {
  return (
    <section className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.bg }}>
      <div className="max-w-5xl mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge color={A.primary}>Observability</Badge>
          <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, marginBottom: "0.75rem", lineHeight: 1.15 }}>
            See everything.<br />
            <span style={{ color: A.muted, fontWeight: 400 }}>Explain every decision.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {OBS_ITEMS.map(({ endpoint, desc }) => (
            <div key={endpoint} className="flex gap-4 rounded-xl border p-5"
              style={{ background: A.surface, borderColor: A.border }}>
              <code className="text-xs px-2 py-1 rounded-md self-start shrink-0"
                style={{ background: `${A.primary}15`, color: A.primary, ...mono }}>
                {endpoint}
              </code>
              <p className="text-sm" style={{ color: A.muted }}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm" style={{ color: A.muted }}>
          Operational runbooks · Circuit breaker native · K8s{" "}
          <code style={{ ...mono, color: A.primary }}>/ready</code> probe · Normal | Degraded | SAFE_MODE
        </p>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────

type FormState = "idle" | "submitting" | "success" | "error";

const WEB3FORMS_KEY = "a7974c9a-965a-4a9b-a29c-f982937d083a";

function ContactSection() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: "AION Demo Request — Sentinela",
          from_name: data.get("name"), email: data.get("email"),
          phone: data.get("phone"), company: data.get("company"),
          team_size: data.get("team_size"), message: data.get("message"),
        }),
      });
      const json = await res.json();
      // M46: era ternário usado como comando, com vírgula-operador no ramo do erro.
      if (json.success) setState("success");
      else { setErrorMsg(json.message ?? "Try again."); setState("error"); }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  const field = (id: string, label: string, type = "text", required = false) => (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>
        {label}{required && " *"}
      </label>
      <input id={id} name={id} type={type} required={required}
        className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
        style={{ background: A.surface, borderColor: A.border, color: A.text }}
        onFocus={e => (e.currentTarget.style.borderColor = A.primary)}
        onBlur={e => (e.currentTarget.style.borderColor = A.border)}
      />
    </div>
  );

  return (
    <section id="contact" className="py-20 sm:py-28 px-6 sm:px-8 relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse 60% 50% at 50% 100%, ${A.amber}09 0%, transparent 70%), ${A.surface}` }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <Badge color={A.amber}>Early Access</Badge>
            <h2 style={{ ...display, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600, color: A.text, marginBottom: "1rem", lineHeight: 1.15 }}>
              POC-ready<br />
              <span style={{ color: A.muted, fontWeight: 400 }}>for your team</span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: A.muted }}>
              First slots for early adopters are open. If your team runs LLMs in production and wants more control, let's talk.
            </p>
            <div className="space-y-4">
              {[
                "No infrastructure required — runs next to your stack",
                "OpenAI-compatible — no code changes",
                "Integration guide + runbooks included",
                "Your data never leaves your environment",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: A.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-sm" style={{ color: A.muted }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-6 sm:p-8" style={{ background: A.bg, borderColor: A.border }}>
            {state === "success" ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${A.primary}18`, border: `1px solid ${A.primary}30` }}>
                  <svg className="w-6 h-6" style={{ color: A.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: A.text }}>Message sent!</h3>
                <p className="text-sm" style={{ color: A.muted }}>We'll be in touch within 48h.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("name", "Name", "text", true)}
                  {field("email", "Email", "email", true)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("phone", "Phone", "tel")}
                  {field("company", "Company", "text", true)}
                </div>
                <div>
                  <label htmlFor="team_size" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Team size</label>
                  <select id="team_size" name="team_size"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
                    style={{ background: A.surface, borderColor: A.border, color: A.text }}>
                    <option value="">Select…</option>
                    {["1–10", "11–50", "51–200", "201–500", "500+"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Message</label>
                  <textarea id="message" name="message" rows={4}
                    defaultValue="I'd like to learn more about AION for our team."
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors resize-none"
                    style={{ background: A.surface, borderColor: A.border, color: A.text }}
                    onFocus={e => { e.currentTarget.style.borderColor = A.primary; }}
                    onBlur={e => { e.currentTarget.style.borderColor = A.border; }}
                  />
                </div>
                {state === "error" && <p className="text-xs" style={{ color: "#F87171" }}>{errorMsg}</p>}
                <Button type="submit" disabled={state === "submitting"}
                  className="w-full rounded-xl font-semibold h-11"
                  style={{ background: A.primary, color: A.bg, opacity: state === "submitting" ? 0.7 : 1 }}>
                  {state === "submitting" ? "Sending…" : "Send request"}
                </Button>
                <p className="text-xs text-center" style={{ color: A.muted }}>
                  We'll respond within 48h. No sales pitch — just a technical conversation.
                </p>
              </form>
            )}
          </div>
        </div>
        <div className="mt-12 text-center">
          <Link to="/" className="text-sm transition-colors" style={{ color: A.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = A.text)}
            onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
            ← Explore Sentinela — batch analysis
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t" style={{ background: A.bg, borderColor: A.border }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/sentinela-icon.svg" alt="" width="26" height="26" className="rounded-md" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold" style={{ color: A.text, ...display }}>Sentinela</span>
                <span style={{ color: A.border }}>·</span>
                <span className="text-sm font-bold" style={{ color: A.primary, ...display }}>AION</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: A.muted, maxWidth: "200px" }}>
              AI Control Plane for production teams. Runtime policy, routing, and learning — in one proxy.
            </p>
          </div>

          {[
            {
              title: "Product",
              links: [
                { label: "Why AION", href: "#problem" },
                { label: "Modules",  href: "#modules" },
                { label: "Integration", href: "#integration" },
                { label: "Observability", href: "#contact" },
              ],
            },
            {
              title: "Engine",
              links: [
                { label: "Controls",         href: "#modules", color: A.estixe },
                { label: "Decides",          href: "#modules", color: A.nomos  },
                { label: "Optimizes",        href: "#modules", color: A.metis  },
                { label: "Learning Engine",  href: "#modules", color: A.nemos  },
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: A.muted, letterSpacing: "0.14em" }}>{title}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, href, color }) => (
                  <li key={label}>
                    <a href={href} className="text-sm transition-colors inline-flex items-center gap-1.5" style={{ color: A.muted }}
                      onMouseEnter={e => (e.currentTarget.style.color = A.text)}
                      onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
                      {color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: A.muted, letterSpacing: "0.14em" }}>Platform</p>
            <ul className="space-y-2.5 mb-6">
              {[{ label: "Sentinela", to: "/" }, { label: "Get started", to: "/register" }, { label: "Sign in", to: "/login" }].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm transition-colors" style={{ color: A.muted }}
                    onMouseEnter={e => (e.currentTarget.style.color = A.text)}
                    onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: A.muted, letterSpacing: "0.14em" }}>Legal</p>
            <ul className="space-y-2">
              {[{ label: "Privacy", to: "/privacy" }, { label: "Terms", to: "/terms" }, { label: "Security", to: "/security" }].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm transition-colors" style={{ color: A.muted }}
                    onMouseEnter={e => (e.currentTarget.style.color = A.text)}
                    onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t" style={{ borderColor: A.border }}>
          <span className="text-xs" style={{ color: A.muted }}>© {year} Baluarte Tecnologia. All rights reserved.</span>
          <span className="text-xs" style={{ color: A.muted }}>contato@baluarte.ia.br</span>
        </div>
      </div>
    </footer>
  );
}

// ─── AionPage ─────────────────────────────────────────────────────────────────

export function AionPage() {
  return (
    <div className="min-h-screen" style={{ background: A.bg, color: A.text }}>
      <Navbar />
      {/* M46: faltava o landmark de conteúdo — sem ele não há "pular para o conteúdo". */}
      <main>
        <Hero />
        <ProblemSection />
        <MetricsSection />
        <ModulesSection />
        <NemosSection />
        <IntegrationSection />
        <AgnosticSection />
        <ObservabilitySection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
