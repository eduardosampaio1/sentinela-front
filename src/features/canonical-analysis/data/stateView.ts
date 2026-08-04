// Máquina de APRESENTAÇÃO dos 7 estados públicos (Onda 6 E3, item 12). PURA e estrita.
//
// Mapeia SÓ os estados públicos → { chave i18n de título/mensagem, ação, terminal, indeterminado }.
// NUNCA inventa fase, percentual, tempo restante, score, veredito. `indeterminate` significa
// "em andamento sem fonte confiável de progresso" — a UI mostra indicador INDETERMINADO, jamais %.

import type { AnalysisStatus, AnalysisStatusView } from "@/lib/v1";

export type AnalysisAction = "wait" | "view_result" | "retry" | "none" | "confirm_mapping";

export interface AnalysisStateView {
  status: AnalysisStatus;
  /** Chave i18n (namespace canonicalAnalysis.state.<status>.*). */
  titleKey: string;
  messageKey: string;
  action: AnalysisAction;
  /** Estado terminal (completed/failed) — encerra polling e a jornada de acompanhamento. */
  terminal: boolean;
  /** Em andamento sem progresso mensurável → indicador INDETERMINADO (nunca barra com %). */
  indeterminate: boolean;
  /** failed é a ÚNICA condição de erro; os demais nunca são tratados como erro. */
  isError: boolean;
}

const NS = "canonicalAnalysis.state";

export function describeAnalysisState(
  view: Pick<AnalysisStatusView, "status" | "retry_allowed">,
): AnalysisStateView {
  const status = view.status;
  const base = { status, titleKey: `${NS}.${status}.title`, messageKey: `${NS}.${status}.message` };
  switch (status) {
    case "preparing":
    case "receiving":
    case "queued":
    case "running":
    case "recovering":
      return { ...base, action: "wait", terminal: false, indeterminate: true, isError: false };
    case "needs_mapping":
      // Os quatro sinais dizem a mesma coisa por ângulos diferentes, e cada um evita um
      // desfecho ruim específico:
      //   `indeterminate: false` — nada está progredindo. Um spinner aqui seria a tela
      //     travada com cara de trabalho em curso: o usuário esperaria para sempre.
      //   `terminal: false` — a jornada não acabou. Tratá-la como terminal encerraria o
      //     acompanhamento de algo que ainda pode andar quando a pessoa confirmar.
      //   `isError: false` — nada quebrou. Pintar de erro faria o usuário procurar defeito
      //     onde há uma pergunta.
      //   `action: "confirm_mapping"` — há uma ação HUMANA pendente, e ela não é "retry":
      //     reenviar o mesmo arquivo daria exatamente o mesmo resultado.
      return {
        ...base,
        action: "confirm_mapping",
        terminal: false,
        indeterminate: false,
        isError: false,
      };
    case "completed":
      return { ...base, action: "view_result", terminal: true, indeterminate: false, isError: false };
    case "failed":
      return {
        ...base,
        action: view.retry_allowed ? "retry" : "none",
        terminal: true,
        indeterminate: false,
        isError: true,
      };
  }
}
