// Os módulos do AION, e o NEMOS.
//
// `MODULES` descreve os quatro módulos e `PII_TYPES` os tipos que o ESTIXE reconhece — dado de
// seção, privado por isso. `NemosSection` vem junto porque é o quinto módulo contado à parte.

import { ProxyFlowDiagram } from "./DiagramaDeFluxo";
import { A, display, mono } from "./tokens";
import { Badge } from "./primitivos";

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

export function ModulesSection() {
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

export function NemosSection() {
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
