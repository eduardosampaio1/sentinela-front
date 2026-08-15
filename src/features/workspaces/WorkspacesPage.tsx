// Workspaces: LISTA o que a projeção de identidade autoriza (Onda 8, macrofrente de identidade).
//
// A versão anterior fazia CRUD de workspace, projeto e ambiente direto no Supabase — o navegador
// escrevendo nas tabelas que decidem a própria autorização. Pela matriz congelada, membership
// pertence ao Keycloak e chega projetada por `GET /v1/me`.
//
// Por isso não há "criar workspace" aqui, e não existe endpoint `/v1` para isso: um cliente que
// pudesse criar o próprio vínculo não teria autorização nenhuma. Provisionar é ação
// administrativa, fora do produto.
//
// `project` e `environment` sumiram junto: nunca foram identidade — eram o eixo de escopo do
// caminho de análise legado, que saiu com ele.

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { EmptyState } from "@/shared/states/EmptyState";
import { ErrorState } from "@/shared/states/ErrorState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * O papel, em chave de texto LITERAL.
 *
 * `switch` e não mapa `papel → chave`: `t(MAPA[p])` é chave opaca e cega o rastreador de i18n,
 * que deixa de saber se `workspacesPage.roleOwner` ainda tem consumidor. Papel desconhecido cai
 * no próprio identificador — inventar rótulo para um papel novo seria pior.
 */
function rotuloDoPapel(papel: string, t: (k: string) => string): string {
  switch (papel) {
    case "owner":
      return t("workspacesPage.roleOwner");
    case "admin":
      return t("workspacesPage.roleAdmin");
    case "member":
      return t("workspacesPage.roleMember");
    case "viewer":
      return t("workspacesPage.roleViewer");
    default:
      return papel;
  }
}

export function WorkspacesPage() {
  const { memberships, membershipsLoading, membershipsError, workspace, switchWorkspace } =
    useAuth();
  const { t } = useLanguage();

  return (
    <AppShell topBarTitle={t("workspacesPage.title")}>
      <PageFrame maxWidth="lg">
        <PageHeader
          title={t("workspacesPage.title")}
          description={t("workspacesPage.subtitle")}
        />

        {membershipsLoading && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("workspacesPage.loading")}
          </p>
        )}

        {/* Falha de projeção NÃO é "você não tem workspaces": são estados diferentes e a tela
            diz qual é. Colapsá-los faria uma indisponibilidade parecer uma afirmação sobre a
            conta do usuário. */}
        {!membershipsLoading && membershipsError && (
          <ErrorState
            title={t("workspacesPage.errorTitle")}
            message={t("workspacesPage.errorBody")}
          />
        )}

        {!membershipsLoading && !membershipsError && memberships.length === 0 && (
          <EmptyState
            title={t("workspacesPage.emptyTitle")}
            description={t("workspacesPage.emptyBody")}
          />
        )}

        {!membershipsLoading && !membershipsError && memberships.length > 0 && (
          <ul className="space-y-2" aria-label={t("workspacesPage.listLabel")}>
            {memberships.map((m) => {
              const ativo = workspace?.id === m.id;
              return (
                <li
                  key={m.id}
                  data-testid={`workspace-${m.id}`}
                  data-ativo={ativo ? "sim" : "nao"}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-xl border p-4",
                    ativo ? "border-primary bg-primary/5" : "border-border bg-card",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rotuloDoPapel(m.role, t)}
                    </p>
                  </div>
                  {/* `text-foreground`, e não `text-primary`: a cor da marca sobre o fundo da
                      página dava 3.56:1 a 12px, abaixo do 4.5:1 de AA. Achado da matriz
                      transversal da M45 — nenhuma suíte rodava axe NESTA superfície, e ela é
                      REAL no Blueprint. */}
                  {ativo ? (
                    <span className="text-xs font-medium text-foreground">
                      {t("workspacesPage.active")}
                    </span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => switchWorkspace(m.id)}>
                      {t("workspacesPage.switch")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageFrame>
    </AppShell>
  );
}
