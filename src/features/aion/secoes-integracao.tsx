// Integração, agnosticismo de provedor e observabilidade.
//
// As três seções que respondem "como isto entra no meu sistema". `IntegrationSection` contém o
// `min-w-0` que a M46 acrescentou — sem ele a página rolava 226px na horizontal no celular.

import { A, display, mono } from "./tokens";
import { Badge, SectionLabel } from "./primitivos";

export function IntegrationSection() {
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
          style={{ background: "hsl(var(--ds-surface-base))", borderColor: A.border }}>
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
              <span style={{ color: A.muted, whiteSpace: "pre" }}>
                {"const client = "}<span style={{ color: "#60A5FA" }}>new</span>{" "}<span style={{ color: "#34D399" }}>OpenAI</span>{"({ "}<span style={{ color: "#F59E0B" }}>baseURL</span>{": "}<span style={{ color: "#F87171" }}>{'"https://api.openai.com/v1"'}</span>{" });"}
              </span>
            </div>
            <div className="flex gap-3 py-1.5 px-3 -mx-3"
              style={{ background: `${A.primary}0d`, borderLeft: `2px solid ${A.primary}` }}>
              <span style={{ color: A.primary, userSelect: "none", flexShrink: 0 }}>+</span>
              <span style={{ color: A.muted, whiteSpace: "pre" }}>
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

export function AgnosticSection() {
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
              <div className="rounded-xl overflow-hidden border" style={{ background: "hsl(var(--ds-surface-base))", borderColor: A.border }}>
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

export function ObservabilitySection() {
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
