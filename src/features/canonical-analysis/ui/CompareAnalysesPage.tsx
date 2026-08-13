// M39 · EVO-02 — comparação A×B.
//
// ## A UI apresenta o resultado da regra; ela não decide o que comparação significa
//
// Toda a semântica vive em `comparacao.ts` (D26/D29): o pareamento é por `indicator.id`, a quebra
// de comparabilidade é do **documento** — mudou `indicator_registry_version`, nenhuma linha
// conecta — e **não existe delta**, porque nada no `analysis-result-v1/v2` publica diferença entre
// duas análises. Esta página lê dois resultados, entrega os dois à regra e renderiza o que ela
// devolve. Se ela devolver `null`, a tela diz que não há comparação; não improvisa uma.
//
// É por isso que o `RunComparePanel` legado não é reusado: ele subtrai localmente
// (`delta: number`) e decide comparabilidade **por linha**, contrariando as duas decisões acima.
// O alinhamento de autoridade da M39 lhe retirou o direito de decidir — reaproveitá-lo aqui
// devolveria esse direito pela porta de trás.
//
// ## A identidade vem da ROTA, e só dela
//
// `/analyses/compare/:analysisAId/:analysisBId`. Os dois ids são a identidade durável, e A e B são
// buscados de forma independente — nenhum depende de a listagem ter sido carregada antes. É isso
// que faz refresh e deep link funcionarem: a tela chega sabendo apenas os dois endereços.
//
// ## A e B são POSIÇÕES, não tempo
//
// A ordem é a da URL: A é o lado esquerdo, B é o direito. A página não afirma qual é mais
// recente, porque a rota não publica isso — e "anterior/atual" inventaria uma cronologia.
//
// ## A fonte é o `analysis-result-v3`, e só ele
//
// Os dois lados pedem `?result_schema_version=3` EXPLICITAMENTE. Sem o pedido, a rota devolveria
// o documento histórico — e a comparação ARGOS mostraria o v1 achando que mostra o ARGOS. Um
// lado sem v3 não vira "meia comparação" com o documento legado: vira indisponibilidade dita.

import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { ErrorState, LoadingState } from "@/design/patterns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAnalysisArgos } from "../data/argos";
import { resolverLeituraArgos } from "../result/adapterV3";
import { compararArgos } from "../result/comparacao";
import { ComparacaoArgos } from "./ComparacaoArgos";
import { useCanonicalScope } from "./scope";

export function CompareAnalysesPage() {
  const { t } = useLanguage();
  const scope = useCanonicalScope();
  const { analysisAId, analysisBId } = useParams<{ analysisAId: string; analysisBId: string }>();

  // Duas leituras independentes, disparadas SÓ aqui — a listagem não busca resultado por linha, e
  // esta página é a ação. `habilitado` segue o escopo: sem workspace ativo não há o que pedir.
  const a = useAnalysisArgos(scope, analysisAId ?? null, Boolean(scope && analysisAId));
  const b = useAnalysisArgos(scope, analysisBId ?? null, Boolean(scope && analysisBId));

  function corpo() {
    if (a.isPending || b.isPending) {
      return <LoadingState rotulo={t("canonicalAnalysis.compare.loading")} />;
    }
    if (a.isError || b.isError) {
      return (
        <ErrorState
          titulo={t("canonicalAnalysis.compare.title")}
          explicacao={t("canonicalAnalysis.compare.error")}
          acao="voltar"
          botao={
            <Link to="/analyses" className="text-sm font-medium underline underline-offset-4">
              {t("canonicalAnalysis.compare.backToList")}
            </Link>
          }
        />
      );
    }

    // Só compara documento com documento RESOLVIDO: um payload que a fronteira recusou não vira
    // "o outro lado", vira ausência declarada. Adaptar o que veio seria a queda silenciosa que o
    // contrato inteiro existe para impedir.
    const rA = resolverLeituraArgos(a.data);
    const rB = resolverLeituraArgos(b.data);
    if (rA.estado === "recusado" || rB.estado === "recusado") {
      const lado = rA.estado === "recusado" ? "A" : "B";
      return (
        <div role="status" className="space-y-2 rounded-md border border-border p-4">
          <p className="text-sm font-medium">
            {t("canonicalAnalysis.compare.noArgosTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("canonicalAnalysis.compare.noArgosBody")}
          </p>
          <p className="text-xs text-muted-foreground" data-lado-sem-v3={lado}>
            {lado === "A"
              ? t("canonicalAnalysis.compare.sideA")
              : t("canonicalAnalysis.compare.sideB")}
          </p>
        </div>
      );
    }

    return <ComparacaoArgos comparacao={compararArgos(rA.documento, rB.documento)} />;
  }

  return (
    <AppShell topBarTitle={t("canonicalAnalysis.compare.title")}>
      <PageFrame>
        <header className="space-y-1">
          <Link
            to="/analyses"
            className="inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("canonicalAnalysis.compare.backToList")}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">{t("canonicalAnalysis.compare.title")}</h1>
          {/* Os dois lados são nomeados pelo identificador, que é o que a rota carrega. Nenhuma
              afirmação de ordem cronológica: a URL não a publica, e inferi-la seria inventar. */}
          <p className="text-sm text-muted-foreground">
            {t("canonicalAnalysis.compare.pair", { a: analysisAId ?? "", b: analysisBId ?? "" })}
          </p>
        </header>
        <div className="mt-6">{corpo()}</div>
      </PageFrame>
    </AppShell>
  );
}
