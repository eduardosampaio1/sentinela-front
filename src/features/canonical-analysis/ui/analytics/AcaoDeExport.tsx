// M29 — a ação de export, e o estado que a governa.
//
// ## O que esta missão removeu
//
// Aqui existia um `BotaoDeExport` que montava um **CSV no navegador**: `exportarCsv(resolvido)`,
// `new Blob`, `createObjectURL`, e o rótulo dizia *"Baixa exatamente os números desta página"*.
// A D16 é literal contra isso: *"Uma única noção de exportação: o artefato do backend. O CSV
// local **SAI**. Com `export = ready`, download; nos demais estados, representar o estado vindo
// de `/progress`."*
//
// Serializar a tela não é exportar a análise. O pacote do backend é determinístico, atestado por
// `sha256` e regenerável; um CSV montado no cliente é uma segunda verdade sobre os mesmos números,
// que diverge no dia em que a tela mudar de formatação.
//
// ## Quem decide se há o que baixar
//
// O eixo `export` de `/progress`, e ele apenas. Tentar o download para descobrir o estado usaria
// a resposta de erro como oráculo — e o produtor colapsa quatro causas no mesmo
// `forbidden_or_not_found` justamente para fechar esse oráculo.
//
// ## `expired` é o ponto da missão
//
// Não há operação pública de regenerar export. As 12 operações de `operations[]` não incluem
// nenhuma. Então `expired` **não** oferece botão, **não** promete recuperação e **não** diz que o
// dado nunca existiu — ele diz que o pacote não está mais disponível, que é a única coisa
// sustentada por contrato. Prometer "gerar de novo" seria um CTA sem owner (Regra de Ouro #37).
//
// A diferença privada entre expirado e purgado não aparece: o produtor a colapsa de propósito, e
// reintroduzi-la aqui reabriria o oráculo de existência que a MF5.2 fechou.
//
// ## Sem card
//
// Nenhum container novo. O estado é uma FRASE ao lado da ação, no lugar onde a dica do CSV já
// vivia — Linear (§3, linha 1): separação por borda e alinhamento, não por caixa. E é frase, não
// cor: em escala de cinza a informação é a mesma.

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ExportAxisState } from "@/lib/v1";
import { useExportDownload } from "../../data/analysis";
import { useCanonicalScope } from "../scope";

export function AcaoDeExport({
  analysisId,
  estado,
}: {
  analysisId: string;
  /** Do eixo `export` de `/progress`. `null` enquanto o progresso não respondeu. */
  estado: ExportAxisState | null;
}) {
  const { t } = useLanguage();
  const scope = useCanonicalScope();
  const pedir = useExportDownload();

  function baixar() {
    if (!scope) return;
    // O owner real: o cliente canônico da M22. Nenhuma segunda implementação HTTP, nenhuma URL
    // de mock na UI. A capability é curta e não é guardada — a navegação acontece na hora.
    pedir.mutate(
      { analysisId, scope },
      {
        onSuccess: (capability) => {
          // `download_url` é transporte com TTL de 5 min. Ela não vira estado, não entra em
          // cache e não é persistida: é usada e esquecida.
          window.location.assign(capability.download_url);
        },
      },
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {estado === "ready" ? (
        <>
          <Button variant="outline" onClick={baixar} disabled={pedir.isPending}>
            {t("canonicalAnalysis.result.analytics.exportDownload")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("canonicalAnalysis.result.analytics.exportReadyHint")}
          </p>
        </>
      ) : (
        // Sem botão desabilitado: um botão que não faz nada convida ao clique e depois nega. O
        // que fica é a frase do estado — família declarada, não `t(variavel)`.
        estado && (
          <p className="text-xs text-muted-foreground">
            {t(`canonicalAnalysis.result.analytics.exportState.${estado}`)}
          </p>
        )
      )}
    </div>
  );
}
