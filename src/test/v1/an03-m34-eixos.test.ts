// M34 · AN-03 — a semântica dos quatro eixos, antes de qualquer pixel.
//
// Escopo literal: *"4 eixos lado a lado; `recovering` ≠ falha; **analytics aparece com
// `ready|partial` mesmo com `final_result` pendente** (D13) — e isso **não** se chama 'resultado
// parcial'"*.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { AnalysisProgressView, ProgressEntry } from "@/lib/v1";
import {
  EIXOS_PUBLICADOS,
  analyticsUtilizavel,
  lerEixos,
  resultadoFinalPendente,
} from "@/features/canonical-analysis/result/eixos";

const RAIZ = resolve(__dirname, "../../..");
const FONTE = () =>
  readFileSync(resolve(RAIZ, "src/features/canonical-analysis/result/eixos.ts"), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ");

const vista = (axes: ProgressEntry[]): AnalysisProgressView => ({ analysis_id: "an-1", axes });

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Os quatro, sempre os quatro, na ordem do contrato
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M34 · 1. leitura dos eixos", () => {
  it("devolve os QUATRO na ordem publicada, mesmo com o payload embaralhado", () => {
    const r = lerEixos(
      vista([
        { axis: "final_result", state: "pending" },
        { axis: "analytics", state: "running" },
        { axis: "export", state: "unavailable" },
        { axis: "engine", state: "ready" },
      ]),
    );
    expect(r.map((e) => e.axis)).toEqual([...EIXOS_PUBLICADOS]);
    expect(r.map((e) => e.entrada?.state)).toEqual(["ready", "running", "unavailable", "pending"]);
  });

  it("eixo NÃO publicado é ausência — nunca vira `pending`", () => {
    // `pending` é um estado que alguém afirmou. Ausência é a falta da afirmação, e convertê-la
    // prometeria que aquele componente ainda vai acontecer.
    const r = lerEixos(vista([{ axis: "engine", state: "running" }]));
    expect(r.find((e) => e.axis === "engine")!.entrada!.state).toBe("running");
    for (const ausente of ["analytics", "export", "final_result"] as const) {
      expect(r.find((e) => e.axis === ausente)!.entrada, `${ausente} virou estado conhecido`).toBeNull();
    }
  });

  it("sem progresso nenhum, ainda são quatro eixos ausentes — não zero eixos", () => {
    const r = lerEixos(undefined);
    expect(r).toHaveLength(4);
    expect(r.every((e) => e.entrada === null)).toBe(true);
  });

  it("duplicata no payload não é resolvida por escolha arbitrária: vence a primeira", () => {
    const r = lerEixos(
      vista([
        { axis: "engine", state: "running" },
        { axis: "engine", state: "ready" },
      ]),
    );
    expect(r.find((e) => e.axis === "engine")!.entrada!.state).toBe("running");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. D13 — disponibilidade progressiva
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M34 · 2. analytics utilizável com final pendente", () => {
  const comAnalytics = (state: ProgressEntry["state"]) =>
    lerEixos(
      vista([
        { axis: "engine", state: "running" },
        { axis: "analytics", state } as ProgressEntry,
        { axis: "final_result", state: "pending" },
      ]),
    );

  it("`ready` e `partial` são utilizáveis mesmo com `final_result: pending`", () => {
    for (const estado of ["ready", "partial"] as const) {
      const eixos = comAnalytics(estado);
      expect(analyticsUtilizavel(eixos), `${estado} deveria ser utilizável`).toBe(true);
      // E o final continua pendente — as duas coisas são ditas ao mesmo tempo, uma não apaga a outra.
      expect(resultadoFinalPendente(eixos)).toBe(true);
    }
  });

  it("`withheld` NÃO é utilizável — e também não é falha", () => {
    // Retenção por privacidade não é erro, e não vira dado. Inferir o que foi suprimido é o que a
    // regra existe para impedir.
    expect(analyticsUtilizavel(comAnalytics("withheld"))).toBe(false);
  });

  it("`pending`, `running`, `failed` e `unknown` não são utilizáveis", () => {
    for (const estado of ["pending", "running", "failed", "unknown"] as const) {
      expect(analyticsUtilizavel(comAnalytics(estado)), estado).toBe(false);
    }
  });

  it("analytics AUSENTE não é utilizável, e não é `failed`", () => {
    const eixos = lerEixos(vista([{ axis: "engine", state: "ready" }]));
    expect(analyticsUtilizavel(eixos)).toBe(false);
    expect(eixos.find((e) => e.axis === "analytics")!.entrada).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. O que o módulo se proíbe
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M34 · 3. sem agregação, sem percentual, sem semáforo", () => {
  it("nenhuma aritmética, contagem de prontos ou etapa global", () => {
    const f = FONTE();
    for (const proibido of [
      "%", "percent", "Math.", "reduce(", "score", "health", "etapa", "step",
      "filter(", "length >", "/ 4", "* 100",
    ]) {
      expect(f, `o módulo passou a agregar: ${proibido}`).not.toContain(proibido);
    }
  });

  it("não normaliza os quatro vocabulários num só", () => {
    const f = FONTE();
    // `expired`/`unavailable` são de `export`; `withheld`/`partial` são de `analytics`. Um mapa
    // comum aceitaria `expired` num eixo que nunca expira.
    expect(f).not.toContain('"expired"');
    expect(f).not.toContain('"unavailable"');
  });

  it("`recovering` não é tratado como eixo", () => {
    // Ele é status da análise. Tratá-lo aqui faria "recuperando" parecer um quinto componente.
    expect(FONTE()).not.toContain("recovering");
  });

  it("controle positivo: a varredura enxerga o que existe no arquivo", () => {
    expect(FONTE()).toContain("lerEixos");
    expect(FONTE()).toContain('"final_result"');
    expect(FONTE().length).toBeGreaterThan(800);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. O vocabulário público dos eixos, alinhado com a autoridade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M34 · 4. eixo.* e estadoEixo.* como fonte única", () => {
  const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
  const pt = JSON.parse(ler("src/i18n/pt.json"));
  const en = JSON.parse(ler("src/i18n/en.json"));

  it("os QUATRO eixos têm rótulo nos dois idiomas, com as chaves do contrato", () => {
    for (const axis of EIXOS_PUBLICADOS) {
      expect(pt.eixo[axis], `pt sem rótulo para ${axis}`).toBeTruthy();
      expect(en.eixo[axis], `en sem rótulo para ${axis}`).toBeTruthy();
    }
  });

  it("o identificador técnico nunca vira copy", () => {
    // A UI mostra "Processamento", não a chave. `engine_version` é `nunca_publico`; a chave
    // `engine` é publicada pelo contrato, mas continua sendo identificador, não texto de tela.
    expect(pt.eixo.engine).toBe("Processamento");
    expect(en.eixo.engine).toBe("Processing");
    for (const [k, v] of Object.entries({ ...pt.eixo, ...pt.estadoEixo })) {
      expect(String(v).toLowerCase(), `copy virou identificador em ${k}`).not.toContain("engine");
      expect(String(v).toLowerCase()).not.toContain("_");
    }
  });

  it("`withheld` é `restrito` — e o Blueprint §15 diz o mesmo", () => {
    // A divergência existiu: o §15 congelava "retido" e a implementação usava "Restrito". O
    // `/ux-copy` da M34 resolveu a favor de "restrito" e o §15 foi alinhado na mesma missão —
    // este caso existe para que produto e autoridade não voltem a discordar em silêncio.
    expect(pt.estadoEixo.withheld.toLowerCase()).toBe("restrito");
    expect(en.estadoEixo.withheld.toLowerCase()).toBe("withheld");
    const bp = ler("docs/EXPERIENCE-BLUEPRINT-V1.md");
    expect(bp).toContain("| `withheld` | restrito | withheld |");
    expect(bp).not.toContain("| `withheld` | retido |");
  });

  it("`withheld` não colide com `recovering` na mesma tela", () => {
    // O argumento que decidiu: AN-03 é a primeira superfície onde o status da análise e o estado
    // do eixo aparecem juntos. "Retomando" e "Retido" partilham radical e significam o oposto.
    const recovering = pt.estadoPublico.recovering.toLowerCase();
    expect(recovering).toBe("retomando");
    expect(pt.estadoEixo.withheld.toLowerCase().slice(0, 3)).not.toBe(recovering.slice(0, 3));
  });

  it("`partial` nunca vira `resultado parcial`", () => {
    expect(pt.estadoEixo.partial.toLowerCase()).toBe("parcial");
    for (const v of Object.values(pt.estadoEixo) as string[]) {
      expect(v.toLowerCase()).not.toContain("resultado parcial");
    }
  });
});
