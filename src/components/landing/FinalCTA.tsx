import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinalCTA = () => {
  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
      </div>
      <div className="container mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">Governance is not optional.</h2>
        <p className="text-muted-foreground mb-10 max-w-md mx-auto">
          Start monitoring your AI's behavioral integrity today.
        </p>
        <Link to="/dashboard">
          <Button size="lg" className="bg-gradient-primary text-primary-foreground font-semibold text-lg px-10 py-6 hover:opacity-90 transition-opacity shadow-glow">
            Start Free
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default FinalCTA;
