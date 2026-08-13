// F3 — uma medição do ARGOS, apresentada LITERALMENTE.
//
// O v1 publicava um número e um estado de cinco valores. O v3 publica, por medição: valor,
// disponibilidade, motivo tipado, cobertura, escala, unidade e versão do método. Esta é a
// diferença que a tela precisa carregar — "não medido" sem motivo não diz a quem lê o que
// fazer; `dependency_unavailable` diz.
//
// ## As três regras que este arquivo existe para não deixar quebrar
//
// **Ausência nunca é zero.** Sem valor, a tela mostra o estado e o motivo — nunca `0`, nunca
// `—` disfarçado de número. Custo zero e custo desconhecido são a mesma pixel e decisões
// opostas.
//
// **`partial` com valor continua parcial.** O número aparece, e a ressalva aparece junto. Um
// valor parcial apresentado como completo é pior que ausência, porque ninguém desconfia dele.
//
// **A escala é do produtor.** `response_stability` sai `0..100`; nada aqui normaliza.

import { useLanguage } from "@/contexts/LanguageContext";
import type {
  PublicIndicatorV3,
  PublicMeasurement,
} from "@/lib/v1/contract/public-v3.types";
import {
  apresentacaoDaMedicao,
  apresentacaoDoIndicador,
  coberturaEscrita,
  escalaEscrita,
  motivoRelevante,
  unidadeInforma,
  valorEscrito,
  type Apresentacao,
} from "../../result/medicaoV3";

/** O que a linha mostra no lugar do número quando não há número.
 *
 * Deliberadamente NÃO é um travessão: um traço é lido como "vazio" ou como "zero" conforme quem
 * olha, e o contrato tem palavra própria para cada caso.
 */
function SemValor({ texto }: { texto: string }) {
  return (
    <span className="text-sm font-medium text-muted-foreground" data-sem-valor="true">
      {texto}
    </span>
  );
}

function Ressalva({ texto }: { texto: string }) {
  return (
    <span
      className="inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-900 dark:text-amber-200"
      data-ressalva="true"
    >
      {texto}
    </span>
  );
}

interface CorpoProps {
  readonly rotulo: string;
  readonly apresentacao: Apresentacao;
  readonly valor: string | null;
  /** TEXTO já resolvido do estado/disponibilidade — nunca a chave. */
  readonly estadoTexto: string;
  /** TEXTO já resolvido do motivo, ou `null` quando ele é `ok`. */
  readonly motivoTexto: string | null;
  readonly cobertura: string | null;
  readonly escala: string | null;
  readonly unidade?: string | null;
  readonly metodo?: string | null;
}

function Corpo(props: CorpoProps) {
  const { t } = useLanguage();
  const {
    rotulo,
    apresentacao,
    valor,
    estadoTexto,
    motivoTexto,
    cobertura,
    escala,
    unidade,
    metodo,
  } = props;

  return (
    <div
      className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0"
      data-apresentacao={apresentacao}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-muted-foreground">{rotulo}</span>
        <span className="flex flex-wrap items-center gap-2">
          {valor === null ? (
            <SemValor texto={estadoTexto} />
          ) : (
            <>
              <span className="text-base font-semibold tabular-nums">{valor}</span>
              {unidade ? (
                <span className="text-xs text-muted-foreground">{unidade}</span>
              ) : null}
              {/* Valor presente E estado ressalvado: os dois ao mesmo tempo, sempre. */}
              {apresentacao === "ressalvada" ? (
                <Ressalva texto={estadoTexto} />
              ) : null}
            </>
          )}
        </span>
      </div>

      {/* O motivo é o campo que o v1 não tinha. `ok` não aparece: ele diria "medimos por
          inteiro", que o valor presente já diz. */}
      {motivoTexto ? (
        <p className="text-xs text-muted-foreground">{motivoTexto}</p>
      ) : null}

      {(cobertura || escala || metodo) && (
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {cobertura ? (
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.coverage")}:</dt>
              <dd className="tabular-nums">{cobertura}</dd>
            </div>
          ) : null}
          {escala ? (
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.scale")}:</dt>
              <dd className="tabular-nums">{escala}</dd>
            </div>
          ) : null}
          {metodo ? (
            <div className="flex gap-1">
              <dt>{t("canonicalAnalysis.argos.method")}:</dt>
              <dd>{metodo}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
}

/** Uma `PublicMeasurement` — dimensões de saúde, escores, riscos, projeções, intenções. */
export function Medicao({
  medicao,
  rotulo,
}: {
  readonly medicao: PublicMeasurement;
  readonly rotulo: string;
}) {
  const { language, t } = useLanguage();
  const apresentacao = apresentacaoDaMedicao(medicao);
  return (
    <Corpo
      rotulo={rotulo}
      apresentacao={apresentacao}
      valor={valorEscrito(medicao, language)}
      // Template com PREFIXO ESTATICO: a catraca M14 consegue ler a familia da chave. Um
      // `t(variavel)` aqui seria a decima chamada opaca, e o gate exige exatamente nove.
      estadoTexto={t(`canonicalAnalysis.argos.availability.${medicao.availability}`)}
      motivoTexto={
        motivoRelevante(medicao.reason)
          ? t(`canonicalAnalysis.argos.reason.${medicao.reason}`)
          : null
      }
      cobertura={coberturaEscrita(medicao.data_coverage, language)}
      escala={escalaEscrita(medicao.scale, language)}
      unidade={unidadeInforma(medicao.unit, medicao.scale) ? medicao.unit : null}
      metodo={medicao.method_version}
    />
  );
}

/** Um `PublicIndicatorV3` — a família de indicadores de negócio. */
export function Indicador({
  indicador,
  rotulo,
}: {
  readonly indicador: PublicIndicatorV3;
  readonly rotulo: string;
}) {
  const { language, t } = useLanguage();
  const apresentacao = apresentacaoDoIndicador(indicador);
  return (
    <Corpo
      rotulo={rotulo}
      apresentacao={apresentacao}
      valor={valorEscrito(indicador, language, indicador.display_precision ?? 2)}
      estadoTexto={t(`canonicalAnalysis.argos.state.${indicador.state}`)}
      motivoTexto={
        motivoRelevante(indicador.reason)
          ? t(`canonicalAnalysis.argos.reason.${indicador.reason}`)
          : null
      }
      cobertura={coberturaEscrita(indicador.coverage, language)}
      escala={escalaEscrita(indicador.scale, language)}
      unidade={unidadeInforma(indicador.unit, indicador.scale) ? indicador.unit : null}
    />
  );
}
