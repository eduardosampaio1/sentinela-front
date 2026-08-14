// M41 — os gates da MASSA da conta: identidade (CFG-01) e idioma (CFG-02, BD11).
//
// **Nenhuma UI, nenhum cliente de produção, nenhuma linha de feature.** Este checkpoint materializa
// massa e a fecha por gate; a tela é da próxima missão.
//
// ## O que está sob teste
//
// Os scenarios são invocados como o browser os invoca — `handlersDoScenario(id)` e as respostas
// medidas por `fetch` contra o MSW. Ler a fixture direto provaria que eu escrevi o que escrevi;
// atravessar o handler prova o que a tela vai receber, inclusive o `PUT` que muda o estado e a
// recusa do corpo com campo a mais.
//
// ## A propriedade que carrega o arquivo inteiro
//
//     stored_language = null   ≠   stored_language = "en"
//
// A primeira diz *"ainda não escolheu"*; a segunda diz *"escolheu inglês"*. As duas massas têm a
// mesma identidade e o mesmo `effective_language`, e essa igualdade é DELIBERADA: se um adapter
// fizer `stored ?? effective`, as duas viram o mesmo objeto e nada quebra — a tela monta, o seletor
// mostra "English", e o produto passa a afirmar uma escolha que a pessoa nunca fez.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { CATALOGO, handlersDoScenario } from "@/mocks/scenarios";
import {
  ESCOLHEU_EN,
  ESCOLHEU_PT,
  FORA_DO_ENUM,
  IDENTIDADE,
  IDIOMAS,
  SEM_ESCOLHA,
} from "@/test/fixtures/public-v1/account-language";

const BASE = "http://mock.test";
const RAIZ = resolve(__dirname, "../../..");

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Arma o scenario pedido — o mesmo caminho que o browser usa. */
function armar(id: string) {
  server.resetHandlers(...handlersDoScenario(id, BASE));
}

const idioma = () => fetch(`${BASE}/v1/me/language`).then((r) => r.json());
const idiomaR = () => fetch(`${BASE}/v1/me/language`);
const me = () => fetch(`${BASE}/v1/me`);

const escolher = (corpo: unknown) =>
  fetch(`${BASE}/v1/me/language`, { method: "PUT", body: JSON.stringify(corpo) });

const fonte = (rel: string) => readFileSync(join(RAIZ, rel), "utf8");
const CATALOGO_FONTE = fonte("src/mocks/scenarios/catalogo.ts");
const MASSA_FONTE = fonte("src/test/fixtures/public-v1/account-language.ts");

/** Só o que o interpretador executa — o cabeçalho destes arquivos cita os proibidos por ofício. */
const soCodigo = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 0. Anti-vacuidade — as massas existem, são invocáveis, e o recorte não apagou tudo
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 0. a massa existe", () => {
  it("os cinco scenarios estão no catálogo, disponíveis, nas superfícies certas", () => {
    const meus = CATALOGO.filter((c) => c.id.startsWith("account-"));
    expect(meus.map((c) => c.id)).toEqual([
      "account-identity",
      "account-language-default",
      "account-language-en",
      "account-language-pt",
      "account-language-unavailable",
    ]);
    expect(meus.every((c) => c.estado === "disponivel")).toBe(true);
    expect(meus.find((c) => c.id === "account-identity")?.superficies).toEqual(["CFG-01"]);
    for (const c of meus.filter((x) => x.id !== "account-identity")) {
      expect(c.superficies, `${c.id} na superfície errada`).toEqual(["CFG-02"]);
    }
  });

  it("o recorte de comentário não apagou o código medido", () => {
    // Sem isto, todo gate estrutural abaixo passaria sobre string vazia.
    expect(soCodigo(CATALOGO_FONTE)).toContain("contaHandlers");
    expect(soCodigo(MASSA_FONTE)).toContain("stored_language");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. G1–G4 — os três estados, e o que os separa
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 1. os três estados", () => {
  it("G1 · nunca escolheu: stored null, effective en", async () => {
    armar("account-language-default");
    expect(await idioma()).toEqual({ stored_language: null, effective_language: "en" });
  });

  it("G2 · escolheu inglês: stored en, effective en", async () => {
    armar("account-language-en");
    expect(await idioma()).toEqual({ stored_language: "en", effective_language: "en" });
  });

  it("G4 · escolheu português: stored pt, effective pt", async () => {
    armar("account-language-pt");
    expect(await idioma()).toEqual({ stored_language: "pt", effective_language: "pt" });
  });

  it("G3 · G1 e G2 NÃO colapsam — e a diferença é só `stored_language`", async () => {
    armar("account-language-default");
    const nunca = await idioma();
    armar("account-language-en");
    const escolheu = await idioma();

    // O par é deliberadamente parecido: mesmo `effective`, respostas diferentes.
    expect(nunca.effective_language).toBe(escolheu.effective_language);
    expect(nunca).not.toEqual(escolheu);
    expect(nunca.stored_language).toBeNull();
    expect(escolheu.stored_language).toBe("en");

    // O colapso concreto que isto existe para matar: `stored ?? effective` iguala os dois.
    const colapsado = (p: { stored_language: string | null; effective_language: string }) =>
      p.stored_language ?? p.effective_language;
    expect(
      colapsado(nunca) === colapsado(escolheu),
      "um adapter com `stored ?? effective` não distingue os dois — e é por isso que ele não pode existir",
    ).toBe(true);
    // …e é exatamente por isso que a comparação HONESTA é campo a campo.
    expect(nunca.stored_language).not.toBe(escolheu.stored_language);
  });

  it("as DUAS chaves existem sempre; `null` nunca é omitido", async () => {
    for (const id of ["account-language-default", "account-language-en", "account-language-pt"]) {
      armar(id);
      const p = await idioma();
      expect(Object.keys(p).sort(), `${id} mudou a forma`).toEqual([
        "effective_language",
        "stored_language",
      ]);
    }
    // E não existe uma terceira chave `language` solta, que apagaria a distinção na serialização.
    armar("account-language-default");
    expect(await idioma()).not.toHaveProperty("language");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. G5–G7 — transições. O catálogo guarda ESTADOS; as transições se provam dentro deles.
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 2. escrita", () => {
  it("G5 · en → pt persiste no estado do scenario", async () => {
    armar("account-language-en");
    const r = await escolher({ language: "pt" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(ESCOLHEU_PT);
    expect(await idioma(), "a leitura seguinte não confirmou").toEqual(ESCOLHEU_PT);
  });

  it("G6 · pt → en termina em stored `en`, NUNCA em null", async () => {
    armar("account-language-pt");
    const r = await escolher({ language: "en" });
    expect(await r.json()).toEqual(ESCOLHEU_EN);

    const depois = await idioma();
    expect(depois).toEqual(ESCOLHEU_EN);
    expect(
      depois.stored_language,
      "voltar para inglês virou `nunca escolheu` — não existe CLEAR na V1",
    ).not.toBeNull();
  });

  it("escrever a partir do estado SEM escolha também persiste", async () => {
    armar("account-language-default");
    expect(await idioma()).toEqual(SEM_ESCOLHA);
    await escolher({ language: "pt" });
    expect(await idioma()).toEqual(ESCOLHEU_PT);
  });

  it("escrever o MESMO valor é sucesso e não muda o estado", async () => {
    armar("account-language-pt");
    const r = await escolher({ language: "pt" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(ESCOLHEU_PT);
    expect(await idioma()).toEqual(ESCOLHEU_PT);
  });

  it("G7 · GET não escreve — três leituras não fabricam escolha", async () => {
    armar("account-language-default");
    await idioma();
    await idioma();
    await idioma();
    expect(
      (await idioma()).stored_language,
      "a leitura criou preferência — o default virou escolha persistida",
    ).toBeNull();
  });

  it("cada invocação do scenario nasce SEM memória do teste anterior", async () => {
    armar("account-language-en");
    await escolher({ language: "pt" });
    expect((await idioma()).stored_language).toBe("pt");

    armar("account-language-en"); // mesmo scenario, invocação nova
    expect(
      (await idioma()).stored_language,
      "o estado vazou entre invocações — o mock virou store global",
    ).toBe("en");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. G8–G9 — contenção de falha
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 3. Account indisponível", () => {
  it("G8 · a preferência vira 503, e NÃO um default falso", async () => {
    armar("account-language-unavailable");
    const r = await idiomaR();
    expect(r.status).toBe(503);
    const corpo = await r.json();
    expect(corpo.code).toBe("temporarily_unavailable");
    // O erro mais caro desta capacidade seria este virar 200 com `null`.
    expect(corpo).not.toHaveProperty("stored_language");
    expect(corpo).not.toHaveProperty("effective_language");
  });

  it("G9 · `GET /v1/me` continua 200 — a identidade não depende do Account", async () => {
    armar("account-language-unavailable");
    const r = await me();
    expect(r.status).toBe(200);
    expect(Object.keys(await r.json()).sort()).toEqual(["capabilities", "user", "workspaces"]);
  });

  it("escrever com o Account fora do ar também é 503, não sucesso otimista", async () => {
    armar("account-language-unavailable");
    expect((await escolher({ language: "pt" })).status).toBe(503);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. CFG-01 — identidade, e a separação das duas superfícies
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 4. identidade", () => {
  it("a massa publica só os campos do contrato", async () => {
    armar("account-identity");
    const corpo = await me().then((r) => r.json());
    expect(Object.keys(corpo).sort()).toEqual(["capabilities", "user", "workspaces"]);
    expect(Object.keys(corpo.user).sort()).toEqual(["email", "id", "name"]);
    expect(Object.keys(corpo.workspaces[0]).sort()).toEqual(["id", "name", "role"]);
    expect(Object.keys(corpo.capabilities)).toEqual(["canonical_analysis_enabled"]);
  });

  it("a identidade NÃO carrega preferência — as duas rotas não se fundem", async () => {
    armar("account-identity");
    const corpo = JSON.stringify(await me().then((r) => r.json()));
    expect(corpo).not.toContain("language");
    expect(corpo).not.toContain("stored");
  });

  it("CFG-01 é construível SEM o Account — o scenario nem serve a rota de idioma", async () => {
    armar("account-identity");
    // `onUnhandledRequest: "error"` faz esta chamada falhar, e é essa a afirmação: a superfície de
    // identidade não depende de o serviço de preferência existir.
    await expect(idiomaR()).rejects.toThrow();
  });

  it("a identidade é a MESMA nos scenarios de idioma — trocar de idioma não muda quem é", async () => {
    for (const id of ["account-language-default", "account-language-pt"]) {
      armar(id);
      expect(await me().then((r) => r.json())).toEqual(IDENTIDADE);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. G10–G11 — o enum fechado, e a ausência de CLEAR
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 5. o que a fronteira recusa", () => {
  it("G10 · só `en` e `pt`", () => {
    expect(IDIOMAS).toEqual(["en", "pt"]);
  });

  it.each(FORA_DO_ENUM)("G10 · `%s` é recusado com problem oficial", async (valor) => {
    armar("account-language-en");
    const r = await escolher({ language: valor });
    expect(r.status).toBe(400);
    expect((await r.json()).code).toBe("invalid_input");
    // E a recusa não mexe no estado.
    expect((await idioma()).stored_language).toBe("en");
  });

  it("G10 · `pt-BR` NÃO é normalizado para `pt` — normalizar é decidir produto", async () => {
    armar("account-language-en");
    await escolher({ language: "pt-BR" });
    expect((await idioma()).stored_language).toBe("en");
  });

  it("G11 · não existe DELETE — e nenhum handler o oferece", async () => {
    armar("account-language-pt");
    await expect(
      fetch(`${BASE}/v1/me/language`, { method: "DELETE" }),
    ).rejects.toThrow();
    for (const proibido of ["resetLanguage", "clearLanguage", "removePreference", "CLEAR"]) {
      expect(soCodigo(CATALOGO_FONTE), `o mock ganhou \`${proibido}\``).not.toContain(proibido);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. G12–G16 — o que a massa não pode conter
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 6. escopo congelado", () => {
  const respostas = async () => {
    const saida: string[] = [];
    for (const id of ["account-language-default", "account-language-en", "account-language-pt"]) {
      armar(id);
      saida.push(JSON.stringify(await idioma()));
    }
    return saida.join(" ");
  };

  it("G12 · G13 · a preferência é GLOBAL — sem workspace, instance ou tenant", async () => {
    const tudo = await respostas();
    for (const proibido of ["workspace_id", "instance_id", "tenant_id", "workspace", "instance"]) {
      expect(tudo, `a resposta de idioma carrega \`${proibido}\``).not.toContain(proibido);
    }
  });

  it("G12 · o `PUT` não aceita escopo — corpo com workspace_id é recusado", async () => {
    armar("account-language-en");
    const r = await escolher({ language: "pt", workspace_id: "ws-acme" });
    expect(r.status).toBe(400);
    expect((await idioma()).stored_language).toBe("en");
  });

  it("G14 · sem tema — D23 continua valendo", async () => {
    const tudo = await respostas();
    for (const proibido of ["theme", "appearance", "dark", "light", "system"]) {
      expect(tudo, `a massa antecipou \`${proibido}\``).not.toContain(proibido);
    }
    // E a massa não o declara nem fora da resposta.
    expect(soCodigo(MASSA_FONTE).toLowerCase()).not.toContain("theme:");
  });

  it("G15 · G16 · sem senha e sem exclusão de conta na massa canônica", () => {
    const massa = soCodigo(MASSA_FONTE).toLowerCase();
    for (const proibido of ["password", "senha", "delete_account", "deleteaccount"]) {
      expect(massa, `a massa da conta antecipou \`${proibido}\``).not.toContain(proibido);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 7. G17–G19 — a fronteira do mock é PÚBLICA
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 7. o mock não conhece o serviço interno", () => {
  it("G17 · nenhum vestígio da API interna do Account", () => {
    const codigo = soCodigo(CATALOGO_FONTE) + soCodigo(MASSA_FONTE);
    for (const interno of [
      "x-internal-token",
      "/internal/v1/accounts",
      "ACCOUNT_INTERNAL_TOKEN",
      "ACCOUNT_DATABASE_URL",
      "account_language_preference",
    ]) {
      expect(codigo, `o mock público conhece \`${interno}\``).not.toContain(interno);
    }
  });

  it("G18 · o cliente não escolhe o subject", async () => {
    // Estruturalmente: não há `user_subject` no lado público.
    expect(soCodigo(CATALOGO_FONTE)).not.toContain("user_subject");
    // E por comportamento: mandá-lo no corpo é recusado, e nada é escrito.
    armar("account-language-en");
    const r = await escolher({ language: "pt", user_subject: "u-de-outra-pessoa" });
    expect(r.status).toBe(400);
    expect((await idioma()).stored_language).toBe("en");
  });

  it("G18 · subject na QUERY também não decide nada", async () => {
    armar("account-language-en");
    const r = await fetch(`${BASE}/v1/me/language?user_subject=u-de-outra-pessoa`);
    expect(await r.json()).toEqual(ESCOLHEU_EN);
  });

  it("G19 · o idioma não depende de Analytics, ARGOS nem result", () => {
    const trecho = CATALOGO_FONTE.slice(CATALOGO_FONTE.indexOf("function contaHandlers"));
    const ateOFim = trecho.slice(0, trecho.indexOf("export const CATALOGO"));
    for (const alheio of ["/analytics", "/result", "/progress", "argos", "ARGOS"]) {
      expect(soCodigo(ateOFim), `o handler de idioma toca \`${alheio}\``).not.toContain(alheio);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 8. G20 — a dívida, declarada e NÃO consertada aqui
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 8. o localStorage ainda é a autoridade de fato", () => {
  const CONTEXTO = fonte("src/contexts/LanguageContext.tsx");

  it("G20 · este checkpoint NÃO transformou o localStorage em preferência de backend", () => {
    // A afirmação é sobre o que NÃO aconteceu. A massa existe; o consumidor não — e enquanto ele
    // não existir, `LanguageContext` continua sendo a fonte da verdade do idioma no Front, com um
    // `|| "en"` que colapsa exatamente a distinção que o backend passou a preservar.
    expect(CONTEXTO).toContain("localStorage");
    expect(
      CONTEXTO,
      "o contexto passou a falar com o backend — isso é trabalho de IMPLEMENTAÇÃO, não desta materialização",
    ).not.toContain("/v1/me/language");
  });

  it("G20 · nenhum código de PRODUÇÃO consome a rota de idioma ainda", () => {
    // O gate morre no dia em que a M41 criar o cliente — e é para morrer. Ele existe para que a
    // criação seja uma DECISÃO visível, e não algo que aparece junto de outra coisa.
    const producao = [
      "src/lib/v1/client.ts",
      "src/contexts/LanguageContext.tsx",
      "src/features/settings/SettingsPage.tsx",
    ];
    for (const arquivo of producao) {
      expect(fonte(arquivo), `${arquivo} já consome a rota`).not.toContain("/v1/me/language");
    }
  });
});
