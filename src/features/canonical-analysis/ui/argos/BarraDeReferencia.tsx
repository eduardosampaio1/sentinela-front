// A BARRA DE REFERÊNCIA — a faixa do protótipo acima da primeira dobra.
//
// ## Eu tinha argumentado CONTRA isto, e estava errado
//
// Ao montar o herói escrevi que comparação "não é um campo ausente deste documento — é um conceito
// que ele não tem", e por isso recusei o vão hachurado de "sem referência". O owner mostrou o
// protótipo, que amarra a comparação na **referência da Instância** — e essa existe de verdade no
// produto, desde a BD10, com rota, ponteiro e ação de definir.
//
// Se a referência é conceito real e OPCIONAL, então "esta Instância não tem referência" é afirmação
// verdadeira, verificável e acionável. Meu argumento caiu.
//
// ## Três estados, e o primeiro é o que quase todo mundo esquece
//
// **Análise SEM Instância.** `instance_id` é `null` no read model de status, e o contrato diz que
// isso inclui "toda a legada". Aqui a barra NÃO aparece: dizer "sem referência" implicaria que uma
// poderia ser definida, e não pode — não há Instância a que amarrar. Prometer um controle que não
// existe é o erro que custou a D21.
//
// **Instância sem referência.** A barra aparece com a ação. É o estado inicial legítimo, nunca erro
// — o contrato é explícito: `null` = `NO_BASELINE`, "estado LEGÍTIMO e inicial".
//
// **Instância com referência.** A barra diz QUAL análise é a referência. Informação, não alerta.
//
// ## O que a barra NÃO afirma
//
// O protótipo dizia "os deltas e a deriva semântica ficam sem base de comparação". Eu não repito
// isso: seria a tela deduzindo quais medidas dependem da referência, e nenhum contrato publica essa
// dependência. Quando uma medida não pode ser calculada, ela mesma diz por quê — o `reason` é
// tipado, e é lá que a explicação pertence.

// ## O vocabulario e o de `baseline.*`, e nao um novo
//
// Eu havia criado quatro chaves proprias — `referenceLabel`, `noReference`, `setReference`,
// `changeReference`. Erro de copy: o mesmo ato ja tem nome nesta casa, em `baseline.*`, usado pela
// tela da Instancia. Duas palavras para o mesmo ato e exatamente o que a regra de copy proibe, e a
// pessoa que ler as duas telas veria termos diferentes para a mesma coisa.
//
// Um efeito colateral bom: `setReference` estourava o orcamento de expansao do PT. A chave que ja
// existia nao estoura, porque alguem ja teve esse trabalho.
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Text } from "@/design/primitives";
import { useBaseline } from "@/features/instances/data/instance";
import type { CanonicalScope } from "@/lib/v1";

export function BarraDeReferencia({
  scope,
  instanceId,
}: {
  readonly scope: CanonicalScope | null;
  /** `instance_id` do read model de status. `null` = análise sem Instância. */
  readonly instanceId: string | null;
}) {
  const { t } = useLanguage();
  // O hook já é `enabled: Boolean(scope && instanceId)` — sem Instância ele não faz requisição.
  const baseline = useBaseline(scope, instanceId ?? undefined);

  // Sem Instância, a referência não é um conceito desta análise. Nada a dizer, e dizer seria pior.
  if (!instanceId) return null;
  // Enquanto carrega, a barra não existe. Um esqueleto aqui anunciaria uma ausência que talvez não
  // seja verdade, e este bloco fica acima do herói — o pior lugar para uma afirmação provisória.
  if (baseline.isPending || baseline.isError || !baseline.data) return null;

  const definida = baseline.data.baseline_analysis_id !== null;
  const paraInstancia = `/instances/${encodeURIComponent(instanceId)}`;

  return (
    <div
      // `status`, não `alert`: ausência de referência é configuração pendente, não falha. Alertar
      // por ausência ensina a ignorar alertas — a mesma regra que esta visão usa nos outros dois
      // estados de indisponibilidade.
      role="status"
      data-referencia={definida ? "definida" : "ausente"}
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3 ${
        definida ? "border-border bg-card" : "border-dashed border-[hsl(var(--ds-border-strong))]"
      }`}
    >
      {definida ? (
        <>
          <Text papel="micro" tom="discreto">
            {t("baseline.currentLabel")}
          </Text>
          {/* O id da referência é IDENTIDADE: `literal` liga a família mono, e mono aqui é o papel
              certo — identificador é para copiar e comparar caractere por caractere. */}
          <Text papel="rotulo" literal>
            {baseline.data.baseline_analysis_id}
          </Text>
        </>
      ) : (
        <Text papel="corpo" tom="secundario" className="min-w-0 flex-1">
          {t("baseline.none")}
        </Text>
      )}

      {/* A ação leva para onde a referência é DEFINIDA — a tela da Instância. Ela não define aqui:
          o Diagnóstico é leitura, e escolher referência é um ato que pertence à Instância. */}
      <Link
        to={paraInstancia}
        className="ml-auto min-h-11 shrink-0 self-center rounded-md border border-border px-3 py-2 text-xs font-medium text-[hsl(var(--ds-accent-ink))] transition-colors hover:bg-muted"
      >
        {definida ? t("baseline.replaceTitle") : t("baseline.set")}
      </Link>
    </div>
  );
}
