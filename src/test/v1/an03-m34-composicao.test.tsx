// M34 · AN-03 — a composição dos quatro eixos.
//
// A semântica já é provada em `an03-m34-eixos`. Aqui guarda-se o que a TELA faz com ela: os quatro
// coexistindo, `recovering` no nível da análise, disponibilidade progressiva, e a espera que não
// apaga o que já está pronto.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import type { ProgressEntry } from "@/lib/v1";
import { lerEixos } from "@/features/canonical-analysis/result/eixos";
import { PainelDeEixos } from "@/features/canonical-analysis/ui/PainelDeEixos";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f
    // CRLF → LF ANTES de qualquer coisa. Este repo tem `core.autocrlf=true`: o mesmo commit
    // chega LF num checkout e CRLF noutro, e as asserções abaixo procuram literais com `\n`.
    // Sem normalizar, o gate fica vermelho por plataforma — dizendo "a composição mudou"
    // quando nenhuma linha de código mudou. Foi o que aconteceu: um `git stash`/`pop` converteu
    // a árvore e o caso passou a acusar uma regressão que não existia.
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const PAINEL = () => semComentarios(ler("src/features/canonical-analysis/ui/PainelDeEixos.tsx"));
const PAGINA = () => semComentarios(ler("src/features/canonical-analysis/ui/AnalysisPage.tsx"));

const montar = (axes: ProgressEntry[]) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(
    <LanguageProvider>
      <PainelDeEixos eixos={lerEixos({ analysis_id: "an-1", axes })} />
    </LanguageProvider>,
  );
};

const DESSINCRONIZADO: ProgressEntry[] = [
  { axis: "engine", state: "running" },
  { axis: "analytics", state: "ready" },
  // `export` NÃO tem `pending` no contrato — a união discriminada recusou, e estava certa. O
  // estado equivalente publicado para esse eixo é `unavailable`.
  { axis: "export", state: "unavailable" },
  { axis: "final_result", state: "pending" },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Os quatro coexistem, nomeados, com estado em palavra
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M34 · 1. a faixa dos quatro eixos", () => {
  it("mostra os QUATRO, na ordem publicada, com o rótulo público de cada um", () => {
    const { container } = montar(DESSINCRONIZADO);
    const celulas = container.querySelectorAll("li");
    expect(celulas).toHaveLength(4);
    expect([...celulas].map((c) => c.textContent)).toEqual([
      expect.stringContaining(pt.eixo.engine),
      expect.stringContaining(pt.eixo.analytics),
      expect.stringContaining(pt.eixo.export),
      expect.stringContaining(pt.eixo.final_result),
    ]);
  });

  it("estados HETEROGÊNEOS aparecem ao mesmo tempo — é o ponto da superfície", () => {
    montar(DESSINCRONIZADO);
    expect(screen.getByText(pt.estadoEixo.running)).toBeTruthy();
    expect(screen.getByText(pt.estadoEixo.ready)).toBeTruthy();
    // Um `pending` (final_result) e um `unavailable` (export): vocabulários diferentes por eixo,
    // exatamente o que a M34 se recusou a normalizar.
    expect(screen.getAllByText(pt.estadoEixo.pending)).toHaveLength(1);
    expect(screen.getByText(pt.estadoEixo.unavailable)).toBeTruthy();
  });

  it("o estado é PALAVRA, não só cor — e o badge traz ícone junto", () => {
    const { container } = montar(DESSINCRONIZADO);
    // Em escala de cinza a informação continua legível: cada célula tem texto do estado.
    for (const celula of container.querySelectorAll("li")) {
      expect(celula.textContent?.trim().length ?? 0).toBeGreaterThan(10);
    }
    // Dois canais além da cor: `StatusBadge` desenha ícone `aria-hidden` ao lado da palavra.
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(4);
  });

  it("eixo ausente vira a palavra do produto, nunca `pending` nem vazio", () => {
    montar([{ axis: "engine", state: "running" }]);
    expect(screen.getAllByText(pt.canonicalAnalysis.result.notMeasured)).toHaveLength(3);
    // E não inventa `pending` para quem não foi publicado.
    expect(screen.queryByText(pt.estadoEixo.pending)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. O que a faixa se proíbe
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M34 · 2. sem progresso global", () => {
  it("nenhum percentual, barra, donut, gauge ou contagem `x de 4`", () => {
    const f = PAINEL();
    for (const proibido of [
      "%", "percent", "<Progress", "donut", "gauge", "Math.", "reduce(",
      "filter(", "length}", "de 4", "of 4",
    ]) {
      expect(f, `a faixa passou a agregar: ${proibido}`).not.toContain(proibido);
    }
  });

  it("o identificador técnico do eixo não vira copy nem literal na feature", () => {
    // O cadeado da jornada proíbe a palavra; o mapa de chaves vive em `lib/v1`.
    expect(PAINEL()).not.toContain("engine");
    // E nenhum `nunca_publico` vaza.
    for (const interno of ["engine_version", "assembly_manifest", "dataset_fingerprint"]) {
      expect(PAINEL(), `vazou ${interno}`).not.toContain(interno);
      expect(PAGINA(), `vazou ${interno}`).not.toContain(interno);
    }
  });

  it("nenhum rótulo diz `resultado parcial`", () => {
    for (const v of Object.values(pt.estadoEixo) as string[]) {
      expect(v.toLowerCase()).not.toContain("resultado parcial");
    }
    expect(PAINEL().toLowerCase()).not.toContain("resultado parcial");
  });

  it("controle positivo: a varredura enxerga o que existe", () => {
    expect(PAINEL()).toContain("PainelDeEixos");
    expect(PAINEL().length).toBeGreaterThan(1200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. A composição da página
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M34 · 3. AN-03 na AnalysisPage", () => {
  it("o status da análise fica AO REDOR dos eixos, nunca dentro", () => {
    const f = PAGINA();
    // `StateBanner` (status) e `PainelDeEixos` (eixos) são irmãos no mesmo bloco.
    const banner = f.indexOf("<StateBanner view={view} />\n            <PainelDeEixos");
    expect(banner, "o banner deixou de preceder a faixa no ramo de execução").toBeGreaterThan(-1);
    // E `recovering` não virou eixo.
    expect(PAINEL()).not.toContain("recovering");
  });

  it("disponibilidade progressiva: Analytics utilizável aparece com final pendente", () => {
    const f = PAGINA();
    expect(f).toContain("analyticsUtilizavel(eixos)");
    expect(f).toMatch(
      /analyticsPronto\s*&&\s*analytics\.data\s*&&\s*\(\s*<RegiaoDeAnalyticsAoVivo/,
    );
    // Reusa o portador canônico da M27 — nenhuma segunda leitura de ready/partial/withheld.
    expect(f).not.toContain('component_status ===');
  });

  it("a espera NÃO apaga os eixos já publicados", () => {
    // `capacity_wait` chega na leitura de status; `/progress` continua respondendo, e o que o
    // produtor já disse sobre cada componente não é desfeito por não sabermos o status.
    const f = PAGINA();
    expect(f).toContain("const algumEixoPublicado = eixos.some((e) => e.entrada !== null);");
    const trecho = f.slice(f.indexOf("algumEixoPublicado"), f.indexOf("algumEixoPublicado") + 420);
    expect(trecho).toContain("<PainelDeEixos");
    expect(trecho).toContain("<ProblemFeedback");
  });

  it("nenhuma ETA, posição em fila ou promessa de horário", () => {
    const f = PAGINA() + PAINEL();
    for (const inventado of ["ETA", "posição", "fila de", "minutos", "estimativa", "previsão"]) {
      expect(f, `espera ganhou promessa: ${inventado}`).not.toContain(inventado);
    }
  });
});
