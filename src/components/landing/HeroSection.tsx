import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Upload, Plug, ShieldCheck, Activity, PlayCircle } from "lucide-react";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";


const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { language, t } = useLanguage();
  const featurePills =
    language === "pt-BR"
      ? ["Detecte deriva cedo", "Compare datasets ao longo do tempo", "Reduza desperdício"]
      : ["Detect drift early", "Compare datasets over time", "Reduce wasted spend"];

  function handlePrimaryClick() {
    if (loading) return;
    navigate(user ? "/dashboard" : "/login");
  }

  function handleSecondaryClick() {
    navigate(user ? "/dashboard?demo=1" : "/login?demo=1");
  }

  return (
    <section className="relative min-h-screen flex items-center pt-16 bg-gradient-hero overflow-hidden landing-grid">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[720px] h-[720px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-20 relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="animate-fade-up max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary mb-6">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("landing.heroBadge")}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.03] mb-6 text-balance">
              {t("landing.heroTitle")}
              <br />
              <span className="text-gradient">{t("landing.heroAccent")}</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
              {t("landing.heroBody")}
            </p>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 mb-8 max-w-2xl">
              <div className="text-sm font-semibold text-foreground">{t("landing.heroProofTitle")}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("landing.heroProofBody")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-8 max-w-2xl">
              <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Upload className="h-4 w-4 text-primary" />
                  {t("landing.heroUploadTitle")}
                </div>
                <p className="text-sm text-muted-foreground">{t("landing.heroUploadBody")}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Plug className="h-4 w-4 text-primary" />
                  {t("landing.heroConnectTitle")}
                </div>
                <p className="text-sm text-muted-foreground">{t("landing.heroConnectBody")}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                size="lg"
                className="bg-gradient-primary text-primary-foreground font-semibold text-base px-8 hover:opacity-90 transition-opacity shadow-glow"
                onClick={handlePrimaryClick}
                disabled={loading}
              >
                {loading ? t("common.loading") : t("landing.heroPrimary")}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="border-border/60 bg-card/40 hover:bg-card/70"
                onClick={handleSecondaryClick}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                {t("landing.heroSecondary")}
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              {featurePills.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up lg:block hidden" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <div className="absolute inset-0 rounded-[28px] bg-primary/10 blur-3xl scale-95" />
              <div className="relative rounded-[28px] overflow-hidden border border-border/40 shadow-card bg-card/70 backdrop-blur-sm">
                <img src={dashboardMockup} alt="Sentinela dashboard preview" className="w-full object-cover" />
              </div>

              <div className="absolute -bottom-5 -left-5 glass rounded-xl p-4 shadow-card animate-fade-in min-w-[190px]" style={{ animationDelay: "0.6s" }}>
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Consistency score</div>
                <div className="mt-1 text-2xl font-bold text-primary">78%</div>
                <div className="text-xs text-muted-foreground mt-1">Stable baseline, but uneven by intent cluster.</div>
              </div>

              <div className="absolute -top-5 -right-5 glass rounded-xl p-4 shadow-card animate-fade-in min-w-[190px]" style={{ animationDelay: "0.8s" }}>
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Estimated waste</div>
                <div className="mt-1 text-2xl font-bold text-warning">$2,340/mo</div>
                <div className="text-xs text-muted-foreground mt-1">Driven by verbosity, repetition, and weak answer discipline.</div>
              </div>

              <div className="absolute top-[58%] -right-8 glass rounded-xl p-4 shadow-card animate-fade-in min-w-[176px]" style={{ animationDelay: "1s" }}>
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Critical alerts</div>
                <div className="mt-1 text-2xl font-bold text-critical">4</div>
                <div className="text-xs text-muted-foreground mt-1">High-severity instability detected across similar prompts.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
