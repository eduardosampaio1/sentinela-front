// PORTAL · a entrada.
//
// A SPA nunca coleta senha: os três caminhos aqui (Google, GitHub e e-mail) terminam no
// Keycloak, que hospeda o formulário. O helper do Supabase saiu na M02; o social login continua
// passando por `startLogin(from, { idpHint })`, que manda o Keycloak direto ao IdP.
//
// ## O aviso, que é a correção de substância
//
// Os três botões saem do domínio. A tela não dizia isso em lugar nenhum — a pessoa clicava e
// desaparecia para outro endereço. Quando algo dá errado no meio do caminho (um `redirect_uri`
// que o realm não conhece, por exemplo) ela cai numa tela de erro de um domínio que nunca viu,
// sem nenhuma pista de que aquilo fazia parte do fluxo.
//
// Foi assim que este defeito foi encontrado: numa validação de navegação, clicando em "Continue
// with email" e caindo num erro do provedor. O produto estava certo; o que faltava era avisar.
//
// A frase fica ACIMA dos botões. Depois deles seria tarde: ninguém lê o rodapé de uma tela em
// que já clicou.
//
// ## O que saiu
//
// **O formulário morto.** `password`, `fieldErrors` e `validate()` sobreviveram à erradicação do
// Supabase — `validate` não tinha um único chamador, e os dois estados nunca chegavam à tela.
// Código inalcançável que ainda parece regra de negócio é pior que código ausente: o próximo a
// ler acredita que existe validação de senha aqui.
//
// **`parseAuthError`.** Ela classificava a exceção por substring da mensagem ("invalid login",
// "user not found") e, no caso genérico, devolvia `msg` — a exceção crua na tela. Além de ser
// texto que o contrato não publica, a classificação por substring é frágil: ela quebra em
// silêncio quando a biblioteca muda uma palavra, e cai no ramo genérico sem ninguém notar.
//
// Nesta tela nenhuma das distinções tinha para onde ir: não há senha para corrigir nem conta
// para procurar, porque a autenticação inteira acontece do outro lado. O fato é um só — não deu
// para chegar ao provedor — e é isso que a pessoa precisa saber.

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuthClient } from "@/lib/auth/index";
import { AuthShell } from "@/shell/AuthShell";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/shared/states/ErrorState";
import { OuEntao } from "@/design/patterns";
import { useRevelacao } from "@/design/motion";
import { useLanguage } from "@/contexts/LanguageContext";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4 flex-shrink-0" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.6-6 7.1l6.2 5.2C39.1 36.7 44 31 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 flex-shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

type Caminho = "google" | "github" | "email";

export function LoginPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/home";
  const raiz = useRevelacao<HTMLDivElement>();

  // Um estado só para os três caminhos. Com um booleano por botão, dois cliques rápidos deixavam
  // dois em "Redirecting…" ao mesmo tempo, sugerindo duas travessias simultâneas.
  const [saindo, setSaindo] = useState<Caminho | null>(null);
  const [falhou, setFalhou] = useState(false);

  async function atravessar(caminho: Caminho) {
    setFalhou(false);
    setSaindo(caminho);
    try {
      await getAuthClient().startLogin(from, caminho === "email" ? undefined : { idpHint: caminho });
      // Sem `setSaindo(null)` no caminho feliz: a navegação já saiu da página, e limpar o estado
      // faria o botão voltar ao normal por um quadro — piscada que parece falha.
    } catch {
      setFalhou(true);
      setSaindo(null);
    }
  }

  const ocupado = saindo !== null;

  return (
    <AuthShell>
      <div ref={raiz}>
        <div data-revelar className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("auth.enterWorkspaceTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link
              to="/register"
              className="text-[hsl(var(--ds-accent-ink))] underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {t("auth.createOne")}
            </Link>
          </p>
        </div>

        {falhou && (
          <InlineError
            message={t("auth.providerUnreachable")}
            onDismiss={() => setFalhou(false)}
            className="mb-5"
          />
        )}

        {/* O aviso ANTES dos botões — os três saem do domínio. */}
        <p
          data-revelar
          className="mb-5 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground"
        >
          {t("auth.signInNotice")}
        </p>

        <div data-revelar className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => void atravessar("google")}
            disabled={ocupado}
            className="flex h-11 w-full items-center justify-center gap-2.5"
          >
            <GoogleIcon />
            {saindo === "google" ? t("auth.redirecting") : t("auth.continueGoogle")}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => void atravessar("github")}
            disabled={ocupado}
            className="flex h-11 w-full items-center justify-center gap-2.5"
          >
            <GitHubIcon />
            {saindo === "github" ? t("auth.redirecting") : t("auth.continueGitHub")}
          </Button>
        </div>

        <div className="my-6">
          <OuEntao rotulo={t("auth.orContinue")} />
        </div>

        <Button
          type="button"
          onClick={() => void atravessar("email")}
          disabled={ocupado}
          className="h-11 w-full font-semibold"
        >
          {saindo === "email" ? t("auth.redirecting") : t("auth.continueEmail")}
        </Button>
      </div>
    </AuthShell>
  );
}
