// M28 — a linha do tempo de RES-01, lida de `/timeline`.
//
// ## Direção visual, e de onde ela vem
//
// **Nenhuma referência medida no programa trata de sequência de eventos.** DESIGN-05 mediu Linear,
// Grafana e Vercel para elevação, densidade, tipografia e procedência — nada sobre timeline.
// Forçar semelhança com elas seria inventar a origem, então o que se aproveita é a REGRA geral, e
// só ela: Linear separa por *"borda e alinhamento"*, não por caixa (§3, linha 1), e o
// `/design-critique` do §5 pede **painel, não cartão**.
//
// Daí a régua contínua à esquerda: a linha vertical **é** a sequência. Nenhum cartão por evento —
// oito caixas empilhadas seriam oito separações onde existe uma continuidade só.
//
// `sequence` em numeral tabular, porque é o que o Grafana faz com número (§3, linha 4) e porque
// dígito de largura variável faz uma coluna de números tremer.
//
// ## O que NÃO é
//
// Não é feed: sem avatar, sem "há 2 horas", sem verbo na voz do sistema. `occurred_at` sai como
// veio — calcular duração ou tempo relativo seria aritmética temporal que contrato nenhum
// autoriza, e "há 2 horas" depende do relógio do navegador.
//
// Não reordena. A ordem recebida é DADO: o produtor entrega crescente por `sequence` por análise,
// e "consertar" isso aqui faria o front opinar sobre a história que o backend gravou.
//
// Não sintetiza nem preenche lacuna. Se falta evento entre dois `sequence`, falta — inventar o do
// meio produziria uma história plausível em vez da que aconteceu.
//
// `analysis.completed` e `result.available` continuam DOIS eventos. Os dois mapeiam para o estado
// público `completed`, e colapsá-los apagaria a janela entre "a execução terminou" e "existe
// documento" — que é justamente quando alguém pergunta o que houve.

import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalysisTimelineView } from "@/lib/v1";

export function LinhaDoTempo({ vista }: { vista: AnalysisTimelineView }) {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="res-timeline" className="space-y-3">
      <div>
        <h2 id="res-timeline" className="text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.result.timelineTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("canonicalAnalysis.result.timelineIntro")}
        </p>
      </div>

      {vista.events.length === 0 ? (
        // Vazio é estado, e é dito. Sumir com a seção faria "não houve evento" e "esta tela não
        // sabe ler evento" parecerem a mesma coisa.
        <p className="text-sm text-muted-foreground">
          {t("canonicalAnalysis.result.timelineEmpty")}
        </p>
      ) : (
        // A régua é o componente: `border-l` contínuo, e cada evento pendurado nele. Sem cartão.
        <ol className="border-l border-border pl-4 space-y-3">
          {vista.events.map((ev) => (
            <li key={ev.event_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {t("canonicalAnalysis.result.timelineSeq")} {ev.sequence}
              </span>
              {/* Família declarada, não `t(variavel)`: o gate da M14 não decide orfandade sobre
                  chamada opaca. */}
              <span className="text-sm font-medium text-foreground">
                {t(`canonicalAnalysis.result.timelineEvent.${ev.event_type}`)}
              </span>
              <time dateTime={ev.occurred_at} className="text-xs tabular-nums text-muted-foreground">
                {/* Como veio. Nada de tempo relativo: ele depende do relógio do navegador, e o
                    contrato não publica duração. */}
                {ev.occurred_at}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
