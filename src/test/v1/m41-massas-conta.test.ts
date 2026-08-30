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

describe("M41 · 8. quem manda no idioma é a CONTA", () => {
  const CONTEXTO = fonte("src/contexts/LanguageContext.tsx");
  const RECONCILIADOR = fonte("src/features/account/ReconciliadorDeIdioma.tsx");
  const HOOKS = fonte("src/features/account/data/language.ts");
  const SECAO = fonte("src/features/account/SecaoDeIdioma.tsx");

  it("G20 · o `|| \"en\"` que colapsava a distinção SAIU do contexto", () => {
    // A versão anterior deste bloco afirmava o contrário — que a materialização NÃO tinha mexido
    // no contexto. Ela existia para que a conversão fosse uma decisão visível, e não algo que
    // aparece junto de outra coisa. A decisão foi tomada na implementação, e o gate virou o
    // inverso: o colapso não pode voltar.
    const codigo = soCodigo(CONTEXTO);
    expect(codigo, "o contexto voltou a concluir preferência do cache").not.toMatch(
      /getItem\([^)]*\)\s*(\|\||\?\?)\s*["']en["']/,
    );
    expect(codigo, "`as Language` sobre o cache volta a inventar domínio fechado").not.toContain(
      "as Language",
    );
  });

  it("G20 · o cache continua existindo, e continua NÃO sendo autoridade", () => {
    // Remover o `localStorage` não era o objetivo: sem ele a interface pisca em inglês a cada
    // carregamento. O que ele não pode é decidir — e é por isso que existe um caminho separado
    // para o backend aplicar o idioma.
    const codigo = soCodigo(CONTEXTO);
    expect(codigo).toContain("localStorage");
    expect(codigo, "sumiu o caminho pelo qual o backend vence o cache").toContain(
      "aplicarPreferenciaDaConta",
    );
  });

  it("G20 · o consumidor de produção existe, e fala com o GATEWAY", () => {
    expect(soCodigo(HOOKS)).toContain("meLanguage");
    expect(soCodigo(SECAO)).toContain("useSalvarIdioma");
    for (const interno of ["/internal/v1/accounts", "x-internal-token", "user_subject"]) {
      expect(soCodigo(HOOKS) + soCodigo(SECAO), `o Front alcançou \`${interno}\``).not.toContain(
        interno,
      );
    }
  });

  it("G20 · o reconciliador aplica `effective`, e NUNCA escreve", () => {
    const codigo = soCodigo(RECONCILIADOR);
    expect(codigo).toContain("effective_language");
    // Um `PUT` aqui migraria a escolha anônima do navegador para a conta no login — silenciosamente.
    for (const escrita of ["setMeLanguage", "useSalvarIdioma", "mutate"]) {
      expect(codigo, `o reconciliador escreve (\`${escrita}\`)`).not.toContain(escrita);
    }
  });

  it("G20 · nada no Front resolve `stored -> effective` por conta própria", () => {
    // O colapso pode voltar por outra porta: derivar `stored` de `effective` em qualquer camada.
    for (const [nome, codigo] of [
      ["hooks", soCodigo(HOOKS)],
      ["seção", soCodigo(SECAO)],
      ["reconciliador", soCodigo(RECONCILIADOR)],
    ] as const) {
      expect(codigo, `${nome} deriva stored de effective`).not.toMatch(
        /stored_language\s*(\?\?|\|\|)\s*/,
      );
    }
  });

  it("G20 · a decisão de salvar compara com o que está SALVO, não com o que está em uso", () => {
    // O caso que separa os dois é o único que importa: quem está em `stored: null` /
    // `effective: "en"` e escolhe inglês ESTÁ mudando algo. Comparar por `effective` concluiria
    // "é o mesmo valor" e deixaria essa pessoa sem como registrar a própria preferência.
    expect(soCodigo(HOOKS)).toContain("p.stored_language !== alvo");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 9. O view-model e a superfície canônica — as lacunas que a campanha de mutação encontrou
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M41 · 9. o view-model preserva os três estados", () => {
  it("os três estados são NOMEADOS, não derivados", async () => {
    const { estadoDaPreferencia } = await import("@/features/account/data/language");
    expect(estadoDaPreferencia(SEM_ESCOLHA)).toEqual({ tipo: "padrao", emUso: "en" });
    expect(estadoDaPreferencia(ESCOLHEU_EN)).toEqual({ tipo: "salva", escolhido: "en", emUso: "en" });
    expect(estadoDaPreferencia(ESCOLHEU_PT)).toEqual({ tipo: "salva", escolhido: "pt", emUso: "pt" });
    expect(estadoDaPreferencia(SEM_ESCOLHA).tipo).not.toBe(estadoDaPreferencia(ESCOLHEU_EN).tipo);
  });

  it("quem está no PADRÃO pode salvar inglês — a comparação é contra o que está salvo", async () => {
    const { mudaAPreferencia } = await import("@/features/account/data/language");
    expect(mudaAPreferencia(SEM_ESCOLHA, "en")).toBe(true);
    expect(mudaAPreferencia(ESCOLHEU_EN, "en")).toBe(false);
    expect(mudaAPreferencia(ESCOLHEU_PT, "en")).toBe(true);
    expect(mudaAPreferencia(ESCOLHEU_PT, "pt")).toBe(false);
  });

  it("o backend continua tendo como vencer o cache", () => {
    const ctx = fonte("src/contexts/LanguageContext.tsx");
    expect(soCodigo(ctx)).toContain("aplicarPreferenciaDaConta: (language: Language) => void;");
    expect(soCodigo(fonte("src/features/account/ReconciliadorDeIdioma.tsx"))).toContain(
      "aplicarPreferenciaDaConta(data.effective_language)",
    );
  });
});

describe("M41 · 9b. a superfície canônica: dois idiomas, e nada além do escopo", () => {
  const SECAO = fonte("src/features/account/SecaoDeIdioma.tsx");
  const PAGINA = fonte("src/features/settings/SettingsPage.tsx");

  it("G10 · a UI oferece exatamente `en` e `pt`", () => {
    expect(soCodigo(SECAO)).toContain('const IDIOMAS: readonly EffectiveLanguage[] = ["en", "pt"];');
    expect(soCodigo(SECAO)).not.toMatch(/"es"|"pt-BR"|"en-US"/);
  });

  it("G15 · D19 — a superfície canônica NÃO tem formulário de senha", () => {
    const codigo = soCodigo(PAGINA);
    expect(codigo, "voltou input de senha à tela canônica").not.toMatch(/type="password"/);
    for (const morto of ["newPassword", "confirmNewPassword", "handleChangePassword"]) {
      expect(codigo, `${morto} voltou`).not.toContain(morto);
    }
  });

  it("G15b · o console seguro abre sem desmontar a jornada do Sentinela", () => {
    const codigo = soCodigo(PAGINA);
    expect(codigo).toContain('target="_blank"');
    expect(codigo).toContain('rel="noopener noreferrer"');
  });

  it("G16 · D21 — nenhuma exclusão de conta", () => {
    const codigo = soCodigo(PAGINA).toLowerCase();
    for (const p2 of ["delete account", "deleteaccount", "excluir conta", "showdeleteconfirm"]) {
      expect(codigo, `${p2} na superfície canônica`).not.toContain(p2);
    }
  });

  it("G14 · D23 — nenhum controle de tema", () => {
    const codigo = (soCodigo(PAGINA) + soCodigo(SECAO)).toLowerCase();
    for (const p2 of ["theme", "appearance", "dark mode", "modo escuro"]) {
      expect(codigo, `${p2} entrou na conta`).not.toContain(p2);
    }
  });

  it("G20 · CFG-03/CFG-04 não entraram por carona", () => {
    const codigo = soCodigo(PAGINA).toLowerCase();
    for (const p2 of ["workspacesettings", "instancesettings", "workspace_id", "instance_id"]) {
      expect(codigo, `${p2} — isso é M42`).not.toContain(p2);
    }
  });
});
