import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

// ─── Shared legal page shell ──────────────────────────────────────────────────

// ## Contraste — M46
//
// Este objeto é a fonte dos 27 nós de a11y que os três documentos legais somavam (`/terms` 8,
// `/privacy` 10, `/security` 9). Não eram três defeitos: era UM template, contado três vezes.
//
// Todas as razões abaixo são contra `bg` (#070C18), medidas em WCAG 2 AA para texto pequeno
// (mínimo 4.5:1) — que é o que estes tokens vestem: rótulos de 12px, corpo de 15px e links.
const L = {
  bg:      "#070C18",
  surface: "#0D1525",
  border:  "rgba(255,255,255,0.08)",
  text:    "#F1F5F9",
  muted:   "#94A3B8", // 7.62:1 — sempre passou; quem reprovava era o `opacity: 0.7` sobre ele.
  // 0.35 compunha #5E6169 sobre o fundo = 3.15:1. A 0.48 compõe ~4.9:1 e continua secundário:
  // o token existe para ser discreto, e discreto não precisa ser ilegível.
  ghost:   "rgba(255,255,255,0.48)",
  // #5E6AD2 dava 4.15:1 — reprovava por pouco, e reprovava no lugar pior: os LINKS do corpo legal
  // e o supertítulo. Mesma matiz, mais claro: 5.90:1.
  accent:  "#7C86E0",
};

function LegalNav() {
  const { language, setLanguage } = useLanguage();
  return (
    <header className="h-14 sticky top-0 z-40 flex items-center justify-between px-6 sm:px-8 border-b"
      style={{ background: `${L.bg}f5`, borderColor: L.border, backdropFilter: "blur(12px)" }}>
      <Link to="/" className="flex items-center gap-2.5 group">
        <img src="/sentinela-icon.svg" alt="" width="26" height="26" className="rounded-md" />
        <span className="text-sm font-semibold tracking-tight" style={{ color: L.text }}>Sentinela</span>
      </Link>
      <button
        onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
        className="text-xs font-medium px-2.5 py-1 rounded-md border transition-colors"
        style={{ color: L.muted, borderColor: L.border, background: "transparent" }}>
        {language === "pt" ? "EN" : "PT"}
      </button>
    </header>
  );
}

export function LegalPage({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle: string;
  updated: string;
  children: ReactNode;
}) {
  const { language } = useLanguage();
  return (
    <div style={{ background: L.bg, minHeight: "100vh", color: L.text }}>
      <LegalNav />
      <main style={{ maxWidth: "740px", margin: "0 auto", padding: "56px 24px 96px" }}>
        {/* Back */}
        <Link to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-10 transition-colors hover:opacity-100"
          style={{ color: L.muted, opacity: 0.85 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {language === "pt" ? "Voltar ao início" : "Back to home"}
        </Link>

        {/* Hero */}
        <div className="mb-12 pb-10 border-b" style={{ borderColor: L.border }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: L.accent, letterSpacing: "0.18em" }}>
            Sentinela
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3" style={{ color: L.text }}>
            {title}
          </h1>
          <p className="text-base leading-relaxed mb-4" style={{ color: L.muted }}>
            {subtitle}
          </p>
          <span className="text-xs" style={{ color: L.ghost }}>
            {language === "pt" ? "Última atualização" : "Last updated"}: {updated}
          </span>
        </div>

        {/* Content */}
        <div className="legal-body">
          {children}
        </div>
      </main>

      {/* Footer bar */}
      <footer className="border-t py-6 px-6 sm:px-8" style={{ borderColor: L.border }}>
        <div style={{ maxWidth: "740px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <span className="text-xs" style={{ color: L.ghost }}>
            © {new Date().getFullYear()} Baluarte Tecnologia. {language === "pt" ? "Todos os direitos reservados." : "All rights reserved."}
          </span>
          <div className="flex items-center gap-4 text-xs" style={{ color: L.muted }}>
            <Link to="/privacy" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.85 }}>
              {language === "pt" ? "Privacidade" : "Privacy"}
            </Link>
            <Link to="/terms" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.85 }}>
              {language === "pt" ? "Termos" : "Terms"}
            </Link>
            <Link to="/security" className="hover:opacity-100 transition-opacity" style={{ opacity: 0.85 }}>
              Security
            </Link>
          </div>
        </div>
      </footer>

      <style>{`
        .legal-body h2 {
          font-size: 1.125rem;
          font-weight: 600;
          color: ${L.text};
          margin: 2.5rem 0 0.75rem;
          letter-spacing: -0.018em;
        }
        .legal-body h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: ${L.text};
          margin: 1.75rem 0 0.5rem;
        }
        .legal-body p {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: ${L.muted};
          margin-bottom: 1rem;
        }
        .legal-body ul {
          list-style: none;
          margin: 0 0 1rem;
          padding: 0;
        }
        .legal-body ul li {
          font-size: 0.9375rem;
          line-height: 1.75;
          color: ${L.muted};
          padding: 0.25rem 0 0.25rem 1.25rem;
          position: relative;
        }
        .legal-body ul li::before {
          content: "–";
          position: absolute;
          left: 0;
          color: ${L.ghost};
        }
        .legal-body strong {
          color: ${L.text};
          font-weight: 600;
        }
        .legal-body a {
          color: ${L.accent};
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .legal-body a:hover {
          opacity: 0.8;
        }
        .legal-body .callout {
          background: ${L.surface};
          border: 1px solid ${L.border};
          border-radius: 10px;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
        }
        .legal-body .callout p {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
