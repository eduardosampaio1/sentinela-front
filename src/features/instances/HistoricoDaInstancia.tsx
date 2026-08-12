// M36 · INST-03 — as execuções da Instância, na ordem em que o backend as entregou.
//
// ## O que este componente se proíbe
//
// Não ordena, não agrupa, não filtra e não conta. A ordem é a do produtor — `(created_at desc,
// analysis_id desc)`, com desempate garantido no SQL — e reordenar "para melhorar" faria a
// segunda página não encaixar na primeira. O filtro por Instância acontece na query do backend;
// pós-filtrar aqui quebraria a contagem da página e o cursor.
//
// ## O cursor é opaco
//
// O componente não sabe o que há dentro dele e não deriva posição. Recebe "há próxima?" e dois
// callbacks. Transformar cursor em número de página seria reintroduzir OFFSET pela porta da
// frente — e OFFSET duplica ou pula linha sob criação concorrente, que é a razão de o backend
// nunca o ter usado.
//
// ## A linha reusa o vocabulário público de Analysis
//
// Estado vem de `estadoPublico.*`, o mesmo das outras superfícies. Uma segunda representação de
// análise só porque a origem agora é uma Instância faria a mesma coisa ter dois nomes na mesma
// aplicação — o defeito que o `StatusBadge` do DS existe para impedir.

import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatusBadge } from "@/design/patterns";
import type { EstadoPublico } from "@/design/patterns/estados";
import type { AnalysisListItem } from "@/lib/v1";

export function HistoricoDaInstancia({
  itens,
  temProxima,
  temAnterior,
  aoAvancar,
  aoVoltar,
}: {
  itens: readonly AnalysisListItem[];
  temProxima: boolean;
  temAnterior: boolean;
  aoAvancar: () => void;
  aoVoltar: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
        {itens.map((item) => (
          <li key={item.analysis_id} className="bg-card">
            <Link
              to={`/analyses/${encodeURIComponent(item.analysis_id)}`}
              aria-label={t("canonicalAnalysis.list.open", { id: item.analysis_id })}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* O id sozinho obriga a lembrar o que ele é. A contagem de registros é campo
                  PUBLICADO (`list_item_fields`) e a mesma que a listagem canônica mostra —
                  reconhecimento em vez de memória, sem inventar dado. `null` vira a copy de
                  desconhecido, nunca `0`. */}
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">
                  {item.analysis_id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.record_count === null
                    ? t("canonicalAnalysis.list.recordsUnknown")
                    : t("canonicalAnalysis.list.records", { count: item.record_count })}
                </span>
              </span>
              <StatusBadge
                vocabulario="publico"
                estado={item.status as EstadoPublico}
                rotulo={t(`estadoPublico.${item.status}`)}
              />
            </Link>
          </li>
        ))}
      </ul>

      {(temProxima || temAnterior) && (
        <nav aria-label={t("instances.historyTitle")} className="flex justify-end gap-2">
          <button
            type="button"
            onClick={aoVoltar}
            disabled={!temAnterior}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {t("canonicalAnalysis.list.previous")}
          </button>
          <button
            type="button"
            onClick={aoAvancar}
            disabled={!temProxima}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {t("canonicalAnalysis.list.next")}
          </button>
        </nav>
      )}
    </div>
  );
}
