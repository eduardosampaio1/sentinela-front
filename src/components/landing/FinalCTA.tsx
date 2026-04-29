import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinalCTA = () => {
  return (
    <section className="py-28 bg-gradient-hero relative overflow-hidden landing-grid">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div
        className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: "hsl(265 70% 60% / 0.08)" }}
      />

      <div className="container mx-auto px-6 text-center relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono-label text-xs font-medium text-primary">
            Pronto quando você estiver
          </div>

          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance leading-[1.05]">
            Pare de adivinhar o que sua IA está fazendo.
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload do dataset, análise em segundos, decisão com evidência. Sem infraestrutura,
            sem integração de código, sem surpresas na fatura.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login">
              <Button
                size="lg"
                className="bg-gradient-primary text-primary-foreground font-semibold text-base px-10 h-12 hover:opacity-90 transition-opacity shadow-glow"
              >
                Começar agora — é grátis
              </Button>
            </Link>
            <Link to="/login?demo=1">
              <Button
                size="lg"
                variant="outline"
                className="border-border/60 bg-card/40 h-12 px-10 hover:bg-card/70 transition-colors"
              >
                Ver demonstração
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
