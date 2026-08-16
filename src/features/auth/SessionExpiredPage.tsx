// PORTAL · a sessão caiu.
//
// ## A frase que precisa vir primeiro
//
// "Seus dados de análise seguem salvos." É a distinção entre perder a SESSÃO e perder o
// TRABALHO, e é a mesma que o 404 faz com o caminho — a matriz cobra as duas no mesmo par de
// jornadas justamente porque é o tipo de garantia que some numa reescrita distraída.
//
// ## O que mudou
//
// Sete cores literais viraram token, e o ícone decorativo de 16×16 saiu. Ele custava a maior
// área da tela para dizer "relógio" — informação que o título já dá em duas palavras, e que a
// pessoa nesta tela não precisa que ninguém ilustre.
//
// O texto saiu do componente e foi para o dicionário: esta é uma superfície alcançável sem
// sessão, e o provider de idioma monta acima do router.

import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Portal } from "@/design/patterns";
import { useRevelacao } from "@/design/motion";
import { useLanguage } from "@/contexts/LanguageContext";

export function SessionExpiredPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const raiz = useRevelacao<HTMLElement>();

  return (
    <main ref={raiz} className="min-h-dvh bg-background">
      <Portal
        marca="Sentinela"
        titulo={t("auth.sessionExpiredTitle")}
        explicacao={t("auth.sessionExpiredBody")}
      >
        <Button asChild className="h-11 w-full">
          <Link to="/login">{t("auth.sessionExpiredSignIn")}</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={() => navigate(0)}
        >
          {t("auth.sessionExpiredReload")}
        </Button>
      </Portal>
    </main>
  );
}
