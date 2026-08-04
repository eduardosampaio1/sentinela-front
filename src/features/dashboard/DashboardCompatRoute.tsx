// `/dashboard` — ROTA DE COMPATIBILIDADE. Não é um segundo dashboard.
//
// Aposentadoria do dashboard legado (preparação local do Big Bang). Nada aqui ativa nada.
//
// ## O que aconteceu com o dashboard legado
//
// Ele lia `AnalysisContext.result`, que só era preenchido pelo cache do navegador. Removido o
// cache (dívida de `sessionStorage`), ficou sem fonte: era uma ilha sem backend, e o cache
// escondia isso.
//
// A decisão de produto foi aposentá-lo em vez de escrever um mapper
// `analysis-result-v1 → AnalysisResult`. Um mapper manteria dois modelos, dois renderizadores,
// duas regras de evolução e uma peça que ninguém lembraria por que existe.
//
// ## O que esta rota faz
//
// Pergunta ao backend qual análise do workspace abrir e REDIRECIONA para o renderizador
// canônico. Ela não renderiza indicador nenhum — quem apresenta resultado é
// `/canonical/analyses/{id}/result`, um lugar só.
//
// Sem análise concluída, mostra estado vazio honesto com ação. NÃO renderiza "No active
// analysis" dentro de painéis com cara de dashboard funcional: isso é a tela mentindo sobre o
// que ela é.

import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import { useV1Client } from "@/features/canonical-analysis/data/client";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";
import { ProblemFeedback } from "@/features/canonical-analysis/ui/notices";
import { resolverAnaliseCanonica, type ResolucaoDaAnalise } from "./resolverAnaliseCanonica";

type Estado =
  | { fase: "resolvendo" }
  | { fase: "resolvido"; resolucao: ResolucaoDaAnalise }
  | { fase: "erro"; erro: unknown };

export function DashboardCompatRoute() {
  const { t } = useLanguage();
  const scope = useCanonicalScope();
  const client = useV1Client();
  const [estado, setEstado] = useState<Estado>({ fase: "resolvendo" });
  const [tentativa, setTentativa] = useState(0);

  const workspaceId = scope?.workspaceId ?? null;

  useEffect(() => {
    if (!workspaceId) return;
    // `vivo` evita aplicar a resposta do workspace ANTERIOR depois de uma troca: sem ele, o
    // id resolvido para o workspace A poderia chegar já no B e redirecionar para uma análise
    // de outro tenant. A query key não protege aqui porque não há React Query nesta rota.
    let vivo = true;
    setEstado({ fase: "resolvendo" });
    resolverAnaliseCanonica(client, workspaceId)
      .then((resolucao) => {
        if (vivo) setEstado({ fase: "resolvido", resolucao });
      })
      .catch((erro) => {
        if (vivo) setEstado({ fase: "erro", erro });
      });
    return () => {
      vivo = false;
    };
  }, [client, workspaceId, tentativa]);

  if (!workspaceId) {
    return (
      <AppShell topBarTitle={t("dashboardCompat.title")}>
        <PageFrame maxWidth="md">
          <LoadingState message={t("dashboardCompat.resolving")} />
        </PageFrame>
      </AppShell>
    );
  }

  if (estado.fase === "resolvendo") {
    return (
      <AppShell topBarTitle={t("dashboardCompat.title")}>
        <PageFrame maxWidth="md">
          <LoadingState message={t("dashboardCompat.resolving")} />
        </PageFrame>
      </AppShell>
    );
  }

  if (estado.fase === "erro") {
    // A falha de LEITURA é apresentada pelo código do problem+json, com re-tentativa por ação
    // do usuário. Não vira estado vazio: "não consegui perguntar" e "não existe" são coisas
    // diferentes, e confundi-las diria ao usuário que ele não tem análise.
    return (
      <AppShell topBarTitle={t("dashboardCompat.title")}>
        <PageFrame maxWidth="md">
          <ProblemFeedback error={estado.erro} onRetry={() => setTentativa((n) => n + 1)} />
        </PageFrame>
      </AppShell>
    );
  }

  const { resolucao } = estado;

  if (resolucao.tipo === "ENCONTRADA") {
    // `replace`: o histórico do navegador não deve guardar a rota de compatibilidade, senão o
    // botão voltar cai nela e redireciona de novo, num laço.
    return (
      <Navigate to={`/canonical/analyses/${encodeURIComponent(resolucao.analysisId)}/result`} replace />
    );
  }

  // Estado vazio HONESTO — e são dois, com frases e ações diferentes.
  const semAnalise = resolucao.tipo === "SEM_ANALISE";
  return (
    <AppShell topBarTitle={t("dashboardCompat.title")}>
      <PageFrame maxWidth="md">
        <div className="space-y-4 py-8 text-center" data-testid="dashboard-compat-vazio">
          <h1 className="text-lg font-semibold text-foreground">
            {semAnalise ? t("dashboardCompat.emptyTitle") : t("dashboardCompat.noCompletedTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {semAnalise ? t("dashboardCompat.emptyBody") : t("dashboardCompat.noCompletedBody")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild>
              <Link to="/canonical/analyses/new">{t("dashboardCompat.startAnalysis")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/canonical/analyses">{t("dashboardCompat.openHistory")}</Link>
            </Button>
          </div>
        </div>
      </PageFrame>
    </AppShell>
  );
}
