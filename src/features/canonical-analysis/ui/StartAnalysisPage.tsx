// Entrada da jornada (Onda 6 E2, itens 2-4). Auth → workspace ativo → prepare com Idempotency-Key
// da INTENÇÃO → recebe analysis_id → navega para a identidade durável /canonical/analyses/:id.

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useRevelacao } from "@/design/motion";
import { useIniciarAnalise } from "./useIniciarAnalise";
import { ProblemNotice } from "./notices";
import { AvisoDaJornada } from "./AvisoDaJornada";
import { LoadingState } from "@/design/patterns";

export function StartAnalysisPage() {
  const { t } = useLanguage();
  // A M37 moveu a intenção para `useIniciarAnalise`, sem contexto de Instância — esta é a jornada
  // GERAL, e ela precisa continuar exatamente igual. O 409, a chave por intenção e a navegação
  // para a identidade durável vivem lá agora, num lugar só.
  const { iniciar, escopo: scope, conflito, pendente, erro } = useIniciarAnalise();
  const iniciou = useRef(false);

  // `/analyses/new` e uma intencao, nao uma etapa para a pessoa confirmar de novo. A reserva
  // continua existindo no backend, mas acontece ao entrar e desemboca direto na tela de upload.
  useEffect(() => {
    if (!scope || iniciou.current) return;
    iniciou.current = true;
    iniciar();
  }, [scope, iniciar]);

  // Esta tela NÃO recebeu o arquétipo de composição, e o motivo é que não há o que compor: a
  // jornada canônica cria a intenção primeiro e recebe os dados depois, então aqui existem um
  // botão e os estados que podem impedi-lo. Um painel de "o que será produzido" precisaria
  // inventar parâmetros que este passo não coleta.
  //
  // O que ela recebeu é o ritmo, e a chave inclui os três estados: sem o `conflito` na chave, o
  // aviso de 409 apareceria sem movimento nenhum, parado no meio de uma tela que se moveu.
  const raiz = useRevelacao<HTMLDivElement>(`${Boolean(scope)}|${conflito}|${pendente}`);

  return (
    <AppShell topBarTitle={t("canonicalAnalysis.entry.title")}>
      <PageFrame maxWidth="md">
        <div ref={raiz} className="space-y-6" data-testid="canonical-start">
          <div data-revelar>
            <h1 className="text-2xl font-semibold text-foreground">{t("canonicalAnalysis.entry.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("canonicalAnalysis.entry.subtitle")}</p>
          </div>
          {!scope && (
            <p role="alert" className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.entry.workspaceMissing")}
            </p>
          )}
          {conflito ? (
            <AvisoDaJornada
              titulo={t("canonicalAnalysis.entry.conflictTitle")}
              significado={t("canonicalAnalysis.entry.conflictMeaning")}
              acao={
                <Button variant="outline" asChild>
                  <Link to="/analyses">{t("canonicalAnalysis.entry.conflictAction")}</Link>
                </Button>
              }
            />
          ) : erro ? (
            <div className="space-y-3">
              <ProblemNotice error={erro} />
              <Button onClick={() => { iniciou.current = true; iniciar(); }} disabled={!scope || pendente}>
                {t("canonicalAnalysis.entry.retry")}
              </Button>
            </div>
          ) : (
            <LoadingState rotulo={t("canonicalAnalysis.entry.starting")} linhas={2} />
          )}
        </div>
      </PageFrame>
    </AppShell>
  );
}
