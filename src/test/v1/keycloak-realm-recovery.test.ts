// MICRO-DELTA KEYCLOAK RECOVERY — o gate contra regressão silenciosa da configuração.
//
// ## O que ele impede
//
// `resetPasswordAllowed` é uma linha de JSON. Some numa edição distraída, e o efeito não aparece
// em teste nenhum: o front continua compilando, o redirect continua acontecendo, e a tela do
// Keycloak simplesmente deixa de mostrar o link "esqueci a senha". O usuário chega numa tela de
// login sem saída, e ninguém é avisado.
//
// `smtpServer` é pior: sem ele o Keycloak **aceita** o pedido de reset e o e-mail se perde. O
// fluxo parece funcionar.
//
// ## Por que este gate mora no repositório do FRONT
//
// Ele verifica arquivo de outro repositório, o que normalmente seria má ideia. Aqui é o contrário:
// quem **depende** dessa configuração é o front — é `/forgot-password` que fica sem saída se ela
// sumir. O gate vive junto de quem sofre a consequência, e a M02 não pode remover o fallback do
// Supabase sem ele verde.
//
// Mesmo desenho fail-closed do `contract-authority`: sem os arquivos no disco, o gate exige que
// alguém DECLARE a ausência em vez de passar por vacuidade.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");

/** Os dois worktrees que carregam o mesmo export. Ver conflito C1 do WS-A. */
const EXPORTS = [
  resolve(RAIZ, "../sentinela-facts/deploy/railway/keycloak/realm-sentinela.json"),
  resolve(RAIZ, "../sentinela/deploy/railway/keycloak/realm-sentinela.json"),
];

const presentes = EXPORTS.filter((p) => existsSync(p));
const temExports = presentes.length > 0;

interface Realm {
  realm?: string;
  resetPasswordAllowed?: boolean;
  smtpServer?: Record<string, string>;
}

const ler = (p: string) => JSON.parse(readFileSync(p, "utf-8")) as Realm;
const curto = (p: string) => p.split(/[\\/]/).slice(-4).join("/");

describe("micro-delta · recuperação de senha no realm Keycloak", () => {
  it("os exports existem — ou alguém declarou explicitamente que não estão no disco", () => {
    // Sem isto, um clone isolado veria zero arquivo, nenhum caso rodaria, e o arquivo reportaria
    // verde sem ter verificado configuração nenhuma.
    if (temExports) return;
    expect(
      process.env.SENTINELA_REALM_ABSENT === "1",
      `nenhum realm export encontrado em:\n  ${EXPORTS.join("\n  ")}\n` +
        "Os casos NÃO rodaram. Para rodar assim de propósito, declare SENTINELA_REALM_ABSENT=1.",
    ).toBe(true);
  });

  it.runIf(temExports)("`resetPasswordAllowed` está LIGADO", () => {
    // É o que o tema lê em `login.ftl:19`. Desligado, não há link de recuperação na tela.
    for (const p of presentes) {
      expect(ler(p).resetPasswordAllowed, `${curto(p)}: recuperação desabilitada`).toBe(true);
    }
  });

  it.runIf(temExports)("`smtpServer` está declarado com destino e remetente", () => {
    // Flag ligada sem SMTP = pedido aceito e e-mail perdido. As duas, ou nenhuma.
    for (const p of presentes) {
      const smtp = ler(p).smtpServer;
      expect(smtp, `${curto(p)}: sem smtpServer — o e-mail de reset se perderia`).toBeTruthy();
      for (const campo of ["host", "port", "from"]) {
        expect(smtp?.[campo], `${curto(p)}: smtpServer sem \`${campo}\``).toBeTruthy();
      }
    }
  });

  it.runIf(temExports)("o SMTP versionado NÃO carrega credencial", () => {
    // O export vive no repositório. Um `password` aqui vazaria segredo para todo mundo que
    // clonar — produção aplica SMTP real por Admin API, a partir do cofre do ambiente.
    for (const p of presentes) {
      const smtp = ler(p).smtpServer ?? {};
      expect(Object.keys(smtp), `${curto(p)}: credencial de SMTP versionada`).not.toContain(
        "password",
      );
      expect(Object.keys(smtp)).not.toContain("user");
    }
  });

  it.runIf(presentes.length > 1)("os dois worktrees carregam o MESMO export", () => {
    // Dois exports divergentes reproduziriam, na configuração, o defeito C1 do contrato: qual
    // deles é a verdade passaria a depender de qual pasta alguém clonou.
    const digests = presentes.map((p) => ({
      arquivo: curto(p),
      sha: createHash("sha256").update(readFileSync(p)).digest("hex").slice(0, 12),
    }));
    expect(new Set(digests.map((d) => d.sha)).size, JSON.stringify(digests)).toBe(1);
  });
});
