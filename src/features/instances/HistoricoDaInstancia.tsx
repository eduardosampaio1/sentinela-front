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
import { LinhaDeColecao, StatusBadge } from "@/design/patterns";
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
      {/* A LINHA É A MESMA DA LISTAGEM CANÔNICA, e essa é a mudança.
          Este histórico é a listagem filtrada por Instância — o mesmo recurso, os mesmos campos —
          e desenhava uma linha própria, com outra geometria. A pessoa que vem de `/analyses` para
          cá via a mesma informação em duas formas, e tinha de reaprender onde olhar.
          Nada foi acrescentado: as conversas observadas entram pelo léxico, como lá, porque o
          contrato diz que `null` naquele campo é ausente e nunca zero. */}
      <ul className="painel grid grid-cols-1 gap-px overflow-hidden bg-border">
        {itens.map((item) => (
          <LinhaDeColecao
            key={item.analysis_id}
            item={{
              chave: item.analysis_id,
              titulo: item.analysis_id,
              // A contagem de registros é campo PUBLICADO (`list_item_fields`) e a mesma que a
              // listagem canônica mostra — reconhecimento em vez de memória, sem inventar dado.
              // `null` vira a copy de desconhecido, nunca `0`.
              subtitulo:
                item.record_count === null
                  ? t("canonicalAnalysis.list.recordsUnknown")
                  : t("canonicalAnalysis.list.records", { count: item.record_count }),
              destino: `/analyses/${encodeURIComponent(item.analysis_id)}`,
              numero: {
                valor:
                  item.observed_conversations === null || item.observed_conversations === undefined
                    ? { tipo: "ausente", motivo: t("canonicalAnalysis.list.conversationsAbsent") }
                    : {
                        tipo: "medido",
                        texto: item.observed_conversations.toLocaleString(),
                        fracao: 1,
                      },
                rotulo: t("canonicalAnalysis.list.conversations"),
              },
              estado: {
                rotulo: "",
                sinal: (
                  <StatusBadge
                    vocabulario="publico"
                    estado={item.status as EstadoPublico}
                    rotulo={t(`estadoPublico.${item.status}`)}
                  />
                ),
              },
            }}
            Envoltorio={({ destino, children, className }) => (
              <Link
                to={destino ?? "#"}
                aria-label={t("canonicalAnalysis.list.open", { id: item.analysis_id })}
                className={className}
              >
                {children}
              </Link>
            )}
          />
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
