import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Design tokens — Linear dark canvas + Vercel shadow-as-border ─────────────

const C = {
  // Surfaces — Linear's luminance stacking
  bg:         "#09090b",
  bgAlt:      "#0f1011",
  bgCard:     "rgba(255,255,255,0.025)",
  bgCardStr:  "rgba(255,255,255,0.04)",

  // Borders
  border:     "rgba(255,255,255,0.06)",
  borderStr:  "rgba(255,255,255,0.1)",

  // Text — Linear's cool near-white palette
  text:       "#f7f8f8",
  muted:      "#a1a1aa",
  ghost:      "#71717a",
  subtle:     "#52525b",

  // Single brand accent: Linear indigo-violet
  accent:     "#5e6ad2",
  accentBr:   "#7170ff",
  accentHov:  "#828fff",
  accentBg:   "rgba(94,106,210,0.08)",
  accentBord: "rgba(94,106,210,0.22)",

  // Status colors — data visualizations only
  green:      "#27a644",
  amber:      "#d97706",
  red:        "#dc2626",
  greenBg:    "rgba(39,166,68,0.08)",
  greenBord:  "rgba(39,166,68,0.2)",
  amberBg:    "rgba(217,119,6,0.08)",
  amberBord:  "rgba(217,119,6,0.22)",
  redBg:      "rgba(220,38,38,0.07)",
  redBord:    "rgba(220,38,38,0.2)",
};

// Inter Variable with Linear's OpenType features
const display: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  fontFeatureSettings: '"cv01", "ss03"',
};
// JetBrains Mono for technical labels
const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', 'Berkeley Mono', ui-monospace, monospace",
};

// ─── Primitives ───────────────────────────────────────────────────────────────

type TagColor = "cyan" | "amber" | "red" | "green" | "purple";

function Tag({ label, color = "cyan" }: { label: string; color?: TagColor }) {
  const conf: Record<TagColor, { bg: string; border: string; text: string }> = {
    cyan:   { bg: C.accentBg,  border: C.accentBord, text: C.accentBr },
    amber:  { bg: C.amberBg,   border: C.amberBord,  text: C.amber },
    red:    { bg: C.redBg,     border: C.redBord,     text: C.red },
    green:  { bg: C.greenBg,   border: C.greenBord,   text: C.green },
    purple: { bg: "rgba(255,255,255,0.04)", border: C.border, text: C.muted },
  };
  const { bg, border, text } = conf[color];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
      style={{ ...mono, fontSize: "9px", fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase", background: bg, borderColor: border, color: text }}
    >
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 mb-5"
      style={{ background: C.accentBg, borderColor: C.accentBord }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.accent }} />
      <span style={{ ...mono, fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: C.accentBr }}>
        {children}
      </span>
    </div>
  );
}

function GlowDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

function Sparkline({ data, color, height = 32, id }: { data: number[]; color: string; height?: number; id: string }) {
  const W = 240;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = ((i / (data.length - 1)) * W).toFixed(1);
    const y = (height - ((v - min) / range) * (height - 4) - 2).toFixed(1);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");
  const lastY = +(height - ((data[data.length - 1] - min) / range) * (height - 4) - 2).toFixed(1);
  const area = `${pts} L${W},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: "100%", height }} preserveAspectRatio="none" overflow="visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

// ─── ARGOS Panel ──────────────────────────────────────────────────────────────

const HERO_SPARK = [44, 51, 57, 63, 69, 74, 71, 68, 65, 67, 70, 68, 64, 67, 72];
const HERO_BARS  = [28, 34, 40, 46, 54, 50, 58, 63, 69, 72];

function ARGOSPanel({ score }: { score: number }) {
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

function Navbar() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <header
      className="fixed top-3 left-4 right-4 sm:left-6 sm:right-6 z-50 h-14 flex items-center justify-between px-4 sm:px-5 rounded-xl"
      style={{
        background: "rgba(9,9,11,0.90)",
        boxShadow: "rgba(255,255,255,0.07) 0px 0px 0px 1px, 0 8px 24px -8px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/sentinela-icon.svg"
            alt=""
            width="28"
            height="28"
            className="rounded-lg"
            style={{ boxShadow: `0 0 14px -6px ${C.accent}80` }}
          />
          <span style={{ ...display, fontSize: "15px", fontWeight: 600, color: C.text }}>Sentinela</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {[
            { href: "#problem",  label: t("landing.v2.nav.problem") },
            { href: "#platform", label: t("landing.v2.nav.platform") },
            { href: "#how",      label: t("landing.v2.nav.how") },
            { href: "#pricing",  label: t("landing.v2.nav.pricing") },
          ].map(({ href, label }) => (
            <a key={href} href={href}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:text-slate-200"
              style={{ ...display, color: C.muted, fontWeight: 400, fontSize: "14px" }}>
              {label}
            </a>
          ))}
          <span className="mx-1.5 h-4 w-px" style={{ background: C.border }} />
          <Link to="/aion" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
            style={{ ...display, color: C.muted, fontWeight: 400, fontSize: "14px" }}>
            AION
            <span style={{ ...mono, fontSize: "9px", fontWeight: 700, background: "rgba(234,179,8,0.12)", color: "#d4a017", border: "1px solid rgba(234,179,8,0.25)", padding: "2px 6px", borderRadius: 999 }}>New</span>
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setLanguage(language === "en" ? "pt" : "en")}
          className="rounded-lg px-2.5 py-1 text-xs transition-colors hover:text-slate-200"
          style={{ ...mono, fontWeight: 600, color: C.ghost, boxShadow: `rgba(255,255,255,0.07) 0px 0px 0px 1px`, background: "rgba(255,255,255,0.02)", cursor: "pointer", border: "none" }}
        >
          {language === "en" ? "PT" : "EN"}
        </button>
        <Link to="/login">
          <Button variant="ghost" size="sm" className="rounded-lg text-sm"
            style={{ ...display, color: C.muted, fontWeight: 400 }}>
            {t("landing.v2.nav.signin")}
          </Button>
        </Link>
        <Link to="/register">
          <Button size="sm" className="rounded-lg"
            style={{ ...display, background: C.accent, color: "#ffffff", fontWeight: 500 }}>
            {t("landing.v2.nav.start")}
          </Button>
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { t } = useLanguage();
  const [score, setScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let n = 0;
      const iv = setInterval(() => {
        n += 2;
        if (n >= 72) { setScore(72); clearInterval(iv); }
        else setScore(n);
      }, 18);
      return () => clearInterval(iv);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden flex items-center" style={{ minHeight: "100vh", paddingTop: 80, paddingBottom: 80 }}>
      {/* Background — very subtle indigo radials, no dot grid */}
      <div className="absolute inset-0" style={{
        background: `
          radial-gradient(ellipse at 10% 50%, rgba(94,106,210,0.07) 0%, transparent 50%),
          radial-gradient(ellipse at 90% 20%, rgba(113,112,255,0.05) 0%, transparent 45%),
          ${C.bg}
        `,
      }} />
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${C.accent}60, ${C.accentBr}40, transparent)` }} />

      <div className="relative w-full max-w-6xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-14 xl:gap-20 items-center">

          {/* Left: copy */}
          <div>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 mb-8"
              style={{ background: C.accentBg, borderColor: C.accentBord }}>
              <GlowDot color={C.accentBr} />
              <span style={{ ...mono, fontSize: "10px", fontWeight: 600, color: C.accentBr }}>{t("landing.v2.hero.badge")}</span>
            </div>

            <h1 style={{
              ...display,
              fontSize: "clamp(2.4rem, 4.8vw, 3.75rem)",
              fontWeight: 510,
              color: C.text,
              lineHeight: 1.03,
              letterSpacing: "-0.022em",
              marginBottom: "1.25rem",
            }}>
              {t("landing.v2.hero.h1a")}<br />
              <span style={{
                backgroundImage: `linear-gradient(135deg, ${C.accentBr} 30%, ${C.accent})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                {t("landing.v2.hero.h1b")}
              </span>
            </h1>

            <p style={{ ...display, fontSize: "1.1rem", fontWeight: 400, color: C.muted, lineHeight: 1.72, maxWidth: "460px", marginBottom: "2rem" }}>
              {t("landing.v2.hero.body")}
            </p>

            {/* Trust checks */}
            <div className="flex flex-col gap-2 mb-8">
              {[
                t("landing.v2.hero.check1"),
                t("landing.v2.hero.check2"),
                t("landing.v2.hero.check3"),
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: C.greenBg, border: `1px solid ${C.greenBord}` }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span style={{ ...display, fontSize: "13px", fontWeight: 400, color: C.muted }}>{item}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register">
                <Button size="lg" className="rounded-lg h-12 px-8 text-base w-full sm:w-auto"
                  style={{ ...display, fontWeight: 500, background: C.accent, color: "#ffffff", boxShadow: `0 0 28px -8px ${C.accent}60` }}>
                  {t("landing.v2.hero.cta1")}
                </Button>
              </Link>
              <a href="#platform">
                <Button size="lg" variant="outline" className="rounded-lg h-12 px-8 text-base w-full sm:w-auto"
                  style={{ ...display, fontWeight: 400, boxShadow: `rgba(255,255,255,0.07) 0px 0px 0px 1px`, borderColor: "transparent", color: C.muted }}>
                  {t("landing.v2.hero.cta2")}
                </Button>
              </a>
            </div>
          </div>

          {/* Right: ARGOS panel */}
          <div className="hidden lg:block">
            <ARGOSPanel score={score} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Context Strip ────────────────────────────────────────────────────────────

const MODELS = [
  { name: "Claude 3.5",    short: "Cl", color: "#CC785C", bg: "rgba(204,120,92,0.14)"  },
  { name: "GPT-4o",        short: "OA", color: "#10A37F", bg: "rgba(16,163,127,0.14)"  },
  { name: "Gemini 1.5",    short: "Gm", color: "#4285F4", bg: "rgba(66,133,244,0.14)"  },
  { name: "Llama 3.3",     short: "Me", color: "#1877F2", bg: "rgba(24,119,242,0.14)"  },
  { name: "Mistral Large", short: "Mi", color: "#FA520F", bg: "rgba(250,82,15,0.14)"   },
  { name: "DeepSeek V3",   short: "DS", color: "#4E6EF2", bg: "rgba(78,110,242,0.14)"  },
  { name: "Command R+",    short: "Co", color: "#39B5AC", bg: "rgba(57,181,172,0.14)"  },
  { name: "Groq",          short: "Gq", color: "#F54F37", bg: "rgba(245,79,55,0.14)"   },
  { name: "Grok 3",        short: "xA", color: "#d4d4d4", bg: "rgba(212,212,212,0.10)" },
  { name: "Perplexity",    short: "Px", color: "#20B2AA", bg: "rgba(32,178,170,0.14)"  },
  { name: "Qwen 2.5",      short: "Qw", color: "#8B6CF7", bg: "rgba(139,108,247,0.14)" },
  { name: "Phi-4",         short: "Ph", color: "#00BCF2", bg: "rgba(0,188,242,0.14)"   },
  { name: "Gemma 2",       short: "Ga", color: "#34A853", bg: "rgba(52,168,83,0.14)"   },
  { name: "Mixtral",       short: "Mx", color: "#E87D26", bg: "rgba(232,125,38,0.14)"  },
  { name: "Custom LLMs",   short: "+",  color: "#7170ff", bg: "rgba(113,112,255,0.14)" },
];

function ModelBadge({ m }: { m: typeof MODELS[number] }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg flex-shrink-0"
      style={{
        padding: "7px 14px 7px 10px",
        boxShadow: "rgba(255,255,255,0.07) 0px 0px 0px 1px",
        background: "rgba(255,255,255,0.025)",
      }}
    >
      <span
        className="flex items-center justify-center rounded flex-shrink-0"
        style={{
          width: 22, height: 22,
          background: m.bg,
          ...mono, fontSize: "8px", fontWeight: 700, color: m.color, letterSpacing: "0.04em",
        }}
      >
        {m.short}
      </span>
      <span style={{ ...display, fontSize: "13px", fontWeight: 500, color: C.muted, whiteSpace: "nowrap" }}>
        {m.name}
      </span>
    </div>
  );
}

function ContextStrip() {
  const { t } = useLanguage();
  const track = [...MODELS, ...MODELS];

  return (
    <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: "rgba(255,255,255,0.01)", padding: "18px 0 22px" }}>
      {/* Label row */}
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-3 mb-5">
        <span style={{ ...mono, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.subtle }}>
          {t("landing.v2.context.label")}
        </span>
        <div className="flex-1 h-px" style={{ background: C.border }} />
        <span style={{ ...mono, fontSize: "9px", color: C.subtle, letterSpacing: "0.08em" }}>15+ providers</span>
      </div>

      {/* Scrolling ticker with fade edges */}
      <div style={{
        overflow: "hidden",
        WebkitMaskImage: "linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)",
        maskImage: "linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)",
      }}>
        <div className="flex gap-2 marquee-track" style={{ width: "max-content" }}>
          {track.map((m, i) => <ModelBadge key={i} m={m} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Problem Section ──────────────────────────────────────────────────────────

function ProblemSection() {
  const { t } = useLanguage();

  const problems = [
    {
      title: t("landing.v2.problem.p1.title"),
      desc:  t("landing.v2.problem.p1.desc"),
      metric: "Behavior Score",
      value: "72 → 64",
      trend: t("landing.v2.problem.p1.trend"),
      color: C.amber, bg: C.amberBg, border: C.amberBord,
      chart: [74, 73, 72, 71, 70, 68, 65, 64],
      chartId: "prob-quality",
      icon: "M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181",
    },
    {
      title: t("landing.v2.problem.p2.title"),
      desc:  t("landing.v2.problem.p2.desc"),
      metric: "Cost per Useful Outcome",
      value: "$0.12",
      trend: t("landing.v2.problem.p2.trend"),
      color: C.red, bg: C.redBg, border: C.redBord,
      chart: [8, 8, 9, 9, 10, 11, 11, 12],
      chartId: "prob-cost",
      icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    },
    {
      title: t("landing.v2.problem.p3.title"),
      desc:  t("landing.v2.problem.p3.desc"),
      metric: "Decision Clarity",
      value: "Manual",
      trend: t("landing.v2.problem.p3.trend"),
      color: C.accentBr, bg: C.accentBg, border: C.accentBord,
      chart: [50, 46, 42, 39, 36, 32, 29, 27],
      chartId: "prob-decision",
      icon: "M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88",
    },
  ];

  return (
    <section id="problem" className="py-24 sm:py-32 px-6 sm:px-8" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>{t("landing.v2.problem.badge")}</SectionLabel>
          <h2 style={{
            ...display,
            fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
            fontWeight: 510,
            color: C.text,
            marginBottom: "1rem",
            letterSpacing: "-0.022em",
            lineHeight: 1.1,
          }}>
            {t("landing.v2.problem.h2")}<br />
            <span style={{ color: C.muted, fontWeight: 400 }}>{t("landing.v2.problem.h2muted")}</span>
          </h2>
          <p style={{ ...display, fontSize: "1.05rem", fontWeight: 400, color: C.muted, maxWidth: "560px", margin: "0 auto", lineHeight: 1.72 }}>
            {t("landing.v2.problem.body")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {problems.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl p-6 relative overflow-hidden transition-all duration-200 cursor-default"
              style={{
                background: p.bg,
                boxShadow: `${p.border} 0px 0px 0px 1px`,
              }}
            >
              <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${p.color}12, transparent 70%)`, filter: "blur(20px)" }} />

              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                style={{ boxShadow: `${p.border} 0px 0px 0px 1px`, background: `${p.color}10` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={p.icon} />
                </svg>
              </div>

              <h3 style={{ ...display, fontSize: "17px", fontWeight: 590, color: C.text, marginBottom: "0.5rem" }}>{p.title}</h3>
              <p style={{ ...display, fontSize: "13px", fontWeight: 400, color: C.muted, lineHeight: 1.68, marginBottom: "1.25rem" }}>{p.desc}</p>

              <div className="rounded-xl p-3.5"
                style={{ background: "rgba(255,255,255,0.025)", boxShadow: `rgba(255,255,255,0.06) 0px 0px 0px 1px` }}>
                <span style={{ ...mono, fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase", color: C.ghost }}>{p.metric}</span>
                <div className="flex items-end gap-2 mt-1 mb-0.5">
                  <span style={{ ...mono, fontSize: "18px", fontWeight: 700, color: p.color, lineHeight: 1 }}>{p.value}</span>
                </div>
                <div style={{ ...mono, fontSize: "9px", color: p.color, opacity: 0.85, marginBottom: 8 }}>{p.trend}</div>
                <Sparkline data={p.chart} color={p.color} height={28} id={p.chartId} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Platform Section ─────────────────────────────────────────────────────────

function PlatformSection() {
  const { t } = useLanguage();

  const capabilities = [
    {
      tag: t("landing.v2.platform.c1.tag"),    tagColor: "cyan" as TagColor,
      title: t("landing.v2.platform.c1.title"),
      desc:  t("landing.v2.platform.c1.desc"),
      value: "72 / 100", valueColor: C.amber,
      chart: [44, 51, 57, 63, 69, 74, 71, 68, 65, 67, 70, 68, 64, 67, 72],
      chartId: "cap-behavior", wide: true,
    },
    {
      tag: t("landing.v2.platform.c2.tag"),    tagColor: "red" as TagColor,
      title: t("landing.v2.platform.c2.title"),
      desc:  t("landing.v2.platform.c2.desc"),
      value: "0.34", valueColor: C.red,
      chart: [0.18, 0.20, 0.22, 0.25, 0.28, 0.26, 0.31, 0.29, 0.34],
      chartId: "cap-drift", wide: false,
    },
    {
      tag: t("landing.v2.platform.c3.tag"),    tagColor: "amber" as TagColor,
      title: t("landing.v2.platform.c3.title"),
      desc:  t("landing.v2.platform.c3.desc"),
      value: "$0.12", valueColor: C.amber,
      chart: [8, 9, 9, 10, 10, 11, 11, 12],
      chartId: "cap-cost", wide: false,
    },
    {
      tag: t("landing.v2.platform.c4.tag"),    tagColor: "cyan" as TagColor,
      title: t("landing.v2.platform.c4.title"),
      desc:  t("landing.v2.platform.c4.desc"),
      value: "18 clusters", valueColor: C.accentBr,
      chart: [12, 13, 14, 13, 15, 16, 15, 17, 18],
      chartId: "cap-intent", wide: false,
    },
    {
      tag: t("landing.v2.platform.c5.tag"),    tagColor: "amber" as TagColor,
      title: t("landing.v2.platform.c5.title"),
      desc:  t("landing.v2.platform.c5.desc"),
      value: "3 flags", valueColor: C.amber,
      chart: [0.4, 0.5, 0.9, 0.6, 1.2, 0.7, 1.5, 1.0, 1.3],
      chartId: "cap-volatility", wide: false,
    },
    {
      tag: t("landing.v2.platform.c6.tag"),    tagColor: "purple" as TagColor,
      title: t("landing.v2.platform.c6.title"),
      desc:  t("landing.v2.platform.c6.desc"),
      value: "1 critical", valueColor: C.accent,
      chart: [5, 4, 6, 5, 7, 4, 6, 5, 4],
      chartId: "cap-recs", wide: false,
    },
  ];

  return (
    <section id="platform" className="py-24 sm:py-32 px-6 sm:px-8"
      style={{ background: C.bgAlt }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <SectionLabel>{t("landing.v2.platform.badge")}</SectionLabel>
            <h2 style={{
              ...display,
              fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
              fontWeight: 510,
              color: C.text,
              letterSpacing: "-0.022em",
              lineHeight: 1.1,
              maxWidth: "440px",
            }}>
              {t("landing.v2.platform.h2")}<br />
              <span style={{ color: C.muted, fontWeight: 400 }}>{t("landing.v2.platform.h2muted")}</span>
            </h2>
          </div>
          <p style={{ ...display, fontSize: "1rem", fontWeight: 400, color: C.muted, maxWidth: "320px", lineHeight: 1.72, paddingBottom: "0.25rem" }}>
            {t("landing.v2.platform.body")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {capabilities.map((cap) => (
            <div
              key={cap.title}
              className={`rounded-2xl p-6 relative overflow-hidden transition-all duration-200 cursor-default${cap.wide ? " xl:col-span-2" : ""}`}
              style={{
                background: C.bgCard,
                boxShadow: "rgba(255,255,255,0.07) 0px 0px 0px 1px, rgba(0,0,0,0.15) 0px 2px 8px -2px",
              }}
            >
              {cap.wide ? (
                <div className="flex gap-8 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <Tag label={cap.tag} color={cap.tagColor} />
                      <span style={{ ...mono, fontSize: "20px", fontWeight: 700, color: cap.valueColor, lineHeight: 1 }}>{cap.value}</span>
                    </div>
                    <h3 style={{ ...display, fontSize: "15px", fontWeight: 590, color: C.text, marginBottom: "0.4rem" }}>{cap.title}</h3>
                    <p style={{ ...display, fontSize: "12px", fontWeight: 400, color: C.muted, lineHeight: 1.68 }}>{cap.desc}</p>
                  </div>
                  <div className="w-64 xl:w-80 shrink-0">
                    <div style={{ ...mono, fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: C.ghost, marginBottom: 8 }}>Score · last 15 runs</div>
                    <Sparkline data={cap.chart} color={cap.valueColor} height={72} id={cap.chartId} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <Tag label={cap.tag} color={cap.tagColor} />
                    <span style={{ ...mono, fontSize: "20px", fontWeight: 700, color: cap.valueColor, lineHeight: 1 }}>{cap.value}</span>
                  </div>
                  <h3 style={{ ...display, fontSize: "15px", fontWeight: 590, color: C.text, marginBottom: "0.4rem" }}>{cap.title}</h3>
                  <p style={{ ...display, fontSize: "12px", fontWeight: 400, color: C.muted, lineHeight: 1.68, marginBottom: "1.25rem" }}>{cap.desc}</p>
                  <Sparkline data={cap.chart} color={cap.valueColor} height={36} id={cap.chartId} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    {
      num: "01",
      title:  t("landing.v2.how.s1.title"),
      desc:   t("landing.v2.how.s1.desc"),
      detail: t("landing.v2.how.s1.detail"),
      icon: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5",
    },
    {
      num: "02",
      title:  t("landing.v2.how.s2.title"),
      desc:   t("landing.v2.how.s2.desc"),
      detail: t("landing.v2.how.s2.detail"),
      icon: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
    },
    {
      num: "03",
      title:  t("landing.v2.how.s3.title"),
      desc:   t("landing.v2.how.s3.desc"),
      detail: t("landing.v2.how.s3.detail"),
      icon: "M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3",
    },
  ];

  return (
    <section id="how" className="py-24 sm:py-32 px-6 sm:px-8" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>{t("landing.v2.how.badge")}</SectionLabel>
          <h2 style={{
            ...display,
            fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
            fontWeight: 510,
            color: C.text,
            marginBottom: "1rem",
            letterSpacing: "-0.022em",
          }}>
            {t("landing.v2.how.h2")}
          </h2>
          <p style={{ ...display, fontSize: "1.05rem", fontWeight: 400, color: C.muted, maxWidth: "480px", margin: "0 auto", lineHeight: 1.72 }}>
            {t("landing.v2.how.body")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute pointer-events-none"
            style={{ top: "3rem", left: "calc(33.3% + 2rem)", right: "calc(33.3% + 2rem)", height: 1, borderTop: "1px dashed rgba(113,112,255,0.3)" }} />

          {steps.map((s) => (
            <div
              key={s.num}
              className="rounded-2xl p-7 relative overflow-hidden transition-all duration-200 cursor-default"
              style={{
                background: C.bgCard,
                boxShadow: "rgba(255,255,255,0.07) 0px 0px 0px 1px, rgba(0,0,0,0.15) 0px 2px 8px -2px",
              }}
            >
              {/* Watermark */}
              <div className="absolute top-2 right-3 select-none pointer-events-none"
                style={{ ...mono, fontSize: "72px", fontWeight: 800, color: "rgba(255,255,255,0.025)", lineHeight: 1 }}>
                {s.num}
              </div>

              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: C.accentBg, boxShadow: `${C.accentBord} 0px 0px 0px 1px` }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accentBr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icon} />
                </svg>
              </div>

              <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: `${C.accentBr}70`, marginBottom: "0.5rem" }}>
                Step {s.num}
              </div>
              <h3 style={{ ...display, fontSize: "16px", fontWeight: 590, color: C.text, marginBottom: "0.5rem" }}>{s.title}</h3>
              <p style={{ ...display, fontSize: "13px", fontWeight: 400, color: C.muted, lineHeight: 1.68, marginBottom: "1rem" }}>{s.desc}</p>
              <div className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full" style={{ background: C.accentBr, opacity: 0.6 }} />
                <span style={{ ...mono, fontSize: "10px", color: C.ghost }}>{s.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Outcomes ─────────────────────────────────────────────────────────────────

function OutcomesSection() {
  const { t } = useLanguage();

  const outcomes = [
    { value: t("landing.v2.outcomes.o1.value"), label: t("landing.v2.outcomes.o1.label"), desc: t("landing.v2.outcomes.o1.desc"), color: C.accentBr },
    { value: t("landing.v2.outcomes.o2.value"), label: t("landing.v2.outcomes.o2.label"), desc: t("landing.v2.outcomes.o2.desc"), color: C.accent },
    { value: t("landing.v2.outcomes.o3.value"), label: t("landing.v2.outcomes.o3.label"), desc: t("landing.v2.outcomes.o3.desc"), color: C.green },
  ];

  return (
    <section className="py-24 sm:py-28 px-6 sm:px-8 relative overflow-hidden"
      style={{ background: C.bgAlt }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(94,106,210,0.07) 0%, transparent 60%)` }} />

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>{t("landing.v2.outcomes.badge")}</SectionLabel>
          <h2 style={{
            ...display,
            fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
            fontWeight: 510,
            color: C.text,
            letterSpacing: "-0.022em",
          }}>
            {t("landing.v2.outcomes.h2")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {outcomes.map((o) => (
            <div key={o.value}
              className="rounded-2xl p-8 text-center relative overflow-hidden"
              style={{
                background: C.bgCard,
                boxShadow: "rgba(255,255,255,0.07) 0px 0px 0px 1px, rgba(0,0,0,0.15) 0px 2px 8px -2px",
              }}>
              <div className="absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${o.color}50, transparent)` }} />
              <div style={{
                ...display,
                fontSize: "clamp(2.4rem, 5vw, 3.4rem)",
                fontWeight: 510,
                color: o.color,
                lineHeight: 1,
                marginBottom: "0.6rem",
              }}>
                {o.value}
              </div>
              <div style={{ ...display, fontSize: "14px", fontWeight: 590, color: C.text, marginBottom: "0.5rem" }}>{o.label}</div>
              <div style={{ ...display, fontSize: "12px", fontWeight: 400, color: C.muted, lineHeight: 1.65 }}>{o.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection() {
  const { t } = useLanguage();

  const features = [
    t("landing.v2.pricing.f1"),
    t("landing.v2.pricing.f2"),
    t("landing.v2.pricing.f3"),
    t("landing.v2.pricing.f4"),
    t("landing.v2.pricing.f5"),
    t("landing.v2.pricing.f6"),
    t("landing.v2.pricing.f7"),
    t("landing.v2.pricing.f8"),
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32 px-6 sm:px-8" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <SectionLabel>{t("landing.v2.pricing.badge")}</SectionLabel>
          <h2 style={{
            ...display,
            fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)",
            fontWeight: 510,
            color: C.text,
            marginBottom: "1rem",
            letterSpacing: "-0.022em",
          }}>
            {t("landing.v2.pricing.h2")}
          </h2>
          <p style={{ ...display, fontSize: "1.05rem", fontWeight: 400, color: C.muted, maxWidth: "460px", margin: "0 auto" }}>
            {t("landing.v2.pricing.body")}
          </p>
        </div>

        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-[1fr_280px] gap-4 items-start">
          {/* Pricing card */}
          <div className="relative rounded-2xl p-8"
            style={{
              background: C.accentBg,
              boxShadow: `${C.accentBord} 0px 0px 0px 1px, 0 0 48px -12px rgba(94,106,210,0.2), inset 0 1px 0 rgba(255,255,255,0.07)`,
            }}>
            <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl"
              style={{ background: `linear-gradient(90deg, transparent, ${C.accentBr}90, transparent)` }} />

            <div className="flex items-center gap-2 mb-6">
              <Tag label={t("landing.v2.pricing.tagEarlyAccess")} color="cyan" />
              <Tag label={t("landing.v2.pricing.tagFree")} color="green" />
            </div>

            <div className="flex items-end gap-1.5 mb-1.5">
              <span style={{ ...display, fontSize: "64px", fontWeight: 510, color: C.text, lineHeight: 1 }}>$0</span>
              <span style={{ ...display, fontSize: "14px", fontWeight: 400, color: C.muted, paddingBottom: 10 }}>{t("landing.v2.pricing.perNow")}</span>
            </div>
            <p style={{ ...display, fontSize: "13px", fontWeight: 400, color: C.muted, marginBottom: "1.75rem" }}>{t("landing.v2.pricing.tagline")}</p>

            <Link to="/register">
              <Button className="w-full rounded-lg h-12 text-base"
                style={{ ...display, fontWeight: 500, background: C.accent, color: "#ffffff", boxShadow: `0 0 20px -6px ${C.accent}60` }}>
                {t("landing.v2.pricing.cta")}
              </Button>
            </Link>
          </div>

          {/* Feature list */}
          <div className="rounded-2xl p-6"
            style={{
              background: C.bgCard,
              boxShadow: "rgba(255,255,255,0.07) 0px 0px 0px 1px",
            }}>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.ghost, marginBottom: "1rem" }}>
              {t("landing.v2.pricing.featuresLabel")}
            </div>
            <ul className="space-y-2.5">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: C.accentBg, boxShadow: `${C.accentBord} 0px 0px 0px 1px` }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.accentBr} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <span style={{ ...display, fontSize: "13px", fontWeight: 400, color: C.muted }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* AION upsell */}
        <div className="max-w-2xl mx-auto mt-4 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{
            background: C.bgCard,
            boxShadow: "rgba(255,255,255,0.07) 0px 0px 0px 1px",
          }}>
          <div className="flex-1">
            <Tag label="Runtime Control" color="cyan" />
            <p style={{ ...display, fontSize: "13px", fontWeight: 400, color: C.muted, marginTop: "0.5rem" }}>
              {t("landing.v2.pricing.aionText")}
            </p>
          </div>
          <Link to="/aion" className="shrink-0">
            <Button variant="ghost" size="sm" className="rounded-lg whitespace-nowrap"
              style={{ ...display, fontWeight: 400, color: C.muted, boxShadow: `rgba(255,255,255,0.07) 0px 0px 0px 1px` }}>
              {t("landing.v2.pricing.aionCta")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  const { t } = useLanguage();
  return (
    <section className="relative py-32 px-6 overflow-hidden" style={{ background: C.bg }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(94,106,210,0.08) 0%, transparent 52%),
          radial-gradient(ellipse at 80% 50%, rgba(113,112,255,0.06) 0%, transparent 52%)
        `,
      }} />
      <div className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${C.accent}60, ${C.accentBr}50, transparent)` }} />

      <div className="relative max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 mb-7"
          style={{ background: C.accentBg, borderColor: C.accentBord }}>
          <GlowDot color={C.accentBr} />
          <span style={{ ...mono, fontSize: "10px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: C.accentBr }}>
            {t("landing.v2.cta.badge")}
          </span>
        </div>

        <h2 style={{
          ...display,
          fontSize: "clamp(2.2rem, 5vw, 3.75rem)",
          fontWeight: 510,
          color: C.text,
          lineHeight: 1.04,
          letterSpacing: "-0.022em",
          marginBottom: "1.25rem",
        }}>
          {t("landing.v2.cta.h2a")}<br />
          <span style={{
            backgroundImage: `linear-gradient(135deg, ${C.accentBr} 30%, ${C.accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            {t("landing.v2.cta.h2b")}
          </span>
        </h2>

        <p style={{ ...display, fontSize: "1.1rem", fontWeight: 400, color: C.muted, lineHeight: 1.72, maxWidth: "520px", margin: "0 auto 2.5rem" }}>
          {t("landing.v2.cta.body")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="rounded-lg h-12 px-10 text-base"
              style={{ ...display, fontWeight: 500, background: `linear-gradient(135deg, ${C.accent}, ${C.accentBr})`, color: "#ffffff", boxShadow: `0 0 36px -10px rgba(94,106,210,0.5)` }}>
              {t("landing.v2.cta.primary")}
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="rounded-lg h-12 px-10 text-base"
              style={{ ...display, fontWeight: 400, boxShadow: `rgba(255,255,255,0.1) 0px 0px 0px 1px`, borderColor: "transparent", color: C.muted }}>
              {t("landing.v2.cta.secondary")}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const { t, language } = useLanguage();
  const pt = language === "pt";

  const productLinks = [
    { href: "#problem",  label: t("landing.v2.nav.problem") },
    { href: "#platform", label: t("landing.v2.nav.platform") },
    { href: "#how",      label: t("landing.v2.nav.how") },
    { href: "#pricing",  label: t("landing.v2.nav.pricing") },
  ];
  const platformLinks = [
    { href: "/aion",     label: "AION" },
    { href: "/register", label: pt ? "Criar conta" : "Get started" },
    { href: "/login",    label: pt ? "Entrar" : "Sign in" },
  ];
  const legalLinks = [
    { href: "/privacy",  label: pt ? "Privacidade" : "Privacy" },
    { href: "/terms",    label: pt ? "Termos de uso" : "Terms of use" },
    { href: "/security", label: "Security" },
  ];

  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, background: C.bgAlt }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/sentinela-icon.svg" alt="" width="28" height="28" className="rounded-lg" />
              <span style={{ ...display, fontSize: "15px", fontWeight: 600, color: C.text }}>Sentinela</span>
            </div>
            <p style={{ ...display, fontSize: "12px", color: C.ghost, lineHeight: 1.7, maxWidth: "200px" }}>
              {pt ? "Monitoramento de saúde para IAs em produção." : "Health monitoring for production AI systems."}
            </p>
          </div>

          {/* Product */}
          <div>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.subtle, marginBottom: "0.875rem" }}>
              {pt ? "Produto" : "Product"}
            </div>
            <ul className="space-y-2.5">
              {productLinks.map(({ href, label }) => (
                <li key={href}>
                  <a href={href} style={{ ...display, fontSize: "13px", color: C.ghost }}>{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.subtle, marginBottom: "0.875rem" }}>
              {pt ? "Plataforma" : "Platform"}
            </div>
            <ul className="space-y-2.5">
              {platformLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link to={href} style={{ ...display, fontSize: "13px", color: C.ghost }}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: C.subtle, marginBottom: "0.875rem" }}>
              Legal
            </div>
            <ul className="space-y-2.5">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link to={href} style={{ ...display, fontSize: "13px", color: C.ghost }}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-8"
          style={{ borderTop: `1px solid ${C.border}` }}>
          <p style={{ ...display, fontSize: "12px", color: C.ghost }}>
            {t("landing.v2.footer")} · {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-2">
            <span style={{ ...mono, fontSize: "9px", color: C.subtle, letterSpacing: "0.12em" }}>PWD BY</span>
            <span style={{ ...display, fontSize: "12px", fontWeight: 600, color: C.ghost }}>Baluarte</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── LandingPage ──────────────────────────────────────────────────────────────

export function LandingPage() {
  const { t } = useLanguage();
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <Navbar />
      <Hero />
      <ContextStrip />
      <ProblemSection />
      <PlatformSection />
      <HowItWorksSection />
      <OutcomesSection />
      <PricingSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
