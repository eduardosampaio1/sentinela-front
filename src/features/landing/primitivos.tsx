// Primitivos visuais da landing.
//
// Extraídos de `LandingPage.tsx` na M47. São os quatro blocos que TODAS as seções usam — rótulo,
// supertítulo, ponto pulsante e minigráfico. Ficavam no topo de 1182 linhas, e por isso mudanças
// neles eram invisíveis para quem lia uma seção.
//
// `TagColor` fica privado de propósito: exportar tipo junto de componente acorda o
// `react-refresh/only-export-components`, e quem chama passa literal (`color="amber"`).

import { C, mono, type TagColor } from "./tokens";
import type { ReactNode } from "react";

// ─── Primitives ───────────────────────────────────────────────────────────────

export function Tag({ label, color = "cyan" }: { label: string; color?: TagColor }) {
  const conf: Record<TagColor, { bg: string; border: string; text: string }> = {
    cyan:   { bg: C.accentBg,  border: C.accentBord, text: C.accentBr },
    amber:  { bg: C.amberBg,   border: C.amberBord,  text: C.amber },
    red:    { bg: C.redBg,     border: C.redBord,     text: C.red },
    green:  { bg: C.greenBg,   border: C.greenBord,   text: C.green },
    purple: { bg: C.bgCard, border: C.border, text: C.muted },
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

export function SectionLabel({ children }: { children: ReactNode }) {
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

export function GlowDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ background: color }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
    </span>
  );
}

export function Sparkline({ data, color, height = 32, id }: { data: number[]; color: string; height?: number; id: string }) {
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
