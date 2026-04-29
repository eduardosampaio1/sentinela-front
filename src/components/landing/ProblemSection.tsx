import React from "react";

const QUESTIONS = [
  {
    q: "Sua IA está boa?",
    context:
      "Ou ela está degradando em silêncio, run a run, sem ninguém perceber?",
    metric: "Behavior Score",
    value: "72",
    unit: "/100",
    badge: "Degradando",
    barWidth: "72%",
    barColor: "bg-warning",
    accentColor: "border-warning/25 bg-warning/5",
    valueColor: "text-warning",
    badgeColor: "text-warning border-warning/30 bg-warning/10",
  },
  {
    q: "Ela está piorando?",
    context:
      "Drift estrutural acumula run a run antes de virar reclamação de usuário.",
    metric: "Drift Index",
    value: "0.34",
    unit: "↑ alto",
    badge: "Crescendo",
    barWidth: "34%",
    barColor: "bg-critical",
    accentColor: "border-critical/20 bg-critical/5",
    valueColor: "text-critical",
    badgeColor: "text-critical border-critical/30 bg-critical/10",
  },
  {
    q: "Quanto custa cada resposta útil?",
    context:
      "40% do spend de tokens vai para verbosidade, repetição e respostas sem valor.",
    metric: "Cost per Useful Outcome",
    value: "$0.12",
    unit: "vs $0.08 ideal",
    badge: "+50% acima",
    barWidth: "60%",
    barColor: "bg-critical",
    accentColor: "border-critical/20 bg-critical/5",
    valueColor: "text-critical",
    badgeColor: "text-critical border-critical/30 bg-critical/10",
  },
  {
    q: "O que você deve corrigir primeiro?",
    context:
      "Prioridade clara, evidência imediata, ação possível — sem especulação.",
    metric: "Top Priority",
    value: "Verbosity",
    unit: "intent_cluster_3",
    badge: "Alta prioridade",
    barWidth: "88%",
    barColor: "bg-primary",
    accentColor: "border-primary/20 bg-primary/5",
    valueColor: "text-primary",
    badgeColor: "text-primary border-primary/30 bg-primary/10",
  },
];

export default function ProblemSection() {
  return (
    <section id="problem" className="bg-background py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono-label text-xs font-medium text-primary">
            Por que o Sentinela existe
          </div>
          <h2 className="mb-5 font-display text-3xl font-bold text-balance md:text-4xl">
            Quatro perguntas que toda equipe de IA deveria conseguir responder.{" "}
            <span className="text-muted-foreground font-normal">Quase nenhuma consegue.</span>
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            O Sentinela foi construído para responder essas quatro perguntas com dados reais,
            não com intuição.
          </p>
        </div>

        {/* 4 question cards — 2x2 bento */}
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
          {QUESTIONS.map((item) => (
            <div
              key={item.q}
              className={`group relative rounded-2xl border ${item.accentColor} p-6 transition-all duration-200 hover:shadow-card cursor-default overflow-hidden`}
            >
              {/* Subtle corner glow */}
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/5 blur-2xl pointer-events-none group-hover:bg-primary/10 transition-all duration-300" />

              {/* Question */}
              <h3 className="font-display text-xl font-bold mb-2 text-foreground relative z-10">
                {item.q}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 relative z-10">
                {item.context}
              </p>

              {/* Metric display */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono-label text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {item.metric}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 font-mono-label text-[9px] font-semibold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <span className={`font-mono-label text-2xl font-bold leading-none ${item.valueColor}`}>
                    {item.value}
                  </span>
                  <span className="pb-0.5 font-mono-label text-xs text-muted-foreground">
                    {item.unit}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-border/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.barColor} opacity-70 animate-count-bar`}
                    style={{ "--bar-width": item.barWidth } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
