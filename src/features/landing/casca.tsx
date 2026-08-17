// A casca da landing: navegação do topo e rodapé.
//
// Os dois são `<header>` e `<footer>` de verdade — o `<main>` que faltava entre eles foi o achado
// da M46. Ficavam nas pontas opostas do arquivo (linhas 228 e 1067), a 800 linhas de distância,
// apesar de serem a mesma peça: o enquadramento da página.

import { Button } from "@/components/ui/button";
import { C, display, mono } from "./tokens";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export function Navbar() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <header
      className="fixed top-3 left-4 right-4 sm:left-6 sm:right-6 z-50 h-14 flex items-center justify-between px-4 sm:px-5 rounded-xl"
      style={{
        background: "rgba(9,9,11,0.90)",
        boxShadow: "hsl(var(--ds-border-default)) 0px 0px 0px 1px, 0 8px 24px -8px rgba(0,0,0,0.5)",
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
          style={{ ...mono, fontWeight: 600, color: C.ghost, boxShadow: `hsl(var(--ds-border-default)) 0px 0px 0px 1px`, background: C.bgCard, cursor: "pointer", border: "none" }}
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
            style={{ ...display, background: C.accent, color: "hsl(var(--ds-text-on-accent))", fontWeight: 500 }}>
            {t("landing.v2.nav.start")}
          </Button>
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function Footer() {
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
