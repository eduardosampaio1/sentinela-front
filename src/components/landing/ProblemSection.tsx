import { AlertTriangle, BadgeDollarSign, MessageSquareWarning, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ProblemSection() {
  const { t } = useLanguage();
  const problems = [
    {
      icon: BadgeDollarSign,
      title: t("landing.problem1Title"),
      description: t("landing.problem1Body"),
    },
    {
      icon: MessageSquareWarning,
      title: t("landing.problem2Title"),
      description: t("landing.problem2Body"),
    },
    {
      icon: ShieldAlert,
      title: t("landing.problem3Title"),
      description: t("landing.problem3Body"),
    },
    {
      icon: AlertTriangle,
      title: t("landing.problem4Title"),
      description: t("landing.problem4Body"),
    },
  ];

  return (
    <section id="problem" className="bg-background py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            {t("landing.problemBadge")}
          </div>
          <h2 className="mb-6 text-3xl font-bold text-balance md:text-4xl">
            {t("landing.problemTitle")}
            <br />
            {t("landing.problemAccent")}
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">{t("landing.problemBody")}</p>
        </div>

        <div className="mx-auto mb-10 grid max-w-5xl gap-5 text-left md:grid-cols-2">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="rounded-2xl border border-border/50 bg-gradient-card p-5 transition-colors hover:border-primary/20 sm:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-warning/20 bg-warning/10">
                  <problem.icon className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <h3 className="mb-2 text-base font-semibold">{problem.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{problem.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-4xl rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 text-center">
          <p className="text-base font-medium leading-relaxed md:text-lg">{t("landing.problemClosing")}</p>
        </div>
      </div>
    </section>
  );
}
