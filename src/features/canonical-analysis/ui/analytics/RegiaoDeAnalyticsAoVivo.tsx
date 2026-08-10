// M27 — a região Analytics de RES-01 lida do PRÓPRIO componente analítico.
//
// ## Por que existe, se o v2 já traz analytics
//
// São duas leituras do mesmo produtor, com prazos diferentes. O `analysis-result-v2` é o
// documento INTEGRADO: ele só existe depois da barreira (facts atestados **e** comanda em desfecho
// terminal). `GET /analytics` é o componente, e ele responde antes disso.
//
// O Blueprint §4.6 atribui a região Analytics de RES-01 justamente a `GET /analytics`
// (`component_status`, `snapshot`, `withheld`), e é dele que vêm os scenarios 11, 12 e 23. Até
// aqui a página inteira ficava atrás de `result_available`: com o documento ausente, RES-01 dizia
// "resultado em preparação" e escondia um analytics que podia estar **pronto**. Um componente
// indisponível bloqueando outro disponível é exatamente o que a disponibilidade progressiva
// existe para impedir.
//
// Quando o documento existe, quem manda é o bloco do v2 — esta região não duplica.
//
// ## Os cinco estados não são sinônimos
//
//   ready      entregue
//   partial    entregue em PARTE; o que falta não foi medido, e não é zero
//   withheld   entregue e RETIDO por regra publicada — conclusão, não falha
//   failed     o componente falhou
//   unknown    não se sabe; a tela não afirma nada
//
// `withheld` reusa `AnalyticsRetido`, que já é a linguagem visual desse estado desde a MF6.4b —
// criar uma segunda seria ensinar duas gramáticas para o mesmo fato.
//
// ## O que esta região NÃO faz
//
// Não agrega categoria, não recalcula média nem percentual, não ordena por relevância, não
// transforma digest ou versão em nota, e não infere qualidade. Ela lê o read model publicado
// (`analytics_read_model_fields`, 9 campos) e o apresenta.

import { useLanguage } from "@/contexts/LanguageContext";
import { ProvenanceMargin, type ItemDeProcedencia } from "@/design/patterns/ProvenanceMargin";
import type { AnalysisAnalyticsView } from "@/lib/v1";
import { lerSnapshot } from "../../result/analyticsProjection";
import { AnalyticsRetido } from "./Retido";

/**
 * Procedência da PROJEÇÃO — nível de documento analítico, e por isso uma margem só na região,
 * não uma por bloco.
 *
 * Só os campos que `analytics_read_model_fields` publica. `min_group_size`, `top_k`,
 * `max_tracked_*` e `privacy_policy_version` vivem DENTRO das projeções aninhadas (BD08) e
 * pertencem a cada bloco — trazê-los para cá afirmaria que valem para a projeção inteira.
 */
function procedenciaDaProjecao(
  vista: AnalysisAnalyticsView,
  t: (chave: string) => string,
): ItemDeProcedencia[] {
  return [
    { rotulo: t("canonicalAnalysis.result.analytics.provGenerated"), valor: vista.generated_at },
    {
      rotulo: t("canonicalAnalysis.result.analytics.provSnapshot"),
      valor: vista.snapshot_contract_version,
    },
    {
      rotulo: t("canonicalAnalysis.result.analytics.provDisclosure"),
      valor: vista.disclosure_rule_version,
    },
    {
      rotulo: t("canonicalAnalysis.result.analytics.provProjection"),
      valor: vista.projection_digest,
    },
  ];
}

export function RegiaoDeAnalyticsAoVivo({ vista }: { vista: AnalysisAnalyticsView }) {
  const { t } = useLanguage();
  const titulo = t("canonicalAnalysis.result.analytics.liveTitle");

  // O snapshot é lido pelo MESMO leitor da M21 (`analytics-snapshot-v9`). Ilegível ou ausente é
  // DECLARADO — nunca preenchido, nunca zero.
  const snapshot = vista.component_status === "withheld" ? null : lerSnapshot(vista.snapshot);
  const temBlocoLegivel = snapshot !== null;

  return (
    <section aria-labelledby="res-analytics-vivo" className="space-y-3">
      <div>
        <h2 id="res-analytics-vivo" className="text-lg font-semibold text-foreground">
          {titulo}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("canonicalAnalysis.result.analytics.liveSubtitle")}
        </p>
      </div>

      {vista.component_status === "withheld" ? (
        // Conclusão, não falha. E a razão INTERNA não é impressa: nomeá-la descreveria a
        // população que a retenção existe para não revelar.
        <AnalyticsRetido />
      ) : (
        <ProvenanceMargin
          // NÃO o título da seção: o `<h2>` já o imprime, e a margem imprime o seu rótulo
          // também — na 1ª captura "Componente analítico" apareceu duas vezes na mesma tela. O
          // grupo é sobre o ESTADO, e é assim que ele se chama.
          rotuloDoIndicador={t("canonicalAnalysis.result.analytics.stateGroup")}
          procedencia={procedenciaDaProjecao(vista, t)}
          rotuloDaMargem={t("canonicalAnalysis.result.provenanceLabel")}
          textoQuandoAusente={t("canonicalAnalysis.result.provenanceAbsent")}
        >
          {/* `role="status"` nos quatro: é leitura de estado, não interrupção. Nem `failed`
              vira `alert` aqui — ele não pede ação nesta tela, e um alerta por componente
              ensinaria a ignorar alertas. O estado é TEXTO; cor não carrega a informação. */}
          {/* Família declarada (`…analytics.state.${status}`), não `t(variavel)`: o gate da M14
              não decide orfandade sobre chamada opaca, e congela a contagem. */}
          <p role="status" className="text-sm text-muted-foreground">
            {t(`canonicalAnalysis.result.analytics.state.${vista.component_status}`)}
          </p>

          {!temBlocoLegivel && vista.component_status !== "failed" && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("canonicalAnalysis.result.analytics.noReadable")}
            </p>
          )}
        </ProvenanceMargin>
      )}
    </section>
  );
}
