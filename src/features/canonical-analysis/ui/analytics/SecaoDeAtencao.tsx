// M26 — a região "O que merece atenção" de RES-01.
//
// Blueprint §4.6, e a linha inteira importa: *fonte de verdade = "derivado do documento canônico
// (ordenação, sem recálculo)"*. Esta seção não decide o que é grave. Ela mostra, em ordem de
// leitura, o que a ORIGEM assinalou — e diz por quê, com palavra, não com cor.
//
// ## Por que não é um alerta
//
// Nada aqui é vermelho por padrão. "Atenção" no Product Freeze é onde existe ação humana real; um
// indicador fora de faixa é uma leitura a conferir, não um incidente que a tela possa classificar.
// Pintar tudo de destrutivo ensinaria a pessoa a ignorar a cor — e o dia em que houvesse algo
// grave, ela não veria.
//
// ## Por que não depende de cor
//
// O motivo vem escrito ao lado do nome do indicador. Em escala de cinza, com daltonismo, ou num
// leitor de tela, a informação é a mesma — V6 da Constituição.
//
// ## Ausência é estado, não vazio
//
// Sem itens assinalados a seção **permanece** e diz isso. Sumir com ela faria "a análise não
// assinalou nada" e "esta tela não sabe assinalar" parecerem a mesma coisa.

import { useLanguage } from "@/contexts/LanguageContext";
import { rotuloDoIndicador } from "../../result/indicadores";
import type { ItemDeAtencao } from "../../result/atencao";

export function SecaoDeAtencao({
  itens,
  partial = false,
}: {
  itens: readonly ItemDeAtencao[];
  partial?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="res-atencao" className="space-y-3">
      <h2 id="res-atencao" className="text-lg font-semibold text-foreground">
        {t("canonicalAnalysis.result.attentionTitle")}
      </h2>

      {/* M31 — vazia, esta região era uma frase cinza de 14px entre dois títulos: a primeira
          leitura da página era a menor coisa dela. Agora o estado vazio ocupa a MESMA moldura que
          a lista ocuparia, então a região tem presença igual esteja cheia ou vazia — que é o que
          "ausência é estado, não vazio" quer dizer visualmente. */}
      {itens.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {t(
              partial
                ? "canonicalAnalysis.result.attentionNonePartial"
                : "canonicalAnalysis.result.attentionNone",
            )}
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
            {itens.map(({ item, motivo }) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 bg-card px-4 py-3"
              >
                {/* O nome do indicador é o gancho: a pessoa encontra o mesmo rótulo na seção de
                    Indicadores abaixo, com valor e procedência. Aqui não se repete o número —
                    repetir criaria dois lugares para o mesmo dado. */}
                <span className="text-sm font-medium text-foreground">
                  {rotuloDoIndicador(item, t)}
                </span>
                {/* Família declarada (`…attentionMotivo.${motivo}`) e não `t(variavel)`: o gate da
                    M14 não decide orfandade sobre chamada opaca, e congela a contagem. */}
                <span className="text-sm text-muted-foreground">
                  {t(`canonicalAnalysis.result.attentionMotivo.${motivo}`)}
                </span>
              </li>
            ))}
          </ul>
          {/* Honestidade sobre o que a ordem É: leitura, não ranking de gravidade. */}
          <p className="text-xs text-muted-foreground">
            {t("canonicalAnalysis.result.attentionOrderNote")}
          </p>
        </>
      )}
    </section>
  );
}
