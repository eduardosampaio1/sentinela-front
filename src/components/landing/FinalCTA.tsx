import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinalCTA = () => {
  return (
    <section className="py-24 bg-gradient-hero relative overflow-hidden landing-grid">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[480px] h-[480px] rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-balance">
            Stop treating production AI like a black box.
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Start with a free analysis, see where behavior is drifting, and give your team a more precise way to govern
            quality, consistency, and cost.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground font-semibold text-lg px-10 py-6 hover:opacity-90 transition-opacity shadow-glow">
              Start free
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
