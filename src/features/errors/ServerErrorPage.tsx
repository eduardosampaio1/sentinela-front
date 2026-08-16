// TERMINAL · falha do serviço.
//
// ## O que mudou, e o que deliberadamente não mudou
//
// O CONTEÚDO desta tela já estava certo: ela dizia o código, dizia que o histórico não foi
// perdido e oferecia duas saídas. O que estava errado era a FORMA — composição de página de
// marketing (ícone grande e centrado, tudo alinhado ao centro) num momento em que a pessoa lê
// para decidir, não para se impressionar. Texto centrado é a pior escolha possível para um
// parágrafo que precisa ser lido com atenção.
//
// A ordem passou a ser a do arquétipo: o que aconteceu → **o que isso custou a você** → como
// sair. A versão anterior já respondia a segunda pergunta, mas depois dos botões; agora ela vem
// antes, para que ninguém precise arriscar um clique para descobrir se perdeu trabalho.
//
// ## O detalhe técnico SAIU, e essa é a mudança de substância
//
// A versão anterior renderizava `error.statusText` ou `error.message` num bloco monoespaçado. É
// `str(exc)` na tela: texto que o contrato não publica, escrito para quem escreveu o código e
// não para quem está lendo. Ele não ajuda a decidir nada e, quando a exceção carrega caminho de
// arquivo ou trecho de payload, vaza o que não devia.
//
// O status HTTP fica: ele é semântica publicada, é o que o suporte pergunta primeiro, e a
// versão anterior já o mostrava.
//
// ## Idioma
//
// As frases saíram do componente e foram para o dicionário. A tela é alcançável sem sessão, e o
// provider de idioma monta acima do router — então ela responde em PT e EN como todas as outras.

import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Terminal } from "@/design/patterns";
import { useRevelacao } from "@/design/motion";
import { useLanguage } from "@/contexts/LanguageContext";

export function ServerErrorPage() {
  const { t } = useLanguage();
  const error = useRouteError();
  const raiz = useRevelacao<HTMLElement>();

  const status = isRouteErrorResponse(error) ? error.status : 500;

  return (
    <main ref={raiz} className="min-h-dvh bg-background">
      <Terminal
        codigo={`${t("errorsPage.serverCode")} · ${status}`}
        titulo={t("errorsPage.serverTitle")}
        consequencia={t("errorsPage.serverConsequence")}
        orientacao={t("errorsPage.serverGuidance")}
        saidas={
          <>
            <Button size="sm" onClick={() => window.location.reload()}>
              {t("errorsPage.serverReload")}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/home">{t("errorsPage.serverHome")}</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
