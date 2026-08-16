// O topo da landing: herói e a esteira de modelos suportados.
//
// `ContextStrip` é a esteira, e ela carrega o marcador de estouro intencional: a largura é
// deliberada (`max-content`, animada dentro de um contêiner que recorta), e o gate de responsive
// só a aceita porque o marcador está declarado e travado por catraca NOMINAL — que conta as
// ocorrências no código-fonte, comentário incluso. Por isso este parágrafo não escreve o
// atributo por extenso: citá-lo criaria uma terceira ocorrência e reprovaria a catraca.
//
// `MODELS` e `ModelBadge` ficam privados: são detalhe da esteira, e exportá-los acordaria o
// `react-refresh/only-export-components`.

import { Button } from "@/components/ui/button";
import { C, display, mono } from "./tokens";
import { ARGOSPanel } from "./PainelArgos";
import { GlowDot } from "./primitivos";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";

export function Hero() {
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
      {/* M46 — o monograma é a MARCA do fornecedor (`#1877F2` é da Meta, `#4E6EF2` da DeepSeek,
          `#8B6CF7` da Qwen), e a WCAG 1.4.3 isenta logotipo de piso de contraste. Ele é
          `aria-hidden` porque o nome do modelo está escrito ao lado, legível: quem usa leitor de
          tela ouve "Llama 3.3", não "Me Llama 3.3".
          Os três continuam contados no gate — isenção da norma não é motivo para parar de medir. */}
      <span
        aria-hidden="true"
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

export function ContextStrip() {
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
        <div data-overflow-ok="marquee" className="flex gap-2 marquee-track" style={{ width: "max-content" }}>
          {track.map((m, i) => <ModelBadge key={i} m={m} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Problem Section ──────────────────────────────────────────────────────────
