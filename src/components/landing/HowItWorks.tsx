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

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3 md:gap-8 relative">
          {/* Connector line between cards (desktop) */}
          <div className="absolute hidden md:block top-[2.75rem] left-[calc(33.3%+1.5rem)] right-[calc(33.3%+1.5rem)] h-px bg-gradient-to-r from-primary/40 via-primary/20 to-primary/40 pointer-events-none" />

          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group relative rounded-2xl border border-border/50 bg-gradient-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-glow-sm cursor-default sm:p-8 overflow-hidden"
            >
              {/* Large watermark number */}
              <div className="absolute top-3 right-4 font-mono-label text-[5rem] font-bold leading-none text-border/15 select-none pointer-events-none">
                0{index + 1}
              </div>

              <div className="mb-5 relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 transition-all duration-200 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:shadow-glow-sm">
                <step.icon className="h-6 w-6 text-primary" />
              </div>

              <div className="mb-3 relative z-10 font-mono-label text-[10px] uppercase tracking-[0.22em] text-primary/60">
                Step 0{index + 1}
              </div>
              <h3 className="mb-3 relative z-10 text-lg font-semibold">{step.title}</h3>
              <p className="relative z-10 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
