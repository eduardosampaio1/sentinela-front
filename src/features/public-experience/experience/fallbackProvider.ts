import type { PublicExperienceLocale } from "../content/copy";
import type { ExperienceResult, PublicExperienceProvider } from "./types";

function classify(input: string) {
  const risky = /diagn[oó]|password|senha|secret|segredo|credit card|cart[aã]o|harm|weapon|arma|suicide|suic[ií]d|medical|m[eé]dic/i.test(input);
  const complex = input.length > 110 || /explain|explique|compare|analy[sz]e|analis|strategy|estrat[eé]gia|quantum|qu[aâ]ntic/i.test(input);
  return { risky, complex };
}

export class FallbackDemoProvider implements PublicExperienceProvider {
  constructor(private readonly locale: PublicExperienceLocale = "en") {}

  async submit(input: string): Promise<ExperienceResult> {
    const { risky, complex } = classify(input);
    await new Promise((resolve) => window.setTimeout(resolve, 520));

    if (this.locale === "pt-BR") return buildPortugueseResult(risky, complex);

    if (risky) {
      return {
        answer:
          "A confident answer would be the wrong outcome here. Sentinela would restrict the route, preserve the uncertainty and ask for qualified human review.",
        decision: {
          llmRequired: false,
          route: "controlled-response",
          risk: "high",
          rationale: "The request asks the system to remove safeguards from a high-impact decision.",
          contextStrategy: "Retain only the minimum context needed to explain the boundary.",
        },
        trace: buildTrace("Risk changed the action, not just the wording."),
        mode: "fallback",
        illustrative: true,
      };
    }

    return {
      answer: complex
        ? "Sentinela would preserve the nuance, select a capable route and constrain the answer to what the evidence supports. The goal is not a longer answer. It is a controlled one."
        : "Sentinela first decides whether AI is needed at all. Simple requests can take a lighter route without giving up control or traceability.",
      decision: {
        llmRequired: true,
        route: complex ? "capable-model" : "efficient-model",
        risk: "low",
        rationale: complex
          ? "The request benefits from reasoning and careful explanation."
          : "The request is low-risk and can use an efficient route.",
        contextStrategy: complex ? "Keep the relevant nuance." : "Use the smallest useful context.",
      },
      trace: buildTrace("The route matches the work instead of defaulting to the largest model."),
      mode: "fallback",
      illustrative: true,
    };
  }
}

function buildPortugueseResult(risky: boolean, complex: boolean): ExperienceResult {
  if (risky) {
    return {
      answer: "Uma resposta confiante seria o resultado errado. O Sentinela restringiria a rota, preservaria a incerteza e pediria revisão humana qualificada.",
      decision: {
        llmRequired: false,
        route: "resposta-controlada",
        risk: "high",
        rationale: "A solicitação tenta remover proteções de uma decisão de alto impacto.",
        contextStrategy: "Manter apenas o contexto mínimo para explicar o limite.",
      },
      trace: buildPortugueseTrace("O risco mudou a ação, não apenas a redação."),
      mode: "fallback",
      illustrative: true,
    };
  }

  return {
    answer: complex
      ? "O Sentinela preservaria as nuances, escolheria uma rota capaz e limitaria a resposta ao que as evidências sustentam. O objetivo não é responder mais. É responder com controle."
      : "O Sentinela primeiro decide se a IA é realmente necessária. Solicitações simples podem seguir uma rota mais leve sem perder controle ou rastreabilidade.",
    decision: {
      llmRequired: true,
      route: complex ? "modelo-capaz" : "modelo-eficiente",
      risk: "low",
      rationale: complex ? "A solicitação exige raciocínio e uma explicação cuidadosa." : "A solicitação tem baixo risco e pode usar uma rota eficiente.",
      contextStrategy: complex ? "Preservar as nuances relevantes." : "Usar o menor contexto útil.",
    },
    trace: buildPortugueseTrace("A rota acompanha o trabalho em vez de usar sempre o maior modelo."),
    mode: "fallback",
    illustrative: true,
  };
}

function buildPortugueseTrace(decision: string): ExperienceResult["trace"] {
  return [
    { stage: "understand", label: "Entender", detail: "Classificar intenção, complexidade e risco.", status: "completed" },
    { stage: "decide", label: "Decidir", detail: decision, status: "completed" },
    { stage: "control", label: "Controlar", detail: "Aplicar limites de rota e contexto.", status: "completed" },
    { stage: "respond", label: "Responder", detail: "Entregar a resposta com a decisão rastreável.", status: "completed" },
  ];
}

function buildTrace(decision: string): ExperienceResult["trace"] {
  return [
    { stage: "understand", label: "Understand", detail: "Classify intent, complexity and risk.", status: "completed" },
    { stage: "decide", label: "Decide", detail: decision, status: "completed" },
    { stage: "control", label: "Control", detail: "Apply route and context boundaries.", status: "completed" },
    { stage: "respond", label: "Respond", detail: "Return an answer with the decision trace intact.", status: "completed" },
  ];
}
