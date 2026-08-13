// M40 — os gates da MASSA de Baseline Reference. Nenhuma UI, nenhum cliente de produção.
//
// A massa é a fronteira entre "a BD10 existe" e "a INST-05 pode ser construída". Ela representa
// **capacidade publicada** — e o trabalho destes gates é impedir que ela represente qualquer outra
// coisa.
//
// ## O que se prova aqui, e por que por comportamento
//
// Os scenarios são invocados como o browser os invoca: `handlersDoScenario(id)` e as respostas
// medidas por `fetch` contra o MSW. Ler a fixture direto provaria que eu escrevi o que escrevi;
// atravessar o handler prova o que a tela vai receber — inclusive o `POST` que muda o estado e o
// filtro que só responde com o parâmetro certo.
//
// ## Contagens EXATAS
//
// `length > 0` passaria numa massa que perdesse dois dos três candidatos, e a prova de troca
// A→B deixaria de ter alternativa sem nada ficar vermelho. Os números vivem na massa
// (`TOTAL_DE_CANDIDATOS`) e são conferidos por igualdade.

import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { CATALOGO, handlersDoScenario } from "@/mocks/scenarios";
import {
  BASELINE_ALTERNATIVO,
  BASELINE_ESCOLHIDO,
  CANDIDATOS,
  TOTAL_DE_CANDIDATOS,
} from "@/test/fixtures/public-v1/baseline";
import { INSTANCIA } from "@/test/fixtures/public-v1/instances";

const BASE = "http://mock.test";
const INST = INSTANCIA.instance_id;

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Arma o scenario pedido — o mesmo caminho que o browser usa. */
function armar(id: string) {
  server.resetHandlers(...handlersDoScenario(id, BASE));
}

const baseline = () => fetch(`${BASE}/v1/instances/${INST}/baseline`).then((r) => r.json());

const candidatos = () =>
  fetch(`${BASE}/v1/analyses?instance_id=${INST}&baseline_eligible=true`).then((r) => r.json());

const eleger = (analysisId: string) =>
  fetch(`${BASE}/v1/instances/${INST}/baseline`, {
    method: "POST",
    body: JSON.stringify({ baseline_analysis_id: analysisId }),
  });

const limpar = () =>
  fetch(`${BASE}/v1/instances/${INST}/baseline`, { method: "DELETE" });

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 0. Anti-vacuidade — a massa existe e é invocável
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · 0. o instrumento", () => {
  it("os três scenarios de baseline estão no catálogo e são executáveis", () => {
    for (const id of ["no-baseline", "baseline-set", "baseline-no-candidates"]) {
      const s = CATALOGO.find((x) => x.id === id);
      expect(s, `${id} ausente do catálogo`).toBeTruthy();
      expect(s?.estado, `${id} não é executável`).toBe("disponivel");
      expect(s?.superficies).toContain("INST-05");
    }
  });

  it("`baseline-active` continua BLOQUEADO, e a razão diz por quê", () => {
    // Ele carrega duas afirmações e só uma destravou. Marcá-lo entregue afirmaria capacidade
    // pública onde há só constraint no banco.
    const s = CATALOGO.find((x) => x.id === "baseline-active");
    expect(s?.estado).toBe("bloqueado");
    expect(s?.razao).toMatch(/exclus/i);
    expect(s?.razao).toMatch(/BD06|B10/);
    // E ele NÃO serve nada: bloqueado sem handlers é o que impede a massa de existir por engano.
    expect(s?.handlers).toBeUndefined();
  });

  it("a massa declara a própria cardinalidade", () => {
    expect(CANDIDATOS).toHaveLength(TOTAL_DE_CANDIDATOS);
    expect(TOTAL_DE_CANDIDATOS).toBeGreaterThanOrEqual(3);
    // Ids distintos: dois candidatos com o mesmo id tornariam a prova de troca indistinguível.
    expect(new Set(CANDIDATOS.map((c) => c.analysis_id)).size).toBe(TOTAL_DE_CANDIDATOS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// A. `no-baseline` — ausência de régua NÃO é ausência de candidatos
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · A. no-baseline", () => {
  it("o baseline vem com as DUAS chaves explicitamente nulas", async () => {
    armar("no-baseline");
    const b = await baseline();
    expect(b.instance_id).toBe(INST);
    // As chaves EXISTEM. Omitir para significar ausência obrigaria a tela a distinguir "não veio"
    // de "não tem" — a mesma decisão que a BD02 já tomou para `instance_id` na listagem.
    expect(b).toHaveProperty("baseline_analysis_id", null);
    expect(b).toHaveProperty("baseline_set_at", null);
  });

  it("e HÁ candidatos — a frase inteira deste scenario", async () => {
    armar("no-baseline");
    const c = await candidatos();
    expect(c.items).toHaveLength(TOTAL_DE_CANDIDATOS);
    expect(c.items.map((x: { analysis_id: string }) => x.analysis_id)).toEqual(
      CANDIDATOS.map((x) => x.analysis_id),
    );
  });

  it("os candidatos são todos `completed` e todos DESTA Instance", async () => {
    // Não porque o Front filtre — porque o backend já filtrou. O que se prova aqui é que a massa
    // representa uma lista já carimbada, e não uma lista crua esperando recorte.
    armar("no-baseline");
    const c = await candidatos();
    for (const item of c.items) {
      expect(item.status).toBe("completed");
      expect(item.instance_id).toBe(INST);
    }
  });

  it("sem `baseline_eligible=true` o que volta é o HISTÓRICO, não os candidatos", async () => {
    // O mock afirma o parâmetro em vez de presumi-lo. Sem isto, um Front que esquecesse de
    // enviá-lo montaria o seletor com a lista errada e a tela pareceria funcionar.
    armar("no-baseline");
    const geral = await fetch(`${BASE}/v1/analyses?instance_id=${INST}`).then((r) => r.json());
    const ids = geral.items.map((x: { analysis_id: string }) => x.analysis_id);
    expect(ids).not.toEqual(CANDIDATOS.map((c) => c.analysis_id));
  });

  it("sem `instance_id` não há candidatura nenhuma", async () => {
    armar("no-baseline");
    const r = await fetch(`${BASE}/v1/analyses?baseline_eligible=true`).then((x) => x.json());
    expect(r.items).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// B. `baseline-set` — a régua configurada
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · B. baseline-set", () => {
  it("o ponteiro e o carimbo vêm JUNTOS, e nunca pela metade", async () => {
    // O banco recusa a metade do par (`CHECK orchestrator_instances_baseline_par`). Uma massa que
    // violasse o invariante ensinaria a tela a tratar um estado impossível.
    armar("baseline-set");
    const b = await baseline();
    expect(b.baseline_analysis_id).toBe(BASELINE_ESCOLHIDO);
    expect(b.baseline_set_at).toBeTruthy();
  });

  it("a régua PERTENCE ao conjunto elegível", async () => {
    // Um baseline fora da lista de candidatos seria uma configuração que o produtor recusaria —
    // e a tela nasceria sabendo desenhar um estado que o backend não produz.
    armar("baseline-set");
    const [b, c] = await Promise.all([baseline(), candidatos()]);
    const ids = c.items.map((x: { analysis_id: string }) => x.analysis_id);
    expect(ids).toContain(b.baseline_analysis_id);
  });

  it("existe pelo menos uma ALTERNATIVA distinta da régua", async () => {
    armar("baseline-set");
    const [b, c] = await Promise.all([baseline(), candidatos()]);
    const alternativas = c.items.filter(
      (x: { analysis_id: string }) => x.analysis_id !== b.baseline_analysis_id,
    );
    expect(alternativas.length).toBeGreaterThanOrEqual(2);
    expect(alternativas.map((x: { analysis_id: string }) => x.analysis_id)).toContain(
      BASELINE_ALTERNATIVO,
    );
  });

  it("a contagem de candidatos é EXATA", async () => {
    armar("baseline-set");
    expect((await candidatos()).items).toHaveLength(TOTAL_DE_CANDIDATOS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// C/D. Troca e remoção — o contrato é observável por TRANSIÇÃO
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · C. troca A→B", () => {
  it("a troca NÃO passa por NO_BASELINE", async () => {
    // A garantia central da BD10: `SET` de outra Analysis substitui atomicamente. Exigir `CLEAR`
    // antes abriria uma janela sem régua, indistinguível de um `NO_BASELINE` deliberado.
    armar("baseline-set");
    expect((await baseline()).baseline_analysis_id).toBe(BASELINE_ESCOLHIDO);

    const r = await eleger(BASELINE_ALTERNATIVO);
    expect(r.status).toBe(200);
    const depois = await r.json();
    expect(depois.baseline_analysis_id).toBe(BASELINE_ALTERNATIVO);
    expect(depois.baseline_set_at).toBeTruthy();
    // E a leitura seguinte confirma — o estado é do recurso, não da resposta.
    expect((await baseline()).baseline_analysis_id).toBe(BASELINE_ALTERNATIVO);
  });

  it("eleger a MESMA Analysis de novo é sucesso, não conflito", async () => {
    armar("baseline-set");
    const r = await eleger(BASELINE_ESCOLHIDO);
    expect(r.status).toBe(200);
    expect((await baseline()).baseline_analysis_id).toBe(BASELINE_ESCOLHIDO);
  });

  it("eleger em `no-baseline` sai de NO_BASELINE por AÇÃO EXPLÍCITA", async () => {
    armar("no-baseline");
    expect((await baseline()).baseline_analysis_id).toBeNull();
    await eleger(BASELINE_ALTERNATIVO);
    expect((await baseline()).baseline_analysis_id).toBe(BASELINE_ALTERNATIVO);
  });

  it("corpo sem `baseline_analysis_id` é recusado — `null` não é CLEAR disfarçado", async () => {
    armar("baseline-set");
    const r = await fetch(`${BASE}/v1/instances/${INST}/baseline`, {
      method: "POST",
      body: JSON.stringify({ baseline_analysis_id: null }),
    });
    expect(r.status).toBe(400);
    // E a régua não mudou.
    expect((await baseline()).baseline_analysis_id).toBe(BASELINE_ESCOLHIDO);
  });
});

describe("M40 · D. remoção", () => {
  it("`DELETE` volta a NO_BASELINE, com as duas chaves nulas", async () => {
    armar("baseline-set");
    const r = await limpar();
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.baseline_analysis_id).toBeNull();
    expect(b.baseline_set_at).toBeNull();
  });

  it("`DELETE` repetido mantém a pós-condição — é idempotente", async () => {
    armar("baseline-set");
    await limpar();
    const segundo = await limpar();
    expect(segundo.status).toBe(200);
    expect((await segundo.json()).baseline_analysis_id).toBeNull();
  });

  it("remover NÃO escolhe substituto, mesmo havendo alternativas", async () => {
    // D25: *"Nunca muda silenciosamente."* Havia dois outros candidatos elegíveis, e nenhum deles
    // vira régua sozinho.
    armar("baseline-set");
    await limpar();
    const [b, c] = await Promise.all([baseline(), candidatos()]);
    expect(b.baseline_analysis_id).toBeNull();
    expect(c.items).toHaveLength(TOTAL_DE_CANDIDATOS);
  });

  it("remover não alcança a Analysis — os candidatos continuam lá", async () => {
    armar("baseline-set");
    await limpar();
    expect((await candidatos()).items).toHaveLength(TOTAL_DE_CANDIDATOS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// E. `baseline-no-candidates` — `[]` é resposta, não falha
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · E. baseline-no-candidates", () => {
  it("`[]` vem com 200 — o backend consultou e achou zero", async () => {
    armar("baseline-no-candidates");
    const r = await fetch(`${BASE}/v1/analyses?instance_id=${INST}&baseline_eligible=true`);
    expect(r.status).toBe(200);
    expect((await r.json()).items).toEqual([]);
  });

  it("e o baseline continua sendo NO_BASELINE legítimo", async () => {
    armar("baseline-no-candidates");
    const b = await baseline();
    expect(b.baseline_analysis_id).toBeNull();
    expect(b.baseline_set_at).toBeNull();
  });

  it("zero candidatos NÃO é o mesmo que endpoint ausente", async () => {
    // As duas se parecem na tela se ninguém as separar: uma é `200` com lista vazia, a outra
    // seria `404`/erro. A massa representa a primeira, e só ela.
    armar("baseline-no-candidates");
    const r = await fetch(`${BASE}/v1/analyses?instance_id=${INST}&baseline_eligible=true`);
    expect(r.ok).toBe(true);
    expect(await r.json()).toHaveProperty("items");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// F. O que NENHUMA massa pode fazer
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M40 · F. as proibições", () => {
  it("o baseline NUNCA aparece sozinho — sem `POST`, fica nulo para sempre", async () => {
    // `SENTINELA_AUTO_BASELINE` é o caminho legado que elege "a última concluída". D25 proíbe, e
    // nenhuma massa daqui o imita: cinco leituras seguidas, e a régua continua ausente.
    armar("no-baseline");
    for (let i = 0; i < 5; i++) {
      expect((await baseline()).baseline_analysis_id).toBeNull();
    }
    await candidatos();
    expect((await baseline()).baseline_analysis_id).toBeNull();
  });

  it("a régua não é a mais recente — e a massa está montada para denunciar isso", async () => {
    // Se alguma tela vier a escolher "a última concluída", ela apontará para o candidato de
    // `created_at` mais novo. A régua deste scenario é deliberadamente o MAIS ANTIGO.
    armar("baseline-set");
    const [b, c] = await Promise.all([baseline(), candidatos()]);
    const maisRecente = [...c.items].sort((x: { created_at: string }, y: { created_at: string }) =>
      y.created_at.localeCompare(x.created_at),
    )[0];
    expect(b.baseline_analysis_id).not.toBe(maisRecente.analysis_id);
  });

  it("nenhum candidato carrega versão de documento, `serves_argos` ou `comparable`", async () => {
    // A BD10 decidiu que v3 NÃO é requisito da referência: uma Analysis v1/v2-only é referência
    // legítima. O contrato sequer publica versão no item da listagem — e essa ausência É a prova.
    armar("baseline-set");
    const bruto = JSON.stringify(await candidatos());
    for (const proibido of [
      "serves_argos",
      "v3_available",
      "comparable",
      "legacy_warning",
      "result_schema_version",
      "analysis-result-v3",
    ]) {
      expect(bruto.includes(proibido), `candidato carrega \`${proibido}\``).toBe(false);
    }
  });

  it("nenhuma resposta de baseline carrega delta, direção ou tendência", async () => {
    armar("baseline-set");
    const bruto = JSON.stringify([await baseline(), await candidatos()]);
    for (const proibido of [
      "delta",
      "trend",
      "direction",
      "higher_is_better",
      "lower_is_better",
      "baseline_system",
      "mk3",
      "melhora",
      "piora",
    ]) {
      expect(bruto.includes(proibido), `a massa carrega \`${proibido}\``).toBe(false);
    }
  });

  it("nenhum scenario de baseline serve `/analytics` ou `/result`", async () => {
    // A referência é configuração da Instance. Comparação e documento canônico são outras
    // capacidades — e `onUnhandledRequest: "error"` faz a tentativa estourar em vez de passar.
    for (const id of ["no-baseline", "baseline-set", "baseline-no-candidates"]) {
      armar(id);
      await expect(fetch(`${BASE}/v1/analyses/an-cand-0001/analytics`)).rejects.toThrow();
      await expect(fetch(`${BASE}/v1/analyses/an-cand-0001/result`)).rejects.toThrow();
    }
  });

  it("nenhum scenario de baseline expõe exclusão de Analysis", async () => {
    // B10 → BD06 não existe. Servir um `DELETE /v1/analyses/{id}` aqui inventaria a operação que
    // mantém o `baseline-active` bloqueado.
    armar("baseline-set");
    await expect(
      fetch(`${BASE}/v1/analyses/${BASELINE_ESCOLHIDO}`, { method: "DELETE" }),
    ).rejects.toThrow();
  });
});
