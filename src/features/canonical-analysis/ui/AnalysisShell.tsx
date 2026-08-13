// F2 — o shell da Analysis: **uma** Analysis, e o lugar de onde suas visões são alcançadas.
//
// ## Por que COMPONENTE e não rota de layout
//
// A primeira versão era uma rota de layout com `Outlet`, dona do `AppShell`. Ela quebrava duas
// coisas que já estavam decididas e provadas:
//
//   1. **M33** congelou que a barra superior identifica a superfície SOMENTE em `preparing` — a
//      lógica vive na `AnalysisPage` e tem gate lendo o `topBarTitle` dela. Subir o `AppShell`
//      para um layout apagaria a decisão junto com a prova.
//   2. Nesta casa **toda página é dona do próprio `AppShell`** (lista, resultado, comparação,
//      início). Um layout dono do chrome inverteria a convenção em uma rota só.
//
// As subrotas continuam sendo rotas de verdade — deep link por visão, refresh na visão certa e
// histórico do navegador. O que muda é só quem desenha o cabeçalho comum: este componente, dentro
// do `PageFrame` de cada visão. React Query deduplica a leitura de status pela `queryKey`, então
// não há segunda requisição por render.
//
// ## O que ele NÃO é
//
// **Não é terceira página de dados.** Identidade, estado e as entradas das visões — nada de
// indicador, nada de projeção. O mesmo dado em três lugares diverge em dois.
//
// **Não são abas.** O produto não possui o pattern `Tabs`: não existe no Design System, não há
// uso em lugar nenhum e nenhuma autoridade o menciona. Inventá-lo seria um primitivo estrutural
// sem equivalente — e a aba perderia deep link, refresh e histórico, que a subrota dá de graça.
//
// **Não é um segundo shell global.** A navegação global continua no `AppShell`; esta navegação
// é interna a UMA Analysis e não vira navegador de motor na sidebar.
//
// ## O status é da ANALYSIS
//
// `StatusBadge` aqui fala o vocabulário público (os 8 estados da Analysis). Não é status do
// ARGOS nem do Analytics — os componentes têm estados próprios, no vocabulário dos eixos, e
// vivem dentro de cada visão. Uma Analysis com Analytics pronto e ARGOS pendente continua sendo
// UMA Analysis com dois relógios (D13), não duas.

import { Link, useLocation } from "react-router-dom";
import { StatusBadge } from "@/design/patterns";
import type { EstadoPublico } from "@/design/patterns/estados";
import { useLanguage } from "@/contexts/LanguageContext";
import { VISOES_DA_ANALISE } from "./visoes";

export interface AnalysisShellProps {
  readonly analysisId: string;
  /** Estado público da Analysis. `undefined` enquanto a leitura não respondeu. */
  readonly estado?: EstadoPublico;
  /** Título da superfície atual — o `<h1>` da visão. */
  readonly titulo: string;
}

export function AnalysisShell({ analysisId, estado, titulo }: AnalysisShellProps) {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {/* Só aparece quando o estado chegou. Um badge de "carregando" inventaria um nono estado
            público, e o vocabulário é fechado. */}
        {estado ? (
          <StatusBadge
            vocabulario="publico"
            estado={estado}
            // O rotulo vem da familia ja publicada (`estadoPublico.*`), como na lista e na Home.
            // Escrever copy nova aqui daria DUAS palavras para o MESMO estado — o defeito que a
            // M11 existe para impedir.
            rotulo={t(`estadoPublico.${estado}`)}
          />
        ) : null}
      </div>

      {/* A identidade é o que torna a Analysis retomável por deep link — e é ela que a pessoa
          cola num chamado. Fica legível, não escondida num atributo. */}
      <p className="text-sm text-muted-foreground">
        <span className="sr-only">{t("canonicalAnalysis.shell.identity")}</span>{" "}
        <code className="font-mono text-xs">{analysisId}</code>
      </p>

      {VISOES_DA_ANALISE.length > 0 ? (
        <nav aria-label={t("canonicalAnalysis.shell.viewsNavLabel")}>
          <ul className="flex flex-wrap gap-2">
            {VISOES_DA_ANALISE.map((visao) => {
              const destino = `/analyses/${encodeURIComponent(analysisId)}/${visao.caminho}`;
              const atual = pathname === destino;
              return (
                <li key={visao.caminho}>
                  <Link
                    to={destino}
                    // `aria-current` e não só cor: a visão em que se está precisa ser legível
                    // por leitor de tela e por quem não distingue as duas cores.
                    aria-current={atual ? "page" : undefined}
                    className={[
                      "inline-flex min-h-11 items-center rounded-md border px-3 text-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      atual
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    {/* Template com PREFIXO ESTATICO. A primeira versao passava `rotuloKey` e
                        chamava `t(variavel)` — a decima chamada opaca, e a catraca M14 exige
                        exatamente nove. E o mesmo defeito que a M39 custou a diagnosticar. */}
                    {t(`canonicalAnalysis.shell.view.${visao.caminho}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
