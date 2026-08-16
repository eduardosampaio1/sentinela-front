// A página do AION — a composição, e só ela.
//
// ## O que este arquivo era
//
// 1167 linhas: nove seções, um diagrama SVG animado, uma demonstração com máquina de estado, um
// formulário com rede e a paleta inteira. A régua da casa é 400.
//
// Ele carregava sozinho o maior bolsão de a11y do produto — 76 nós de contraste, todos do mesmo
// `A.muted`. Isso não é coincidência: um token no meio de 1167 linhas é um token que ninguém
// revisa. A M46 corrigiu o valor; esta missão tira o esconderijo.
//
// ## Por que os cortes são estes
//
// O corte separa o que quebra por MOTIVOS DIFERENTES:
//
// * `DemoInterativa` — o único bloco com estado e temporizador; quebra por lógica;
// * `DiagramaDeFluxo` — SVG animado por CSS; quebra por geometria;
// * `ContactSection` — o único que faz rede; quebra por integração;
// * `casca`, `primitivos`, `tokens` — o enquadramento e o vocabulário;
// * três arquivos de seção, agrupados pela pergunta que respondem (o que é, quais módulos, como
//   integra).
//
// Quem edita copy de seção não precisa mais atravessar 124 linhas de `<path d="…">`.

import { A } from "./tokens";
import { Footer, Navbar } from "./casca";
import { Hero, MetricsSection, ProblemSection } from "./secoes-topo";
import { ModulesSection, NemosSection } from "./secoes-modulos";
import { AgnosticSection, IntegrationSection, ObservabilitySection } from "./secoes-integracao";
import { ContactSection } from "./ContactSection";

export function AionPage() {
  return (
    <div className="min-h-screen" style={{ background: A.bg, color: A.text }}>
      <Navbar />
      {/* M46: faltava o landmark de conteúdo — sem ele não há "pular para o conteúdo". */}
      <main>
        <Hero />
        <ProblemSection />
        <MetricsSection />
        <ModulesSection />
        <NemosSection />
        <IntegrationSection />
        <AgnosticSection />
        <ObservabilitySection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
