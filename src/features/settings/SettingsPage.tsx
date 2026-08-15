// M41 — a superfície CANÔNICA da conta: CFG-01 (identidade) e CFG-02 (idioma).
//
// ## O que saiu, e por quê
//
// **O formulário de senha.** Ele renderizava campos e um botão que não trocavam senha nenhuma: a
// chamada ao provedor antigo tinha sido removida, e o que sobrou foi uma tela oferecendo uma ação
// que não acontece. D19 delega credencial ao provedor de identidade — então o lugar certo é um
// link para o console dele, não um formulário aqui.
//
// **Excluir conta.** D21 está `FUTURE / DO NOT BUILD`. O botão existia e abria um diálogo que
// terminava num `alert()` pedindo e-mail para o suporte. Uma ação destrutiva que não executa é
// pior que ausente: ela promete um controle que o produto não tem.
//
// ## O que NÃO entrou
//
// Tema (D23), configuração de Workspace e de Instância (CFG-03/CFG-04, M42). A identidade vem de
// `GET /v1/me` — o Account **não** é fonte de nome nem de e-mail, e esta tela não mostra claim
// bruta, token nem papel inventado.

import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { getAuthClient } from "@/lib/auth/index";
import { SecaoDeIdioma } from "@/features/account/SecaoDeIdioma";
import { useContaDoUsuario } from "@/features/account/data/language";
import { SecaoDeWorkspace } from "@/features/workspace/SecaoDeWorkspace";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-base p-6">
      <div className="mb-4 border-b border-border pb-4">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm text-foreground sm:mt-0">{valor}</dd>
    </>
  );
}

export function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  // M42 · CFG-03 — o escopo canônico já existe; a seção do espaço usa o MESMO, e não um
  // `workspace_id` lido de outro lugar.
  const escopo = useCanonicalScope();
  const { t } = useLanguage();
  const conta = useContaDoUsuario();

  // A identidade tem carregamento PRÓPRIO. Um spinner global esconderia que ela já chegou e que
  // só a preferência está pendente — e são duas dependências diferentes, com falhas diferentes.
  const urlDoProvedor = getAuthClient().accountManagementUrl();

  async function sair() {
    await signOut();
    navigate("/login");
  }

  return (
    <AppShell topBarTitle={t("account.title")}>
      <PageFrame maxWidth="lg">
        <PageHeader title={t("account.title")} description={t("account.subtitle")} />

        <div className="space-y-6">
          <Section title={t("account.identityTitle")} description={t("account.identityBody")}>
            {conta.isPending ? (
              <p className="text-sm text-muted-foreground" role="status">
                {t("common.loading")}
              </p>
            ) : conta.data ? (
              <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-[10rem_1fr]">
                <Campo rotulo={t("account.name")} valor={conta.data.user.name} />
                <Campo rotulo={t("account.email")} valor={conta.data.user.email} />
                {/* Lista, e não texto unido por separador: um nome de workspace pode CONTER o
                    separador — a massa tem "Acme · Laboratório" —, e aí "Acme · Acme · Laboratório"
                    não deixa ver onde um termina e o outro começa. Achado da revisão da captura. */}
                <>
                  <dt className="text-sm text-muted-foreground">{t("account.workspaces")}</dt>
                  <dd className="text-sm text-foreground">
                    {conta.data.workspaces.length ? (
                      <ul className="space-y-1">
                        {conta.data.workspaces.map((w) => (
                          <li key={w.id}>{w.name}</li>
                        ))}
                      </ul>
                    ) : (
                      t("account.noWorkspaces")
                    )}
                  </dd>
                </>
              </dl>
            ) : (
              <p className="text-sm text-destructive" role="alert">
                {t("account.identityFailed")}
              </p>
            )}
          </Section>

          <Section title={t("account.languageTitle")} description={t("account.languageBody")}>
            <SecaoDeIdioma />
          </Section>

          {/* M42 · CFG-03. Seção PRÓPRIA, com carregamento e falha próprios: o espaço e a conta
              têm donos diferentes, e um `503` do espaço não pode apagar a identidade acima nem o
              idioma abaixo. A configuração da Instância não está aqui — ela mora onde o contexto
              de Instância existe, e inventar um seletor seria criar superfície sem authority. */}
          <Section title={t("workspaceConfig.title")} description={t("workspaceConfig.body")}>
            <SecaoDeWorkspace workspaceId={escopo?.workspaceId ?? null} />
          </Section>

          <Section title={t("account.signInTitle")} description={t("account.signInBody")}>
            <div className="flex flex-wrap items-center gap-3">
              {urlDoProvedor && (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="min-h-11 rounded-xl border border-border text-foreground"
                >
                  <a href={urlDoProvedor} rel="noopener noreferrer">
                    {t("account.signInAction")}
                  </a>
                </Button>
              )}
              <Button
                onClick={sair}
                variant="ghost"
                size="sm"
                className="min-h-11 rounded-xl text-muted-foreground hover:bg-muted"
              >
                {t("account.signOut")}
              </Button>
            </div>
          </Section>
        </div>
      </PageFrame>
    </AppShell>
  );
}
