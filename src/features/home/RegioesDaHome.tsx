// M32 — as regiões operacionais de HOME-01.
//
// ## Design preflight — referência → problema da Home → decisão
//
// **PagerDuty (fila de ação).** Foi DESCARTADA na RES-01, e o motivo está no DESIGN-05 §5:
// *"atenção é ordenação, não triagem"* — lá a seção só ordena o que o documento assinalou. Na Home
// o veredito **inverte**: "Ações necessárias" É uma fila operacional, análises paradas esperando
// uma pessoa. Por isso esta região tem moldura e as outras não: a diferença de peso entre as
// regiões é o que faz a Home responder *"o que precisa de mim"* em vez de *"quantos temos"*.
// É também o que a impede de virar uma cópia da RES-01, onde todas as regiões pesam igual.
//
// **Linear (rampa de borda e alinhamento, não caixas).** A Home lista análises, e o reflexo é um
// cartão por análise. Com quatro regiões isso vira uma parede de retângulos idênticos — o mesmo
// defeito que a M31 mediu e desfez em RES-01. Cada região é uma LISTA DE LINHAS separadas por fio;
// nenhuma análise tem caixa própria.
//
// **Grafana (numerais tabulares).** `record_count` é a única coluna numérica; alinha para poder
// ser varrida. Nada de outro número: contagem agregada, score, saúde, percentual e ranking estão
// congelados fora desta superfície por decisão de owner — a Home não é dashboard de KPIs (D9).
//
// **Motion.** Nenhum novo. O único movimento é o `motion-safe:animate-pulse` que o `LoadingState`
// do DS já traz. Não há continuidade de estado nesta tela que fique mais compreensível com
// movimento; animar a entrada das linhas seria decoração.
//
// ## O estado é palavra, nunca cor
//
// `StatusBadge` é imposto pelo Blueprint (*"UM só componente para os dois vocabulários"*) e é
// explicitamente a defesa contra `HomeStatus`/`InstanceStatus`/`AnalysisStatus` com três
// linguagens. Nenhuma região inventa rótulo de estado.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatusBadge } from "@/design/patterns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AnalysisListItem, AnalysisStatus, CanonicalScope, InstanceView } from "@/lib/v1";
import { useDeleteFailedAnalysis } from "@/features/canonical-analysis/data/list";

const LIMITE_DA_HOME = 4;

/**
 * O rótulo publicado de cada estado.
 *
 * FAMÍLIA declarada — `estadoPublico.${estado}` —, não `t(variavel)`. A 1ª versão montava um
 * `Record<AnalysisStatus, string>` de chaves e passava `t(chave[estado])`: o gate da M14 reprovou,
 * e com razão, porque sobre chamada opaca ele não consegue decidir orfandade e o contador de
 * dívida subiria por nada. O sufixo é o literal do contrato; quem garante que os oito têm rótulo
 * nos dois idiomas é o teste, varrendo `PUBLIC_STATES`.
 */
function rotuloDeEstado(estado: AnalysisStatus, t: (c: string) => string): string {
  return t(`estadoPublico.${estado}`);
}

/**
 * Uma linha de análise. Sem caixa: quem separa é o fio da lista.
 *
 * Abaixo de `sm` ela vira DUAS alturas — estado + identificador na primeira, contagem + ação na
 * segunda. A versão de uma linha só truncava o `analysis_id` para `an-…` em 342px, e ele é a
 * ÚNICA identidade da análise: o contrato não publica título, e inventar um ("Análise de 31 de
 * julho") seria fabricar nome. Identidade truncada é informação desaparecendo.
 *
 * A ação fica na MESMA célula que a contagem, nunca solta numa linha órfã: ação separada do item
 * a que pertence é ação sem contexto. `sm:contents` dissolve os dois invólucros a partir de 640px,
 * e os quatro elementos voltam a ser filhos diretos da linha.
 */
function LinhaDeAnalise({
  item,
  acao,
  nota,
}: {
  item: AnalysisListItem;
  /** O que se pode fazer com esta análise AQUI. `null` quando não há operação real. */
  acao: React.ReactNode;
  /** Explicação abaixo da linha. Só onde o estado exige — não é subtítulo de todo item. */
  nota?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <li className="border-b border-border/60 py-4 last:border-b-0">
      <div className="grid min-w-0 gap-2 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:items-center md:gap-x-3">
        {/* `rotulo` é obrigatório por design da M11: o badge não conhece i18n de produto. A chave
            vive na RAIZ (`estadoPublico.*`), e não sob `home.*`, porque o critério 17 exige UMA
            semântica pública de estados — um segundo conjunto por superfície seria exatamente o
            `HomeStatus`/`AnalysisStatus` com duas linguagens contra o qual o pattern foi criado. */}
        <StatusBadge
          vocabulario="publico"
          estado={item.status}
          rotulo={rotuloDeEstado(item.status, t)}
          className="w-fit"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">
            {item.display_name ?? t("home.unnamedAnalysis")}
          </span>
          <span className="mt-0.5 block break-all font-mono text-xs text-muted-foreground md:truncate md:break-normal">
            {item.analysis_id}
          </span>
        </span>
        {/* `record_count` é `null` quando ausente, e ausência NUNCA vira zero. */}
        <span className="tabular-nums text-sm text-muted-foreground">
          {item.record_count === null
            ? t("home.recordCountAbsent")
            : t("home.recordCount", { n: String(item.record_count) })}
        </span>
        <span className="w-full md:w-auto [&_a]:min-h-11 [&_a]:w-full [&_button]:min-h-11 [&_button]:w-full md:[&_a]:min-h-9 md:[&_a]:w-auto md:[&_button]:min-h-9 md:[&_button]:w-auto">
          {acao}
        </span>
      </div>
      {nota ? <div className="mt-2 md:pl-[calc(5.75rem+0.75rem)]">{nota}</div> : null}
    </li>
  );
}

function TituloDaRegiao({ id, texto }: { id: string; texto: string }) {
  return (
    <h2 id={id} className="text-lg font-semibold text-foreground">
      {texto}
    </h2>
  );
}

function itensDaHome(itens: readonly AnalysisListItem[]): readonly AnalysisListItem[] {
  return itens.slice(0, LIMITE_DA_HOME);
}

function AvisoDeRecorte({ mostrar }: { mostrar: boolean }) {
  const { t } = useLanguage();
  if (!mostrar) return null;
  return (
    <p className="pt-2 text-sm text-muted-foreground">
      {t("home.sectionOverflow")}{" "}
      <Link to="/analyses" className="inline-block py-1 text-foreground underline-offset-4 hover:underline">
        {t("home.seeAll")}
      </Link>
    </p>
  );
}

/**
 * 1 · Continue daqui — a fila acionável.
 *
 * `preparing`, `needs_mapping` e `ready_to_submit` têm uma próxima ação concreta dentro da análise.
 * A Home mostra a porta certa, não tenta resolver o fluxo inteiro na lista.
 */
export function RegiaoDeAcoes({ itens }: { itens: readonly AnalysisListItem[] }) {
  const { t } = useLanguage();
  if (itens.length === 0) {
    // Fila vazia é boa notícia, e a região permanece: sumir faria "nada precisa de você" e "esta
    // tela não sabe checar" parecerem a mesma coisa.
    return (
      <section data-revelar aria-labelledby="home-acoes" className="space-y-3">
        <TituloDaRegiao id="home-acoes" texto={t("home.actions.title")} />
        <div className="rounded-[var(--ds-radius-panel)] border border-border bg-card p-4">
          <p className="max-w-prose text-sm text-muted-foreground">{t("home.actions.none")}</p>
        </div>
      </section>
    );
  }
  return (
    <section data-revelar aria-labelledby="home-acoes" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TituloDaRegiao id="home-acoes" texto={t("home.actions.title")} />
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t("home.actions.explain")}</p>
        </div>
      </div>
      <ul className="rounded-[var(--ds-radius-panel)] border border-border bg-card/65 px-3 sm:px-4">
        {itensDaHome(itens).map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={
              <Button
                asChild
                variant={item.status === "preparing" ? "outline" : "default"}
                size="sm"
                className="w-full md:w-auto"
              >
                <Link to={`/analyses/${encodeURIComponent(item.analysis_id)}`}>
                  {item.status === "preparing"
                    ? t("home.actions.sendDataset")
                    : item.status === "ready_to_submit"
                      ? t("home.actions.submit")
                      : item.status === "needs_mapping"
                        ? t("home.actions.resolve")
                        : t("home.openAnalysis")}
                </Link>
              </Button>
            }
            nota={
              // Estado publico COM operacao publica, e isto mudou. O catalogo declarava o
              // scenario `parcial` -- "EXIBIR sim, RESOLVER nao" -- porque a operacao que
              // resolve nao existia. Ela existe (`GET`/`POST /v1/analyses/{id}/mapping`), e
              // a nota deixou de explicar impedimento para apontar o caminho.
              //
              // Continua sem botao AQUI: a fila lista, e resolver e assunto da analise. Um
              // `Confirmar` na linha abriria um editor de colunas dentro de uma lista.
              //
              // Nao usa `ActionRequiredSemOperacao` aqui: aquele pattern desenha a propria
              // moldura, e dentro da fila isso dava caixa-dentro-de-caixa. O efeito nao era
              // estetico -- na MESMA regiao um item virava cartao e o outro linha, e o peso
              // afirmava uma urgencia entre eles que a semantica nao afirma (a ordem e a da
              // origem, sem prioridade inventada). A distincao de "acao necessaria" continua,
              // pelo `StatusBadge`, que e o componente do DS para isso.
              item.status === "needs_mapping" ? (
                <p className="mt-1 text-xs text-muted-foreground sm:w-full">
                  {t("canonicalAnalysis.needsMapping.explain")}{" "}
                  <span className="text-muted-foreground">
                    {t("canonicalAnalysis.needsMapping.goConfirm")}
                  </span>
                </p>
              ) : item.status === "preparing" ? (
                <p className="mt-1 text-xs text-muted-foreground sm:w-full">
                  {t("home.actions.preparingNote")}
                </p>
              ) : item.status === "ready_to_submit" ? (
                <p className="mt-1 text-xs text-muted-foreground sm:w-full">
                  {t("home.actions.readyNote")}
                </p>
              ) : undefined
            }
          />
        ))}
      </ul>
      <AvisoDeRecorte mostrar={itens.length > LIMITE_DA_HOME} />
    </section>
  );
}

/** 2 · Em andamento — o sistema está trabalhando; ninguém é esperado. */
export function RegiaoEmAndamento({ itens }: { itens: readonly AnalysisListItem[] }) {
  const { t } = useLanguage();
  if (itens.length === 0) return null;
  return (
    <section data-revelar aria-labelledby="home-andamento" className="space-y-3">
      <div>
        <TituloDaRegiao id="home-andamento" texto={t("home.running.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("home.running.explain")}</p>
      </div>
      {/* Sem moldura: peso menor que a fila, de propósito. Nenhuma barra de progresso agregada —
          o detalhe por eixo é de AN-03, e um "%" somado aqui seria número inventado. */}
      <ul className="rounded-[var(--ds-radius-panel)] border border-border bg-card/70 px-3 sm:px-4">
        {itensDaHome(itens).map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={
              <Button asChild variant="outline" size="sm" className="w-full md:w-auto">
                <Link to={`/analyses/${encodeURIComponent(item.analysis_id)}`}>
                  {t("home.followAnalysis")}
                </Link>
              </Button>
            }
          />
        ))}
      </ul>
      <AvisoDeRecorte mostrar={itens.length > LIMITE_DA_HOME} />
    </section>
  );
}

/** 3 · Resultados recentes — `completed` com `result_available`. */
export function RegiaoDeResultados({
  itens,
  semResultado,
}: {
  itens: readonly AnalysisListItem[];
  /** `completed` SEM `result_available`: não é resultado recente, e não pode sumir. */
  semResultado: readonly AnalysisListItem[];
}) {
  const { t } = useLanguage();
  if (itens.length === 0 && semResultado.length === 0) return null;
  return (
    <section data-revelar aria-labelledby="home-resultados" className="space-y-3">
      <div>
        <TituloDaRegiao id="home-resultados" texto={t("home.recent.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("home.recent.explain")}</p>
      </div>
      <ul className="rounded-[var(--ds-radius-panel)] border border-primary/40 bg-card/95 px-3 shadow-[0_18px_60px_hsl(var(--primary)/0.07)] sm:px-4">
        {itensDaHome(itens).map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={
              <Button asChild size="sm" className="w-full md:w-auto">
                <Link to={`/analyses/${encodeURIComponent(item.analysis_id)}/result`}>
                  {t("home.openResult")}
                </Link>
              </Button>
            }
          />
        ))}
        {/* Concluída sem documento disponível. Aparece com o motivo escrito e SEM link para o
            resultado: oferecer "Abrir resultado" para algo que o contrato diz não estar
            disponível seria CTA que quebra no clique. */}
        {itensDaHome(semResultado).map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={<span className="text-sm text-muted-foreground">{t("home.resultUnavailable")}</span>}
          />
        ))}
      </ul>
      <AvisoDeRecorte mostrar={itens.length + semResultado.length > LIMITE_DA_HOME} />
    </section>
  );
}

function ExcluirAnaliseFalhada({ item, scope }: { item: AnalysisListItem; scope: CanonicalScope }) {
  const { t } = useLanguage();
  const excluir = useDeleteFailedAnalysis();
  const [aberto, setAberto] = useState(false);

  async function confirmar() {
    try {
      await excluir.mutateAsync({ analysisId: item.analysis_id, scope });
      setAberto(false);
    } catch {
      // O erro permanece no diálogo: fechar faria a pessoa acreditar que a operação funcionou.
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(value) => !excluir.isPending && setAberto(value)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 aria-hidden="true" />
          {t("home.failed.delete")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("home.failed.deleteDialog.title")}</DialogTitle>
          <DialogDescription>{t("home.failed.deleteDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/35 p-3">
          <p className="text-sm font-medium text-foreground">
            {item.display_name ?? t("home.unnamedAnalysis")}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{item.analysis_id}</p>
        </div>
        {excluir.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("home.failed.deleteDialog.error")}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={excluir.isPending}>
              {t("home.failed.deleteDialog.cancel")}
            </Button>
          </DialogClose>
          <Button variant="destructive" disabled={excluir.isPending} onClick={confirmar}>
            {excluir.isPending
              ? t("home.failed.deleteDialog.deleting")
              : t("home.failed.deleteDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 4 · Falhas — visíveis, inspecionáveis e removíveis com confirmação explícita. */
export function RegiaoDeFalhas({
  itens,
  scope,
}: {
  itens: readonly AnalysisListItem[];
  scope: CanonicalScope;
}) {
  const { t } = useLanguage();
  if (itens.length === 0) return null;
  return (
    <section data-revelar aria-labelledby="home-falhas" className="space-y-3">
      <div>
        <TituloDaRegiao id="home-falhas" texto={t("home.failed.title")} />
        <p className="mt-1 text-sm text-muted-foreground">{t("home.failed.explain")}</p>
      </div>
      <ul className="rounded-[var(--ds-radius-panel)] border border-border bg-card/60 px-3 sm:px-4">
        {itensDaHome(itens).map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={
              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <Button asChild variant="outline" size="sm" className="w-full md:w-auto">
                  <Link to={`/analyses/${encodeURIComponent(item.analysis_id)}`}>
                    {t("home.failed.inspect")}
                  </Link>
                </Button>
                <ExcluirAnaliseFalhada item={item} scope={scope} />
              </div>
            }
            nota={
              <p className="mt-1 text-xs text-muted-foreground sm:w-full">
                {t("home.failed.note")}
              </p>
            }
          />
        ))}
      </ul>
      <AvisoDeRecorte mostrar={itens.length > LIMITE_DA_HOME} />
    </section>
  );
}

/**
 * 4 · Instâncias — inalcançável até BD02.
 *
 * A região é NOMEADA e declarada indisponível, com o motivo. Não existe placeholder funcional,
 * Instance falsa, CTA local nem estado meio-construído: o Blueprint §4.4 é literal — *"o delta
 * continua não autorizado, e o Gateway hoje executa `del project_id, environment_id`"*.
 *
 * Some da tela? Não. O catálogo de mocks já fixou a regra para o que está bloqueado: *"um catálogo
 * que só mostra o que funciona faz o que falta parecer inexistente"*. Aqui vale igual.
 */
/**
 * Região 3 de D9 — Instâncias. **Viva desde a BD02.**
 *
 * A M32 a entregou deliberadamente inalcançável: *"a região de Instâncias fica inalcançável até
 * BD02 (não meio-construída)"*. Ela dizia que o agrupamento por Instância não existia no contrato
 * público — verdade na época, falsa desde que a BD02 congelou. Isto não é redesenho da HOME-01: é
 * remover um placeholder que descrevia o mundo antigo e ligar a região à capacidade que nasceu.
 *
 * O Discovery §9.1 define o fluxo: a região pergunta *"possui Instância?"* — e por isso ela LÊ as
 * Instâncias, em vez de ser só um link. O ramo "Sim" leva ao detalhe; o ramo "Não" do Discovery
 * leva a *"Criar primeira Instância"*, que é `create_instance` — capacidade publicada e SEM missão
 * dona: a M37 é INST-04 (nova análise), não criação. Enquanto não houver superfície autorizada, o
 * vazio diz o que a região é e não oferece ação — anunciar funcionalidade futura ou pôr botão morto
 * seria pior que a ausência.
 *
 * Sem contador, sem estado, sem "última execução": a Instância publica identidade, nome e data de
 * criação. E a Home *"não é dashboard de KPIs"* (D9).
 */
export function RegiaoDeInstancias({ itens }: { itens: readonly InstanceView[] }) {
  const { t } = useLanguage();
  return (
    <section data-revelar aria-labelledby="home-instancias" className="space-y-3 rounded-[var(--ds-radius-panel)] border border-border bg-card/45 p-3 sm:p-4">
      <TituloDaRegiao id="home-instancias" texto={t("home.instances.title")} />
      {itens.length === 0 ? (
        <p role="note" className="text-sm text-muted-foreground">
          {t("home.instances.empty")}
        </p>
      ) : (
        <ul className="space-y-1">
          {itens.slice(0, LIMITE_DA_HOME).map((inst) => (
            <li key={inst.instance_id}>
              <Link
                to={`/instances/${encodeURIComponent(inst.instance_id)}`}
                className="inline-block py-1.5 text-sm text-foreground underline-offset-4 hover:underline"
              >
                {inst.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/instances"
        className="inline-block py-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {t("home.instances.openAll")}
      </Link>
    </section>
  );
}
