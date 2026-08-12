// M38 · EVO-01 — gates de AUTORIDADE, escritos antes da implementação.
//
// O preflight devolveu `NEEDS AUTHORITY ALIGNMENT`: produtor completo, autoridade incompleta. Uma
// decisão de owner que vive só em prosa vira folclore na terceira missão — estes casos são o que
// a torna executável. Nenhum deles testa comportamento de tela: eles testam que a autoridade diz
// o que decidimos e que o código não pode contradizê-la sem ficar vermelho.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOGO, handlersDoScenario, scenario } from "@/mocks/scenarios";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(?<!:)\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const BLUEPRINT = ler("docs/EXPERIENCE-BLUEPRINT-V1.md");
const PLAN = ler("docs/FRONT-V1-IMPLEMENTATION-PLAN.md");
const DISCOVERY = ler("docs/DISCOVERY-FRONT-EXPERIENCE.md");
const ROUTER = () => semComentarios(ler("src/app/router.tsx"));

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. A decisão está ESCRITA — não é memória de sessão
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M38 · 1. a autoridade declara a rota canônica", () => {
  it("o Blueprint dá a `/analyses` como rota canônica da EVO-01", () => {
    expect(BLUEPRINT).toMatch(/\|\s*\*\*EVO-01\*\*\s*\|[^|]*\|\s*\*\*`\/analyses`\*\*\s*\|/);
  });

  it("o Blueprint proíbe a terceira tela, em texto", () => {
    expect(BLUEPRINT).toContain("Uma terceira rota de histórico é proibida");
  });

  it("`/dashboard/history` está classificada como compatibilidade, com dono", () => {
    // Sem "entregue PELA M38" a frase viraria intenção sem missão — o padrão que abriu o B1.
    expect(BLUEPRINT).toMatch(/`\/dashboard\/history` → `\/analyses`/);
    expect(BLUEPRINT).toContain("o redirect é entregue **pela M38**");
  });

  it("a entrada da M38 no PLAN deixou de ser esparsa", () => {
    const m = PLAN.match(/### M38[\s\S]*?(?=### M39)/);
    expect(m, "a entrada da M38 sumiu").toBeTruthy();
    const entrada = m![0];
    for (const campo of ["**Escopo:**", "**Fora:**", "**DoD:**", "**Gates:**", "**Autoridades:**", "**Rota canônica:**"]) {
      expect(entrada, `a M38 continua sem ${campo}`).toContain(campo);
    }
  });

  it("o Discovery preserva a duplicidade E registra a resolução", () => {
    // Histórico não se reescreve: as duas telas existiram. O que se acrescenta é o desfecho.
    expect(DISCOVERY).toContain("**Duplicado:** histórico em `/canonical/analyses` e `/dashboard/history`.");
    expect(DISCOVERY).toContain("RESOLVIDO em 2026-08-12");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. `DataTable`/`Toolbar` não são estrutura obrigatória
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M38 · 2. patterns previstos ≠ estrutura obrigatória", () => {
  it("o mapa de componentes diz que é previsão, não obrigação", () => {
    expect(BLUEPRINT).toContain("Esta tabela mapeia patterns PREVISTOS, não estrutura física obrigatória");
  });

  it("`DataTable` e `Toolbar` estão marcados como não vinculantes para EVO-01", () => {
    for (const p of ["DataTable", "Toolbar"]) {
      const linha = BLUEPRINT.split("\n").find((l) => l.startsWith(`| \`${p}\``));
      expect(linha, `sumiu a linha de ${p}`).toBeTruthy();
      expect(linha!, `${p} voltou a parecer obrigatório para EVO-01`).toContain("não vinculante");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Uma rota de histórico, e só uma
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M38 · 3. nenhuma terceira rota nasce", () => {
  it("o router tem `/analyses` e NÃO tem uma segunda rota de histórico canônico", () => {
    const r = ROUTER();
    expect(r, "a rota canônica sumiu").toContain('path: "/analyses"');
    for (const inventada of ['path: "/history"', 'path: "/evolution"', 'path: "/analyses/history"']) {
      expect(r, `terceira rota de histórico: ${inventada}`).not.toContain(inventada);
    }
  });

  it("`/dashboard/history` resolve para `/analyses` no ROUTER, não numa página própria", () => {
    // PROMOVIDO em 2026-08-12. Este caso lia só o Blueprint enquanto a rota ainda apontava para a
    // `HistoryPage`; agora que a M38 entregou o redirect, ele prova o router de verdade. Um gate
    // que continuasse medindo a prosa ficaria verde no dia em que alguém reintroduzisse a página.
    const r = ROUTER();
    expect(r).toMatch(/path: "\/dashboard\/history",\s*element: <Navigate to="\/analyses" replace \/>/);
    expect(r, "a HistoryPage voltou ao router").not.toContain("HistoryPage");
    expect(BLUEPRINT).toContain("não pode voltar a ter lista própria");
  });

  it("a `HistoryPage` não existe mais como módulo", () => {
    expect(existsSync(resolve(RAIZ, "src/features/history/HistoryPage.tsx")), "a segunda implementação voltou").toBe(false);
  });

  it("`RunRow`/`RunComparePanel` seguem no repo — órfãos INTENCIONAIS, owner M39", () => {
    // Não é código morto esquecido: o Blueprint cita `RunComparePanel` como AS-IS da EVO-02, e
    // decidir o destino dele é da M39. Este caso existe para que a preservação seja deliberada e
    // visível, e não vire achado de auditoria daqui a três missões.
    for (const f of ["src/features/history/RunRow.tsx", "src/features/history/RunComparePanel.tsx"]) {
      expect(existsSync(resolve(RAIZ, f)), `${f} foi removido sem decisão da M39`).toBe(true);
    }
    expect(PLAN).toContain("órfãos intencionais");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. O scenario sustenta EVO-01 — e NÃO sustenta EVO-02/03
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M38 · 4. `list-pagination` é o scenario certo", () => {
  it("existe, está disponível e cobre EVO-01", () => {
    const s = scenario("list-pagination");
    expect(s.estado).toBe("disponivel");
    expect(s.superficies).toContain("EVO-01");
  });

  it("entrega travessia REAL de cursor — duas páginas, sem repetir", async () => {
    const BASE = "http://gw.test";
    const hs = handlersDoScenario("list-pagination", BASE);
    const servir = async (url: string) => {
      for (const h of hs) {
        const r = await h.run({ request: new Request(url), requestId: "t", cookies: {} } as never);
        const resp = (r as { response?: Response } | null)?.response;
        if (resp) return resp.json();
      }
      throw new Error(`nenhum handler respondeu ${url}`);
    };
    const p1 = await servir(`${BASE}/v1/analyses`);
    expect(p1.next_cursor, "sem 2ª página não se prova paginação").toBeTruthy();
    const p2 = await servir(`${BASE}/v1/analyses?cursor=${p1.next_cursor}`);
    const ids = [...p1.items, ...p2.items].map((x: { analysis_id: string }) => x.analysis_id);
    expect(new Set(ids).size, "a paginação repetiu item").toBe(ids.length);
  });

  it("NÃO é scenario de comparação nem de baseline", () => {
    // A armadilha que o preflight nomeou: "tem lista paginada, então temos Evolution". Comparação
    // é EVO-02 e baseline é EVO-03 — e os dois têm scenarios próprios, um deles bloqueado.
    const s = scenario("list-pagination");
    expect(s.superficies).not.toContain("EVO-02");
    expect(s.superficies).not.toContain("EVO-03");
    expect(CATALOGO.filter((c) => c.superficies.includes("EVO-03"))).toEqual([]);
    for (const bloqueado of ["no-baseline", "baseline-active"]) {
      expect(scenario(bloqueado).estado, `${bloqueado} deixou de ser bloqueado`).toBe("bloqueado");
    }
  });

  it("a M38 não trouxe scenario novo — o catálogo continua em 35", () => {
    expect(CATALOGO.length).toBe(35);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. O que a M38 não pode arrastar para dentro
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M38 · 5. fronteira com M39, M40 e a listagem canônica", () => {
  const LISTA = "src/features/canonical-analysis/ui/AnalysesListPage.tsx";

  it("a listagem não ordena localmente — a ordem é a do produtor", () => {
    const f = semComentarios(ler(LISTA));
    for (const proibido of [".sort(", ".reverse("]) {
      expect(f, `ordenação local na EVO-01: ${proibido}`).not.toContain(proibido);
    }
  });

  it("a listagem não usa OFFSET — o cursor é opaco", () => {
    const f = semComentarios(ler(LISTA));
    for (const proibido of ["offset", "page=", "pageNumber", "parseInt(cursor"]) {
      expect(f.toLowerCase(), `OFFSET disfarçado: ${proibido}`).not.toContain(proibido.toLowerCase());
    }
  });

  it("baseline e comparação A×B não entram na EVO-01", () => {
    const f = semComentarios(ler(LISTA));
    for (const proibido of ["baseline", "ComparisonPanel", "ComparisonRow", "compare"]) {
      expect(f, `M39/M40 antecipada na EVO-01: ${proibido}`).not.toContain(proibido);
    }
  });

  it("o PLAN mantém M39 e M40 fora da M38, por escrito", () => {
    const entrada = PLAN.match(/### M38[\s\S]*?(?=### M39)/)![0];
    const fora = entrada.match(/\*\*Fora:\*\*[\s\S]*?(?=\n- \*\*)/)![0];
    for (const termo of ["EVO-02", "EVO-03", "Baseline", "INST-05", "INST-06", "terceira rota"]) {
      expect(fora, `a M38 deixou de excluir ${termo}`).toContain(termo);
    }
  });
});
