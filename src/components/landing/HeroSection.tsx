import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";

// Sparkline: behavior score over last 15 runs — improving then slight volatility
const SPARK = [44, 51, 57, 63, 69, 74, 71, 68, 65, 67, 70, 68, 64, 67, 72];
const SW = 260, SH = 44;
const minV = Math.min(...SPARK), maxV = Math.max(...SPARK);
function pt(val: number, i: number) {
  const x = ((i / (SPARK.length - 1)) * SW).toFixed(1);
  const y = (SH - ((val - minV) / (maxV - minV)) * (SH - 6) - 3).toFixed(1);
  return `${i === 0 ? "M" : "L"}${x},${y}`;
}
const sparkPath = SPARK.map(pt).join(" ");
const lastX = SW;
const lastY = +(SH - ((SPARK[SPARK.length - 1] - minV) / (maxV - minV)) * (SH - 6) - 3).toFixed(1);
const areaPath = `${sparkPath} L${SW},${SH} L0,${SH} Z`;

// ── ARGOS Mock Panel ──────────────────────────────────────────────────────────
function ARGOSMock({ score }: { score: number }) {
  const bars = [32, 38, 42, 48, 55, 50, 58, 62, 68, 72];

  return (
    <div className="relative rounded-2xl border border-primary/25 bg-card overflow-hidden shadow-glow animate-fade-in" style={{ animationDelay: "0.2s" }}>
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-background/30">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="font-mono-label text-xs text-primary">ARGOS MK 3.5</span>
          <span className="font-mono-label text-xs text-muted-foreground">· run_2847 · 1,240 conversas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-critical/70" />
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* ── Behavior Score ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-label text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Behavior Score
            </span>
            <span className="font-mono-label text-[10px] text-warning">▼ degradando vs pico (74)</span>
          </div>
          <div className="flex items-end gap-3 mb-2.5">
            <span className="font-display text-6xl font-bold text-primary tabular-nums leading-none">
              {score}
            </span>
            <span className="pb-1.5 font-mono-label text-lg text-muted-foreground/50">/100</span>
          </div>
          {/* Animated fill bar */}
          <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${score}%`,
                background:
                  score < 60
                    ? "hsl(0 72% 51%)"
                    : score < 75
                    ? "hsl(38 92% 50%)"
                    : "hsl(195 100% 50%)",
              }}
            />
          </div>
        </div>

        {/* ── Mini metric grid ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Drift", value: "0.34", delta: "+0.12 ▲", color: "text-warning" },
            { label: "Cost / UO", value: "$0.12", delta: "+50% vs ideal", color: "text-critical" },
            { label: "Confidence", value: "68%", delta: "estável", color: "text-success" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-border/40 bg-background/50 p-3"
            >
              <div className="font-mono-label text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                {m.label}
              </div>
              <div className={`font-mono-label text-lg font-bold leading-none ${m.color}`}>
                {m.value}
              </div>
              <div className="font-mono-label text-[9px] text-muted-foreground/60 mt-1">{m.delta}</div>
            </div>
          ))}
        </div>

        {/* ── Sparkline: score trend ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono-label text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Score · últimas 15 runs
            </span>
            <span className="font-mono-label text-[9px] text-primary">72 atual</span>
          </div>
          <svg
            viewBox={`0 0 ${SW} ${SH}`}
            className="w-full h-10 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="hg-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(195 100% 50%)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="hsl(195 100% 50%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#hg-area)" />
            <path
              d={sparkPath}
              fill="none"
              stroke="hsl(195 100% 50%)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-line"
            />
            <circle cx={lastX} cy={lastY} r="2.5" fill="hsl(195 100% 50%)" />
          </svg>
        </div>

        {/* ── Mini bar chart: token waste by intent ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-label text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              Token waste · por intent cluster
            </span>
          </div>
          <div className="flex h-8 items-end gap-1">
            {bars.map((b, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-all duration-300 ${
                  i === bars.length - 1 ? "bg-warning/80" : "bg-primary/20"
                }`}
                style={{ height: `${b}%`, transitionDelay: `${i * 60 + 800}ms` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5 font-mono-label text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            <span>intent_1</span>
            <span className="text-warning">intent_10 ⚠</span>
          </div>
        </div>

        {/* ── Top Recommendation ── */}
        <div className="rounded-xl border border-warning/25 bg-warning/5 p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
            <span className="font-mono-label text-[9px] uppercase tracking-[0.18em] text-warning">
              Top Recommendation
            </span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed">
            Verbosity spike no <span className="text-warning font-medium">intent_cluster_3</span>. Revise constraints do prompt — potencial de reduzir 38% do custo.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── HeroSection ───────────────────────────────────────────────────────────────
export default function HeroSection() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [score, setScore] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      let n = 0;
      const iv = setInterval(() => {
        n += 2;
        if (n >= 72) {
          setScore(72);
          clearInterval(iv);
        } else {
          setScore(n);
        }
      }, 18);
      return () => clearInterval(iv);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  function handleStart() {
    if (loading) return;
    navigate(user ? "/home" : "/login");
  }

  return (
    <section className="relative min-h-screen flex items-center pt-20 bg-gradient-hero overflow-hidden landing-grid">
      {/* Cyan orb — left */}
      <div className="absolute top-1/4 -left-40 w-[640px] h-[640px] rounded-full bg-primary/8 blur-[160px] pointer-events-none" />
      {/* Purple orb — right */}
      <div
        className="absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full blur-[160px] pointer-events-none"
        style={{ background: "hsl(265 70% 60% / 0.07)" }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-14 relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.05fr_0.95fr] lg:gap-14">

          {/* ── Left: Copy ── */}
          <div className="animate-fade-up">
            {/* Terminal badge */}
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 mb-8">
              <span className="font-mono-label text-xs text-muted-foreground">[</span>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="font-mono-label text-xs font-medium text-primary">
                AI Observability Platform
              </span>
              <span className="font-mono-label text-xs text-muted-foreground">]</span>
              <span className="font-mono-label text-xs text-primary/40 animate-blink select-none">▋</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold leading-[1.03] mb-5 text-balance">
              Entenda sua IA<br />
              <span className="text-gradient-cyber">antes que ela custe caro.</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              O Sentinela analisa conversas, detecta drift, mede desperdício de tokens e transforma comportamento de IA em decisão clara.
            </p>

            {/* 4 perguntas */}
            <div className="grid grid-cols-2 gap-2 mb-9 max-w-lg">
              {[
                { q: "Sua IA está boa?", color: "text-warning" },
                { q: "Ela está piorando?", color: "text-critical" },
                { q: "Quanto custa cada resposta útil?", color: "text-critical" },
                { q: "O que corrigir primeiro?", color: "text-primary" },
              ].map(({ q, color }) => (
                <div
                  key={q}
                  className="flex items-start gap-2 rounded-xl border border-border/50 bg-card/40 px-3.5 py-2.5 text-sm"
                >
                  <span className={`font-mono-label text-xs mt-0.5 shrink-0 ${color}`}>→</span>
                  <span className="text-foreground/80 text-xs leading-snug">{q}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                size="lg"
                className="bg-gradient-primary text-primary-foreground font-semibold text-base px-8 h-12 hover:opacity-90 transition-opacity shadow-glow"
                onClick={handleStart}
                disabled={loading}
              >
                {loading ? "Carregando..." : "Começar agora"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border/60 bg-card/40 h-12 hover:bg-card/70 transition-colors"
                onClick={() => navigate(user ? "/home" : "/login?demo=1")}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Ver demo
              </Button>
            </div>

            <p className="text-sm text-muted-foreground/60">
              Nenhuma integração de código. Upload, analise e aja em minutos.
            </p>
          </div>

          {/* ── Right: Animated ARGOS Mock ── */}
          <div className="hidden lg:block">
            <ARGOSMock score={score} />
          </div>
        </div>
      </div>
    </section>
  );
}
