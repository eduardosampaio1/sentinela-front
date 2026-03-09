import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import MetricsSection from "@/components/landing/MetricsSection";
import ProblemSection from "@/components/landing/ProblemSection";
import PricingSection from "@/components/landing/PricingSection";
import SecuritySection from "@/components/landing/SecuritySection";
import FinalCTA from "@/components/landing/FinalCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <MetricsSection />
      <ProblemSection />
      <PricingSection />
      <SecuritySection />
      <FinalCTA />
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 Sentinela. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
