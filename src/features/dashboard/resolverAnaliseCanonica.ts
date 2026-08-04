// Resolve QUAL análise a rota de compatibilidade `/dashboard` deve abrir.
//
// Aposentadoria do dashboard legado (preparação local do Big Bang). Nada aqui ativa nada.
//
// ## De onde o id PODE vir, e de onde não pode
//
// Vem da listagem canônica do Gateway, escopada pelo workspace autenticado: a análise mais
// recente do workspace que está `completed` e tem resultado disponível. É uma resolução
// EXPLÍCITA e autorizada pelo backend.
//
// NÃO vem de `sessionStorage`, `localStorage`, IndexedDB, cookie, hash do dataset, conteúdo do
// arquivo nem variável global persistente. Essa era exatamente a fonte do dashboard legado — o
// cache do navegador — e é o que a decisão de produto aposenta.
//
// ## Os três desfechos, e por que são três
//
// `ENCONTRADA` / `SEM_ANALISE` / `SEM_CONCLUIDA` são estados distintos e a tela precisa
// distingui-los. Colapsar os dois últimos em "você não tem análise" mentiria para quem tem
// cinco análises rodando: a frase certa ali é "nenhuma concluída ainda", e a ação certa é
// abrir o histórico, não começar de novo.

import type { AnalysisListItem, V1Client } from "@/lib/v1";

/** Páginas percorridas no máximo. Bounded de propósito: um workspace com muitas análises em
 *  andamento não pode fazer a rota de compatibilidade varrer a listagem inteira. */
export const MAX_PAGINAS = 5;

export type ResolucaoDaAnalise =
  | { tipo: "ENCONTRADA"; analysisId: string }
  /** A listagem não devolveu NENHUM item: o workspace nunca teve análise. */
  | { tipo: "SEM_ANALISE" }
  /** Havia análises, nenhuma concluída com resultado dentro do limite percorrido. */
  | { tipo: "SEM_CONCLUIDA"; examinadas: number; exauriu: boolean };

/**
 * `completed` E `result_available`.
 *
 * A conjunção não é redundância: `completed` sem `result_available` acontece de verdade — a
 * análise terminou e o resultado ainda está sendo materializado. Redirecionar para lá
 * entregaria uma página de resultado que não tem resultado.
 */
function abrivel(item: AnalysisListItem): boolean {
  return item.status === "completed" && item.result_available === true;
}

/**
 * Percorre a listagem canônica até achar a análise mais recente que dá para abrir.
 *
 * A listagem vem ordenada por criação decrescente (garantido pelo Orchestrator: `order by
 * o.created_at desc, o.analysis_id desc`), então o primeiro item abrível é o mais recente —
 * não é preciso ordenar aqui, e ordenar aqui criaria uma segunda regra de ordenação.
 */
export async function resolverAnaliseCanonica(
  client: Pick<V1Client, "list">,
  workspaceId: string,
  opts?: { limit?: number; maxPaginas?: number },
): Promise<ResolucaoDaAnalise> {
  const limit = opts?.limit ?? 20;
  const maxPaginas = opts?.maxPaginas ?? MAX_PAGINAS;

  let cursor: string | null = null;
  let examinadas = 0;

  for (let pagina = 0; pagina < maxPaginas; pagina += 1) {
    const resposta = await client.list({ workspaceId, limit, cursor });
    const itens = resposta.items ?? [];
    examinadas += itens.length;

    const achada = itens.find(abrivel);
    if (achada) return { tipo: "ENCONTRADA", analysisId: achada.analysis_id };

    cursor = resposta.next_cursor ?? null;
    // Sem próxima página: a listagem acabou. `exauriu: true` é o que separa "não existe
    // nenhuma concluída" de "não achei nas N primeiras páginas" — a tela diz coisas
    // diferentes nos dois casos, e afirmar o primeiro sem ter chegado ao fim seria inventar.
    if (!cursor) {
      return examinadas === 0
        ? { tipo: "SEM_ANALISE" }
        : { tipo: "SEM_CONCLUIDA", examinadas, exauriu: true };
    }
  }

  return { tipo: "SEM_CONCLUIDA", examinadas, exauriu: false };
}
