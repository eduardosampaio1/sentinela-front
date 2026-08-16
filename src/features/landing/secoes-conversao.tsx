// Preço e chamada final.
//
// As duas seções de conversão. Ficam juntas porque quem mexe numa quase sempre mexe na outra: o
// que o preço promete é o que a chamada final cobra.

import { Button } from "@/components/ui/button";
import { C, display, mono } from "./tokens";
import { GlowDot, SectionLabel, Tag } from "./primitivos";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export function PricingSection() {
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

export function FinalCTA() {
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
