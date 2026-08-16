// Primitivos visuais da página do AION.
//
// `Badge` e `SectionLabel` são usados por quase todas as seções. Ficavam no topo de 1167 linhas.

import { A } from "./tokens";
import type { ReactNode } from "react";

// ─── Shared primitives ────────────────────────────────────────────────────────

export function Badge({ children, color = A.primary, bg }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-5"
      style={{ background: bg ?? `${color}18`, borderColor: `${color}33` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      <span className="text-xs font-semibold" style={{ color }}>{children}</span>
    </div>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: "11px", letterSpacing: "0.20em", fontWeight: 600, textTransform: "uppercase", color: A.muted, marginBottom: "12px" }}>
      {children}
    </p>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
