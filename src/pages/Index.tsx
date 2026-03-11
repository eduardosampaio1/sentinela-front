import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import MetricsSection from "@/components/landing/MetricsSection";
import HowItWorks from "@/components/landing/HowItWorks";
import SecuritySection from "@/components/landing/SecuritySection";
import PricingSection from "@/components/landing/PricingSection";
import FinalCTA from "@/components/landing/FinalCTA";

const Index = () => {
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
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 Sentinela. AI observability for production teams. Powered by Baluarte. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;