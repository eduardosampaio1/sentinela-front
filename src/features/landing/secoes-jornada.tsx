// Como funciona, e o que se ganha.
//
// O par que descreve a jornada: os passos e o desfecho. `HowItWorksSection` contém os cards com o
// numeral-fantasma `aria-hidden` — textura a 1.04:1, um dos seis nós de a11y que a M46 deixou
// contados com motivo escrito.

import { C, display, mono } from "./tokens";
import { SectionLabel } from "./primitivos";
import { useLanguage } from "@/contexts/LanguageContext";

export function HowItWorksSection() {
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
              {/* Watermark — M46: é textura, e agora está declarada como tal.
                  A 1.04:1 este numeral é invisível para TODO MUNDO, que é o efeito pretendido
                  (`rgba(255,255,255,0.025)`, `select-none`, `pointer-events-none`). E o mesmo
                  número aparece legível logo abaixo, em "Step {n}". `aria-hidden` aqui não esconde
                  informação: evita que um leitor de tela anuncie duas vezes o que já está escrito,
                  e tira do gate um nó que nunca foi conteúdo. */}
              <div aria-hidden="true" className="absolute top-2 right-3 select-none pointer-events-none"
                style={{ ...mono, fontSize: "72px", fontWeight: 800, color: "rgba(255,255,255,0.025)", lineHeight: 1 }}>
                {s.num}
              </div>

              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: C.accentBg, boxShadow: `${C.accentBord} 0px 0px 0px 1px` }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.accentBr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icon} />
                </svg>
              </div>

              <div style={{ ...mono, fontSize: "9px", letterSpacing: "0.22em", textTransform: "uppercase", color: C.accentBr, marginBottom: "0.5rem" }}>
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

export function OutcomesSection() {
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
