import FinalCTA from "@/components/landing/FinalCTA";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import MetricsSection from "@/components/landing/MetricsSection";
import Navbar from "@/components/landing/Navbar";
import PricingSection from "@/components/landing/PricingSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SecuritySection from "@/components/landing/SecuritySection";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Index() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <MetricsSection />
      <HowItWorks />
      <SecuritySection />
      <PricingSection />
      <FinalCTA />
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          {t("landing.footerLegal")}
        </div>
      </footer>
    </div>
  );
}
