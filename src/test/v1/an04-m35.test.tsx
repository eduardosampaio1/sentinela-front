// M35 · AN-04 — falhas terminais.
//
// Escopo literal do PLAN: *"`retry` só quando `retry_allowed`; `non_retryable_failure` **sem**
// 'tentar novamente'; `capacity_wait` com espera"*. Scenarios 13–15 e 29, e só eles.
//
// ## `non_retryable_failure` não tem scenario, e não vai ganhar um
//
// O PLAN não pede scenario para ele; o escopo pede COMPORTAMENTO. A obrigação é provar que o caso
// não oferece retomada — e isso é reproduzível pela autoridade que já existe:
//
// - `retry_allowed` chega em `AnalysisStatusView` (`GET /v1/analyses/{id}`), e a fixture canônica
//   `statusView` aceita o override. O default para `failed` é `true`, então `false` é escolha
//   explícita de quem escreve o caso — não massa fabricada;
// - `non_retryable_failure` é `problem_code` 422, resposta de operação, e a tabela de
//   `errorView.ts` já lhe dá `action: "none"`.
//
// Nenhum scenario 33, nenhuma fixture "quase canônica".
//
// ## `failed` e `retry_allowed` são dimensões diferentes
//
// Um eixo em `failed` não autoriza retomada. Quem autoriza é `retry_allowed`, que é da ANÁLISE.
// Confundir os dois faria a tela oferecer uma operação que o produtor não permitiu.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import pt from "@/i18n/pt.json";
import { PROGRESS_AXES, type ProgressEntry } from "@/lib/v1";
import { statusView } from "@/test/fixtures/public-v1/analyses";
import { describeProblem } from "@/features/canonical-analysis/data/errorView";
import { lerEixos, analyticsUtilizavel } from "@/features/canonical-analysis/result/eixos";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
const PAGINA = () => semComentarios(ler("src/features/canonical-analysis/ui/AnalysisPage.tsx"));

/** Os três scenarios de falha, como o catálogo os publica. */
const S13: ProgressEntry[] = [
  { axis: "engine", state: "failed" },
  { axis: "analytics", state: "ready" },
  { axis: "export", state: "unavailable" },
  { axis: "final_result", state: "pending" },
];
const S14: ProgressEntry[] = [
  { axis: "engine", state: "ready" },
  { axis: "analytics", state: "failed" },
  { axis: "export", state: "unavailable" },
  { axis: "final_result", state: "pending" },
];
const S15: ProgressEntry[] = [
  { axis: "engine", state: "failed" },
  { axis: "analytics", state: "failed" },
  { axis: "export", state: "unavailable" },
  { axis: "final_result", state: "failed" },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Retry existe só quando `retry_allowed` autoriza
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M35 · 1. retry_allowed é a única autorização", () => {
  it("a fixture canônica reproduz os DOIS lados sem inventar massa", () => {
    // O default de `failed` é `true`; o `false` exige override explícito. Nenhum scenario novo.
    expect(statusView("failed").retry_allowed).toBe(true);
    expect(statusView("failed", { retry_allowed: false }).retry_allowed).toBe(false);
    // E a fixture DERIVA do status: uma que concedesse retomada a todo mundo deixaria um caso
    // futuro "provar" retry numa análise concluída. O gate pegou este buraco — o override
    // sozinho sobrevivia à mutação que tornava `retry_allowed` sempre verdadeiro.
    for (const semRetomada of ["completed", "running", "queued", "preparing"] as const) {
      expect(statusView(semRetomada).retry_allowed, `${semRetomada} ganhou retomada`).toBe(false);
    }
  });

  it("a página condiciona o botão a `retry_allowed`, e a mais nada", () => {
    const f = PAGINA();
    // O ternário do ramo terminal lê o campo da ANÁLISE, não o estado de um eixo.
    expect(f).toContain("view.retry_allowed ? (");
    // E não deriva retomada de eixo, de HTTP nem de aparência. A varredura precisa ser sobre a
    // CONDIÇÃO, não sobre o ramo inteiro: a 1ª versão procurava "eixo" e batia em
    // `<PainelDeEixos eixos={eixos} />`, que é o nome da variável — instrumento grosseiro.
    const ramo = f.slice(f.indexOf('case "failed":'), f.indexOf('default:'));
    for (const inferencia of ['entrada.state', '=== "failed"', "status >= 500", "isError &&"]) {
      expect(ramo, `retry inferido por ${inferencia}`).not.toContain(inferencia);
    }
    // A condição é o campo da análise, sozinho — sem `&&` nem `||` acoplando outra coisa.
    expect(ramo).toContain("{view.retry_allowed ? (");
  });

  it("`non_retryable_failure` não oferece ação nenhuma", () => {
    // Resposta de operação (422), não estado de análise. A tabela decide pelo CÓDIGO.
    expect(describeProblem("non_retryable_failure").action).toBe("none");
    // E `capacity_wait` continua espera, não erro.
    expect(describeProblem("capacity_wait").action).toBe("wait");
    expect(describeProblem("capacity_wait").tone).toBe("wait");
  });

  it("controle positivo: a tabela distingue de fato — `temporarily_unavailable` re-tenta", () => {
    // Sem isto, `action: "none"` poderia ser o default de tudo e o caso acima seria vácuo.
    expect(describeProblem("temporarily_unavailable").action).toBe("retry");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Falha é granular — scenarios 13, 14 e 15
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M35 · 2. um eixo falho não apaga os outros", () => {
  it("13: processamento falhou e o analytics continua UTILIZÁVEL", () => {
    const eixos = lerEixos({ analysis_id: "an-1", axes: S13 });
    expect(eixos.find((e) => e.axis === "engine")!.entrada!.state).toBe("failed");
    expect(analyticsUtilizavel(eixos), "a falha de um eixo apagou o outro").toBe(true);
  });

  it("14: analytics falhou e isso NÃO torna a análise inteira uma falha", () => {
    const eixos = lerEixos({ analysis_id: "an-1", axes: S14 });
    expect(analyticsUtilizavel(eixos)).toBe(false);
    // O processamento continua pronto — a granularidade sobrevive.
    expect(eixos.find((e) => e.axis === "engine")!.entrada!.state).toBe("ready");
    // E `final_result` segue `pending`, não `failed`: ninguém promoveu a falha de componente
    // a falha da análise.
    expect(eixos.find((e) => e.axis === "final_result")!.entrada!.state).toBe("pending");
  });

  it("15: ambos falharam — e ainda assim são QUATRO eixos, cada um com o seu estado", () => {
    const eixos = lerEixos({ analysis_id: "an-1", axes: S15 });
    expect(eixos).toHaveLength(PROGRESS_AXES.length);
    expect(eixos.map((e) => e.entrada!.state)).toEqual(["failed", "failed", "unavailable", "failed"]);
    // `export` NÃO é `failed`: o componente de export nunca foi acionado, e dizer que ele falhou
    // afirmaria uma tentativa que não houve.
    expect(eixos.find((e) => e.axis === "export")!.entrada!.state).toBe("unavailable");
  });

  it("o ramo terminal MOSTRA os eixos — falha não vira tela genérica de erro", () => {
    const ramo = PAGINA().slice(PAGINA().indexOf('case "failed":'), PAGINA().indexOf("default:"));
    expect(ramo, "a falha voltou a apagar os quatro eixos").toContain("<PainelDeEixos");
    expect(ramo, "o que já estava pronto sumiu na falha").toContain("<RegiaoDeAnalyticsAoVivo");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. O que a superfície se proíbe
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M35 · 3. sem toast, sem cor sozinha, sem AN-02", () => {
  it("a falha não é toast", () => {
    const f = PAGINA();
    expect(f).not.toContain("toast");
    expect(f).not.toContain("useToast");
  });

  it("AN-02 continua exibindo sem agir — nenhum CTA funcional de mapping", () => {
    // A nota vermelha da M35 declara AN-02 inacessível até BD01, que ainda "falta autorizar".
    const ramo = PAGINA().slice(PAGINA().indexOf('case "needs_mapping":'), PAGINA().indexOf('case "completed":'));
    expect(ramo).toContain("checkAgain");
    for (const proibido of ["/mapping", "/profile", "confirmarMapping", "ingestion"]) {
      expect(ramo, `AN-02 ganhou operação: ${proibido}`).not.toContain(proibido);
    }
  });

  it("nenhuma promessa sem autoridade na copy de falha", () => {
    const p = pt.canonicalAnalysis.problem as Record<string, string>;
    expect(p.non_retryable_failure.toLowerCase()).not.toContain("tentar novamente");
    expect(p.non_retryable_failure.toLowerCase()).not.toContain("mais tarde");
    // `capacity_wait` não é falha terminal.
    expect(p.capacity_wait.toLowerCase()).not.toContain("falh");
  });

  it("controle positivo: a leitura do ramo terminal enxerga o que existe", () => {
    const ramo = PAGINA().slice(PAGINA().indexOf('case "failed":'), PAGINA().indexOf("default:"));
    expect(ramo).toContain("StateBanner");
    expect(ramo.length).toBeGreaterThan(400);
  });
});
