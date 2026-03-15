import { Clock, Eye, Server, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SecuritySection() {
  const { language } = useLanguage();

  const copy =
    language === "pt-BR"
      ? {
          title: "Segurança e confiança importam tanto quanto detecção",
          body:
            "Observabilidade para IA só funciona quando o time consegue avaliar comportamento com disciplina sobre privacidade, acesso e tratamento de dados sensíveis.",
          features: [
            {
              icon: Clock,
              title: "Mentalidade de minimização de dados",
              desc: "O fluxo de análise busca limitar retenção desnecessária e manter o tratamento restrito ao diagnóstico.",
            },
            {
              icon: Eye,
              title: "Revisão consciente de privacidade",
              desc: "Pensado para times que precisam visibilidade sobre o modelo sem tratar dados conversacionais de forma casual.",
            },
            {
              icon: Shield,
              title: "Design atento a acesso",
              desc: "Autenticação, separação de ambientes e áreas protegidas ajudam a controlar acesso às análises.",
            },
            {
              icon: Server,
              title: "Direção pronta para enterprise",
              desc: "O Sentinela está sendo moldado para organizações que precisam disciplina de governança, não só um dashboard mais bonito.",
            },
          ],
        }
      : {
          title: "Security and trust matter as much as detection",
          body:
            "Observability for AI only works when teams can evaluate behavior with discipline around privacy, access, and how sensitive data is handled.",
          features: [
            {
              icon: Clock,
              title: "Data minimization mindset",
              desc: "The analysis flow is designed to limit unnecessary retention and keep handling scoped to what the diagnostic needs.",
            },
            {
              icon: Eye,
              title: "Privacy-conscious review",
              desc: "Built for teams that need visibility into model behavior without treating conversation data casually.",
            },
            {
              icon: Shield,
              title: "Access-aware product design",
              desc: "Authentication, environment separation, and protected application areas help keep analysis access controlled.",
            },
            {
              icon: Server,
              title: "Enterprise-ready direction",
              desc: "Sentinela is being shaped for organizations that need governance discipline, not just a prettier dashboard.",
            },
          ],
        };

  return (
    <section id="security" className="bg-background py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">{copy.title}</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">{copy.body}</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
          {copy.features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 rounded-2xl border border-border/50 bg-gradient-card p-5 sm:p-6"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
