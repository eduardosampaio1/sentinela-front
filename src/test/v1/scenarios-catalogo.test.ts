// M18 — o catálogo dos cenários, provado onde ele costuma virar ficção.
//
// Um catálogo de mock apodrece de dois jeitos. Ou ele cresce com cenários que ninguém consegue
// invocar — nomes que só existem na documentação — ou ele "completa" o que falta: serve um objeto
// plausível para um delta de backend que não existe, e a tela monta. O segundo é pior, porque
// produz uma demo que funciona e um produto que não.
//
// Este gate ataca os dois: todo nome do Blueprint é invocável, e todo bloqueado RECUSA.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOGO,
  NOMES,
  ScenarioIndisponivel,
  handlersDoScenario,
  nomesPorEstado,
  scenario,
} from "@/mocks/scenarios";

const RAIZ = resolve(__dirname, "../../..");
const BASE = "http://gw.test";

/** Os 32 nomes do Blueprint §11 — a autoridade de MAPA. */
const BLUEPRINT = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");

/** Os bloqueados que o plano nomeia, literalmente.
 *
 * Eram 4. `instance-empty` saiu com o freeze da BD02 (B3 fechado): a razão dele nomeava três
 * ausências no contrato público — operação, read model e campo — e as três acabaram. Sair daqui
 * é o que faz o cenário deixar de recusar servir. */
const BLOQUEADOS_DO_PLANO = [
  "recommendation-persisted",
  "no-baseline",
  "baseline-active",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — DoD 7: catálogo vazio ou incompleto não passa
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M18 · 1. o catálogo está completo", () => {
  it("tem as 32 entradas do Blueprint §11", () => {
    // Um catálogo curto passaria em todos os outros casos: o que ele não lista, ele não erra.
    expect(CATALOGO.length, "o catálogo divergiu do Blueprint").toBe(32);
  });

  it("28 disponíveis · 1 parcial · 3 bloqueados", () => {
    // `instance-empty` saiu de bloqueado para disponível com o freeze da BD02 (B3 fechado). O
    // TOTAL não muda: nenhum cenário nasceu nem morreu, só um mudou de estado — e é por isso
    // que os três números são conferidos juntos, e não só o do estado que mudou.
    expect(nomesPorEstado("disponivel").length).toBe(28);
    expect(nomesPorEstado("parcial").length).toBe(1);
    expect(nomesPorEstado("bloqueado").length).toBe(3);
  });

  it("o desbloqueio da BD02 foi de ESTADO, não de composição do catálogo", () => {
    // A prova de que o checkpoint foi administrativo: `instance-empty` continua existindo, com
    // a mesma superfície, e os que continuam bloqueados são exatamente os outros três.
    const alvo = CATALOGO.find((c) => c.id === "instance-empty");
    expect(alvo, "o cenário sumiu do catálogo").toBeTruthy();
    expect(alvo!.superficies).toEqual(["INST-01"]);
    expect(alvo!.estado).toBe("disponivel");
    expect(new Set(nomesPorEstado("bloqueado"))).toEqual(
      new Set(["recommendation-persisted", "no-baseline", "baseline-active"]),
    );
  });

  it("o vazio de `instance-empty` é o do produtor REAL, não fixture inventada", () => {
    // `{"items": [], "next_cursor": null}` é o que o Gateway real devolve para workspace
    // autorizado sem Instances — medido no gate E2E da BD02. Um cenário que servisse Instance
    // fabricada faria a tela montar sobre dado que ninguém produz.
    const alvo = CATALOGO.find((c) => c.id === "instance-empty")!;
    expect(alvo.handlers, "cenário disponível sem handler não serve nada").toBeTruthy();
    expect(alvo.razao, "cenário disponível não pode manter razão de bloqueio").toBeFalsy();
  });

  it("todo nome do catálogo aparece no Blueprint", () => {
    // A direção que impede o catálogo de INVENTAR cenário: um id que não está no mapa é um
    // segundo catálogo nascendo ao lado do primeiro.
    const forasteiros = NOMES.filter((n) => !BLUEPRINT.includes(`\`${n}\``));
    expect(forasteiros, "cenário que não existe no Blueprint").toEqual([]);
  });

  it("todo cenário do Blueprint está no catálogo", () => {
    // A direção inversa: o que o mapa promete e o catálogo não entrega.
    const doMapa = [...BLUEPRINT.matchAll(/^\|\s*\d+\s*\|\s*`([a-z0-9-]+)`/gm)].map((m) => m[1]);
    expect(doMapa.length, "não consegui ler a tabela §11 do Blueprint").toBe(32);
    const faltando = doMapa.filter((n) => !NOMES.includes(n));
    expect(faltando, "cenário do Blueprint ausente do catálogo").toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. DoD 1 e 3 — invocável por nome, e o nome é único
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M18 · 2. cada cenário é invocável pelo nome", () => {
  for (const s of CATALOGO) {
    it(`\`${s.id}\` resolve`, () => {
      const achado = scenario(s.id);
      expect(achado.id).toBe(s.id);
      expect(achado.superficies.length, `${s.id} sem superfície declarada`).toBeGreaterThan(0);
    });
  }

  it("os nomes são únicos", () => {
    // A construção do índice já lança em duplicata — este caso prova que a lista chegou íntegra
    // até aqui, e serve de âncora para a mutação que introduz um id repetido.
    expect(new Set(NOMES).size).toBe(NOMES.length);
  });

  it("todo cenário DISPONÍVEL entrega handlers de verdade", () => {
    for (const nome of nomesPorEstado("disponivel")) {
      const hs = handlersDoScenario(nome, BASE);
      expect(hs.length, `${nome} devolveu lista vazia de handlers`).toBeGreaterThan(0);
    }
  });

  it("o PARCIAL entrega handlers — ele exibe, só não resolve", () => {
    for (const nome of nomesPorEstado("parcial")) {
      expect(handlersDoScenario(nome, BASE).length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. DoD 2 — nome inexistente falha claramente
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M18 · 3. um nome que não existe falha alto", () => {
  it("`scenario()` lança, e a mensagem lista os conhecidos", () => {
    // Silêncio aqui seria pior que erro: um `undefined` devolvido viraria "sem handlers", e o
    // teste que pediu o cenário errado passaria mostrando a tela vazia.
    expect(() => scenario("cenario-que-nao-existe")).toThrow(ScenarioIndisponivel);
    try {
      scenario("cenario-que-nao-existe");
    } catch (e) {
      expect((e as ScenarioIndisponivel).estado).toBe("inexistente");
      expect((e as Error).message).toContain("workspace-empty");
    }
  });

  it("`handlersDoScenario()` também lança", () => {
    expect(() => handlersDoScenario("nao-existe", BASE)).toThrow(ScenarioIndisponivel);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. DoD 4 e 6 — os bloqueados recusam, com a razão, e ninguém os "completa"
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M18 · 4. os bloqueados falham explicitamente", () => {
  it("são exatamente os que o plano nomeia", () => {
    expect([...nomesPorEstado("bloqueado")].sort()).toEqual([...BLOQUEADOS_DO_PLANO].sort());
  });

  for (const nome of BLOQUEADOS_DO_PLANO) {
    it(`\`${nome}\` recusa servir, e diz por quê`, () => {
      expect(() => handlersDoScenario(nome, BASE)).toThrow(ScenarioIndisponivel);
      try {
        handlersDoScenario(nome, BASE);
      } catch (e) {
        const erro = e as ScenarioIndisponivel;
        expect(erro.estado).toBe("bloqueado");
        // A razão é o produto do bloqueio. Sem ela, "bloqueado" é só uma palavra, e a próxima
        // pessoa reabre a discussão do zero.
        expect(erro.message, `${nome} recusa sem explicar`).toMatch(/Motivo: .{40,}/);
      }
    });
  }

  it("nenhum bloqueado carrega handlers — nem vazios", () => {
    // DoD 6. Uma lista vazia seria "completar pelo mock" com outro nome: a tela montaria, o
    // estado vazio pareceria legítimo, e o delta ausente ficaria invisível.
    for (const nome of nomesPorEstado("bloqueado")) {
      expect(scenario(nome).handlers, `${nome} tem handlers e não deveria`).toBeUndefined();
    }
  });

  it("cada bloqueado aponta o blocker ou o delta que o destrava", () => {
    const esperado: Record<string, RegExp> = {
      "recommendation-persisted": /recommendation_id|BD03/i,
      "no-baseline": /baseline/i,
      "baseline-active": /baseline/i,
    };
    for (const [nome, padrao] of Object.entries(esperado)) {
      expect(scenario(nome).razao ?? "", `${nome}: razão não nomeia a causa`).toMatch(padrao);
    }
  });

  it("o PARCIAL diz o que faz e o que não faz", () => {
    const s = scenario("needs-mapping");
    expect(s.estado).toBe("parcial");
    expect(s.razao ?? "").toMatch(/EXIBIR|exibir/);
    expect(s.razao ?? "", "não diz que a resolução está bloqueada").toMatch(/RESOLVER|resolver/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. DoD 5 — os cenários bebem das fixtures presas ao contrato (M17)
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M18 · 5. os cenários reutilizam as fixtures da M17", () => {
  const fonte = readFileSync(resolve(RAIZ, "src/mocks/scenarios/catalogo.ts"), "utf-8");

  it("o catálogo importa a fixture canônica, e não monta payload próprio", () => {
    // Se o catálogo escrevesse os próprios objetos, ele escaparia do gate da M17 — e voltaríamos
    // à fixture que envelhece sozinha, agora com outro nome.
    expect(fonte).toContain('from "@/test/fixtures/public-v1/analyses"');
  });

  it("nenhum cenário reconstrói o read model à mão", () => {
    // Os campos do contrato aparecem nas FIXTURES, não aqui. `analysis_id` é a exceção declarada:
    // ele identifica a rota nos handlers de progresso/analytics, não descreve um read model.
    const semComentarios = fonte
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(?<!:)\/\/.*$/gm, "");
    for (const campo of ["record_count", "result_available", "retry_allowed", "created_at"]) {
      expect(semComentarios, `catálogo redigita \`${campo}\` em vez de usar a fixture`).
        not.toContain(campo);
    }
  });

  it("os códigos de erro vêm do catálogo canônico de problemas", () => {
    // Dois códigos foram INVENTADOS na primeira versão (`export_expired`, `unauthenticated`) e o
    // typecheck reprovou. Este caso mantém a porta fechada por nome, não só por tipo.
    for (const inventado of ["export_expired", "unauthenticated", "not_found_error"]) {
      expect(fonte, `código de problema inventado: \`${inventado}\``).not.toContain(inventado + '"');
    }
  });
});
