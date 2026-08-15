// M44 · COMMUNICATION + REENTRY — os gates da materialização de cenários.
//
// ## Por que `fetch` cru, e não um cliente
//
// A M44 **não tem cliente**, e criá-lo aqui seria implementar a missão seguinte dentro do
// checkpoint que a proíbe. As quatro operações continuam declaradas em `SEM_CLIENTE_NO_FRONT`, e
// é assim que devem terminar esta missão. O que se prova aqui é a MASSA e o CENÁRIO: que o
// scenario oficial representa o produtor, e que uma implementação errada seria observavelmente
// errada quando ela existir.
//
// ## O que estes gates protegem
//
// O eixo da M44 é uma distinção que colapsa fácil: **ausência não é indisponibilidade**. Zero
// destinatário configurado e "não consegui perguntar ao dono" produzem telas opostas, e
// normalizar os dois para `null` — que é o atalho natural de qualquer camada de dados — faria o
// produto dizer "você ainda não configurou" no dia em que o Dispatcher caísse.
//
// O segundo eixo é de PROPRIEDADE: `destination` e `language` são intenção explícita da
// assinatura, e há duas fontes plausíveis e erradas a um passo de distância (o e-mail da conta e
// a preferência de idioma da conta). A massa é hostil justamente para que usá-las falhe.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { handlersDoScenario, scenario, CATALOGO } from "@/mocks/scenarios";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import {
  ASSINATURA_ATIVA,
  DESTINO_CONFIGURADO,
  EMAIL_DA_CONTA,
  EVENTO_CONCLUIDA,
  EVENTO_CONCLUIDA_SEM_RESULTADO,
  EVENTO_FALHADA,
  IDIOMA_DA_ASSINATURA,
  IDIOMA_DA_CONTA,
  NUNCA_PUBLICOS,
  SUB_ATIVA,
  SUB_DESATIVADA,
  SUB_DO_VIZINHO,
  SUB_NAO_VERIFICADA,
  WS_PRINCIPAL,
  WS_VIZINHO,
  linkDaMensagem,
  type SubscriptionView,
} from "@/test/fixtures/public-v1/subscriptions";

setupMsw();

const RAIZ = resolve(__dirname, "../../..");
const cenario = (nome: string) => server.use(...handlersDoScenario(nome, MSW_BASE));

const FONTE_DOS_CENARIOS = readFileSync(
  resolve(RAIZ, "src/mocks/scenarios/assinaturas.ts"),
  "utf-8",
);
const FONTE_DA_MASSA = readFileSync(
  resolve(RAIZ, "src/test/fixtures/public-v1/subscriptions.ts"),
  "utf-8",
);

/**
 * Remove comentários antes de medir. Um cadeado que lê a prosa mede a EXPLICAÇÃO: metade destes
 * gates procura literais como `/v1/me` e `result_available`, e os comentários deste repo os citam
 * o tempo todo para explicar por que NÃO são usados.
 */
function semComentarios(fonte: string): string {
  return (
    fonte
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      // O `//` de um comentário nunca vem precedido de `:`. Sem esta ressalva o stripper come
      // `http://localhost:8081/internal/v1/...` a partir das duas barras — e o gate que procura
      // interno vazado passa a medir `destination: "http:`, verde sobre a evidência que ele
      // mesmo destruiu. Foi a mutação 18 que expôs isso: ela sobreviveu por defeito do
      // instrumento, não por falta de gate.
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
  );
}

/**
 * A massa, SEM a declaração `NUNCA_PUBLICOS`.
 *
 * Essa lista existe para NOMEAR o que não pode vazar — `lease_token`, `stack_trace`, `object_key`.
 * Um gate que varra o arquivo inteiro procurando esses termos encontra a própria declaração e
 * acusa vazamento onde há justamente a defesa contra ele. Foi o que aconteceu na primeira
 * execução: duas falhas, uma causa, e nenhuma delas no código medido.
 *
 * O recorte é asserido: se a âncora sumir, o `slice` devolveria o arquivo inteiro e o gate
 * voltaria a se acusar sozinho.
 */
function massaSemListaDeProibidos(): string {
  const limpa = semComentarios(FONTE_DA_MASSA);
  const inicio = limpa.indexOf("export const NUNCA_PUBLICOS");
  expect(inicio, "âncora `NUNCA_PUBLICOS` sumiu da massa").toBeGreaterThan(-1);
  const fim = limpa.indexOf("] as const;", inicio);
  expect(fim, "fim da declaração `NUNCA_PUBLICOS` não encontrado").toBeGreaterThan(inicio);
  const recortada = limpa.slice(0, inicio) + limpa.slice(fim + "] as const;".length);
  expect(
    recortada.length,
    "o recorte não removeu nada — o gate mediria a lista de proibidos de novo",
  ).toBeLessThan(limpa.length);
  return recortada;
}

/** Todo o módulo de cenários da M44 — handlers e entradas do catálogo. */
function fonteDaM44(): string {
  const limpa = semComentarios(FONTE_DOS_CENARIOS);
  const inicio = limpa.indexOf("function assinaturaHandlers");
  expect(inicio, "âncora `assinaturaHandlers` sumiu — este gate mediria o arquivo errado")
    .toBeGreaterThan(-1);
  return limpa.slice(inicio);
}

/**
 * SÓ o corpo de `assinaturaHandlers`, sem as entradas do catálogo que vêm depois.
 *
 * A distinção é o que separa "o helper lê identidade" de "existe um cenário que serve
 * identidade". O segundo é legítimo e necessário — `subscription-destination-diverges` precisa
 * responder `/v1/me` para a armadilha existir. O primeiro é o defeito.
 *
 * O recorte é fechado dos DOIS lados, e as duas âncoras são asseridas. A primeira versão fechava
 * em `function instanceHandlers`, que vivia no `catalogo.ts`; quando este módulo foi extraído, a
 * âncora deixou de existir, `indexOf` devolveu `-1`, e o `slice(inicio, -1)` passou a engolir o
 * arquivo quase inteiro — inclusive os cenários que servem `/v1/me` de propósito. O gate acusou
 * o helper por causa de código que não é dele.
 *
 * O guarda que eu tinha (`length > 200`) não pegou: ele protegia contra recorte VAZIO, e o
 * defeito era recorte LARGO DEMAIS. Por isso agora o fim é asserido, e não só o começo.
 */
function corpoDoHelper(): string {
  const modulo = fonteDaM44();
  const fim = modulo.indexOf("export const CENARIOS_DE_COMUNICACAO");
  expect(fim, "âncora de fim do helper sumiu — o recorte voltaria a medir o módulo inteiro")
    .toBeGreaterThan(0);
  const corpo = modulo.slice(0, fim);
  expect(corpo.length, "recorte do helper ficou vazio").toBeGreaterThan(200);
  expect(corpo.length, "recorte do helper não excluiu os cenários").toBeLessThan(modulo.length);
  return corpo;
}

const listar = (ws: string) =>
  fetch(`${MSW_BASE}/v1/subscriptions?workspace_id=${encodeURIComponent(ws)}`);

const desativar = (ws: string, id: string) =>
  fetch(`${MSW_BASE}/v1/subscriptions/${id}?workspace_id=${encodeURIComponent(ws)}`, {
    method: "DELETE",
  });

const criar = (ws: string, corpo: Record<string, unknown>) =>
  fetch(`${MSW_BASE}/v1/subscriptions?workspace_id=${encodeURIComponent(ws)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });

const rotacionar = (ws: string, id: string) =>
  fetch(`${MSW_BASE}/v1/subscriptions/${id}/secret?workspace_id=${encodeURIComponent(ws)}`, {
    method: "POST",
  });

async function itens(ws: string): Promise<SubscriptionView[]> {
  const r = await listar(ws);
  expect(r.status, `esperava 200 ao listar ${ws}`).toBe(200);
  return ((await r.json()) as { items: SubscriptionView[] }).items;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// SG · SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M44 · SG · Subscription", () => {
  it("SG1 · ausência é `items: []` com 200 — estado legítimo, não erro", async () => {
    cenario("subscription-absent");
    const r = await listar(WS_PRINCIPAL);

    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { items: unknown[] };
    // A CHAVE existe e é um array vazio. `null`, `undefined` ou ausência da chave obrigariam o
    // cliente a distinguir "não veio" de "não tem" — e é essa confusão que gera a tela errada.
    expect(Array.isArray(corpo.items)).toBe(true);
    expect(corpo.items).toHaveLength(0);
  });

  it("SG2 · `GET` não cria: dez leituras seguidas continuam vazias", async () => {
    cenario("subscription-absent");
    for (let i = 0; i < 10; i += 1) {
      expect(await itens(WS_PRINCIPAL), `leitura ${i + 1} deixou de ser vazia`).toHaveLength(0);
    }
  });

  it("SG3 · outage NÃO é ausência: 503 com problem, e nunca lista vazia", async () => {
    cenario("subscription-unavailable");
    const r = await listar(WS_PRINCIPAL);

    expect(r.status).toBe(503);
    const corpo = (await r.json()) as { code?: string; items?: unknown };
    expect(corpo.code).toBe("temporarily_unavailable");
    // O que separa outage de ausência: NÃO existe `items` aqui. Um handler que devolvesse
    // `{ items: [] }` com 503 deixaria a camada de dados normalizar as duas para a mesma coisa.
    expect(corpo.items, "outage não pode trazer `items` — isso o faria colapsar em ausência")
      .toBeUndefined();

    // E a escrita cai junto: o dono está fora, não seletivamente fora.
    expect((await criar(WS_PRINCIPAL, { channel: "email", destination: "x@y.test", event_types: ["analysis.failed"] })).status).toBe(503);
    expect((await desativar(WS_PRINCIPAL, SUB_ATIVA)).status).toBe(503);
    expect((await rotacionar(WS_PRINCIPAL, SUB_ATIVA)).status).toBe(503);
  });

  it("SG4 · `destination` vem da assinatura, e é o da massa", async () => {
    cenario("subscription-destination-diverges");
    const lista = await itens(WS_PRINCIPAL);

    // ÂNCORA POSITIVA antes da negativa: sem uma assinatura de verdade, "não contém o e-mail da
    // conta" seria verdade sobre uma lista vazia.
    expect(lista.length).toBeGreaterThan(0);
    expect(lista[0].destination).toBe(DESTINO_CONFIGURADO);
  });

  it("SG5 · o e-mail da CONTA não vence o destination — nem aparece", async () => {
    cenario("subscription-destination-diverges");

    // A conta responde 200 e carrega o e-mail: a divergência existe nesta sessão.
    const eu = await fetch(`${MSW_BASE}/v1/me`);
    expect(eu.status).toBe(200);
    expect(JSON.stringify(await eu.json())).toContain(EMAIL_DA_CONTA);

    const lista = await itens(WS_PRINCIPAL);
    expect(lista.length).toBeGreaterThan(0);
    for (const s of lista) {
      expect(s.destination, "o e-mail de login virou destinatário").not.toBe(EMAIL_DA_CONTA);
    }
  });

  it("SG6 · `language` da assinatura é independente", async () => {
    cenario("subscription-language-diverges");
    const lista = await itens(WS_PRINCIPAL);

    expect(lista.length).toBeGreaterThan(0);
    expect(lista[0].language).toBe(IDIOMA_DA_ASSINATURA);
    expect(IDIOMA_DA_ASSINATURA).not.toBe(IDIOMA_DA_CONTA);
  });

  it("SG7 · a preferência da CONTA não vence o idioma da entrega", async () => {
    cenario("subscription-language-diverges");

    const pref = await fetch(`${MSW_BASE}/v1/me/language`);
    expect(pref.status).toBe(200);
    expect((await pref.json()) as { effective_language: string }).toMatchObject({
      effective_language: IDIOMA_DA_CONTA,
    });

    const lista = await itens(WS_PRINCIPAL);
    expect(lista[0].language).not.toBe(IDIOMA_DA_CONTA);
  });

  it("SG8 · o escopo é o `workspace_id` da QUERY, em toda operação", async () => {
    cenario("subscription-other-workspace");

    expect((await itens(WS_PRINCIPAL)).map((s) => s.subscription_id)).toEqual([
      SUB_ATIVA,
      SUB_NAO_VERIFICADA,
    ]);
    expect((await itens(WS_VIZINHO)).map((s) => s.subscription_id)).toEqual([SUB_DO_VIZINHO]);
  });

  it("SG9 · isolamento: B não vê nem desativa a assinatura de A", async () => {
    cenario("subscription-other-workspace");

    const doVizinho = await itens(WS_VIZINHO);
    expect(doVizinho.map((s) => s.subscription_id)).not.toContain(SUB_ATIVA);

    // Tentar desativar a de A declarando o escopo de B colapsa no anti-oracle — e, o que importa
    // mais, NÃO tem efeito: a assinatura de A continua ativa.
    expect((await desativar(WS_VIZINHO, SUB_ATIVA)).status).toBe(404);
    const deA = await itens(WS_PRINCIPAL);
    expect(deA.find((s) => s.subscription_id === SUB_ATIVA)?.active).toBe(true);
  });

  it("SG10 · desativada CONTINUA existindo — disable não é delete", async () => {
    cenario("subscription-current");

    const antes = await itens(WS_PRINCIPAL);
    expect(antes).toHaveLength(2);

    const r = await desativar(WS_PRINCIPAL, SUB_ATIVA);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ subscription_id: SUB_ATIVA, active: false });

    const depois = await itens(WS_PRINCIPAL);
    // MESMA cardinalidade: a linha não sumiu.
    expect(depois).toHaveLength(2);
    expect(depois.find((s) => s.subscription_id === SUB_ATIVA)?.active).toBe(false);

    // E não reativa: desativar de novo colapsa no anti-oracle, como no owner.
    expect((await desativar(WS_PRINCIPAL, SUB_ATIVA)).status).toBe(404);
  });

  it("SG11 · nenhum cenário de inbox / notification center", () => {
    const proibidos = /inbox|notification-?center|unread|mensagens-lidas|messages-list/i;
    for (const s of CATALOGO) {
      expect(s.id, `cenário de inbox no catálogo: ${s.id}`).not.toMatch(proibidos);
    }
    expect(semComentarios(FONTE_DOS_CENARIOS)).not.toMatch(proibidos);
  });

  it("SG12 · nenhuma configuração genérica de notificação, e nenhum interno do Dispatcher", () => {
    const fonte = fonteDaM44() + massaSemListaDeProibidos();
    for (const termo of [
      "notification_settings",
      "notificationSettings",
      "smtp",
      "dead_letter",
      "deadLetter",
      "attempt_number",
      "hmac",
      "retry_queue",
      "lease_token",
      "s2s",
      "internal/v1",
    ]) {
      expect(fonte.toLowerCase(), `interno/genérico vazou na massa M44: ${termo}`)
        .not.toContain(termo.toLowerCase());
    }
  });

  it("SG20 · o ciclo de vida servido é SÓ o público: nada de verify, update ou get-by-id", () => {
    const fonte = fonteDaM44();
    // Positivo primeiro — as quatro operações reais existem.
    expect(fonte).toContain("http.get(`${b}/v1/subscriptions`");
    expect(fonte).toContain("http.post(`${b}/v1/subscriptions`");
    expect(fonte).toContain("http.delete(`${b}/v1/subscriptions/:subscriptionId`");
    expect(fonte).toContain("http.post(`${b}/v1/subscriptions/:subscriptionId/secret`");
    // E nenhuma inventada.
    expect(fonte, "`PATCH` de assinatura não existe no contrato").not.toContain(
      "http.patch(`${b}/v1/subscriptions",
    );
    expect(fonte, "`PUT` de assinatura não existe no contrato").not.toContain(
      "http.put(`${b}/v1/subscriptions",
    );
    expect(fonte, "não há leitura de UMA assinatura por id").not.toContain(
      "http.get(`${b}/v1/subscriptions/:subscriptionId`",
    );
    expect(fonte, "verificar não é operação pública").not.toMatch(/\/verify|\/verificar|otp/i);
  });

  it("SG13 · criar é ação EXPLÍCITA, e recusa `workspace_id` no corpo", async () => {
    cenario("subscription-absent");
    expect(await itens(WS_PRINCIPAL)).toHaveLength(0);

    const recusado = await criar(WS_PRINCIPAL, {
      channel: "email",
      destination: DESTINO_CONFIGURADO,
      event_types: ["analysis.completed"],
      workspace_id: WS_PRINCIPAL,
    });
    expect(recusado.status, "corpo com `workspace_id` tem de ser recusado").toBe(400);
    expect(await itens(WS_PRINCIPAL), "a recusa não pode ter criado nada").toHaveLength(0);

    const ok = await criar(WS_PRINCIPAL, {
      channel: "email",
      destination: DESTINO_CONFIGURADO,
      event_types: ["analysis.completed"],
    });
    expect(ok.status).toBe(201);
    // A forma literal de `create`: o segredo sai uma vez, e é `null` para e-mail — com a CHAVE
    // presente, para o cliente não ter de distinguir "não veio" de "não tem".
    const criada = (await ok.json()) as Record<string, unknown>;
    expect(Object.keys(criada).sort()).toEqual(["secret", "secret_version", "subscription_id"]);
    expect(criada.secret).toBeNull();

    const depois = await itens(WS_PRINCIPAL);
    expect(depois).toHaveLength(1);
    expect(depois[0].destination).toBe(DESTINO_CONFIGURADO);
    // Nasce NÃO verificada: verificação é consequência de entrega.
    expect(depois[0].verified_at).toBeNull();
  });

  it("SG14 · rotate preserva a identidade e sobe a versão", async () => {
    cenario("subscription-current");
    const antes = (await itens(WS_PRINCIPAL)).find((s) => s.subscription_id === SUB_NAO_VERIFICADA);
    expect(antes?.channel).toBe("webhook");

    const r = await rotacionar(WS_PRINCIPAL, SUB_NAO_VERIFICADA);
    expect(r.status).toBe(200);
    const nova = (await r.json()) as { subscription_id: string; secret_version: number };
    // MESMA identidade — rotação não é apagar e recriar.
    expect(nova.subscription_id).toBe(SUB_NAO_VERIFICADA);
    expect(nova.secret_version).toBe((antes?.secret_version ?? 0) + 1);

    // E-mail não tem segredo: rotacionar é recusa do domínio, não sucesso vazio.
    expect((await rotacionar(WS_PRINCIPAL, SUB_ATIVA)).status).toBe(400);
  });

  it("SG15 · cada invocação começa no estado canônico — uma transição não contamina a outra", async () => {
    cenario("subscription-current");
    expect((await itens(WS_PRINCIPAL)).find((s) => s.subscription_id === SUB_ATIVA)?.active).toBe(true);
    expect((await desativar(WS_PRINCIPAL, SUB_ATIVA)).status).toBe(200);
    expect((await itens(WS_PRINCIPAL)).find((s) => s.subscription_id === SUB_ATIVA)?.active).toBe(false);

    // Novo `handlersDoScenario` → estado novo. Sem isto, a ordem dos testes decidiria o resultado.
    cenario("subscription-current");
    expect(
      (await itens(WS_PRINCIPAL)).find((s) => s.subscription_id === SUB_ATIVA)?.active,
      "a transição do bloco anterior vazou para esta invocação",
    ).toBe(true);
  });

  it("SG16 · a massa `disabled` existe e é servida como existente", async () => {
    cenario("subscription-disabled");
    const lista = await itens(WS_PRINCIPAL);
    expect(lista).toHaveLength(1);
    expect(lista[0].subscription_id).toBe(SUB_DESATIVADA);
    expect(lista[0].active).toBe(false);
  });

  it("SG17 · invisível preserva o anti-oracle: mesma resposta para três causas", async () => {
    cenario("subscription-invisible");
    // Lista vazia — o workspace pode não ter nada OU não ser visível, e a resposta não diz qual.
    expect(await itens(WS_PRINCIPAL)).toHaveLength(0);

    for (const r of [
      await desativar(WS_PRINCIPAL, SUB_ATIVA),
      await rotacionar(WS_PRINCIPAL, SUB_ATIVA),
    ]) {
      expect(r.status).toBe(404);
      const corpo = (await r.json()) as { code: string; detail?: string };
      expect(corpo.code).toBe("forbidden_or_not_found");
      expect(
        JSON.stringify(corpo).toLowerCase(),
        "a resposta revelou qual das três causas ocorreu",
      ).not.toMatch(/permiss|forbidden_because|does not exist|outro workspace/);
    }
  });

  it("SG18 · `event_types` é filtro real, e não `todos`", async () => {
    cenario("subscription-current");
    const lista = await itens(WS_PRINCIPAL);

    const ativa = lista.find((s) => s.subscription_id === SUB_ATIVA);
    expect(ativa?.event_types).toEqual(["analysis.completed", "analysis.failed"]);
    // O terceiro evento notificável por e-mail fica de FORA — é o que torna "quais eventos esta
    // assinatura recebe" uma pergunta com resposta observável.
    expect(ativa?.event_types).not.toContain("result.available");

    const outra = lista.find((s) => s.subscription_id === SUB_NAO_VERIFICADA);
    expect(outra?.event_types).toEqual(["analysis.failed"]);
  });

  it("SG19 · nenhum tipo de evento inventado: só os do contrato de eventos", () => {
    const CONTRATADOS = new Set([
      "analysis.created",
      "analysis.data_received",
      "analysis.queued",
      "analysis.started",
      "analysis.recovering",
      "analysis.completed",
      "analysis.failed",
      "result.available",
    ]);
    const naMassa = new Set(
      [...semComentarios(FONTE_DA_MASSA).matchAll(/"((?:analysis|result)\.[a-z_]+)"/g)].map(
        (m) => m[1],
      ),
    );
    expect(naMassa.size, "nenhum tipo de evento na massa — o laço abaixo seria vazio")
      .toBeGreaterThan(0);
    for (const t of naMassa) {
      expect(CONTRATADOS.has(t), `tipo de evento inventado: ${t}`).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// RG · REENTRADA
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M44 · RG · reentrada", () => {
  it("RG1 · `analysis.completed` leva a `/analyses/{id}`", () => {
    const link = linkDaMensagem(EVENTO_CONCLUIDA.analysis_id);
    expect(link).toBe(`https://app.sentinela.test/analyses/${EVENTO_CONCLUIDA.analysis_id}`);
  });

  it("RG2 · `analysis.failed` leva a `/analyses/{id}` — o MESMO formato", () => {
    const link = linkDaMensagem(EVENTO_FALHADA.analysis_id);
    expect(link).toBe(`https://app.sentinela.test/analyses/${EVENTO_FALHADA.analysis_id}`);
    // O compositor não tem ramo por tipo de evento: os dois links diferem só no id.
    expect(link.replace(EVENTO_FALHADA.analysis_id, "X")).toBe(
      linkDaMensagem(EVENTO_CONCLUIDA.analysis_id).replace(EVENTO_CONCLUIDA.analysis_id, "X"),
    );
  });

  it("RG3 · `/canonical` nunca é destino de mensagem", () => {
    for (const e of [EVENTO_CONCLUIDA, EVENTO_FALHADA, EVENTO_CONCLUIDA_SEM_RESULTADO]) {
      expect(linkDaMensagem(e.analysis_id)).not.toContain("/canonical");
    }
    expect(semComentarios(FONTE_DA_MASSA), "`/canonical` apareceu na massa de comunicação")
      .not.toContain("/canonical");
  });

  it("RG4 · `/result` não é destino primário", () => {
    for (const e of [EVENTO_CONCLUIDA, EVENTO_FALHADA, EVENTO_CONCLUIDA_SEM_RESULTADO]) {
      const link = linkDaMensagem(e.analysis_id);
      // Termina no id. Um sufixo `/result` mudaria a superfície de destino sem authority — e o
      // Blueprint §12 dizia isso até esta missão medir o compositor.
      expect(link.endsWith(e.analysis_id), `link não termina no analysis_id: ${link}`).toBe(true);
      expect(link).not.toContain("/result");
    }
  });

  it("RG5/RG6 · reentrada não cria Analysis nem toca Instance", async () => {
    cenario("communication-completed-reentry");
    const pedidos: { metodo: string; url: string }[] = [];
    server.events.on("request:start", ({ request }) => {
      pedidos.push({ metodo: request.method, url: request.url });
    });

    const r = await fetch(`${MSW_BASE}/v1/analyses/${EVENTO_CONCLUIDA.analysis_id}`);
    expect(r.status).toBe(200);

    expect(pedidos.length, "nenhuma requisição observada — as negativas abaixo seriam triviais")
      .toBeGreaterThan(0);
    for (const p of pedidos) {
      expect(p.metodo, `reentrada emitiu ${p.metodo} ${p.url}`).toBe("GET");
    }
    expect(pedidos.some((p) => p.url.includes("/v1/instances"))).toBe(false);
    expect(pedidos.some((p) => p.url.includes("/baseline"))).toBe(false);

    // E o gate ESTRUTURAL, porque o de tráfego sozinho é cego aqui: acrescentar um
    // `http.post` ao cenário de reentrada não faz teste nenhum emitir `POST`, então a mutação
    // sobrevive sendo inerte — e uma capacidade de escrita declarada num cenário de reentrada é
    // exatamente o que não pode existir, mesmo sem chamador. A primeira tela que a usar herda o
    // defeito pronto.
    const bloco = fonteDaM44();
    const inicio = bloco.indexOf('id: "communication-completed-reentry"');
    expect(inicio, "âncora do cenário de reentrada sumiu").toBeGreaterThan(-1);
    const reentrada = bloco.slice(inicio);
    expect(reentrada.length).toBeGreaterThan(100);
    for (const escrita of ["http.post(", "http.put(", "http.patch(", "http.delete("]) {
      expect(reentrada, `cenário de reentrada declara escrita: ${escrita}`).not.toContain(escrita);
    }
  });

  it("RG7 · anti-oracle na Analysis de destino", async () => {
    // Um deep link para Analysis que o backend colapsa: o cenário oficial `not-found` já
    // representa isso, e a reentrada não pode aprender a distinguir o que o backend esconde.
    cenario("not-found");
    const r = await fetch(`${MSW_BASE}/v1/analyses/${EVENTO_CONCLUIDA.analysis_id}`);
    expect(r.status).toBe(404);
    const corpo = JSON.stringify(await r.json()).toLowerCase();
    expect(corpo).toContain("forbidden_or_not_found");
    expect(corpo, "a resposta revelou permissão ou existência").not.toMatch(/permiss|does not exist/);
  });

  it("RG8 · `result_available` vem da MASSA, e nunca é derivado do estado", () => {
    // As duas massas são `analysis.completed`. Se `result_available` fosse derivado do tipo do
    // evento, as duas teriam o mesmo valor — e o par existe exatamente para impedir esse atalho.
    expect(EVENTO_CONCLUIDA.event_type).toBe("analysis.completed");
    expect(EVENTO_CONCLUIDA_SEM_RESULTADO.event_type).toBe("analysis.completed");
    expect(EVENTO_CONCLUIDA.data.result_available).toBe(true);
    expect(EVENTO_CONCLUIDA_SEM_RESULTADO.data.result_available).toBe(false);

    // E nenhuma derivação escrita na massa.
    const fonte = semComentarios(FONTE_DA_MASSA);
    expect(fonte).not.toMatch(/result_available\s*[:=]\s*[^,\n}]*(completed|===|\?)/);
  });

  it("RG9 · o envelope publica só o que o contrato de eventos declara", () => {
    const CAMPOS = [
      "event_id",
      "event_type",
      "event_schema_version",
      "analysis_id",
      "workspace_id",
      "sequence",
      "occurred_at",
      "data",
    ];
    for (const e of [EVENTO_CONCLUIDA, EVENTO_FALHADA, EVENTO_CONCLUIDA_SEM_RESULTADO]) {
      expect(Object.keys(e).sort()).toEqual([...CAMPOS].sort());
    }
    // E nenhum campo declarado NUNCA público atravessou.
    const bruto = JSON.stringify([EVENTO_CONCLUIDA, EVENTO_FALHADA, EVENTO_CONCLUIDA_SEM_RESULTADO]);
    expect(NUNCA_PUBLICOS.length).toBeGreaterThan(0);
    for (const proibido of NUNCA_PUBLICOS) {
      expect(bruto, `campo nunca-público no envelope: ${proibido}`).not.toContain(`"${proibido}"`);
    }
  });

  it("RG10 · `failure_stage` fica no enum público, sem causa técnica inventada", () => {
    expect(["input", "execution", "cancelled"]).toContain(EVENTO_FALHADA.data.failure_stage);
    const fonte = massaSemListaDeProibidos().toLowerCase();
    for (const termo of ["stack", "traceback", "exception", "sqlstate", "errno"]) {
      expect(fonte, `causa técnica inventada na massa de falha: ${termo}`).not.toContain(termo);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// C · FRONTEIRAS ENTRE DONOS
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M44 · C · cross-owner", () => {
  it("C1/C2/C3 · a massa de Subscription não importa Account, Workspace nem Analysis", () => {
    const fonte = semComentarios(FONTE_DA_MASSA);
    for (const vizinho of [
      "account-language",
      "workspace-instance-config",
      "fixtures/public-v1/analyses",
      "instances",
    ]) {
      expect(fonte, `a massa M44 passou a depender de ${vizinho}`).not.toContain(vizinho);
    }
  });

  it("C4 · `destination` não vem de identidade — os handlers não leem `/v1/me`", () => {
    const helper = corpoDoHelper();
    // Positivo: `destination` é lido do CORPO.
    expect(helper).toContain("destination: corpo.destination");
    // Negativo: nenhuma leitura de identidade DENTRO do helper de assinatura.
    expect(helper, "os handlers de assinatura passaram a ler identidade").not.toContain("/v1/me");
  });

  it("C5 · `language` não vem da conta — default do produtor, e não preferência", () => {
    // Mesmo recorte fechado do C4. Este caso passou na primeira rodada pós-extração medindo o
    // módulo inteiro — verde pela região errada, que é o modo mais silencioso de um gate falhar.
    const recorte = corpoDoHelper();
    expect(recorte).toContain('corpo.language ?? "pt"');
    // O atalho proibido, em qualquer das formas plausíveis.
    expect(recorte).not.toMatch(/language\s*\?\?\s*(account|conta|preferencia|effective)/i);
    expect(recorte).not.toMatch(/effective_language|stored_language/);
  });

  it("C6/C7 · nenhum interno de Gateway ou Dispatcher na superfície do cenário", () => {
    const fonte = fonteDaM44() + massaSemListaDeProibidos();
    for (const termo of [
      "localhost:8", // porta de serviço interno
      "dispatcher_subscriptions",
      "secret_ciphertext",
      "exigir_chamador_interno",
      "_internal",
      "x-internal",
    ]) {
      expect(fonte.toLowerCase(), `interno vazou: ${termo}`).not.toContain(termo.toLowerCase());
    }
    // O segredo em claro só existe nas respostas de create/rotate, nunca na projeção de leitura.
    expect(Object.keys(ASSINATURA_ATIVA)).not.toContain("secret");
  });

  it("C8 · reentrada não muta estado de Analysis", async () => {
    cenario("communication-failed-reentry");
    const r = await fetch(`${MSW_BASE}/v1/analyses/${EVENTO_FALHADA.analysis_id}`);
    expect(r.status).toBe(200);
    const antes = JSON.stringify(await r.json());

    const r2 = await fetch(`${MSW_BASE}/v1/analyses/${EVENTO_FALHADA.analysis_id}`);
    expect(JSON.stringify(await r2.json()), "ler a Analysis pela reentrada mudou o estado")
      .toBe(antes);
  });

  it("C9 · os cenários de reentrada são PARCIAIS, com a razão declarada", () => {
    for (const id of ["communication-completed-reentry", "communication-failed-reentry"]) {
      const s = scenario(id);
      expect(s.estado, `${id} deveria ser parcial`).toBe("parcial");
      expect(s.razao, `${id} sem razão declarada`).toBeTruthy();
      // A razão precisa dizer o FATO: não há operação pública de leitura de evento.
      expect(s.razao).toMatch(/fixture|opera[çc]/i);
    }
  });

  it("C10 · os cenários de Subscription estão registrados e são únicos", () => {
    const esperados = [
      "subscription-absent",
      "subscription-current",
      "subscription-destination-diverges",
      "subscription-language-diverges",
      "subscription-disabled",
      "subscription-unavailable",
      "subscription-invisible",
      "subscription-other-workspace",
      "communication-completed-reentry",
      "communication-failed-reentry",
    ];
    for (const id of esperados) {
      const s = scenario(id);
      expect(s.superficies.some((x) => x.startsWith("COM-")), `${id} sem superfície COM-`).toBe(true);
    }
    expect(new Set(esperados).size).toBe(esperados.length);
  });
});
