// Workspaces: LISTA o que a projeção de identidade autoriza (Onda 8, macrofrente de identidade).
//
// A versão anterior fazia CRUD de workspace, projeto e ambiente direto no Supabase — o navegador
// escrevendo nas tabelas que decidem a própria autorização. Pela matriz congelada, membership
// pertence ao Keycloak e chega projetada por `GET /v1/me`.
//
// Havia aqui a frase "não existe criar workspace, provisionar é ação administrativa". Ela caiu
// por decisão de produto: qualquer pessoa cria o próprio espaço. O argumento antigo — um cliente
// que cria o próprio vínculo não teria autorização — continua valendo, e é exatamente por isso
// que o vínculo NÃO nasce no navegador: `POST /v1/workspaces` grava o espaço e o Gateway concede
// o acesso no provedor de identidade, que segue sendo a autoridade única.
//
// A consequência para esta tela é uma só, e ela é visível: o token em mãos foi emitido antes do
// espaço existir e não fala dele. Por isso o sucesso não navega para dentro — ele explica que o
// acesso entra no próximo login e oferece o caminho. Navegar levaria a um 403 que pareceria bug.
//
// `project` e `environment` sumiram junto: nunca foram identidade — eram o eixo de escopo do
// caminho de análise legado, que saiu com ele.

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { EmptyState } from "@/shared/states/EmptyState";
import { ErrorState } from "@/shared/states/ErrorState";
import { Button } from "@/components/ui/button";
import { LinhaDeColecao } from "@/design/patterns";
import { CriarWorkspace } from "./CriarWorkspace";
import { useRevelacao } from "@/design/motion";

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
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const raiz = useRevelacao<HTMLDivElement>(membershipsLoading ? "carregando" : memberships.length);

  return (
    <AppShell topBarTitle={t("workspacesPage.title")}>
      <PageFrame maxWidth="lg">
        <div ref={raiz}>
        <PageHeader
          title={t("workspacesPage.title")}
          description={t("workspacesPage.subtitle")}
          // O CTA aparece UMA vez por estado. Com lista, ele mora aqui; vazio, ele e o foco
          // central do empty state. Nos dois lugares ao mesmo tempo criaria dois pontos
          // focais competindo pela mesma acao.
          actions={
            !membershipsLoading && !membershipsError && memberships.length > 0 ? (
              <Button size="sm" onClick={() => setDialogoAberto(true)}>
                {t("workspacesPage.createCta")}
              </Button>
            ) : undefined
          }
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
            // A frase antiga explicava que o acesso vem do provedor de identidade e parava
            // ali -- verdadeira e sem saida. Agora existe saida, e o texto oferece.
            description={t("workspacesPage.emptyCanCreate")}
            action={{
              label: t("workspacesPage.createCta"),
              onClick: () => setDialogoAberto(true),
            }}
          />
        )}

        {!membershipsLoading && !membershipsError && memberships.length > 0 && (
          <ul
            aria-label={t("workspacesPage.listLabel")}
            className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border"
          >
            {memberships.map((m) => {
              const ativo = workspace?.id === m.id;
              return (
                <LinhaDeColecao
                  key={m.id}
                  item={{
                    chave: m.id,
                    titulo: m.name,
                    subtitulo: rotuloDoPapel(m.role, t),
                    ativo,
                    dados: { "data-testid": `workspace-${m.id}`, "data-ativo": ativo ? "sim" : "nao" },
                    // `text-foreground`, e não `text-primary`: a cor da marca sobre o fundo da
                    // página dava 3.56:1 a 12px, abaixo do 4.5:1 de AA. Achado da matriz
                    // transversal da M45 — nenhuma suíte rodava axe NESTA superfície, e ela é
                    // REAL no Blueprint.
                    acao: ativo ? (
                      <span className="text-xs font-medium text-foreground">
                        {t("workspacesPage.active")}
                      </span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => switchWorkspace(m.id)}>
                        {t("workspacesPage.switch")}
                      </Button>
                    ),
                  }}
                  // Sem destino: nenhum espaço tem tela própria. Um `<a>` aqui seria focável,
                  // anunciado como link e não iria a lugar nenhum.
                  Envoltorio={({ children, className }) => <div className={className}>{children}</div>}
                />
              );
            })}
          </ul>
        )}
        {/* O fluxo inteiro mora no componente: pedir o nome e, depois, explicar por que o
            espaco recem-criado ainda nao esta na lista. A confirmacao era um painel AQUI e
            virou passo do dialogo, porque a criacao passou a ter uma segunda porta -- o
            seletor da barra lateral -- e la nao caberia painel de pagina. */}
        <CriarWorkspace aberto={dialogoAberto} aoFechar={() => setDialogoAberto(false)} />
        </div>
      </PageFrame>
    </AppShell>
  );
}
