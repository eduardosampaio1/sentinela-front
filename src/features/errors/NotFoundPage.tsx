// TERMINAL · o caminho não existe.
//
// ## Tom neutro, e isso é a decisão
//
// A versão anterior já acertava ao não usar vermelho, e o arquétipo torna isso explícito em vez
// de acidental: `gravidade="neutro"`. Um endereço que envelheceu não é defeito de quem clicou no
// link antigo, e pintar isso com o sinal de falha transforma navegação normal em acusação.
//
// É a mesma distinção que a sessão expirada faz — perder o CAMINHO não é perder o TRABALHO — e a
// matriz cobra as duas no mesmo par de jornadas.
//
// ## O endereço vira diagnóstico
//
// Antes ele estava no meio de um parágrafo, em fonte monoespaçada, quebrando a leitura no ponto
// exato em que a frase explicava o que tinha acontecido. Como linha de diagnóstico rotulada ele
// fica selecionável, some do caminho do olho de quem só quer sair daqui, e continua disponível
// para quem veio conferir qual link está quebrado.
//
// Ao contrário do detalhe técnico que saiu da tela de falha, o endereço NÃO é interno: foi a
// pessoa que o pediu, ele está na barra do navegador, e ecoá-lo não revela nada que ela já não
// tenha digitado.
//
// ## A segunda saída
//
// Era `/dashboard`, que é rota de compatibilidade e resolve para outro lugar — mandar quem já se
// perdeu para um redirecionamento é dar a ela um segundo salto para entender. Agora aponta para
// a lista de análises, que é onde o texto promete que o trabalho continua.

import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Terminal } from "@/design/patterns";
import { useRevelacao } from "@/design/motion";
import { useLanguage } from "@/contexts/LanguageContext";

export function NotFoundPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const raiz = useRevelacao<HTMLElement>(location.pathname);

  return (
    <main ref={raiz} className="min-h-dvh bg-background">
      <Terminal
        // Só o número. "404 — Não encontrado" repetiria em duas palavras o que o título já diz
        // por extenso na linha seguinte, e o gate de expansão PT/EN mede exatamente esse tipo de
        // rótulo curto: "Not found" → "Não encontrado" estoura o orçamento de 1,3× por si só.
        codigo="404"
        gravidade="neutro"
        titulo={t("errorsPage.notFoundTitle")}
        consequencia={t("errorsPage.notFoundConsequence")}
        diagnostico={[{ rotulo: t("errorsPage.notFoundAddress"), valor: location.pathname }]}
        saidas={
          <>
            <Button size="sm" asChild>
              <Link to="/home">{t("errorsPage.notFoundHome")}</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/analyses">{t("errorsPage.notFoundList")}</Link>
            </Button>
          </>
        }
      />
    </main>
  );
}
