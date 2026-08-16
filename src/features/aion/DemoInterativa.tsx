// A demonstração interativa do AION.
//
// Único bloco da página com ESTADO e temporizador: encena o proxy avaliando um pedido, fase a
// fase. Vive sozinho porque é o único que quebra por lógica, e não por copy.

import { A, mono } from "./tokens";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

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

export function InteractiveDemo() {
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
