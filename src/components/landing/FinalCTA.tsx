import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const FinalCTA = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden landing-grid">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[480px] h-[480px] rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-balance">
            {t("landing.footerTitle")}
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("landing.footerBody")}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground font-semibold text-lg px-10 py-6 hover:opacity-90 transition-opacity shadow-glow">
                {t("common.startFree")}
              </Button>
            </Link>
            <Link to="/login?demo=1">
              <Button size="lg" variant="outline" className="border-border/60 bg-card/40 px-10 py-6 text-lg">
                {t("landing.heroSecondary")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
