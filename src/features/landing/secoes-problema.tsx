// As duas seções que estabelecem o problema e a plataforma.
//
// Vêm juntas porque contam uma coisa só: o que dói hoje, e o que o produto põe no lugar. Separá-las
// em dois arquivos de ~110 linhas dividiria um argumento que se lê em sequência.

import { C, display, mono, type TagColor } from "./tokens";
import { SectionLabel, Sparkline, Tag } from "./primitivos";
import { useLanguage } from "@/contexts/LanguageContext";

export function ProblemSection() {
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
              <div data-overflow-ok="orbe-decorativo" aria-hidden="true" className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
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

export function PlatformSection() {
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
                boxShadow: "hsl(var(--ds-border-default)) 0px 0px 0px 1px, rgba(0,0,0,0.15) 0px 2px 8px -2px",
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
