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
import { CriarPorNome, LinhaDeColecao } from "@/design/patterns";
import { useV1Client } from "@/features/canonical-analysis/data/client";
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
  const {
    memberships,
    membershipsLoading,
    membershipsError,
    workspace,
    switchWorkspace,
    signOut,
  } = useAuth();
  const { t } = useLanguage();
  const cliente = useV1Client();
  const [dialogoAberto, setDialogoAberto] = useState(false);
  // O nome do que acabou de nascer. Guardado porque o sucesso PRECISA dize-lo de volta: sem
  // o nome, "workspace criado" nao confirma nada -- poderia ser qualquer um.
  const [recemCriado, setRecemCriado] = useState<string | null>(null);
  const raiz = useRevelacao<HTMLDivElement>(membershipsLoading ? "carregando" : memberships.length);

  const criar = async (nome: string) => {
    const ws = await cliente.createWorkspace(nome);
    // Fecha e mostra o sucesso. NAO navega para dentro: o token em maos foi emitido antes
    // deste espaco existir, e entrar agora bateria em 403 -- que a pessoa leria como bug, e
    // nao como "seu acesso ainda nao foi carregado".
    setDialogoAberto(false);
    setRecemCriado(ws.name);
  };

  const textosDeCriacao = {
    titulo: t("workspacesPage.createTitle"),
    descricao: t("workspacesPage.createDescription"),
    rotulo: t("workspacesPage.createLabel"),
    ajuda: t("workspacesPage.createHelp"),
    exemplo: t("workspacesPage.createExample"),
    enviar: t("workspacesPage.createSubmit"),
    enviando: t("workspacesPage.createSubmitting"),
    cancelar: t("workspacesPage.createCancel"),
    erroVazio: t("workspacesPage.createEmptyError"),
    erroAoCriar: t("workspacesPage.createFailed"),
  };

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
        {/* O sucesso e um PAINEL, nao um toast: ele carrega uma instrucao que a pessoa
            precisa executar, e toast some sozinho. Sumir levaria embora a unica explicacao
            de por que o espaco recem-criado ainda nao esta na lista. */}
        {recemCriado ? (
          <div role="status" className="mt-6 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              {t("workspacesPage.createdTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("workspacesPage.createdBody", { name: recemCriado })}
            </p>
            <Button className="mt-3" size="sm" onClick={() => void signOut()}>
              {t("workspacesPage.createdCta")}
            </Button>
          </div>
        ) : null}

        <CriarPorNome
          aberto={dialogoAberto}
          aoFechar={() => setDialogoAberto(false)}
          textos={textosDeCriacao}
          aoCriar={criar}
        />
        </div>
      </PageFrame>
    </AppShell>
  );
}
