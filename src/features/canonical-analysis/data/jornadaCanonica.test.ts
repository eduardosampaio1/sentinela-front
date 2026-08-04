// Jornada canônica local — o painel mostrando a pressão certa sem abrir a parede.
//
// Preparação local do Big Bang. Nada aqui ativa nada: são provas do código local candidato.
//
// A jornada que o usuário percorre:
//   upload recebido → profiling → mapping automático  → validação/sanitização → ready
//                               ↘ needs_mapping (para, e DIZ por quê)
//   → análise iniciada → resultado
//
// O Gateway traduz tudo isso para o vocabulário público. O frontend não sabe o que é bucket,
// object key, worker, lease, purge ou fencing — e há teste provando que não sabe.

import { describe, expect, it } from "vitest";

import { describeAnalysisState } from "./stateView";
import { PUBLIC_STATES } from "@/lib/v1/contract/public-v1.types";
import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";

describe("needs_mapping — a parada honesta", () => {
  const view = describeAnalysisState({ status: "needs_mapping", retry_allowed: false });

  it("NÃO é erro: nada quebrou, há uma pergunta", () => {
    // Pintar de erro faria o usuário procurar defeito onde há uma pergunta.
    expect(view.isError).toBe(false);
  });

  it("NÃO é indeterminado: um spinner aqui é a tela travada", () => {
    // O sintoma que a instrução nomeia. Nada está progredindo; mostrar progresso faria o
    // usuário esperar para sempre por algo que não vai acontecer sozinho.
    expect(view.indeterminate).toBe(false);
  });

  it("NÃO é terminal: a jornada continua quando a pessoa confirmar", () => {
    expect(view.terminal).toBe(false);
  });

  it("a ação é confirmar o mapping, e NUNCA `retry`", () => {
    // Reenviar o mesmo arquivo daria exatamente o mesmo resultado. Oferecer "tentar de novo"
    // seria mandar o usuário repetir trabalho sem chance de sucesso.
    expect(view.action).toBe("confirm_mapping");
    expect(view.action).not.toBe("retry");
  });

  it("não vira `retry` nem quando o backend permite retry por engano", () => {
    // Fail-closed de apresentação: se o Gateway mandar `retry_allowed: true` por defeito,
    // a tela ainda não oferece um retry que não resolve.
    const comRetry = describeAnalysisState({ status: "needs_mapping", retry_allowed: true });
    expect(comRetry.action).toBe("confirm_mapping");
  });
});

describe("nenhum estado público fica sem texto", () => {
  // Cadeado de exaustividade: um estado novo sem i18n apareceria como a CHAVE crua na tela
  // ("canonicalAnalysis.state.needs_mapping.title"), que é a forma de a interface mentir sem
  // ninguém notar em teste de unidade.
  for (const status of PUBLIC_STATES) {
    it(`${status} tem título e mensagem em pt e en`, () => {
      for (const [nome, dicionario] of [["pt", pt], ["en", en]] as const) {
        const estado = (dicionario as Record<string, any>).canonicalAnalysis?.state?.[status];
        expect(estado, `${status} sem entrada em ${nome}`).toBeTruthy();
        expect(String(estado.title).trim().length, `${status}.title vazio em ${nome}`)
          .toBeGreaterThan(0);
        expect(String(estado.message).trim().length, `${status}.message vazio em ${nome}`)
          .toBeGreaterThan(0);
      }
    });
  }

  it("a máquina de apresentação cobre TODOS os estados declarados", () => {
    // Sem isto, um estado novo no contrato cairia no `switch` sem `case` e a função
    // devolveria `undefined` — a tela quebraria em runtime, não em teste.
    for (const status of PUBLIC_STATES) {
      const v = describeAnalysisState({ status, retry_allowed: false });
      expect(v, `sem apresentação para ${status}`).toBeTruthy();
      expect(v.status).toBe(status);
    }
  });
});

describe("o frontend não conhece o interior do sistema", () => {
  // O Gateway é fachada. Se um destes termos aparecer no vocabulário público ou nos textos
  // da jornada, o detalhe interno vazou para a tela — e o contrato deixou de ser fachada.
  const PROIBIDOS = [
    "bucket",
    "object_key",
    "objectkey",
    "worker",
    "lease",
    "fencing",
    "purge",
    "minio",
    "presigned",
    "attempt",
    "ingestion_id",
  ];

  it("os estados públicos não usam vocabulário interno", () => {
    for (const status of PUBLIC_STATES) {
      for (const proibido of PROIBIDOS) {
        expect(status.toLowerCase()).not.toContain(proibido);
      }
    }
  });

  it("os textos da jornada não mencionam infraestrutura", () => {
    for (const dicionario of [pt, en]) {
      const estados = (dicionario as Record<string, any>).canonicalAnalysis?.state ?? {};
      const texto = JSON.stringify(estados).toLowerCase();
      for (const proibido of PROIBIDOS) {
        expect(texto, `texto de estado menciona "${proibido}"`).not.toContain(proibido);
      }
    }
  });
});
