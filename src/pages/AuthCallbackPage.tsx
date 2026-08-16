// PORTAL · o retorno do provedor.
//
// ## O que esta tela é: uma espera de menos de um segundo
//
// A versão anterior a tratava como superfície institucional. Ela renderizava uma casca de
// marketing com três "highlights" — *Signed exchange*, *Token cleanup*, *Scoped continuation* —
// explicando a MECÂNICA da troca de código para alguém que está de passagem por 800 ms e não
// pediu para entender OIDC. Nada ali ajudava a decidir coisa nenhuma.
//
// Pior: a descrição dizia que o callback *"validates the auth artifact from Supabase"*. O
// Supabase foi erradicado na M02, e o texto continuou afirmando a arquitetura antiga na cara do
// usuário. Copy que envelhece sem ninguém notar é a mesma classe de defeito que a evidência
// documentando um estado que a tela nunca renderizou — só que voltada para fora.
//
// ## Espera, não tela em branco
//
// Espera precisa dizer o que está acontecendo. `role="status"` com `aria-live` porque o texto
// muda sozinho: quem usa leitor de tela precisa ouvir "validando" virar "tudo certo" sem ter de
// ir procurar.
//
// ## A falha vira um TERMINAL, não um recado
//
// Quando a troca não completa, a pessoa está presa: não entrou e não tem o que tentar aqui. A
// mensagem antiga era `error.message` — "Authentication callback did not return a session", que
// é uma frase escrita para quem depura. O fato que importa é outro e é simples: o link de
// retorno vale uma vez só. Dizer isso explica por que recarregar não adianta.
//
// A lógica de troca não mudou: a guarda contra o double-invoke do StrictMode continua, e ela é
// necessária porque o `code` do OIDC é de uso único.

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { clearTransientAuthLocation, normalizeNextPath } from "@/lib/authFlow";
import { getAuthClient } from "@/lib/auth/index";
import { Button } from "@/components/ui/button";
import { Portal, Terminal } from "@/design/patterns";
import { useRevelacao } from "@/design/motion";
import { useLanguage } from "@/contexts/LanguageContext";

// O StrictMode (React 18 dev) dispara o effect 2×; o authorization code OIDC é single-use,
// então a 2ª troca falharia com "Code not valid". Compartilhamos UMA troca por carregamento
// de página (reseta a cada novo callback, pois cada callback é uma navegação/reload completo).
let authExchangePromise: Promise<void> | null = null;

async function exchangeAuthArtifact(): Promise<void> {
  const session = await getAuthClient().completeLoginCallback();
  if (!session) {
    throw new Error("Authentication callback did not return a session.");
  }
  clearTransientAuthLocation({ removeCode: true });
}

/** Milissegundos entre "entrou" e a navegação. Curto o bastante para não ser espera, longo o
 *  bastante para a confirmação ser lida — sem ele a tela pisca e ninguém sabe o que aconteceu. */
const PAUSA_ANTES_DE_SEGUIR = 800;

export default function AuthCallbackPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fase, setFase] = useState<"validando" | "concluido" | "falhou">("validando");
  const raiz = useRevelacao<HTMLElement>(fase);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const nextPath = normalizeNextPath(searchParams.get("next"));
      try {
        if (!authExchangePromise) {
          authExchangePromise = exchangeAuthArtifact();
        }
        await authExchangePromise;

        if (cancelled) return;
        setFase("concluido");
        window.setTimeout(() => {
          if (!cancelled) navigate(nextPath, { replace: true });
        }, PAUSA_ANTES_DE_SEGUIR);
      } catch {
        // A exceção não chega à tela: ela é escrita para quem depura, e aqui não há nada que a
        // pessoa possa fazer com ela. O fato acionável é que o link de retorno vale uma vez só.
        if (!cancelled) setFase("falhou");
      }
    }

    void completeAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  if (fase === "falhou") {
    return (
      <main ref={raiz} className="min-h-dvh bg-background">
        <Terminal
          codigo="Sentinela"
          titulo={t("auth.callbackFailedTitle")}
          consequencia={t("auth.callbackFailedBody")}
          saidas={
            <Button size="sm" asChild>
              <Link to="/login">{t("auth.callbackRestart")}</Link>
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main ref={raiz} className="min-h-dvh bg-background">
      <Portal marca="Sentinela" titulo={t("auth.callbackTitle")}>
        <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">
          {fase === "concluido" ? t("auth.callbackDone") : t("auth.callbackWaiting")}
        </p>
      </Portal>
    </main>
  );
}
