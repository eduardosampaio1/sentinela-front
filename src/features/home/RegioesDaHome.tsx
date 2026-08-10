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

import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { ActionRequiredSemOperacao, StatusBadge } from "@/design/patterns";
import type { AnalysisListItem, AnalysisStatus } from "@/lib/v1";

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

/** Uma linha de análise. Sem caixa: quem separa é o fio da lista. */
function LinhaDeAnalise({
  item,
  acao,
}: {
  item: AnalysisListItem;
  /** O que se pode fazer com esta análise AQUI. `null` quando não há operação real. */
  acao: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 py-2 last:border-b-0">
      {/* `rotulo` é obrigatório por design da M11: o badge não conhece i18n de produto. A chave
          vive na RAIZ (`estadoPublico.*`), e não sob `home.*`, porque o critério 17 exige UMA
          semântica pública de estados — um segundo conjunto por superfície seria exatamente o
          `HomeStatus`/`AnalysisStatus` com duas linguagens contra o qual o pattern foi criado.
          Família declarada, nunca `t(variavel)`: o gate da M14 não decide orfandade sobre chamada
          opaca. */}
      <StatusBadge
        vocabulario="publico"
        estado={item.status}
        rotulo={rotuloDeEstado(item.status, t)}
      />
      {/* O identificador é o nome que a pessoa reconhece entre execuções — não há título de
          análise no contrato, e inventar um ("Análise de 31 de julho") seria fabricar nome. */}
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
        {item.analysis_id}
      </span>
      {/* `record_count` é `null` quando ausente, e ausência NUNCA vira zero. */}
      <span className="tabular-nums text-sm text-muted-foreground">
        {item.record_count === null
          ? t("home.recordCountAbsent")
          : t("home.recordCount", { n: String(item.record_count) })}
      </span>
      {acao}
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

/**
 * 1 · Ações necessárias — a fila.
 *
 * `needs_mapping` e `failed`. Sobre `failed`: a Home **não** oferece "Tentar novamente", porque
 * `retry_allowed` não é publicado na listagem (ver `regioes.ts`). A ação daqui é abrir a análise,
 * que é onde o estado individual — e o botão, se houver — vivem.
 */
export function RegiaoDeAcoes({ itens }: { itens: readonly AnalysisListItem[] }) {
  const { t } = useLanguage();
  if (itens.length === 0) {
    // Fila vazia é boa notícia, e a região permanece: sumir faria "nada precisa de você" e "esta
    // tela não sabe checar" parecerem a mesma coisa.
    return (
      <section aria-labelledby="home-acoes" className="space-y-3">
        <TituloDaRegiao id="home-acoes" texto={t("home.actions.title")} />
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          {t("home.actions.none")}
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="home-acoes" className="space-y-3">
      <TituloDaRegiao id="home-acoes" texto={t("home.actions.title")} />
      {/* A ÚNICA região com moldura. O peso é a mensagem: é aqui que alguém é esperado. */}
      <ul className="rounded-lg border border-border bg-card px-4">
        {itens.map((item) =>
          item.status === "needs_mapping" ? (
            // Estado público sem operação pública: o catálogo o declara `parcial` — "EXIBIR sim,
            // RESOLVER não" —, e o pattern do DS existe exatamente para isso. Nenhum "Confirmar"
            // funcional, nenhum deep link para fluxo inexistente.
            <li key={item.analysis_id} className="border-b border-border/60 py-3 last:border-b-0">
              <ActionRequiredSemOperacao
                titulo={item.analysis_id}
                explicacao={t("home.actions.needsMappingExplain")}
                rotuloDoEstado={rotuloDeEstado("needs_mapping", t)}
                motivo={t("home.actions.needsMappingBlocked")}
              />
            </li>
          ) : (
            <LinhaDeAnalise
              key={item.analysis_id}
              item={item}
              acao={
                <Link
                  to={`/analyses/${encodeURIComponent(item.analysis_id)}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t("home.openAnalysis")}
                </Link>
              }
            />
          ),
        )}
      </ul>
    </section>
  );
}

/** 2 · Em andamento — o sistema está trabalhando; ninguém é esperado. */
export function RegiaoEmAndamento({ itens }: { itens: readonly AnalysisListItem[] }) {
  const { t } = useLanguage();
  if (itens.length === 0) return null;
  return (
    <section aria-labelledby="home-andamento" className="space-y-2">
      <TituloDaRegiao id="home-andamento" texto={t("home.running.title")} />
      {/* Sem moldura: peso menor que a fila, de propósito. Nenhuma barra de progresso agregada —
          o detalhe por eixo é de AN-03, e um "%" somado aqui seria número inventado. */}
      <ul>
        {itens.map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={
              <Link
                to={`/analyses/${encodeURIComponent(item.analysis_id)}`}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("home.followAnalysis")}
              </Link>
            }
          />
        ))}
      </ul>
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
    <section aria-labelledby="home-resultados" className="space-y-2">
      <TituloDaRegiao id="home-resultados" texto={t("home.recent.title")} />
      <ul>
        {itens.map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={
              <Link
                to={`/analyses/${encodeURIComponent(item.analysis_id)}/result`}
                className="text-sm text-foreground underline-offset-4 hover:underline"
              >
                {t("home.openResult")}
              </Link>
            }
          />
        ))}
        {/* Concluída sem documento disponível. Aparece com o motivo escrito e SEM link para o
            resultado: oferecer "Abrir resultado" para algo que o contrato diz não estar
            disponível seria CTA que quebra no clique. */}
        {semResultado.map((item) => (
          <LinhaDeAnalise
            key={item.analysis_id}
            item={item}
            acao={<span className="text-sm text-muted-foreground">{t("home.resultUnavailable")}</span>}
          />
        ))}
      </ul>
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
export function RegiaoDeInstancias() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="home-instancias" className="space-y-2">
      <TituloDaRegiao id="home-instancias" texto={t("home.instances.title")} />
      <p role="note" className="text-sm text-muted-foreground">
        {t("home.instances.unavailable")}
      </p>
    </section>
  );
}
