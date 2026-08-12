// M30 — a região "comparado com a anterior" de RES-01.
//
// ## Por que é LINHA, e não painel duplo
//
// Linear (§3, linha 1): separação por *"borda e alinhamento"*, não por caixa. Duas colunas de
// cartões — um "antes" e um "depois" por indicador — seriam o dobro de containers para dizer o
// que uma linha diz: `antes → depois`. O `Moldura` do `ComparisonRow` (M13) já é essa linha, com
// `border-b`.
//
// ## A ruptura não pode parecer delta
//
// O pattern da M13 tem DUAS formas, e a diferença não é de aparência: no caso comparável existe
// seta e pode existir delta; no quebrado existe **elo partido** e não existe número nenhum. São
// três canais somados — ícone, ausência do delta e o motivo escrito — e **nenhum deles é cor**.
// Alguém em escala de cinza, com daltonismo ou num leitor de tela recebe a mesma informação.
//
// ## O delta é `null`, e isso é o contrato
//
// `ComparisonRow` aceita `delta` como *"texto pronto, com sinal e unidade"*, porque o Front não
// calcula variação. Nada no `analysis-result-v1/v2` publica delta entre duas análises — então
// passa `null`, e a linha mostra os dois valores sem afirmar movimento entre eles.

import { useLanguage } from "@/contexts/LanguageContext";
import { ComparisonRow, ComparisonRowQuebrada } from "@/design/patterns/ComparisonRow";
import { rotuloDoIndicador } from "../../result/indicadores";
import type { Comparacao } from "../../result/comparacao";

/**
 * M39 — os RÓTULOS passaram a ser injetáveis, a REGRA não.
 *
 * Na RES-01 o lado esquerdo é mesmo "a anterior", e o título diz isso com verdade. Na EVO-02 os
 * dois lados vêm da URL e **nenhuma ordem cronológica é publicada**: chamar A de "anterior" ali
 * seria a tela afirmando um fato que nem a rota nem o contrato sustentam. Um segundo componente
 * resolveria a copy e duplicaria a apresentação — que é exatamente o que D29 proíbe. Então o
 * componente é um só, e quem sabe a relação entre os dois lados informa como chamá-los.
 */
export function ComparacaoComAnterior({
  comparacao,
  tituloKey = "canonicalAnalysis.result.compareTitle",
  baseKey = "canonicalAnalysis.result.compareBase",
}: {
  comparacao: Comparacao | null;
  tituloKey?: string;
  baseKey?: string;
}) {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="res-comparacao" className="space-y-3">
      <div>
        <h2 id="res-comparacao" className="text-lg font-semibold text-foreground">
          {t(tituloKey)}
        </h2>
        {/* A quebra é dita ANTES das linhas, e em texto. Escondê-la num tooltip faria a pessoa
            ler dezenas de pares como série antes de descobrir que não são. */}
        {comparacao && !comparacao.comparavel && (
          <p role="status" className="mt-1 text-sm text-muted-foreground">
            {t("canonicalAnalysis.result.compareBroken")}
          </p>
        )}
      </div>

      {comparacao === null ? (
        <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.compareNone")}</p>
      ) : (
        <div>
          {comparacao.linhas.map((l) => {
            const rotulo = rotuloDoIndicador(l, t);
            const base = t(baseKey);
            return l.comparavel ? (
              <ComparisonRow
                key={l.id}
                rotulo={rotulo}
                antes={l.antes}
                depois={l.depois}
                base={base}
                // Nada publica variação entre duas análises. `null` é a resposta honesta.
                delta={null}
              />
            ) : (
              <ComparisonRowQuebrada
                key={l.id}
                rotulo={rotulo}
                antes={l.antes}
                depois={l.depois}
                base={base}
                // CURTO na linha, completo no cabeçalho. A captura mostrou a frase inteira
                // repetida em cada par — com muitos indicadores, vira parede de texto e a
                // explicação deixa de ser lida. O motivo por linha só precisa dizer que aquele
                // par não é série; o porquê já foi dito uma vez, acima.
                motivo={t("canonicalAnalysis.result.compareBrokenShort")}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
