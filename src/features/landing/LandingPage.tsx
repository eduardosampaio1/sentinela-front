// A landing pública — a composição, e só ela.
//
// ## O que este arquivo era
//
// 1182 linhas. Vinte componentes, a paleta inteira, sete seções e o painel simulado do herói, tudo
// num só lugar. A régua da casa é 400, e ele estava na baseline do anti-monólito desde a M07 com o
// motivo *"decompor é missão própria (D17)"*.
//
// A M46 tirou dele os tokens — não por virtude, mas porque a catraca recusou as ~19 linhas de
// comentário que as correções de a11y exigiam. Foi o primeiro sinal de que o arquivo já não cabia
// nem nas próprias correções.
//
// ## Por que os cortes são estes
//
// Não foi "um arquivo por componente": isso trocaria um monólito por vinte arquivos de 60 linhas e
// perderia o que se lê em sequência. O corte segue quem MUDA JUNTO:
//
// * `primitivos` — os quatro blocos que todas as seções usam;
// * `tokens` — a paleta (extraída na M46);
// * `PainelArgos` — a ilustração do herói, o bloco que mais muda quando o produto muda de cara;
// * `casca` — `<header>` e `<footer>`, que estavam a 800 linhas um do outro sendo a mesma peça;
// * `topo` — herói e esteira de modelos;
// * três arquivos de seção, agrupados por ARGUMENTO (problema, jornada, conversão).
//
// O que sobra aqui é a ORDEM da página — que é a única coisa que este arquivo sempre quis dizer.

import { C } from "./tokens";
import { Footer, Navbar } from "./casca";
import { ContextStrip, Hero } from "./topo";
import { PlatformSection, ProblemSection } from "./secoes-problema";
import { HowItWorksSection, OutcomesSection } from "./secoes-jornada";
import { FinalCTA, PricingSection } from "./secoes-conversao";

export function LandingPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh" }}>
      <Navbar />
      {/* M46: a primeira tela do produto era a única sem landmark de conteúdo. */}
      <main>
        <Hero />
        <ContextStrip />
        <ProblemSection />
        <PlatformSection />
        <HowItWorksSection />
        <OutcomesSection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
