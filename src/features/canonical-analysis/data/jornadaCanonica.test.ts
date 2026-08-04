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

import fs from "node:fs";
import path from "node:path";

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

  it("a UNIÃO e o array declaram exatamente os mesmos estados", () => {
    // A direção que faltava. O laço acima percorre `PUBLIC_STATES`: um estado acrescentado só
    // na união `AnalysisStatus` nunca seria testado, e o gate de sincronia com a origem que
    // pegaria isso não roda quando a origem não está na máquina.
    //
    // Este teste NÃO depende da origem: é uma coerência interna do arquivo, e vale sempre.
    const fonte = fs.readFileSync(
      path.resolve(__dirname, "../../../lib/v1/contract/public-v1.types.ts"),
      "utf-8",
    );
    const uniao = fonte.slice(
      fonte.indexOf("export type AnalysisStatus"),
      fonte.indexOf("export const PUBLIC_STATES"),
    );
    const daUniao = [...uniao.matchAll(/\|\s*"([a-z_]+)"/g)].map((m) => m[1]).sort();
    expect(daUniao.length, "nenhum estado extraído da união").toBeGreaterThan(0);
    expect(daUniao).toEqual([...PUBLIC_STATES].sort());
  });

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

  it("o CÓDIGO da jornada não menciona infraestrutura", () => {
    // Os dois testes acima cobrem o vocabulário e os textos. A afirmação, porém, é sobre o
    // frontend: um hook lendo `object_key`, uma chamada com `bucket` na URL ou um campo
    // `lease` num tipo passariam por eles inteiros. O que o Gateway esconde na fachada não
    // pode reaparecer aqui pela porta dos fundos.
    const raiz = path.resolve(__dirname, "..");
    const arquivos: string[] = [];
    const visitar = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const alvo = path.join(dir, e.name);
        if (e.isDirectory()) visitar(alvo);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) arquivos.push(alvo);
      }
    };
    visitar(raiz);
    expect(arquivos.length, "nenhum arquivo da jornada encontrado").toBeGreaterThan(5);

    // `attempt` sai desta lista: `attempt_count` é conceito do Orchestrator, mas a palavra
    // aparece legitimamente em ingles corrente. O cadeado de estados acima ja o cobre onde
    // importa — no vocabulario publico.
    const noCodigo = PROIBIDOS.filter((p) => p !== "attempt");
    const culpados: string[] = [];
    for (const a of arquivos) {
      const src = fs
        .readFileSync(a, "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
        .toLowerCase();
      for (const proibido of noCodigo) {
        if (src.includes(proibido)) culpados.push(`${path.relative(raiz, a)}: ${proibido}`);
      }
    }
    expect(culpados).toEqual([]);
  });
});
