// M32 · HOME-01 — a composição da superfície.
//
// A semântica já está provada em `home-m32-regioes`. Aqui o que se guarda é o que a TELA faz com
// ela: os três estados distintos, a hierarquia entre as regiões, o que a Home se proíbe de mostrar
// e o que sobrou do `/home` legado (nada).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import en from "@/i18n/en.json";
import { PUBLIC_STATES, type AnalysisListItem } from "@/lib/v1";
import {
  RegiaoDeAcoes,
  RegiaoDeInstancias,
  RegiaoDeResultados,
  RegiaoEmAndamento,
} from "@/features/home/RegioesDaHome";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const item = (over: Partial<AnalysisListItem> = {}): AnalysisListItem => ({
  analysis_id: "an-1",
  status: "completed",
  record_count: 100,
  result_available: true,
  created_at: "2026-08-01T10:00:00Z",
  ...over,
});

const montar = (ui: React.ReactElement) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <MemoryRouter>
      <LanguageProvider>{ui}</LanguageProvider>
    </MemoryRouter>,
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. O vocabulário público de estados tem casa própria, e está completo
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 1. um só vocabulário de estados", () => {
  it("os OITO estados públicos têm rótulo nos dois idiomas", () => {
    // Critério 17: uma única semântica pública de estados. Um estado sem rótulo viraria chave
    // crua na tela — e um estado novo no contrato reprova aqui antes de chegar ao navegador.
    for (const estado of PUBLIC_STATES) {
      expect((pt as unknown as Record<string, Record<string, string>>).estadoPublico[estado], `pt sem ${estado}`).toBeTruthy();
      expect((en as unknown as Record<string, Record<string, string>>).estadoPublico[estado], `en sem ${estado}`).toBeTruthy();
    }
  });

  it("os rótulos congelados do §15 são respeitados", () => {
    const p = (pt as unknown as Record<string, Record<string, string>>).estadoPublico;
    expect(p.recovering).toBe("Retomando");
    expect(p.needs_mapping).toBe("Ação necessária");
    // `failed` nunca é "erro temporário"; `recovering` nunca é "falhou".
    expect(p.failed.toLowerCase()).not.toContain("temporár");
    expect(p.recovering.toLowerCase()).not.toContain("falh");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. A fila, e o que ela NÃO oferece
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 2. Ações necessárias", () => {
  it("`needs_mapping` aparece com o motivo do bloqueio e SEM operação", () => {
    montar(<RegiaoDeAcoes itens={[item({ analysis_id: "an-nm", status: "needs_mapping" })]} />);
    expect(screen.getByText(pt.home.actions.needsMappingBlocked)).toBeTruthy();
    // Nenhum "Confirmar" funcional e nenhum estado local fingindo resolução.
    expect(screen.queryByRole("button")).toBeNull();
    // O único caminho oferecido é ABRIR a análise — rota que existe. Isto não é deep link para
    // fluxo inexistente: o que não existe é a operação que RESOLVE, e ela não é oferecida.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe(pt.home.openAnalysis);
    expect(links[0].getAttribute("href")).toBe("/analyses/an-nm");
    // E a linha do `needs_mapping` NÃO desenha moldura própria dentro da fila: na mesma região,
    // um item em cartão e outro em linha afirmaria uma urgência entre eles que ninguém mediu.
    const linha = links[0].closest("li")!;
    expect(linha.className).not.toContain("rounded");
    expect(linha.querySelectorAll("[class*='rounded-lg']")).toHaveLength(0);
  });

  it("`failed` NÃO oferece `Tentar novamente` — a listagem não publica `retry_allowed`", () => {
    montar(<RegiaoDeAcoes itens={[item({ analysis_id: "an-f", status: "failed", result_available: false })]} />);
    expect(screen.queryByText(pt.canonicalAnalysis.action.retry)).toBeNull();
    // O que existe é abrir a análise, onde o estado individual vive.
    const link = screen.getByRole("link", { name: pt.home.openAnalysis });
    expect(link.getAttribute("href")).toBe("/analyses/an-f");
  });

  it("fila vazia PERMANECE como região, dizendo que está vazia", () => {
    montar(<RegiaoDeAcoes itens={[]} />);
    expect(screen.getByRole("heading", { name: pt.home.actions.title })).toBeTruthy();
    expect(screen.getByText(pt.home.actions.none)).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. As outras regiões
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 3. andamento, resultados e Instâncias", () => {
  it("ausência de `record_count` vira a palavra do produto, nunca `0`", () => {
    const { container } = montar(
      <RegiaoEmAndamento itens={[item({ status: "running", result_available: false, record_count: null })]} />,
    );
    expect(screen.getByText(pt.home.recordCountAbsent)).toBeTruthy();
    expect(within(container).queryByText("0")).toBeNull();
  });

  it("`completed` sem documento aparece SEM link para o resultado", () => {
    montar(
      <RegiaoDeResultados
        itens={[item({ analysis_id: "ok" })]}
        semResultado={[item({ analysis_id: "vazio", result_available: false })]}
      />,
    );
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/analyses/ok/result",
    ]);
    expect(screen.getByText(pt.home.resultUnavailable)).toBeTruthy();
  });

  // A M32 entregou esta região deliberadamente inalcançável — *"fica inalcançável até BD02 (não
  // meio-construída)"* — e o caso original travava exatamente isso. A BD02 congelou, e o caso
  // inverteu de direção em vez de sumir: ele agora exige que a região LEVE a algum lugar, e
  // continua recusando CTA de criação, que não tem missão dona.
  it("Instâncias leva ao detalhe e à lista — e continua sem CTA de criação", () => {
    montar(
      <RegiaoDeInstancias
        itens={[{ instance_id: "i-1", name: "Produção", created_at: "2026-07-20T09:00:00Z" }]}
      />,
    );
    expect(screen.getByRole("heading", { name: pt.home.instances.title })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Produção" }).getAttribute("href")).toBe("/instances/i-1");
    expect(screen.getByRole("link", { name: pt.home.instances.openAll }).getAttribute("href")).toBe(
      "/instances",
    );
    // Nenhum botão: criar Instância é `create_instance`, publicado e sem superfície autorizada.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sem Instâncias: a região DIZ que está vazia e ainda assim leva à lista", () => {
    // O ramo "Não possui" do Discovery §9.1 aponta para "Criar primeira Instância" — capacidade
    // que NENHUMA missão entrega hoje. Até lá o vazio é honesto: nomeia o estado, sem ação inventada.
    montar(<RegiaoDeInstancias itens={[]} />);
    expect(screen.getByText(pt.home.instances.empty)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/instances"]);
  });

  it("a região NÃO conta nem qualifica as Instâncias", () => {
    // D9: a Home não é dashboard de KPIs. Contador aqui exigiria contar no browser, e estado
    // exigiria um produtor que a BD02 deliberadamente não criou (é a razão de INST-02 não existir).
    montar(
      <RegiaoDeInstancias
        itens={[
          { instance_id: "i-1", name: "Produção", created_at: null },
          { instance_id: "i-2", name: "Homologação", created_at: null },
        ]}
      />,
    );
    const texto = document.body.textContent ?? "";
    for (const proibido of ["2", "duas", "ativa", "saúde", "status"]) {
      expect(texto.toLowerCase()).not.toContain(proibido.toLowerCase());
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A Home não é dashboard de KPIs
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 4. o que a Home se proíbe", () => {
  const FONTES = () =>
    ["src/features/home/HomePage.tsx", "src/features/home/RegioesDaHome.tsx"]
      .map((f) => semComentarios(ler(f)))
      .join("\n");

  it("nenhum contador, score, saúde, percentual, sparkline ou ranking", () => {
    // D9: "não é dashboard de KPIs". DoD: "o que precisa de mim", não "quantos temos".
    for (const proibido of [
      "score", "health", "risk", "sparkline", "ranking", "percent", "%",
      ".length}", "Math.", "reduce(",
    ]) {
      expect(FONTES(), `a Home passou a exibir: ${proibido}`).not.toContain(proibido);
    }
  });

  it("não chama `/progress` — barra agregada seria percentual inventado", () => {
    expect(FONTES()).not.toContain("useAnalysisProgress");
    expect(FONTES()).not.toContain("progress");
  });

  it("controle positivo: a varredura enxerga um termo quando ele existe", () => {
    expect(FONTES()).toContain("RegiaoDeAcoes");
    expect(FONTES().length).toBeGreaterThan(3000);
  });

  it("zero cor literal na superfície nova", () => {
    // Critério 15. O `/home` legado tinha 34 delas declaradas como dívida; a nova nasce em zero.
    expect(FONTES()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(FONTES()).not.toContain("rgba(");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. O legado não sobreviveu
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 5. o `/home` legado saiu inteiro", () => {
  it("`features/launchpad` não existe mais", () => {
    expect(existsSync(resolve(RAIZ, "src/features/launchpad"))).toBe(false);
  });

  it("`/home` serve a HomePage canônica", () => {
    const r = semComentarios(ler("src/app/router.tsx"));
    expect(r).toContain("<HomePage />");
    expect(r).not.toContain("LaunchpadPage");
  });

  it("o vocabulário fabricado não migrou para lugar nenhum", () => {
    // `behavior_score` não existe em nenhum `.py` de `sentinela-facts`; a Landing o mostra com
    // números de vitrine, e Landing não é autoridade de resultado.
    // Comentários EXPLICAM a remoção e citam os termos; medir prosa foi o defeito das M25/M28.
    const f = FONTES_HOME();
    for (const inventado of ["behavior", "Behavior", "economic", "Economic", "classification"]) {
      expect(f, `vocabulário fabricado ressuscitou: ${inventado}`).not.toContain(inventado);
    }
  });

  const FONTES_HOME = () =>
    [
      "src/features/home/HomePage.tsx",
      "src/features/home/RegioesDaHome.tsx",
      "src/features/home/regioes.ts",
    ]
      .map((f) => semComentarios(ler(f)))
      .join("\n");
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. A PÁGINA, e não só as regiões
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M32 · 6. a composição da HomePage", () => {
  // Estes casos leem a fonte em vez de montar a página: `HomePage` depende de contexto de auth,
  // de escopo e de cliente HTTP, e montá-la aqui exigiria um provider inteiro só para provar
  // COMPOSIÇÃO — que é estrutura, não comportamento. O comportamento de cada região já é provado
  // por render acima. O gate de mutação confirmou que sem estes casos seis mutações reais
  // sobreviviam: sumir com uma região, colapsar dois estados, e reintroduzir `/dashboard`.
  const PAGINA = () => semComentarios(ler("src/features/home/HomePage.tsx"));

  it("as QUATRO regiões de D9 estão na composição", () => {
    const f = PAGINA();
    for (const regiao of [
      "<RegiaoDeAcoes",
      "<RegiaoEmAndamento",
      "<RegiaoDeResultados",
      "<RegiaoDeInstancias",
    ]) {
      expect(f, `região ausente da composição: ${regiao}`).toContain(regiao);
    }
  });

  it("os TRÊS estados são distintos, cada um usado uma vez", () => {
    const f = PAGINA();
    for (const estado of ["<LoadingState", "<ErrorState", "<EmptyState"]) {
      expect(f.split(estado).length - 1, `${estado} não aparece exatamente uma vez`).toBe(1);
    }
    // E cada um tem a sua condição própria: colapsar duas delas foi mutação que sobreviveu.
    expect(f).toContain("lista.isPending");
    expect(f).toContain("lista.isError");
    // O vazio passou a medir as DUAS fontes da Home. Antes da BD02 a região de Instâncias era
    // inalcançável e as análises eram tudo o que havia; agora um workspace com Instância e sem
    // análise nenhuma cairia no vazio e ESCONDERIA a região — a tela diria "não há nada" tendo
    // o que mostrar.
    expect(f).toContain("homeVazia(itens, instancias");
  });

  it("o vazio da Home exige as DUAS fontes ausentes", async () => {
    const { homeVazia } = await import("@/features/home/regioes");
    const analise = [{ analysis_id: "a", status: "completed" }] as never[];
    const instancia = [{ instance_id: "i", name: "P", created_at: null }] as never[];
    expect(homeVazia([], [])).toBe(true);
    expect(homeVazia(analise, [])).toBe(false);
    // O caso que o defeito produzia: só Instância, nenhuma análise.
    expect(homeVazia([], instancia), "Home vazia escondendo a região de Instâncias").toBe(false);
    expect(homeVazia(analise, instancia)).toBe(false);
  });

  it("nenhuma rota legada volta para a Home", () => {
    const f = PAGINA();
    expect(f).not.toContain("/dashboard");
    // O CTA principal do §4.3 aponta para a rota canônica.
    expect(f).toContain('to="/analyses/new"');
  });

  it("nenhuma ênfase de chip inventa fundo que o gate de contraste não meça", () => {
    // O axe mediu 4,12:1 no rótulo do chip neutro sobre `bg-muted`, um fundo que o gate da M11
    // não conhecia. A regra vive aqui também porque é nesta superfície que ela foi violada.
    const chip = semComentarios(ler("src/design/primitives/Chip.tsx"));
    const fundos = [...chip.matchAll(/bg-([a-z-]+)/g)].map((m) => m[1]);
    expect(fundos.length, "a varredura não achou fundo nenhum").toBeGreaterThan(0);
    expect(fundos.filter((x) => !["transparent", "secondary"].includes(x))).toEqual([]);
  });

  it("com cursor, a Home DECLARA que mostra só a primeira página", () => {
    // Fila que mostra parte e se cala afirma completude que não tem: um item de "Ações
    // necessárias" na página seguinte não existiria para quem olha.
    const f = PAGINA();
    expect(f).toContain("next_cursor");
    expect(f).toContain('t("home.truncated")');
    expect(f).toContain('to="/analyses"');
  });

  it("a cópia de erro não fala de infraestrutura", () => {
    for (const idioma of [pt, en]) {
      const e = (idioma as unknown as Record<string, Record<string, Record<string, string>>>).home.error;
      expect(e.explain.toLowerCase()).not.toContain("backend");
      expect(e.explain.length).toBeGreaterThan(20);
    }
  });

  it("controle positivo: a leitura da página enxerga o que existe", () => {
    expect(PAGINA()).toContain("HomePage");
    expect(PAGINA().length).toBeGreaterThan(1500);
  });
});
