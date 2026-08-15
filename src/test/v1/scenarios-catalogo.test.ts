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

/** Executa o handler MSW que casa com a URL e devolve o corpo — a prova é o que ele SERVE. */
async function servir(hs: ReturnType<typeof handlersDoScenario>, url: string): Promise<any> {
  const pedido = new Request(url);
  for (const h of hs) {
    const r = await h.run({ request: pedido, requestId: "t", cookies: {} } as never);
    const resposta = (r as { response?: Response } | null)?.response;
    if (resposta) return resposta.json();
  }
  throw new Error(`nenhum handler respondeu ${url}`);
}

/** Executa o handler que casa com um POST — o prepare é write, e `servir` só faz GET.
 *
 * O retorno é tipado no shape real do prepare (`{analysis_id, status}`) em vez de `any`: a
 * resposta desta operação é justamente onde a associação com a Instância NÃO aparece, e um
 * `any` aqui deixaria passar um caso que a lê deste corpo em vez de ler do status. */
async function servirPost(
  hs: ReturnType<typeof handlersDoScenario>,
  url: string,
): Promise<{ analysis_id: string; status: string }> {
  const pedido = new Request(url, { method: "POST" });
  for (const h of hs) {
    const r = await h.run({ request: pedido, requestId: "t", cookies: {} } as never);
    const resposta = (r as { response?: Response } | null)?.response;
    if (resposta) return resposta.json();
  }
  throw new Error(`nenhum handler respondeu POST ${url}`);
}

/** Os 35 nomes do Blueprint §11 — a autoridade de MAPA. */
const BLUEPRINT = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");

/** Os bloqueados que o plano nomeia, literalmente.
 *
 * Eram 4. `instance-empty` saiu com o freeze da BD02 (B3 fechado): a razão dele nomeava três
 * ausências no contrato público — operação, read model e campo — e as três acabaram. Sair daqui
 * é o que faz o cenário deixar de recusar servir. */
const BLOQUEADOS_DO_PLANO = [
  "recommendation-persisted",
  // `no-baseline` saiu na M40, e pela mesma mecânica do `instance-empty`: a razão dele nomeava
  // ausências no contrato público — *"nenhuma operação a cria, lê ou compara"* — e a BD10 acabou
  // com as duas primeiras. A terceira (comparar) continua verdadeira, e este scenario não
  // precisa dela.
  //
  // `baseline-active` NÃO saiu: ele carrega também "régua ativa bloqueia exclusão", e exclusão
  // pública de Analysis é o B10 → BD06, que não existe.
  "baseline-active",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — DoD 7: catálogo vazio ou incompleto não passa
// ═══════════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════════
// M45 · GATE 2 — o invariante que substituiu a contagem
// ═══════════════════════════════════════════════════════════════════════════════════════════
//
// O gate era *"os **27** scenarios não bloqueados reproduzíveis por nome"*, e `27` é um SNAPSHOT
// de 2026-08-10. O catálogo passou por 44, 52 e hoje tem 62. Um número datado como proxy de
// completude mede a data em que foi escrito.
//
// O invariante congelado na M45 é o que a frase sempre quis dizer, sem o número: **todo** scenario
// não bloqueado é reproduzível por nome, e **todo** bloqueado recusa com razão. Os casos abaixo
// varrem o catálogo inteiro — se ele crescer durante a M45, eles crescem junto e nada precisa ser
// atualizado à mão.

describe("M45 · G2 · todo scenario não bloqueado é reproduzível POR NOME", () => {
  it("todos os disponíveis e parciais servem handlers, sem exceção", () => {
    const invocaveis = [...nomesPorEstado("disponivel"), ...nomesPorEstado("parcial")];
    // Piso do INSTRUMENTO: um catálogo vazio faria o laço abaixo passar sem medir nada.
    expect(invocaveis.length, "nenhum scenario invocável — o laço seria vazio").toBeGreaterThan(50);

    const quebrados: string[] = [];
    for (const nome of invocaveis) {
      try {
        const hs = handlersDoScenario(nome, BASE);
        // Handlers vazios seriam pior que lançar: a tela montaria e o vazio pareceria legítimo.
        if (!Array.isArray(hs) || hs.length === 0) quebrados.push(`${nome}: zero handlers`);
      } catch (e) {
        quebrados.push(`${nome}: ${(e as Error).message.slice(0, 80)}`);
      }
    }
    expect(quebrados, "scenario declarado e não reproduzível").toEqual([]);
  });

  it("todo bloqueado RECUSA, com a razão — nunca devolve vazio", () => {
    const bloqueados = nomesPorEstado("bloqueado");
    expect(bloqueados.length, "sem bloqueados, a recusa não é medida").toBeGreaterThan(0);
    for (const nome of bloqueados) {
      expect(() => handlersDoScenario(nome, BASE)).toThrow(ScenarioIndisponivel);
      expect(scenario(nome).razao, `${nome} bloqueado sem razão declarada`).toBeTruthy();
    }
  });

  it("nenhum nome órfão: catálogo e Blueprint casam nas DUAS direções", () => {
    const blueprint = readFileSync(resolve(RAIZ, "docs/EXPERIENCE-BLUEPRINT-V1.md"), "utf-8");
    const doMapa = [...blueprint.matchAll(/^\|\s*\d+\s*\|\s*`([a-z0-9-]+)`/gm)].map((m) => m[1]);
    expect(doMapa.length, "o regex parou de casar a tabela §11").toBeGreaterThan(50);

    expect(doMapa.filter((n) => !NOMES.includes(n)), "no Blueprint e fora do catálogo").toEqual([]);
    expect(NOMES.filter((n) => !doMapa.includes(n)), "no catálogo e fora do Blueprint").toEqual([]);
  });
});

describe("M18 · 1. o catálogo está completo", () => {
  it("tem as 65 entradas do Blueprint §11", () => {
    // Um catálogo curto passaria em todos os outros casos: o que ele não lista, ele não erra.
    // 35 → 37 na materialização das massas v3 da M39. 37 → 39 na M40: `baseline-set` e
    // `baseline-no-candidates`. 39 → 44 na M41: `account-identity` (CFG-01) e os quatro
    // `account-language-*` (CFG-02). As entradas novas são as ÚNICAS que cada missão trouxe, e o
    // Blueprint §11 as lista ANTES de o código as receber.
    //
    // ## Este número quebrar é o gate FUNCIONANDO
    //
    // Ele não é proxy frágil: é o invariante do próprio catálogo — a autoridade vem primeiro. Um
    // crescimento legítimo o derruba de propósito, para que alguém tenha de ir ao Blueprint. Por
    // isso ele não vira `>= 44` nem sai daqui.
    //
    // E ele não anda sozinho: os dois casos do fim deste arquivo cruzam os NOMES contra
    // `docs/EXPERIENCE-BLUEPRINT-V1.md` nas duas direções. O número aqui é o terceiro dente, não o
    // único — um catálogo que crescesse com o Blueprint junto ainda teria de passar por ele.
    //
    // **Registro da M41, porque a suspeita era outra:** ao mexer neste número eu achei que o
    // Blueprint estivesse sete entradas atrás e que a frase "as N entradas do Blueprint §11" fosse
    // falsa. Estava errado. Existem DUAS cópias do documento — a do vault e
    // `sentinela-front-e1/docs/EXPERIENCE-BLUEPRINT-V1.md` —, e o gate lê a do repositório, que
    // estava correta e completa. Quem envelheceu foi a do vault, que gate nenhum lê. A do
    // repositório é a autoridade operativa.
    // 52 → 62 com as DEZ da M44 (oito de Subscription + duas de reentrada). O Blueprint §11 as
    // lista antes, e é ele que este número persegue.
    // 62 → 65 com as TRÊS da M45.4: `ARG-01` e `ANL-01` eram as únicas superfícies REAL sem
    // nome invocável, e o gate 2 mede nome, não cobertura.
    expect(CATALOGO.length, "o catálogo divergiu do Blueprint").toBe(65);
  });

  it("60 disponíveis · 3 parciais · 2 bloqueados", () => {
    // Duas mudanças distintas, e os números as separam. A BD02 moveu `instance-empty` de
    // bloqueado para disponível sem alterar o TOTAL — nada nasceu nem morreu. A M36 acrescentou
    // `instance-present` e `instance-history` e o Checkpoint 0 da M37 acrescentou
    // `instance-new-analysis`, e aí o total SOBE: 32 → 34 → 35, 28 → 30 → 31. Conferir os três
    // juntos é o que distingue "mudou de estado" de "entrou no catálogo".
    //
    // A M39 acrescentou os dois v3 da comparação: 35 → 37, 31 → 33. Também é entrada, não
    // mudança de estado — e por isso o total e os disponíveis sobem juntos.
    //
    // A M40 fez as DUAS coisas ao mesmo tempo, e por isso os números precisam ser lidos juntos:
    // `no-baseline` mudou de ESTADO (a BD10 publicou o produtor que faltava), e `baseline-set` +
    // `baseline-no-candidates` ENTRARAM. Total 37 → 39; disponíveis 33 → 36 (+2 novos, +1
    // desbloqueado); bloqueados 3 → 2. `baseline-active` fica, porque exige exclusão pública.
    //
    // A M41 acrescentou CINCO, todos disponíveis, e nenhum mudou de estado: 39 → 44, 36 → 41.
    // A M42 acrescentou OITO, também todos disponíveis — quatro de CFG-03 e quatro de CFG-04:
    // 44 → 52, 41 → 49. Os bloqueados e o parcial não se mexeram: a M42 materializa massa para
    // produtor que JÁ existe (BD12 e BD13), e não desbloqueia nada.
    // Total e disponíveis sobem juntos, e os bloqueados não se movem — é a assinatura de
    // "entrou no catálogo", distinta de "mudou de estado".
    //
    // A M44 acrescentou DEZ e é a primeira em que os PARCIAIS se movem: 52 → 62, 49 → 57,
    // parciais 1 → 3. As oito de Subscription são disponíveis; as duas de reentrada nascem
    // PARCIAIS, e por um motivo que não é falta de massa — não existe operação pública que
    // devolva evento ao Front, então o cenário serve a Analysis de destino e o evento fica
    // como fixture. Marcá-las `disponivel` prometeria um seam que não existe.
    expect(nomesPorEstado("disponivel").length).toBe(60);
    expect(nomesPorEstado("parcial").length).toBe(3);
    expect(nomesPorEstado("bloqueado").length).toBe(2);
  });

  it("o desbloqueio da BD02 foi de ESTADO, não de composição do catálogo", () => {
    // A prova de que o checkpoint foi administrativo: `instance-empty` continua existindo, com
    // a mesma superfície, e os que continuam bloqueados são exatamente os outros três.
    const alvo = CATALOGO.find((c) => c.id === "instance-empty");
    expect(alvo, "o cenário sumiu do catálogo").toBeTruthy();
    expect(alvo!.superficies).toEqual(["INST-01"]);
    expect(alvo!.estado).toBe("disponivel");
    expect(new Set(nomesPorEstado("bloqueado"))).toEqual(
      // `no-baseline` saiu na M40 — mesma mecânica: a BD10 publicou o produtor que faltava.
      new Set(["recommendation-persisted", "baseline-active"]),
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

  it("`instance-present`: list e get devolvem a MESMA identidade, e só campos publicados", async () => {
    // O deep link chega sabendo apenas o `instance_id`. Se `get` devolvesse outra identidade que
    // a `list`, o refresh mostraria uma Instance e a navegação outra — e nenhum dos dois erraria
    // sozinho.
    const hs = handlersDoScenario("instance-present", BASE);
    const lista = await servir(hs, `${BASE}/v1/instances`);
    const um = await servir(hs, `${BASE}/v1/instances/${lista.items[0].instance_id}`);
    expect(lista.next_cursor).toBeNull();
    expect(um.instance_id).toBe(lista.items[0].instance_id);
    // Nada além do publicado: `instance_read_model_fields` sao exatamente estes tres.
    for (const corpo of [lista.items[0], um]) {
      expect(Object.keys(corpo).sort()).toEqual(["created_at", "instance_id", "name"]);
    }
  });

  it("`instance-history`: os itens pertencem à Instance, e o filtro é EXIGIDO", async () => {
    const hs = handlersDoScenario("instance-history", BASE);
    const inst = (await servir(hs, `${BASE}/v1/instances`)).items[0].instance_id;

    const p1 = await servir(hs, `${BASE}/v1/analyses?instance_id=${inst}`);
    expect(p1.items.length).toBeGreaterThan(0);
    for (const it of p1.items) expect(it.instance_id).toBe(inst);
    expect(p1.next_cursor, "sem 2ª página não se prova travessia").toBeTruthy();

    // Sem o filtro, o histórico não existe. Um mock que devolvesse a lista geral aqui deixaria
    // passar um Front que esqueceu de enviar o `instance_id`.
    const semFiltro = await servir(hs, `${BASE}/v1/analyses`);
    expect(semFiltro.items).toEqual([]);
  });

  it("`instance-history`: a 2ª página fecha a travessia sem repetir nem perder", async () => {
    const hs = handlersDoScenario("instance-history", BASE);
    const inst = (await servir(hs, `${BASE}/v1/instances`)).items[0].instance_id;
    const p1 = await servir(hs, `${BASE}/v1/analyses?instance_id=${inst}`);
    const p2 = await servir(hs, `${BASE}/v1/analyses?instance_id=${inst}&cursor=${p1.next_cursor}`);
    const ids = [...p1.items, ...p2.items].map((x: { analysis_id: string }) => x.analysis_id);
    expect(p2.next_cursor, "a travessia não termina").toBeNull();
    expect(new Set(ids).size, "a paginação repetiu").toBe(ids.length);
  });

  it("`instance-empty` continua VAZIO e distinto do populado", async () => {
    const vazio = await servir(handlersDoScenario("instance-empty", BASE), `${BASE}/v1/instances`);
    expect(vazio).toEqual({ items: [], next_cursor: null });
  });

  it("nenhum scenario de Instance publica campo que o contrato não tem", async () => {
    // A trava contra o mock crescer com `status`/`health`/contador — que e a mesma razao pela
    // qual INST-02 nao tem scenario.
    const proibidos = ["status", "health", "description", "tags", "slug", "updated_at", "count"];
    for (const nome of ["instance-present", "instance-history"]) {
      const corpo = await servir(handlersDoScenario(nome, BASE), `${BASE}/v1/instances`);
      for (const chave of Object.keys(corpo.items[0] ?? {})) {
        expect(proibidos, `${nome} publica \`${chave}\``).not.toContain(chave);
      }
    }
  });

  it("INST-02 continua SEM scenario — e isso é registrado, não esquecido", () => {
    const comInst02 = CATALOGO.filter((c) => c.superficies.includes("INST-02"));
    expect(comInst02, "INST-02 ganhou massa sem produtor de estado corrente").toEqual([]);
    expect(BLUEPRINT).toContain("DELTA DECLARADO — sem produtor de estado corrente");
  });

  it("INST-07 também fica SEM scenario, e pela MESMA classe de razão", () => {
    // A M37 nasceu no PLAN como "INST-04/07". A 07 saiu no Checkpoint 0 porque o contrato não tem
    // operação de configuração — nem `update`, nem `PATCH`, nem `delete` —, e o D22 depende da
    // BD04. Sem esta trava, a próxima pessoa acrescenta `instance-config` para "destravar a tela"
    // e o delta some do mapa.
    expect(
      CATALOGO.filter((c) => c.superficies.includes("INST-07")),
      "INST-07 ganhou massa sem produtor de configuração",
    ).toEqual([]);
    expect(BLUEPRINT).toContain("DELTA DECLARADO — sem produtor de configuração");
    // E o motivo declarado é falta de PRODUTOR, não atraso de cronograma: a distinção é o que
    // impede a superfície de ser reagendada como se fosse só uma missão que não coube.
    // Âncora por SUBSTÂNCIA, não pela frase exata: a lista cresceu quando a M39 declarou
    // INST-06 também sem produtor, e uma âncora literal teria caído por motivo errado — o
    // fato que este caso protege é que INST-07 falta PRODUTOR, não que a frase seja aquela.
    expect(BLUEPRINT).toMatch(/INST-07.*são falta de PRODUTOR/);
  });

  it("`instance-new-analysis`: o prepare leva EXATAMENTE o `instance_id` da tela", async () => {
    // INST-04 é o fluxo canônico recebendo contexto — e a associação não volta na resposta do
    // prepare (`{analysis_id, status}`). Ela só aparece no status, que é onde este caso a lê.
    const hs = handlersDoScenario("instance-new-analysis", BASE);
    const lista = await servir(hs, `${BASE}/v1/instances`);
    const alvo = lista.items[0].instance_id;
    expect(lista.items.length, "com uma só Instance, a errada é indistinguível da certa").toBe(2);

    const handle = await servirPost(hs, `${BASE}/v1/analyses?workspace_id=w-1&instance_id=${alvo}`);
    expect(handle.analysis_id, "o prepare não devolveu identidade").toBeTruthy();
    const st = await servir(hs, `${BASE}/v1/analyses/${handle.analysis_id}`);
    expect(st.instance_id, "a análise nasceu sem a Instância que a originou").toBe(alvo);
  });

  it("`instance-new-analysis`: mandar a OUTRA Instância é detectável", async () => {
    // A mutação óbvia — enviar um `instance_id` qualquer, ou o primeiro da lista em vez do da
    // rota — passaria em qualquer asserção de "enviou alguma coisa".
    const hs = handlersDoScenario("instance-new-analysis", BASE);
    const lista = await servir(hs, `${BASE}/v1/instances`);
    const [uma, outra] = lista.items.map((x: { instance_id: string }) => x.instance_id);
    const h = await servirPost(hs, `${BASE}/v1/analyses?instance_id=${outra}`);
    const st = await servir(hs, `${BASE}/v1/analyses/${h.analysis_id}`);
    expect(st.instance_id).toBe(outra);
    expect(st.instance_id, "o mock responde a mesma coisa para Instâncias diferentes").not.toBe(uma);
  });

  it("`instance-new-analysis`: preparar SEM Instância continua válido — e visivelmente solto", async () => {
    // O produtor real aceita a ausência: `instance_id` é query param OPCIONAL e ADITIVO, e é o
    // caminho de toda análise fora de Instância. Um mock que devolvesse 4xx aqui ensinaria ao
    // Front que o campo é obrigatório — mentira sobre o contrato. A detecção é o `null` no
    // status, não um erro.
    const hs = handlersDoScenario("instance-new-analysis", BASE);
    const h = await servirPost(hs, `${BASE}/v1/analyses?workspace_id=w-1`);
    expect(h.analysis_id, "a ausência de Instância virou erro").toBeTruthy();
    const st = await servir(hs, `${BASE}/v1/analyses/${h.analysis_id}`);
    expect(st.instance_id, "sem contexto, a análise tem de aparecer SOLTA").toBeNull();
  });

  it("`instance-new-analysis`: o campo é lido da QUERY, como no Gateway real", async () => {
    // `prepare_analysis` @ ac81633 declara `instance_id: Annotated[str | None, Query()]`. Um mock
    // que o aceitasse no corpo deixaria passar um Front que envia no lugar errado, e o defeito só
    // apareceria contra o Gateway de verdade.
    const hs = handlersDoScenario("instance-new-analysis", BASE);
    const inst = (await servir(hs, `${BASE}/v1/instances`)).items[0].instance_id;
    const pedido = new Request(`${BASE}/v1/analyses`, {
      method: "POST",
      body: JSON.stringify({ instance_id: inst }),
      headers: { "content-type": "application/json" },
    });
    for (const h of hs) await h.run({ request: pedido, requestId: "t", cookies: {} } as never);
    const st = await servir(hs, `${BASE}/v1/analyses/an-abc`);
    expect(st.instance_id, "o mock aceitou o `instance_id` pelo CORPO").toBeNull();
  });

  it("a memória do scenario não vaza entre invocações", async () => {
    // Cada `handlersDoScenario()` nasce sem contexto. Sem isto, um teste herdaria o `instance_id`
    // que o anterior enviou e passaria sem mandar nada.
    const primeiro = handlersDoScenario("instance-new-analysis", BASE);
    const inst = (await servir(primeiro, `${BASE}/v1/instances`)).items[0].instance_id;
    await servirPost(primeiro, `${BASE}/v1/analyses?instance_id=${inst}`);

    const segundo = handlersDoScenario("instance-new-analysis", BASE);
    const st = await servir(segundo, `${BASE}/v1/analyses/an-abc`);
    expect(st.instance_id, "a segunda invocação herdou o contexto da primeira").toBeNull();
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
    // Piso do INSTRUMENTO, não do catálogo: se o regex parar de casar a tabela, o filtro
    // abaixo roda sobre lista vazia e passa sempre. 44 → 52 com as oito entradas da M42, e
    // 52 → 62 com as dez da M44.
    expect(doMapa.length, "não consegui ler a tabela §11 do Blueprint").toBe(65);
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
      // A razão do `baseline-active` deixou de poder dizer só "baseline": o baseline existe. Ela
      // precisa nomear o que AINDA falta — exclusão pública de Analysis (B10 → BD06) —, senão a
      // recusa vira genérica sobre uma ausência que acabou.
      "baseline-active": /exclus.*(B10|BD06)|(B10|BD06).*exclus/is,
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
