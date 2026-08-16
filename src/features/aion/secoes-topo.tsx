// Herói, problema e métricas — o topo argumentativo da página.
//
// As três primeiras seções contam uma coisa só: o que o AION é, o que dói sem ele, e o tamanho do
// que ele mede. `PROBLEMS` e `METRIC_DATA` ficam privados: são dado de uma seção só.

import { InteractiveDemo } from "./DemoInterativa";
import { A, display } from "./tokens";
import { Badge, SectionLabel } from "./primitivos";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

export function Hero() {
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

export function ProblemSection() {
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

export function MetricsSection() {
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
