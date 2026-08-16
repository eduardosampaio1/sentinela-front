// PORTAL · a travessia para o provedor de identidade.
//
// Serve `/register`, `/forgot-password` e `/auth/reset-password`: as três são a mesma moldura
// com título e ação trocados. A SPA nunca coleta senha — o formulário vive no Keycloak.
//
// ## A mensagem de falha deixou de ecoar a exceção
//
// `setError(e.message)` punha na tela o texto que a biblioteca de autenticação produziu para
// quem escreveu o código. Numa falha de rede isso vira "Failed to fetch"; numa de configuração,
// o nome de um endpoint interno. Nenhum dos dois diz à pessoa o que fazer, e o segundo revela
// topologia que o contrato não publica.
//
// A frase agora é nossa e é a mesma para toda falha de alcance, porque para quem está diante da
// porta o fato é um só: não deu para chegar ao provedor. A distinção entre os motivos existe
// para o log, não para esta tela.
//
// ## O aviso continua vindo ANTES
//
// Esta tela já fazia certo o que a de entrada não fazia: dizer que haverá uma saída e um
// retorno. Sumir da tela sem avisar é o momento em que as pessoas acham que o produto quebrou.

import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/shell/AuthShell";
import { Button } from "@/components/ui/button";
import { getAuthClient } from "@/lib/auth/index";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRevelacao } from "@/design/motion";

type Mode = "login" | "register" | "reset";

const COPY: Record<Mode, { title: string; action: string }> = {
  login: { title: "Redirecting to secure sign-in", action: "Continue to sign in" },
  register: { title: "Redirecting to account creation", action: "Continue to create account" },
  reset: { title: "Redirecting to password reset", action: "Continue to reset password" },
};

export function KeycloakRedirect({ mode, nextPath }: { mode: Mode; nextPath?: string }) {
  const { t } = useLanguage();
  const [falhou, setFalhou] = useState(false);
  const started = useRef(false);
  const raiz = useRevelacao<HTMLDivElement>();
  const client = getAuthClient();

  const start = async () => {
    setFalhou(false);
    try {
      if (mode === "register") await client.startRegister(nextPath);
      else if (mode === "reset") await client.startPasswordReset();
      else await client.startLogin(nextPath);
    } catch {
      setFalhou(true);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = COPY[mode];

  return (
    <AuthShell>
      <div ref={raiz} className="space-y-4">
        <h1 data-revelar className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h1>

        <p data-revelar className="text-sm text-muted-foreground">
          {t("auth.redirectNotice")} {t("auth.redirectFallback")}
        </p>

        {falhou && (
          // `role="alert"` porque a falha aparece DEPOIS da tela montar: sem ele, quem usa
          // leitor de tela fica esperando um redirecionamento que já desistiu.
          <p role="alert" className="text-sm text-destructive">
            {t("auth.providerUnreachable")}
          </p>
        )}

        <Button type="button" onClick={() => void start()} className="h-11 w-full">
          {copy.action}
        </Button>
      </div>
    </AuthShell>
  );
}
