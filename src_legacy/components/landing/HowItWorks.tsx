import { FileText, Search, Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HowItWorks() {
  const { t } = useLanguage();
  const steps = [
    { icon: Upload, title: t("landing.workflowStep1Title"), description: t("landing.workflowStep1Body") },
    { icon: Search, title: t("landing.workflowStep2Title"), description: t("landing.workflowStep2Body") },
    { icon: FileText, title: t("landing.workflowStep3Title"), description: t("landing.workflowStep3Body") },
  ];

  return (
    <section id="workflow" className="bg-background py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {t("landing.workflow")}
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">{t("landing.workflowTitle")}</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">{t("landing.workflowBody")}</p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group relative rounded-2xl border border-border/50 bg-gradient-card p-6 transition-all hover:border-primary/30 sm:p-8"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 transition-colors group-hover:bg-primary/20">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                0{index + 1}
              </div>
              <h3 className="mb-3 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
