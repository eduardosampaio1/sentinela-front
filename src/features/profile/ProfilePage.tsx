// OBJETO · a conta de quem está usando.
//
// ## O formulário que prometia o que a SPA não faz
//
// Esta tela renderizava dois campos de senha, um `placeholder` dizendo "Minimum 8 characters",
// três mensagens de validação e um botão "Update password". Nada disso funcionava.
//
// `handleChangePassword` começava por `supportsPasswordForms()`, que é **false** desde que o
// Keycloak assumiu — então a primeira coisa que o submit fazia era redirecionar para o Account
// Console do provedor. Tudo depois daquele `if` era inalcançável, inclusive as regras de senha,
// inclusive a mensagem de sucesso, inclusive um `throw` de "unreachable" deixado no lugar da
// chamada removida na M02.
//
// O defeito não é o código morto: é a tela AFIRMANDO um poder que ela não tem. Quem digitava
// uma senha nova ali e via a página trocar de domínio não tinha como saber se a troca aconteceu.
//
// ## A verdade já estava escrita — em outra tela
//
// `account.signInTitle` ("Senha e acesso"), `account.signInBody` ("Ficam com seu provedor de
// identidade, não aqui") e `account.signInAction` ("Gerenciar acesso") já existem no dicionário
// e já são usados pela superfície de Conta. Duas telas do mesmo produto diziam coisas opostas
// sobre o mesmo fato, e a que mentia era a que tinha formulário.
//
// Nenhuma copy nova foi escrita para esta seção: ela passa a usar as chaves que já são a
// resposta certa. Um mesmo ato, um mesmo nome.
//
// ## Arquétipo
//
// Identidade primeiro, depois os atributos, depois acesso. Sem sinais vitais: não existe medida
// sobre uma conta — inventar uma barra aqui seria decorar. É a mesma regra que fez a linha de
// Instâncias ter dois campos.

import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getAuthClient } from "@/lib/auth/index";
import { IdentidadeDoObjeto, SecaoDoObjeto } from "@/design/patterns";
import { useRevelacao } from "@/design/motion";
import { useLanguage } from "@/contexts/LanguageContext";

/** Duas letras de reconhecimento. Não é foto e não representa a pessoa — é uma marca de lugar. */
function iniciais(texto: string): string {
  const partes = texto.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  return texto.slice(0, 2).toUpperCase();
}

export function ProfilePage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const raiz = useRevelacao<HTMLDivElement>(user?.id);

  const nome =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    null;

  const membroDesde = user?.created_at
    ? new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(user.created_at))
    : null;

  const atributos = [
    user?.email,
    membroDesde ? `${t("account.memberSince")} ${membroDesde}` : null,
  ].filter((x): x is string => Boolean(x));

  const campos = [
    { chave: "nome", rotulo: t("account.name"), valor: nome, mono: false },
    { chave: "email", rotulo: t("account.email"), valor: user?.email ?? null, mono: false },
    { chave: "id", rotulo: t("account.userIdentifier"), valor: user?.id ?? null, mono: true },
    {
      chave: "provedor",
      rotulo: t("account.signInProvider"),
      valor: (user?.app_metadata?.provider as string | undefined) ?? null,
      mono: false,
    },
  ];

  function irParaOProvedor() {
    const url = getAuthClient().accountManagementUrl();
    if (url) window.location.href = url;
  }

  return (
    <AppShell topBarTitle={t("account.profileTitle")}>
      <PageFrame maxWidth="lg">
        <div ref={raiz}>
          <IdentidadeDoObjeto
            sigla={iniciais(nome ?? user?.email ?? "?")}
            titulo={nome ?? user?.email ?? t("account.profileTitle")}
            atributos={atributos}
          />

          <p data-revelar className="mt-4 text-sm text-muted-foreground">
            {t("account.profileSubtitle")}
          </p>

          <SecaoDoObjeto titulo={t("account.identityTitle")} detalhe={t("account.identityBody")}>
            <dl className="grid gap-0">
              {campos.map((c) => (
                <div
                  key={c.chave}
                  data-revelar
                  className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6"
                >
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {c.rotulo}
                  </dt>
                  {/* Campo sem valor NÃO vira travessão silencioso: o rótulo do vazio diz que a
                      origem não publicou, que é diferente de "está em branco". */}
                  <dd
                    className={
                      c.valor
                        ? c.mono
                          ? "break-all font-mono text-xs text-foreground"
                          : "text-sm text-foreground"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {c.valor ?? t("account.identityFailed")}
                  </dd>
                </div>
              ))}
            </dl>
          </SecaoDoObjeto>

          <SecaoDoObjeto titulo={t("account.signInTitle")}>
            <div data-revelar className="grid gap-3 rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("account.signInBody")}</p>
              {/* O aviso da travessia é o próprio texto acima: ele diz que o assunto fica com o
                  provedor ANTES do botão que leva até lá. Mesma regra do PORTAL. */}
              <Button size="sm" variant="outline" className="justify-self-start" onClick={irParaOProvedor}>
                {t("account.signInAction")}
              </Button>
            </div>
          </SecaoDoObjeto>
        </div>
      </PageFrame>
    </AppShell>
  );
}
