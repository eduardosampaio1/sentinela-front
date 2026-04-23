import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// ─── Config ───────────────────────────────────────────────────────────────────

const WEB3FORMS_KEY = "a7974c9a-965a-4a9b-a29c-f982937d083a"; // https://web3forms.com/#start → paste key here

// ─── Design tokens (AION — aion-sim palette) ──────────────────────────────────

const A = {
  bg:         "#0B1120",
  surface:    "#141B2D",
  surfaceAlt: "#1A2236",
  border:     "#1E293B",
  primary:    "#14B8A6",   // teal
  cta:        "#0EA5E9",   // sky blue
  text:       "#E2E8F0",
  muted:      "#64748B",
  amber:      "#EAB308",
  nomos:      "#38BDF8",   // sky-400
  estixe:     "#2DD4BF",   // teal-400
  metis:      "#A78BFA",   // violet-400
  nemos:      "#EAB308",   // amber (learning engine)
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function Badge({ children, color = A.primary, bg }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-5"
      style={{
        background: bg ?? `${color}18`,
        borderColor: `${color}33`,
      }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="text-xs font-semibold" style={{ color }}>{children}</span>
    </div>
  );
}

function SectionHeading({ title, body, center = true }: { title: ReactNode; body?: string; center?: boolean }) {
  return (
    <div className={`max-w-3xl mb-14 ${center ? "mx-auto text-center" : ""}`}>
      {title}
      {body && <p className="text-lg leading-relaxed" style={{ color: A.muted }}>{body}</p>}
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 sm:px-8 border-b sticky top-0 z-40"
      style={{ background: `${A.bg}f0`, borderColor: A.border, backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${A.primary}18`, border: `1px solid ${A.primary}30` }}>
            <svg className="w-4 h-4" style={{ color: A.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold" style={{ color: A.text }}>Sentinela</span>
            <span style={{ color: A.border }}>·</span>
            <span className="text-sm font-bold" style={{ color: A.primary }}>AION</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {[
            { href: "#problem", label: "Why AION" },
            { href: "#modules", label: "Modules" },
            { href: "#integration", label: "Integration" },
            { href: "#contact", label: "Contact" },
          ].map(({ href, label }) => (
            <a key={href} href={href}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: A.muted }}
              onMouseEnter={e => { e.currentTarget.style.color = A.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = A.muted; }}>
              {label}
            </a>
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: A.border }} aria-hidden="true" />
          <Link to="/"
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: A.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = A.text)}
            onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
            ← Sentinela
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="rounded-xl" style={{ color: A.muted }}>
            Sign in
          </Button>
        </Link>
        <a href="#contact">
          <Button size="sm" className="rounded-xl font-semibold"
            style={{ background: A.cta, color: "#fff" }}>
            Request demo
          </Button>
        </a>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32 text-center"
      style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${A.primary}0f 0%, transparent 70%), ${A.bg}` }}>
      <div className="max-w-4xl mx-auto relative z-10">
        <Badge color={A.amber}>AI Control Plane — Runtime</Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
          style={{ color: A.text, fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
          The proxy that thinks<br />
          <span style={{ color: A.primary }}>before it lets through</span>
        </h1>
        <p className="text-lg sm:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: A.muted }}>
          AION sits between your app and any LLM — enforcing policy, routing intelligently, and learning from every request. OpenAI-compatible. Up in one day.
        </p>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {[
            { value: "1 day", label: "to integrate" },
            { value: "45%", label: "cost reduction" },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold tabular-nums"
                style={{ color: A.primary, fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" }}>
                {value}
              </span>
              <span className="text-xs mt-0.5" style={{ color: A.muted }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#contact">
            <Button size="lg" className="rounded-xl font-semibold h-12 px-10 text-base"
              style={{ background: A.cta, color: "#fff" }}>
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
        <SectionHeading
          title={<>
            <Badge color={A.primary}>Why it matters</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: A.text }}>
              You're flying blind at runtime
            </h2>
          </>}
          body="Batch analysis tells you what happened. AION controls what happens next — before any token leaves your boundary."
        />
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
              <h3 className="text-base font-semibold mb-2" style={{ color: A.text }}>{p.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: A.muted }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Modules (Bento Grid) ─────────────────────────────────────────────────────

const MODULES = [
  {
    key: "estixe",
    name: "ESTIXE",
    role: "Controls",
    tagline: "Guard the gate",
    color: A.estixe,
    span: "md:col-span-2",
    features: [
      "PII detection: CPF, CNPJ, RG, PIX, API keys",
      "Policy engine with automatic rollback",
      "Semantic intent classification",
      "Block / bypass / audit per policy",
      "PII action per tenant: allow / mask / block",
    ],
  },
  {
    key: "nomos",
    name: "NOMOS",
    role: "Decides",
    tagline: "Route with intelligence",
    color: A.nomos,
    span: "md:col-span-1",
    features: [
      "Multi-factor scoring: cost × fit × latency × risk",
      "Risk tier per model (low / medium / high)",
      "Configurable weights via env vars",
      "ScoreBreakdown in every response",
    ],
  },
  {
    key: "metis",
    name: "METIS",
    role: "Optimizes",
    tagline: "Compress, dial, deliver",
    color: A.metis,
    span: "md:col-span-1",
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
        <SectionHeading
          title={<>
            <Badge color={A.primary}>The engine</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: A.text }}>
              Three modules. One decision per request.
            </h2>
          </>}
          body="Each module runs independently. NEMOS feeds learned data back across all three — no cross-dependencies."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MODULES.map((mod) => (
            <div key={mod.key} className={`rounded-2xl border p-6 flex flex-col ${mod.span}`}
              style={{
                background: `linear-gradient(135deg, ${mod.color}0c 0%, ${A.surface} 100%)`,
                borderColor: `${mod.color}30`,
              }}>
              <div className="flex items-start justify-between mb-5">
                <div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full mr-2"
                    style={{ background: `${mod.color}18`, color: mod.color, border: `1px solid ${mod.color}30` }}>
                    {mod.role}
                  </span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1" style={{ color: mod.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                {mod.name}
              </h3>
              <p className="text-sm font-medium mb-5" style={{ color: A.muted }}>{mod.tagline}</p>
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
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── NEMOS ────────────────────────────────────────────────────────────────────

function NemosSection() {
  return (
    <section className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.surfaceAlt }}>
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl border p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center"
          style={{ background: A.surface, borderColor: `${A.nemos}30` }}>
          <div>
            <Badge color={A.nemos}>Learning Engine</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: A.text }}>
              NEMOS — gets smarter<br />with every request
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: A.muted }}>
              NEMOS is the shared brain. It feeds learned data back into each module — better routes, smarter bypasses, tighter compression. All per-tenant. All with guardrails.
            </p>
            <p className="text-sm" style={{ color: A.muted }}>
              No module depends on another — learning flows only through NEMOS. Each tenant builds its own model. One bad actor can't influence another.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "EMA half-life", value: "7 days" },
              { label: "Exploration budget", value: "5%" },
              { label: "Rollback", value: "Automatic" },
              { label: "Cooldown post-rollback", value: "Enforced" },
              { label: "LGPD erasure", value: "DELETE /v1/data/{tenant}" },
              { label: "ActuationGuard", value: "Active" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border p-4"
                style={{ background: A.surfaceAlt, borderColor: A.border }}>
                <p className="text-xs mb-1" style={{ color: A.muted }}>{label}</p>
                <p className="text-sm font-semibold"
                  style={{ color: A.nemos, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {value}
                </p>
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
        <SectionHeading
          title={<>
            <Badge color={A.primary}>Integration</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: A.text }}>
              Change one line. Get full control.
            </h2>
          </>}
          body="AION is 100% OpenAI-compatible. No SDK changes, no refactoring. Point your existing client at AION and every request passes through the control plane."
        />

        {/* Code diff */}
        <div className="rounded-2xl overflow-hidden border mb-10"
          style={{ background: "#0D1117", borderColor: A.border }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: A.border }}>
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs" style={{ color: A.muted, fontFamily: "monospace" }}>client.ts</span>
          </div>
          <div className="p-6 overflow-x-auto" style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace", fontSize: "0.875rem" }}>
            <div className="flex gap-3 py-1.5 px-3 -mx-3 mb-1"
              style={{ background: "rgba(239,68,68,0.08)", borderLeft: "2px solid #EF4444" }}>
              <span style={{ color: "#EF4444", userSelect: "none", flexShrink: 0 }}>-</span>
              <span style={{ color: "#94A3B8", whiteSpace: "pre" }}>
                {"const client = "}<span style={{ color: "#60A5FA" }}>new</span>{" "}<span style={{ color: "#34D399" }}>OpenAI</span>{"({ "}<span style={{ color: "#F59E0B" }}>baseURL</span>{": "}<span style={{ color: "#F87171" }}>{'"https://api.openai.com/v1"'}</span>{" });"}
              </span>
            </div>
            <div className="flex gap-3 py-1.5 px-3 -mx-3"
              style={{ background: "rgba(52,211,153,0.08)", borderLeft: "2px solid #34D399" }}>
              <span style={{ color: "#34D399", userSelect: "none", flexShrink: 0 }}>+</span>
              <span style={{ color: "#94A3B8", whiteSpace: "pre" }}>
                {"const client = "}<span style={{ color: "#60A5FA" }}>new</span>{" "}<span style={{ color: "#34D399" }}>OpenAI</span>{"({ "}<span style={{ color: "#F59E0B" }}>baseURL</span>{": "}<span style={{ color: "#86EFAC" }}>{'"https://your-aion.internal/v1"'}</span>{" });"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "Auth via header", desc: "Pass your API key as Bearer token. Tenant resolved automatically." },
            { title: "Tenant isolation", desc: "Each tenant's data, limits, and learning are fully separated." },
            { title: "Feature flags", desc: "Toggle any module on or off at runtime. PUT /v1/modules/{name}/toggle" },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-xl border p-5"
              style={{ background: A.surface, borderColor: A.border }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: A.text }}>{title}</h4>
              <p className="text-sm" style={{ color: A.muted }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── LLM Agnostic ─────────────────────────────────────────────────────────────

const PROVIDERS = [
  "OpenAI", "Azure OpenAI", "Anthropic", "Groq",
  "Together AI", "vLLM", "Ollama", "LM Studio",
];

function AgnosticSection() {
  return (
    <section className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.surface }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          title={<>
            <Badge color={A.primary}>Provider Agnostic</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: A.text }}>
              Works with any LLM.<br />Including yours.
            </h2>
          </>}
          body="If it has a /v1/chat/completions endpoint, AION controls it. Market models or your own on-premise AI — same URL pattern."
        />

        {/* Provider pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {PROVIDERS.map((p) => (
            <span key={p} className="px-4 py-2 rounded-full border text-sm font-medium"
              style={{ background: A.surfaceAlt, borderColor: A.border, color: A.text }}>
              {p}
            </span>
          ))}
        </div>

        {/* Enterprise callout */}
        <div className="rounded-2xl border p-6 sm:p-8 mb-8"
          style={{ background: `${A.amber}08`, borderColor: `${A.amber}25` }}>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${A.amber}18`, border: `1px solid ${A.amber}30` }}>
              <svg className="w-4 h-4" style={{ color: A.amber }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: A.amber }}>Your enterprise has its own AI?</p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: A.muted }}>
                The right question is: <span style={{ color: A.text }}>does it expose a <code style={{ fontFamily: "monospace", color: A.primary }}>/v1/chat/completions</code> endpoint?</span>
                <br />If yes — pass the URL. AION routes, controls, and monitors it like any other model. Data stays on-premise. <code style={{ fontFamily: "monospace", color: A.amber }}>risk_tier: high</code> applied automatically.
              </p>
              {/* Config example */}
              <div className="rounded-xl overflow-hidden border" style={{ background: "#0D1117", borderColor: A.border }}>
                <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: A.border }}>
                  <span className="text-xs" style={{ color: A.muted, fontFamily: "monospace" }}>.env</span>
                </div>
                <pre className="px-4 py-4 text-sm overflow-x-auto" style={{ fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace" }}>
                  <span style={{ color: A.muted }}># Point AION at your internal LLM</span>{"\n"}
                  <span style={{ color: "#38BDF8" }}>AION_DEFAULT_PROVIDER</span><span style={{ color: A.muted }}>=</span><span style={{ color: "#86EFAC" }}>internal</span>{"\n"}
                  <span style={{ color: "#38BDF8" }}>AION_DEFAULT_BASE_URL</span><span style={{ color: A.muted }}>=</span><span style={{ color: "#86EFAC" }}>http://llm.yourcompany.com:8000/v1</span>{"\n"}
                  <span style={{ color: "#38BDF8" }}>AION_DEFAULT_API_KEY</span><span style={{ color: A.muted }}>=</span><span style={{ color: "#86EFAC" }}>sk-xxx</span><span style={{ color: A.muted }}>  # or empty if no auth required</span>
                </pre>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm" style={{ color: A.muted }}>
          Native Gemini SDK and AWS Bedrock native formats are not supported. Any server speaking OpenAI-compatible format works immediately — no code changes.
        </p>
      </div>
    </section>
  );
}

// ─── Observability ────────────────────────────────────────────────────────────

const OBS_ITEMS = [
  { endpoint: "GET /metrics", desc: "Prometheus-compatible scrape endpoint" },
  { endpoint: "GET /v1/economics", desc: "Cost breakdown per tenant and per model" },
  { endpoint: "GET /v1/explain/{id}", desc: "Full decision explainability for any request" },
  { endpoint: "GET /v1/recommendations/{tenant}", desc: "NEMOS-generated optimization suggestions" },
  { endpoint: "SAFE_MODE", desc: "Kill switch with reason logged + state transition audit" },
  { endpoint: "DELETE /v1/data/{tenant}", desc: "LGPD right-to-erasure — purges all tenant data" },
];

function ObservabilitySection() {
  return (
    <section className="py-20 sm:py-24 px-6 sm:px-8" style={{ background: A.bg }}>
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          title={<>
            <Badge color={A.primary}>Observability</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: A.text }}>
              See everything.<br />Explain every decision.
            </h2>
          </>}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {OBS_ITEMS.map(({ endpoint, desc }) => (
            <div key={endpoint} className="flex gap-4 rounded-xl border p-5"
              style={{ background: A.surface, borderColor: A.border }}>
              <div className="flex-shrink-0">
                <code className="text-xs px-2 py-1 rounded-md"
                  style={{ background: `${A.primary}15`, color: A.primary, fontFamily: "monospace" }}>
                  {endpoint}
                </code>
              </div>
              <p className="text-sm" style={{ color: A.muted }}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm" style={{ color: A.muted }}>
          Operational runbooks included · Circuit breaker native · K8s-ready{" "}
          <code style={{ fontFamily: "monospace", color: A.primary }}>/ready</code> probe · 3 operation modes: Normal | Degraded | SAFE_MODE
        </p>
      </div>
    </section>
  );
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

type FormState = "idle" | "submitting" | "success" | "error";

function ContactSection() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      access_key: WEB3FORMS_KEY,
      subject: "AION Demo Request — Sentinela",
      from_name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      company: data.get("company"),
      team_size: data.get("team_size"),
      message: data.get("message"),
    };

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setState("success");
      } else {
        setErrorMsg(json.message ?? "Something went wrong. Please try again.");
        setState("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <section id="contact" className="py-20 sm:py-28 px-6 sm:px-8 relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse 60% 50% at 50% 100%, ${A.amber}0a 0%, transparent 70%), ${A.surface}` }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left — copy */}
          <div>
            <Badge color={A.amber}>Early Access</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: A.text }}>
              We're POC-ready<br />for your team
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: A.muted }}>
              We're opening the first slots for early adopters. If your team uses LLMs in production and wants more control, we want to talk.
            </p>
            <div className="space-y-4">
              {[
                "No infrastructure required — runs next to your stack",
                "OpenAI-compatible — no code changes on your side",
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

          {/* Right — form */}
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
                <p className="text-sm" style={{ color: A.muted }}>We'll be in touch within 48h. No sales pitch — just a technical conversation.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Name *</label>
                    <input id="name" name="name" type="text" required
                      className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{ background: A.surface, borderColor: A.border, color: A.text }}
                      onFocus={e => (e.currentTarget.style.borderColor = A.primary)}
                      onBlur={e => (e.currentTarget.style.borderColor = A.border)}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Email *</label>
                    <input id="email" name="email" type="email" required
                      className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{ background: A.surface, borderColor: A.border, color: A.text }}
                      onFocus={e => (e.currentTarget.style.borderColor = A.primary)}
                      onBlur={e => (e.currentTarget.style.borderColor = A.border)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Phone</label>
                    <input id="phone" name="phone" type="tel"
                      className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{ background: A.surface, borderColor: A.border, color: A.text }}
                      onFocus={e => (e.currentTarget.style.borderColor = A.primary)}
                      onBlur={e => (e.currentTarget.style.borderColor = A.border)}
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Company *</label>
                    <input id="company" name="company" type="text" required
                      className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors"
                      style={{ background: A.surface, borderColor: A.border, color: A.text }}
                      onFocus={e => (e.currentTarget.style.borderColor = A.primary)}
                      onBlur={e => (e.currentTarget.style.borderColor = A.border)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="team_size" className="block text-xs font-medium mb-1.5" style={{ color: A.muted }}>Team size</label>
                  <select id="team_size" name="team_size"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors cursor-pointer"
                    style={{ background: A.surface, borderColor: A.border, color: A.text }}>
                    <option value="">Select…</option>
                    <option value="1-10">1–10</option>
                    <option value="11-50">11–50</option>
                    <option value="51-200">51–200</option>
                    <option value="201-500">201–500</option>
                    <option value="500+">500+</option>
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
                {state === "error" && (
                  <p className="text-xs" style={{ color: "#F87171" }}>{errorMsg}</p>
                )}
                <Button type="submit" disabled={state === "submitting"}
                  className="w-full rounded-xl font-semibold h-11"
                  style={{ background: A.cta, color: "#fff", opacity: state === "submitting" ? 0.7 : 1 }}>
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
          <Link to="/" className="text-sm transition-colors hover:text-[#E2E8F0]" style={{ color: A.muted }}>
            ← Explore Sentinela — batch analysis
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── AionPage ─────────────────────────────────────────────────────────────────

export function AionPage() {
  return (
    <div className="min-h-screen" style={{ background: A.bg, color: A.text }}>
      <Navbar />
      <Hero />
      <ProblemSection />
      <ModulesSection />
      <NemosSection />
      <IntegrationSection />
      <AgnosticSection />
      <ObservabilitySection />
      <ContactSection />
      <footer className="h-14 flex items-center justify-center border-t" style={{ borderColor: A.border }}>
        <p className="text-xs" style={{ color: A.muted }}>Sentinela · AION — AI Control Plane · contato@baluarte.ia.br</p>
      </footer>
    </div>
  );
}
