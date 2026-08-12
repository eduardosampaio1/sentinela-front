// Listagem, histórico e retomada (Onda 6 E4). Consome SÓ a listagem pública `/v1/analyses`.
// Cursor OPACO (pilha de cursores; nunca decodificado/offset). Estados distintos: loading, vazio
// REAL, erro recuperável, sessão expirada. Sem N+1 (nenhuma consulta de resultado por linha), sem
// indicador analítico, sem estado interno. Só campos contratados de AnalysisListItem.
//
// Isolamento por workspace: a paginação vive em <ListaCanonica key={workspaceId}> — a troca de
// workspace REMONTA o filho, zerando cursor/pilha ANTES da 1ª query do novo workspace (nenhuma
// janela em que um cursor do workspace anterior é enviado ao novo — Codex E4 R1 [P2]).

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalysisListItem, CanonicalScope } from "@/lib/v1";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { LoadingState } from "@/shared/states/LoadingState";
import { EmptyState, StatusBadge, Toolbar } from "@/design/patterns";
import type { EstadoPublico } from "@/design/patterns/estados";
import { useAnalysesList } from "../data/list";
import { classifyListError } from "../data/listView";
import { useCanonicalScope } from "./scope";
import { problemCodeOf } from "./notices";

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/** M39 — a seleção é um controle SEPARADO do link, não o link mudando de comportamento.
 *  Sequestrar o clique da linha faria "abrir" e "escolher" morarem no mesmo alvo, e quem navega
 *  por teclado ou leitor de tela perderia a distinção. O checkbox tem nome próprio. */
function ItemLinha({
  item,
  selecao,
}: {
  item: AnalysisListItem;
  selecao?: { marcada: boolean; alternar: () => void; bloqueada: boolean };
}) {
  const { t } = useLanguage();
  const registros =
    item.record_count === null
      ? t("canonicalAnalysis.list.recordsUnknown")
      : t("canonicalAnalysis.list.records", { count: item.record_count });
  return (
    <li className={selecao ? "flex items-center gap-3" : undefined}>
      {selecao && (
        <input
          type="checkbox"
          className="h-4 w-4 flex-none accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          checked={selecao.marcada}
          // Bloqueia a TERCEIRA, nunca desmarcar: quem já escolheu duas ainda pode trocar.
          disabled={selecao.bloqueada && !selecao.marcada}
          onChange={selecao.alternar}
          aria-label={t("canonicalAnalysis.list.open", { id: item.analysis_id })}
        />
      )}
      <Link
        to={`/analyses/${encodeURIComponent(item.analysis_id)}`}
        aria-label={t("canonicalAnalysis.list.open", { id: item.analysis_id })}
        className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <span className="block truncate font-medium text-foreground">{item.analysis_id}</span>
          <span className="text-sm text-muted-foreground">{registros}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {/* M38 · microcorreção final. Era um chip a mão lendo `canonicalAnalysis.state.*.title`,
              enquanto INST-03 e HOME-01 liam `estadoPublico.*` pelo `StatusBadge` — duas palavras
              para o MESMO estado (`preparing` era "Preparing" aqui e "Reserved" lá). O Blueprint
              marca `StatusBadge` 🔴 vinculante para EVO-01 exatamente como defesa contra isso.
              Nenhuma copy foi escrita: o rótulo passa a vir da família já publicada. */}
          <StatusBadge
            vocabulario="publico"
            estado={item.status as EstadoPublico}
            rotulo={t(`estadoPublico.${item.status}`)}
          />
          {item.result_available && (
            <span className="text-muted-foreground">{t("canonicalAnalysis.list.resultReady")}</span>
          )}
          <span className="text-muted-foreground">{formatarData(item.created_at)}</span>
        </div>
      </Link>
    </li>
  );
}

/** Lista + paginação de UM workspace. Remonta (key=workspaceId) na troca → estado sempre fresco. */
function ListaCanonica({ scope }: { scope: CanonicalScope }) {
  // M39 · EVO-02 — escolher EXATAMENTE duas. A lista não compara: ela só reúne a intenção e
  // navega para a rota canônica, que é onde a comparação é reconstruída pelos dois ids.
  const navigate = useNavigate();
  const [selecionando, setSelecionando] = useState(false);
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const alternar = (id: string) =>
    setEscolhidas((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? s : [...s, id]));
  const sairDaSelecao = () => {
    setSelecionando(false);
    setEscolhidas([]);
  };
  const { t } = useLanguage();
  // Cursor OPACO corrente + pilha de cursores anteriores (para "voltar" sem offset local).
  const [cursor, setCursor] = useState<string | null>(null);
  const [prevStack, setPrevStack] = useState<(string | null)[]>([]);
  const list = useAnalysesList(scope, cursor);

  function irProxima() {
    const next = list.data?.next_cursor ?? null;
    if (!next) return;
    setPrevStack((s) => [...s, cursor]);
    setCursor(next);
  }
  function irAnterior() {
    if (prevStack.length === 0) return;
    const anterior = prevStack[prevStack.length - 1];
    setPrevStack((s) => s.slice(0, -1));
    setCursor(anterior);
  }

  if (list.isLoading) {
    return <LoadingState message={t("canonicalAnalysis.list.loading")} size="md" />;
  }
  if (list.isError) {
    const classe = classifyListError(problemCodeOf(list.error));
    const msgKey =
      classe === "session"
        ? "canonicalAnalysis.list.sessionExpired"
        : classe === "recoverable"
          ? "canonicalAnalysis.list.errorRecoverable"
          : "canonicalAnalysis.list.errorGeneric";
    return (
      <div role="alert" className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <p className="text-sm text-foreground">{t(msgKey)}</p>
        {classe !== "session" && (
          <Button variant="outline" onClick={() => void list.refetch()} disabled={list.isFetching}>
            {t("canonicalAnalysis.list.retry")}
          </Button>
        )}
      </div>
    );
  }

  const items = list.data?.items ?? [];
  if (items.length === 0) {
    // M38 · EVO-01. Era um `div` a mão, sem papel de acessibilidade: o erro anunciava
    // (`role="alert"`) e o carregando anunciava (`role="status"`), mas o vazio ficava mudo para
    // quem usa leitor de tela — os três estados só eram distintos para quem enxerga. O
    // `EmptyState` do DS é o mesmo que INST-01/03 e HOME-01 já usam, e traz o papel por
    // construção. Copy REUSADA: nenhuma chave nova, mesmo texto de antes.
    return (
      <EmptyState
        titulo={t("canonicalAnalysis.list.title")}
        explicacao={t("canonicalAnalysis.list.empty")}
        acao={
          <Button asChild>
            <Link to="/analyses/new">{t("canonicalAnalysis.list.newAnalysis")}</Link>
          </Button>
        }
      />
    );
  }

  const podeVoltar = prevStack.length > 0;
  const podeAvancar = Boolean(list.data?.next_cursor);
  return (
    <div className="space-y-6">
      {/* A `Toolbar` do DS entra aqui porque agora existe função REAL — a decisão da M38 dizia
          que ela não nasce vazia nem por decreto. Fora do modo de seleção há uma ação; dentro,
          três, e o contador diz onde a pessoa está. */}
      <Toolbar
        primaria={
          selecionando ? (
            <Button
              onClick={() => navigate(`/analyses/compare/${encodeURIComponent(escolhidas[0])}/${encodeURIComponent(escolhidas[1])}`)}
              disabled={escolhidas.length !== 2}
            >
              {t("canonicalAnalysis.compare.compareNow")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setSelecionando(true)}>
              {t("canonicalAnalysis.compare.select")}
            </Button>
          )
        }
        secundarias={
          selecionando
            ? [
                <span key="contador" role="status" className="text-sm text-muted-foreground">
                  {t("canonicalAnalysis.compare.selected", { n: escolhidas.length })}
                </span>,
                <Button key="cancelar" variant="ghost" onClick={sairDaSelecao}>
                  {t("canonicalAnalysis.compare.cancel")}
                </Button>,
              ]
            : []
        }
        menuSecundarias={
          selecionando ? (
            <Button variant="ghost" onClick={sairDaSelecao}>
              {t("canonicalAnalysis.compare.cancel")}
            </Button>
          ) : undefined
        }
      />
      {selecionando && (
        <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.compare.selectHint")}</p>
      )}
      <ul aria-label={t("canonicalAnalysis.list.title")} className="space-y-3">
        {items.map((item) => (
          <ItemLinha
            key={item.analysis_id}
            item={item}
            selecao={
              selecionando
                ? {
                    marcada: escolhidas.includes(item.analysis_id),
                    alternar: () => alternar(item.analysis_id),
                    bloqueada: escolhidas.length >= 2,
                  }
                : undefined
            }
          />
        ))}
      </ul>
      {(podeVoltar || podeAvancar) && (
        <nav aria-label={t("canonicalAnalysis.list.title")} className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={irAnterior} disabled={!podeVoltar || list.isFetching}>
            {t("canonicalAnalysis.list.previous")}
          </Button>
          <Button variant="outline" onClick={irProxima} disabled={!podeAvancar || list.isFetching}>
            {t("canonicalAnalysis.list.next")}
          </Button>
        </nav>
      )}
    </div>
  );
}

export function AnalysesListPage() {
  const { t } = useLanguage();
  const scope = useCanonicalScope();

  return (
    <AppShell topBarTitle={t("canonicalAnalysis.list.title")}>
      <PageFrame maxWidth="lg">
        <div className="space-y-6" data-testid="canonical-analyses-list">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{t("canonicalAnalysis.list.title")}</h1>
              <p className="mt-1 text-muted-foreground">{t("canonicalAnalysis.list.subtitle")}</p>
            </div>
            <Button asChild>
              <Link to="/analyses/new">{t("canonicalAnalysis.list.newAnalysis")}</Link>
            </Button>
          </div>
          {scope ? (
            <ListaCanonica key={scope.workspaceId} scope={scope} />
          ) : (
            <p role="alert" className="text-sm text-muted-foreground">
              {t("canonicalAnalysis.entry.workspaceMissing")}
            </p>
          )}
        </div>
      </PageFrame>
    </AppShell>
  );
}
