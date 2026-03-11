import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload, Plug } from "lucide-react";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import { useAuth } from "@/contexts/AuthContext";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  function handleAnalyzeClick() {
    if (loading) return;

    if (user) {
      navigate("/dashboard");
      return;
    }

    navigate("/login");
  }

  return (
    <section className="relative min-h-screen flex items-center pt-16 bg-gradient-hero overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-up">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
              You trust your AI.
              <br />
              <span className="text-gradient">But is it consistent?</span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Sentinela analyzes your AI conversations and reveals behavioral drift, token waste, and structural inconsistency before they become operational risks.
            </p>

            <div className="flex gap-3 mb-8 p-4 rounded-lg border border-border/50 bg-card/50 max-w-md">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm text-secondary-foreground cursor-pointer hover:bg-secondary/80 transition-colors">
                <Upload className="w-4 h-4" />
                Upload JSON
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm text-secondary-foreground cursor-pointer hover:bg-secondary/80 transition-colors">
                <Plug className="w-4 h-4" />
                Connect API
              </div>
            </div>

            <Button
              size="lg"
              className="bg-gradient-primary text-primary-foreground font-semibold text-base px-8 hover:opacity-90 transition-opacity shadow-glow"
              onClick={handleAnalyzeClick}
              disabled={loading}
            >
              {loading ? "Checking session..." : "Analyze 100 conversations free"}
            </Button>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <div className="relative">
              <div className="rounded-xl overflow-hidden border border-border/30 shadow-card">
                <img src={dashboardMockup} alt="Sentinela Dashboard" className="w-full" />
              </div>

              <div
                className="absolute -bottom-4 -left-4 glass rounded-lg p-3 shadow-card animate-fade-in"
                style={{ animationDelay: "0.6s" }}
              >
                <div className="text-xs text-muted-foreground">Consistency Score</div>
                <div className="text-xl font-bold text-primary">78%</div>
              </div>

              <div
                className="absolute -top-4 -right-4 glass rounded-lg p-3 shadow-card animate-fade-in"
                style={{ animationDelay: "0.8s" }}
              >
                <div className="text-xs text-muted-foreground">Token Waste</div>
                <div className="text-xl font-bold text-warning">
                  $2,340<span className="text-xs text-muted-foreground">/mo</span>
                </div>
              </div>

              <div
                className="absolute top-1/2 -right-6 glass rounded-lg p-3 shadow-card animate-fade-in"
                style={{ animationDelay: "1s" }}
              >
                <div className="text-xs text-muted-foreground">Critical Alerts</div>
                <div className="text-xl font-bold text-critical">4</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;