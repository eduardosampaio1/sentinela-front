// Sanitização rejeitada — o desfecho novo do Privacy Gate na tela.
//
// Preparação local do Big Bang: provas do código local candidato. Nada aqui ativa nada.
//
// Quando o Ingestion rejeita a base (o dado não passa na sanitização), a análise não pode
// prosseguir COM AQUELE ARQUIVO. O erro é definitivo por natureza — o mesmo arquivo produz a
// mesma rejeição — e a tela precisa dizer isso sem prometer que insistir resolve.
//
// É o mesmo defeito de `needs_mapping` por outro caminho: oferecer "tentar de novo" para algo
// que não muda é mandar o usuário repetir trabalho sem chance de sucesso. A diferença é que aqui
// ALGO deu errado de verdade (tom de erro), enquanto `needs_mapping` é só uma pergunta.

import { describe, expect, it } from "vitest";

import { describeProblem } from "./errorView";
import { describeAnalysisState } from "./stateView";
import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";

describe("sanitização rejeitada", () => {
  // A rejeição chega como `non_retryable_failure` (422): a categoria pública de falha que não
  // se recupera repetindo. É deliberadamente distinta de `temporarily_unavailable`, que é a
  // única do catálogo em que insistir faz sentido.
  const ui = describeProblem("non_retryable_failure");

  it("não oferece retry", () => {
    expect(ui.action).toBe("none");
    expect(ui.action).not.toBe("retry");
  });

  it("é apresentada como falha, não como espera", () => {
    // `tone: "wait"` aqui deixaria a pessoa esperando por um desfecho que já aconteceu.
    expect(ui.tone).toBe("error");
  });

  it("não é re-tentável na leitura", () => {
    // `readRetryable` liga o polling. Ligado num desfecho definitivo, o app ficaria batendo no
    // backend para sempre por uma resposta que nunca muda.
    expect(ui.readRetryable).toBe(false);
  });

  it("NÃO derruba a sessão", () => {
    // Só `authentication_required` limpa sessão. Deslogar alguém porque o ARQUIVO foi
    // rejeitado confunde um problema do dado com um problema de identidade.
    expect(ui.clearSession).toBe(false);
    expect(describeProblem("authentication_required").clearSession).toBe(true);
  });

  it("a mensagem existe em pt e en", () => {
    for (const [nome, dic] of [["pt", pt], ["en", en]] as const) {
      const caminho = ui.messageKey.split(".");
      let no: unknown = dic;
      for (const parte of caminho) no = (no as Record<string, unknown>)?.[parte];
      expect(typeof no, `${ui.messageKey} ausente em ${nome}`).toBe("string");
      expect(String(no).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("o estado terminal da rejeição", () => {
  // A análise cujo dado foi rejeitado termina em `failed` com `retry_allowed: false` — o
  // Gateway já não permite retry de estado terminal. A tela precisa respeitar isso.
  const view = describeAnalysisState({ status: "failed", retry_allowed: false });

  it("é terminal e encerra o acompanhamento", () => {
    expect(view.terminal).toBe(true);
    expect(view.indeterminate).toBe(false);
  });

  it("não oferece ação quando o backend não permite retry", () => {
    expect(view.action).toBe("none");
  });

  it("`failed` é a ÚNICA condição de erro da jornada", () => {
    // Se outro estado virasse erro, a pessoa procuraria defeito onde não há.
    for (const status of ["preparing", "receiving", "queued", "running", "recovering", "needs_mapping", "completed"] as const) {
      expect(describeAnalysisState({ status, retry_allowed: false }).isError, `${status} virou erro`).toBe(false);
    }
    expect(view.isError).toBe(true);
  });
});

describe("insistir só é oferecido onde insistir resolve", () => {
  // O contraste é a prova: se TODO código não-retentável devolvesse `none`, o teste acima
  // passaria por um `describeProblem` que ignora o argumento. Aqui a função precisa
  // DISCRIMINAR entre categorias.
  it("`temporarily_unavailable` — e só ele — oferece retry explícito", () => {
    expect(describeProblem("temporarily_unavailable").action).toBe("retry");
    expect(describeProblem("non_retryable_failure").action).toBe("none");
    expect(describeProblem("invalid_input").action).toBe("new_analysis");
  });

  it("upload vazio ou inválido manda começar de novo, não repetir", () => {
    // `invalid_input` é o arquivo que nem chegou a ser dado: vazio, formato errado, malformado.
    // A saída honesta é uma análise nova — repetir a mesma submissão daria o mesmo 400.
    const invalido = describeProblem("invalid_input");
    expect(invalido.action).toBe("new_analysis");
    expect(invalido.readRetryable).toBe(false);
    expect(invalido.clearSession).toBe(false);
  });

  it("erro de autenticação leva a entrar de novo, e só ele limpa a sessão", () => {
    const auth = describeProblem("authentication_required");
    expect(auth.action).toBe("sign_in");
    expect(auth.clearSession).toBe(true);
    for (const outro of ["invalid_input", "non_retryable_failure", "capacity_wait", "temporarily_unavailable"]) {
      expect(describeProblem(outro).clearSession, `${outro} limpou a sessão`).toBe(false);
    }
  });

  it("falha de rede sem envelope não é confundida com rejeição de dado", () => {
    // Sem `problem+json` não dá para saber o que houve. Tratar como definitivo esconderia uma
    // queda de rede atrás de "seu arquivo foi rejeitado".
    const rede = describeProblem(null);
    expect(rede.readRetryable).toBe(true);
    expect(rede.action).toBe("retry");
  });
});
