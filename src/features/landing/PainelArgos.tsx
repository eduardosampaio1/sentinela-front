// O painel ARGOS simulado do herói da landing.
//
// É o maior bloco visual da página (~145 linhas) e é PURA ilustração: dado fixo, sem rede. Vive
// sozinho porque é o que mais muda quando o produto muda de cara, e o que menos precisa ser lido
// por quem está mexendo em copy de seção.

import { C, display, mono } from "./tokens";
import { GlowDot, Sparkline, Tag } from "./primitivos";

const HERO_SPARK = [44, 51, 57, 63, 69, 74, 71, 68, 65, 67, 70, 68, 64, 67, 72];
const HERO_BARS  = [28, 34, 40, 46, 54, 50, 58, 63, 69, 72];

export function ARGOSPanel({ score }: { score: number }) {
  return (
    <div className="relative" style={{ padding: "28px 36px 20px 12px" }}>
      {/* Floating score card — top left */}
      <div
        className="absolute top-0 left-0 rounded-xl p-3 w-40 z-20"
        style={{
          background: "rgba(9,9,11,0.96)",
          boxShadow: `rgba(255,255,255,0.08) 0px 0px 0px 1px, 0 8px 32px -8px rgba(0,0,0,0.6), 0 0 20px -8px rgba(39,166,68,0.15)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.13em", textTransform: "uppercase", color: C.ghost, marginBottom: 4 }}>Consistency</div>
        <div className="flex items-end gap-1.5">
          <span style={{ ...mono, fontSize: "22px", fontWeight: 700, color: C.green, lineHeight: 1 }}>78%</span>
          <span style={{ ...mono, fontSize: "9px", color: C.green, paddingBottom: 2 }}>↑ +4%</span>
        </div>
        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div style={{ width: "78%", height: "100%", borderRadius: 999, background: C.green, opacity: 0.7 }} />
        </div>
      </div>

      {/* Main panel */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          boxShadow: `rgba(255,255,255,0.09) 0px 0px 0px 1px, 0 0 60px -20px rgba(94,106,210,0.18), 0 40px 80px -30px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`,
          background: "linear-gradient(145deg, rgba(15,16,17,0.98), rgba(9,9,11,0.99))",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${C.accentBr}aa, transparent)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2.5">
            <GlowDot color={C.accentBr} />
            <span style={{ ...mono, fontSize: "11px", color: C.accentBr, fontWeight: 600 }}>ARGOS · MK 3.5</span>
            <span style={{ ...mono, fontSize: "11px", color: C.ghost }}>run_2847 · 1,240 conv.</span>
          </div>
          <div className="flex items-center gap-1">
            {[C.green, C.amber, C.red].map((c) => (
              <span key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.9 }} />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Score */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.ghost }}>Behavior Score</span>
              <Tag label="Degrading" color="amber" />
            </div>
            <div className="flex items-end gap-3 mb-2">
              <span style={{ ...display, fontSize: "56px", fontWeight: 700, color: C.accentBr, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{score}</span>
              <span style={{ ...mono, fontSize: "16px", color: C.ghost, paddingBottom: 6 }}>/100</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${score}%`, background: `linear-gradient(90deg, ${C.amber}88, ${C.accentBr})` }}
              />
            </div>
          </div>

          {/* Mini metrics */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Drift",      v: "0.34",  d: "+0.12 ▲",    col: C.amber },
              { label: "Cost / UO",  v: "$0.12", d: "+50% ideal",  col: C.red },
              { label: "Confidence", v: "68%",   d: "stable",      col: C.green },
            ].map((m) => (
              <div key={m.label} className="rounded-xl p-2.5"
                style={{ boxShadow: `rgba(255,255,255,0.06) 0px 0px 0px 1px`, background: "rgba(255,255,255,0.02)" }}>
                <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.ghost, marginBottom: 3 }}>{m.label}</div>
                <div style={{ ...mono, fontSize: "15px", fontWeight: 700, color: m.col, lineHeight: 1 }}>{m.v}</div>
                <div style={{ ...mono, fontSize: "8px", color: C.ghost, marginTop: 2 }}>{m.d}</div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div>
            <div className="flex justify-between mb-1">
              <span style={{ ...mono, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.ghost }}>Score · last 15 runs</span>
              <span style={{ ...mono, fontSize: "8px", color: C.accentBr }}>72 current</span>
            </div>
            <Sparkline data={HERO_SPARK} color={C.accentBr} height={38} id="hero-spark" />
          </div>

          {/* Bar chart */}
          <div>
            <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.ghost, marginBottom: 6 }}>
              Token waste · by intent cluster
            </div>
            <div className="flex h-8 items-end gap-0.5">
              {HERO_BARS.map((b, i) => (
                <div key={i} className="flex-1 rounded-sm"
                  style={{ height: `${b}%`, background: i === HERO_BARS.length - 1 ? `${C.amber}cc` : `${C.accent}25` }} />
              ))}
            </div>
            <div className="flex justify-between mt-1" style={{ ...mono, fontSize: "8px", color: C.ghost }}>
              <span>intent_1</span>
              <span style={{ color: C.amber }}>intent_10 ⚠</span>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl p-3" style={{ boxShadow: `${C.amberBord} 0px 0px 0px 1px`, background: C.amberBg }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.amber }} />
              <span style={{ ...mono, fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.amber, fontWeight: 600 }}>Top Recommendation</span>
            </div>
            <p style={{ fontSize: "11px", color: C.text, lineHeight: 1.6 }}>
              Verbosity spike at <span style={{ color: C.amber, fontWeight: 600 }}>intent_cluster_3</span>. Revise prompt constraints — 38% cost reduction potential.
            </p>
          </div>
        </div>
      </div>

      {/* Floating alert card — bottom right */}
      <div
        className="absolute bottom-0 right-0 rounded-xl p-3 w-44 z-20"
        style={{
          background: "rgba(9,9,11,0.96)",
          boxShadow: `rgba(255,255,255,0.08) 0px 0px 0px 1px, 0 8px 32px -8px rgba(0,0,0,0.6), 0 0 20px -8px rgba(220,38,38,0.15)`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.red }} />
          <span style={{ ...mono, fontSize: "8px", color: C.red, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Alert · High</span>
        </div>
        <p style={{ fontSize: "11px", color: C.muted, lineHeight: 1.6 }}>
          Drift +0.12 vs baseline.<br />3 consecutive runs.
        </p>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
