// M34 — os quatro eixos de progresso, lado a lado.
//
// ## Design preflight — referência → problema de AN-03 → decisão
//
// **Grafana (observabilidade).** A referência finalmente cai no terreno dela. O problema: quatro
// componentes com estados HETEROGÊNEOS que precisam ser comparáveis de relance — um pode estar
// pronto enquanto outro ainda roda. Decisão: **mesmo gabarito por eixo, em colunas alinhadas** —
// nome em cima, estado embaixo, sempre na mesma altura —, para o olho varrer a *linha de estados*
// em vez de ler quatro blocos. Numerais tabulares não entram porque aqui não há número nenhum.
//
// **Grafana como CONTRAEXEMPLO.** A tentação óbvia é o semáforo: uma bolinha verde/amarela/
// vermelha por eixo. Recusado — `StatusBadge` traz ícone **e** palavra, dois canais além da cor,
// e é o componente que o DS criou exatamente contra `HomeStatus`/`AnalysisStatus` divergentes.
//
// **Linear (rampa).** Um painel com fios internos, não quatro cartões. Quatro caixas iguais fariam
// a leitura voltar a ser "quatro coisas" em vez de "um sistema com quatro capacidades" — o mesmo
// defeito que a M31 mediu em RES-01 e desfez.
//
// **PagerDuty.** Descartada de novo: AN-03 não é fila, ninguém é esperado aqui.
//
// **Nem HOME-01 nem RES-01.** A Home é uma lista de coisas acionáveis, e lê-se de cima para baixo;
// RES-01 agrupa medidas de um documento. AN-03 é a primeira superfície cuja leitura é
// **horizontal**: quatro capacidades comparadas entre si, no mesmo instante.
//
// ## O que esta faixa se proíbe
//
// Sem percentual, sem barra global, sem donut, sem gauge, sem "3 de 4 prontos", sem ordenar por
// "mais pronto". O tipo do contrato é explícito: *"Não há percentual, e não haverá"*. A ordem é a
// publicada em `progress_axes`, porque reordenar seria a tela decidindo prioridade entre
// componentes que o produtor lista lado a lado.
//
// ## Vocabulário
//
// Rótulo de eixo e rótulo de estado vêm de `eixo.*` e `estadoEixo.*`, na RAIZ do i18n — fonte
// única, critério 17. As chaves espelham as do contrato, então a família é declarada
// (`eixo.${axis}`) e nunca `t(variavel)`, que o gate da M14 recusa.
//
// O identificador técnico do eixo **não** vira copy: a UI mostra "Processamento", nunca a chave.
// É também por isso que este arquivo não contém a palavra proibida pelo cadeado da jornada — o
// mapa de chaves vive em `lib/v1`, e aqui só se itera sobre ele.

import { useLanguage } from "@/contexts/LanguageContext";
import { StatusBadge } from "@/design/patterns";
import type { EstadoDeEixo } from "@/design/patterns/estados";
import type { EixoLido } from "../result/eixos";

/** Uma coluna: nome do eixo em cima, estado embaixo. Mesmo gabarito nos quatro. */
function ColunaDeEixo({ eixo }: { eixo: EixoLido }) {
  const { t } = useLanguage();
  return (
    <li className="flex flex-col gap-1.5 bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t(`eixo.${eixo.axis}`)}</p>
      {eixo.entrada === null ? (
        // AUSÊNCIA: o produtor não publicou este eixo. Não é `pending` — `pending` é um estado que
        // alguém afirmou, e convertê-lo prometeria que o componente ainda vai acontecer.
        <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.result.notMeasured")}</p>
      ) : (
        <div className="flex">
          <StatusBadge
            vocabulario="eixo"
            estado={eixo.entrada.state as EstadoDeEixo}
            rotulo={t(`estadoEixo.${eixo.entrada.state}`)}
          />
        </div>
      )}
    </li>
  );
}

export function PainelDeEixos({ eixos }: { eixos: readonly EixoLido[] }) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="an03-eixos" className="space-y-3">
      <h2 id="an03-eixos" className="text-lg font-semibold text-foreground">
        {t("canonicalAnalysis.progress.title")}
      </h2>
      {/* Lado a lado onde há largura real. Abaixo de `md` vira duas colunas e, no mobile, uma —
          preservando a ORDEM publicada. Quatro colunas microscópicas em 390px cumpririam a letra
          de "lado a lado" e destruiriam a comparação, que é o que o requisito quer.
          A moldura é uma só, com fio de 1px entre as células: um sistema com quatro capacidades,
          não quatro cartões. */}
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {eixos.map((eixo) => (
          <ColunaDeEixo key={eixo.axis} eixo={eixo} />
        ))}
      </ul>
      {/* Nenhum agregado embaixo. A pergunta que a faixa responde é "o que está acontecendo em
          cada parte", e um resumo aqui reintroduziria o progresso global pela porta dos fundos. */}
    </section>
  );
}
