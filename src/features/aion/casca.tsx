// A casca da página do AION: navegação do topo e rodapé.
//
// Estavam a mil linhas um do outro (28 e 1052) sendo a mesma peça — o enquadramento. O `<main>`
// entre os dois foi o achado da M46: a página não tinha landmark de conteúdo.

import { A, display } from "./tokens";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function Navbar() {
  return (
    <header className="h-16 flex items-center justify-between px-6 sm:px-8 border-b sticky top-0 z-40"
      style={{ background: `${A.bg}f0`, borderColor: A.border, backdropFilter: "blur(12px)" }}>
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/sentinela-icon.svg" alt="" width="28" height="28" className="rounded-lg"
            style={{ boxShadow: `0 0 14px -6px ${A.primary}80` }} />
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold" style={{ color: A.text, ...display }}>Sentinela</span>
            <span style={{ color: A.border }}>·</span>
            <span className="text-sm font-bold" style={{ color: A.primary, ...display }}>AION</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {[
            { href: "#problem",     label: "Why AION" },
            { href: "#modules",     label: "Modules" },
            { href: "#integration", label: "Integration" },
            { href: "#contact",     label: "Contact" },
          ].map(({ href, label }) => (
            <a key={href} href={href} className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{ color: A.muted }}
              onMouseEnter={e => { e.currentTarget.style.color = A.text; }}
              onMouseLeave={e => { e.currentTarget.style.color = A.muted; }}>
              {label}
            </a>
          ))}
          <span className="mx-1 h-4 w-px" style={{ background: A.border }} aria-hidden="true" />
          <Link to="/" className="px-3 py-1.5 rounded-lg text-sm transition-colors" style={{ color: A.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = A.text)}
            onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
            ← Sentinela
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="rounded-xl" style={{ color: A.muted }}>Sign in</Button>
        </Link>
        <a href="#contact">
          <Button size="sm" className="rounded-xl font-semibold" style={{ background: A.primary, color: A.bg }}>
            Request demo
          </Button>
        </a>
      </div>
    </header>
  );
}

// ─── Interactive demo ────────────────────────────────────────────────────────

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t" style={{ background: A.bg, borderColor: A.border }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/sentinela-icon.svg" alt="" width="26" height="26" className="rounded-md" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold" style={{ color: A.text, ...display }}>Sentinela</span>
                <span style={{ color: A.border }}>·</span>
                <span className="text-sm font-bold" style={{ color: A.primary, ...display }}>AION</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: A.muted, maxWidth: "200px" }}>
              AI Control Plane for production teams. Runtime policy, routing, and learning — in one proxy.
            </p>
          </div>

          {[
            {
              title: "Product",
              links: [
                { label: "Why AION", href: "#problem" },
                { label: "Modules",  href: "#modules" },
                { label: "Integration", href: "#integration" },
                { label: "Observability", href: "#contact" },
              ],
            },
            {
              title: "Engine",
              links: [
                { label: "Controls",         href: "#modules", color: A.estixe },
                { label: "Decides",          href: "#modules", color: A.nomos  },
                { label: "Optimizes",        href: "#modules", color: A.metis  },
                { label: "Learning Engine",  href: "#modules", color: A.nemos  },
              ],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: A.muted, letterSpacing: "0.14em" }}>{title}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, href, color }) => (
                  <li key={label}>
                    <a href={href} className="text-sm transition-colors inline-flex items-center gap-1.5" style={{ color: A.muted }}
                      onMouseEnter={e => (e.currentTarget.style.color = A.text)}
                      onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
                      {color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: A.muted, letterSpacing: "0.14em" }}>Platform</p>
            <ul className="space-y-2.5 mb-6">
              {[{ label: "Sentinela", to: "/" }, { label: "Get started", to: "/register" }, { label: "Sign in", to: "/login" }].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm transition-colors" style={{ color: A.muted }}
                    onMouseEnter={e => (e.currentTarget.style.color = A.text)}
                    onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: A.muted, letterSpacing: "0.14em" }}>Legal</p>
            <ul className="space-y-2">
              {[{ label: "Privacy", to: "/privacy" }, { label: "Terms", to: "/terms" }, { label: "Security", to: "/security" }].map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm transition-colors" style={{ color: A.muted }}
                    onMouseEnter={e => (e.currentTarget.style.color = A.text)}
                    onMouseLeave={e => (e.currentTarget.style.color = A.muted)}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t" style={{ borderColor: A.border }}>
          <span className="text-xs" style={{ color: A.muted }}>© {year} Baluarte Tecnologia. All rights reserved.</span>
          <span className="text-xs" style={{ color: A.muted }}>contato@baluarte.ia.br</span>
        </div>
      </div>
    </footer>
  );
}

// ─── AionPage ─────────────────────────────────────────────────────────────────
