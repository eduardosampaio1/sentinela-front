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
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { EmptyState } from "@/shared/states/EmptyState";
import { ErrorState } from "@/shared/states/ErrorState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROTULO_PAPEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export function WorkspacesPage() {
  const { memberships, membershipsLoading, membershipsError, workspace, switchWorkspace } =
    useAuth();

  return (
    <AppShell topBarTitle="Workspaces">
      <PageFrame maxWidth="lg">
        <PageHeader
          title="Workspaces"
          description="The workspaces your account is a member of. Access comes from your identity provider."
        />

        {membershipsLoading && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading your workspaces…
          </p>
        )}

        {/* Falha de projeção NÃO é "você não tem workspaces": são estados diferentes e a tela
            diz qual é. Colapsá-los faria uma indisponibilidade parecer uma afirmação sobre a
            conta do usuário. */}
        {!membershipsLoading && membershipsError && (
          <ErrorState
            title="Workspaces could not be loaded"
            message="We could not reach the service that lists your workspaces. This is not a statement about your access."
          />
        )}

        {!membershipsLoading && !membershipsError && memberships.length === 0 && (
          <EmptyState
            title="No workspace access"
            description="Your account is not a member of any workspace yet. Workspace access is granted by an administrator in your identity provider."
          />
        )}

        {!membershipsLoading && !membershipsError && memberships.length > 0 && (
          <ul className="space-y-2" aria-label="Your workspaces">
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
                      {ROTULO_PAPEL[m.role] ?? m.role}
                    </p>
                  </div>
                  {ativo ? (
                    <span className="text-xs font-medium text-primary">Active</span>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => switchWorkspace(m.id)}>
                      Switch
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
