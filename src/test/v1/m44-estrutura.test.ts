// M44 — os invariantes que o BROWSER não alcança.
//
// Estes casos existem porque a campanha de mutação expôs cinco defeitos que nenhum teste de
// browser mata, e por razões diferentes:
//
// * **cache por workspace** — provar vazamento A→B exigiria trocar de escopo dentro de uma
//   sessão, com duas memberships; o que se pode afirmar barato e sem ambiguidade é que a chave
//   de query CARREGA o escopo;
// * **URL interna no cliente** — o gravador de rede do spec só registra `/v1/`, então uma chamada
//   a `/internal/v1/` não aparece em lugar nenhum. Corrigir o gravador ajuda, mas o invariante é
//   de FONTE: o Front não escreve `/internal` em cliente nenhum;
// * **segredo em storage** — o browser prova o caminho que o teste exercita; a fonte prova que
//   não existe outro;
// * **trava de duplo envio** — uma corrida de dois cliques é instável de encenar e estável de ler;
// * **vocabulário de eventos** — o dono aceita seis e o produto oferece três; a lista é dado, e
//   compará-la com um literal é mais honesto que contar caixas de seleção na tela.
//
// Um gate estrutural não substitui o de comportamento: ele cobre o que o de comportamento não
// alcança, e diz isso em voz alta.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { workspaceKeys } from "@/lib/v1";
import { TIPOS_DE_EVENTO } from "@/features/communication/data/subscriptions";

const RAIZ = resolve(__dirname, "../../..");
const ler = (p: string) => readFileSync(resolve(RAIZ, p), "utf-8");

/** Remove comentários antes de medir — um cadeado que lê a prosa mede a explicação. E o `//` de
 *  comentário nunca vem precedido de `:`, senão o stripper come `http://…`. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const HOOKS = semComentarios(ler("src/features/communication/data/subscriptions.ts"));
const UI = semComentarios(ler("src/features/communication/SecaoDeNotificacoes.tsx"));
const CLIENTE = semComentarios(ler("src/lib/v1/client.ts"));

describe("M44 · E · estrutura", () => {
  it("E1 · a chave de query carrega o WORKSPACE", () => {
    // Positivo primeiro: a chave existe e muda com o escopo.
    const a = JSON.stringify(workspaceKeys.subscriptions("ws-a"));
    const b = JSON.stringify(workspaceKeys.subscriptions("ws-b"));
    expect(a).not.toBe(b);
    expect(a).toContain("ws-a");
    // E o hook usa ELA, e não uma chave global.
    expect(HOOKS).toContain("workspaceKeys.subscriptions(workspaceId");
    expect(HOOKS, "chave de assinatura sem escopo — A e B compartilhariam cache").not.toMatch(
      /queryKey:\s*\[\s*["'`]subscriptions/,
    );
  });

  it("E2 · o cliente não conhece rota interna nem token S2S", () => {
    // Âncora positiva: as quatro operações públicas estão lá.
    for (const caminho of ['"/v1/subscriptions"', "/v1/subscriptions/${encodeAnalysisId"]) {
      expect(CLIENTE).toContain(caminho);
    }
    for (const proibido of ["/internal", "s2s", "x-internal"]) {
      expect(CLIENTE.toLowerCase(), `interno no cliente público: ${proibido}`).not.toContain(
        proibido.toLowerCase(),
      );
    }
  });

  it("E3 · o segredo não é persistido em lugar nenhum", () => {
    const fonte = HOOKS + UI;
    expect(fonte.length).toBeGreaterThan(1000);
    for (const proibido of ["localStorage", "sessionStorage", "document.cookie", "console.log"]) {
      expect(fonte, `o segredo pode acabar em ${proibido}`).not.toContain(proibido);
    }
    // E ele NÃO entra no cache: nenhuma escrita de `secret` em `setQueryData`.
    const escritas = HOOKS.slice(HOOKS.indexOf("setQueryData"));
    expect(escritas.length).toBeGreaterThan(100);
    expect(escritas, "`secret` foi escrito no cache de query").not.toMatch(/secret\s*:/);
  });

  it("E4 · a trava síncrona de duplo envio existe nas três escritas", () => {
    expect(UI).toContain("const emVoo = useRef(false)");
    // Uma por operação: criar, desativar e rotacionar.
    expect(UI.match(/emVoo\.current/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(UI, "a guarda de criar sumiu").toContain("if (!podeAdicionar || emVoo.current) return;");
  });

  it("E5 · o vocabulário oferecido é o do contrato, e é subconjunto do que o dono aceita", () => {
    // Os SEIS que o dono aceita (`EVENTOS_NOTIFICAVEIS`, derivado de `public-events-v1.json`).
    const ACEITOS = new Set([
      "analysis.queued",
      "analysis.started",
      "analysis.recovering",
      "analysis.completed",
      "analysis.failed",
      "result.available",
    ]);
    expect(TIPOS_DE_EVENTO.length).toBeGreaterThan(0);
    for (const t of TIPOS_DE_EVENTO) {
      expect(ACEITOS.has(t), `tipo de evento inventado: ${t}`).toBe(true);
    }
    // E é exatamente o trio que o Blueprint §12 confirma — os outros três estão 🔴 lá.
    expect([...TIPOS_DE_EVENTO].sort()).toEqual([
      "analysis.completed",
      "analysis.failed",
      "result.available",
    ]);
  });

  it("E6 · a seção não importa Account para resolver assinatura", () => {
    const fonte = HOOKS + UI;
    for (const vizinho of ["account/data/language", "useAccountLanguage", "useContaDoUsuario"]) {
      expect(fonte, `a M44 passou a depender de ${vizinho}`).not.toContain(vizinho);
    }
    // `account.portuguese`/`account.english` são CHAVES DE TEXTO reusadas, não dependência de
    // dados — e é por isso que a proibição é sobre hook/cliente, não sobre i18n.
    expect(UI).toContain('t("account.portuguese")');
  });

  it("E7 · nenhuma operação que o contrato não publica", () => {
    for (const inventada of [
      "getSubscription",
      "updateSubscription",
      "verifySubscription",
      "deleteSubscription",
      "enableSubscription",
    ]) {
      expect(CLIENTE, `operação inventada no cliente: ${inventada}`).not.toContain(inventada);
    }
  });
});
