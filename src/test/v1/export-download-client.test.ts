// M22 — o cliente de `/analytics/export/download`, contra o servidor de verdade (MSW) e contra
// o contrato.
//
// ## Existe UMA noção de exportação, e ela é do backend
//
// Product Freeze D16: o CSV local saiu. Com `export = ready`, download; nos demais estados a tela
// representa o estado vindo de `/progress`. Este cliente, portanto, não monta pacote, não escreve
// arquivo e não deriva nada — ele pede uma capability e devolve o que veio.
//
// ## A URL assinada é transporte, não entidade
//
// O produtor assina com TTL de 5 minutos. Guardá-la em cache seria guardar uma credencial que
// vence sozinha: o usuário clicaria num link morto e leria isso como defeito da plataforma. Por
// isso o hook é `useMutation` e não `useQuery`, e por isso `object_key` — a chave do storage —
// nunca atravessa. O produtor já a omite (`assert "object_key" not in corpo`); aqui se prova que
// o front também não a inventa.
//
// ## As negativas são UMA só, e isso é decisão de segurança
//
// Inexistente, de outro workspace, expirado e purgado colapsam num único `forbidden_or_not_found`.
// O produtor resolve as quatro no Analytics, ANTES do broker, e a mutação `g4` do gate
// anti-bypass mata quem tentar distinguí-las no `detail`. Um cliente que ramificasse por causa
// reabriria o oráculo de existência que a MF5.2 fechou.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { createV1Client, PROBLEM_CODES, ProblemError } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { resolverOrigemDoContrato } from "./contractOrigin";
import { SEM_CLIENTE_NO_FRONT } from "./divergenciaDeclarada";

setupMsw();

const RAIZ = resolve(__dirname, "../../..");
const ESCOPO = { workspaceId: "ws-1" };
const cliente = () => createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });

const origem = resolverOrigemDoContrato();
const contrato = JSON.parse(
  readFileSync(resolve(origem.escolhida!.caminho, "public-v1.json"), "utf-8"),
) as Record<string, unknown>;

const OPERACAO = "GET /v1/analyses/{analysis_id}/analytics/export/download";
const CAMINHO = "/v1/analyses/:id/analytics/export/download";

const FONTE_CLIENTE = readFileSync(resolve(RAIZ, "src/lib/v1/client.ts"), "utf-8");
const FONTE_TIPOS = readFileSync(resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts"), "utf-8");
const FONTE_DADOS = readFileSync(
  resolve(RAIZ, "src/features/canonical-analysis/data/analysis.ts"),
  "utf-8",
);

/** A resposta observada do produtor (`api/routes/analyses_v1.py:739`). */
const RESPOSTA = {
  analysis_id: "an-abc",
  export_id: "ex-1",
  download_url: "https://storage.local/pacote.zip?X-Amz-Signature=abc",
  expires_in_seconds: 300,
  sha256: "a".repeat(64),
  size_bytes: 2048,
  export_contract_version: "analytics-export-v1",
  format: "zip",
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — o contrato publica o que este arquivo afirma medir
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M22 · 1. o contrato tem o que julgar", () => {
  it("a origem authoritative resolve sem ambiguidade", () => {
    expect(origem.motivo).not.toBe("ambigua");
  });

  it("`get_analysis_export_download` está em `operations[]`, com método e path exatos", () => {
    const ops = contrato.operations as {
      operationId: string;
      method: string;
      path: string;
      required_query?: string[];
      success_status?: number[];
    }[];
    const op = ops.find((o) => o.operationId === "get_analysis_export_download");
    expect(op, "`get_analysis_export_download` sumiu do contrato").toBeTruthy();
    expect(op?.method).toBe("GET");
    // O path carrega `/analytics/` — sem ele a operação é outra, e o cliente bateria em 404.
    expect(op?.path).toBe("/v1/analyses/{analysis_id}/analytics/export/download");
    expect(op?.required_query, "`workspace_id` deixou de ser obrigatório").toContain("workspace_id");
    expect(op?.success_status, "sucesso deixou de ser 200").toEqual([200]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Método, caminho e escopo saem como contratado
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M22 · 2. o cliente fala com o endereço contratado", () => {
  it("`GET /v1/analyses/{id}/analytics/export/download?workspace_id=…`", async () => {
    let visto: { metodo: string; caminho: string; ws: string | null } | null = null;
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, ({ request }) => {
        const url = new URL(request.url);
        visto = { metodo: request.method, caminho: url.pathname, ws: url.searchParams.get("workspace_id") };
        return HttpResponse.json(RESPOSTA);
      }),
    );

    await cliente().getExportDownload("an-abc", ESCOPO);

    expect(visto).not.toBeNull();
    expect(visto!.metodo).toBe("GET");
    expect(visto!.caminho).toBe("/v1/analyses/an-abc/analytics/export/download");
    expect(visto!.ws, "sem `workspace_id` a chamada sai sem escopo de tenant").toBe("ws-1");
  });

  it("o `analysis_id` é ESCAPADO no path — id hostil não vira outra rota", async () => {
    let caminho = "";
    server.use(
      http.get(`${MSW_BASE}/v1/analyses/:id/analytics/export/download`, ({ request }) => {
        caminho = new URL(request.url).pathname;
        return HttpResponse.json(RESPOSTA);
      }),
    );

    await cliente().getExportDownload("an/../../outro", ESCOPO);

    expect(caminho).not.toContain("../");
    expect(caminho).toContain("an%2F..%2F..%2Foutro");
  });

  it("workspace vazio falha ANTES da rede — fail-closed, nunca sem tenant", async () => {
    let bateu = false;
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () => {
        bateu = true;
        return HttpResponse.json(RESPOSTA);
      }),
    );

    await expect(cliente().getExportDownload("an-abc", { workspaceId: "  " })).rejects.toBeInstanceOf(
      ProblemError,
    );
    expect(bateu, "a requisição saiu sem escopo de tenant").toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. A resposta é TIPADA e vem inteira — e `object_key` não existe
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M22 · 3. a projeção pública", () => {
  it("os 8 campos observados chegam sem tradução", async () => {
    server.use(http.get(`${MSW_BASE}${CAMINHO}`, () => HttpResponse.json(RESPOSTA)));

    const vista = await cliente().getExportDownload("an-abc", ESCOPO);

    expect(vista).toEqual(RESPOSTA);
    // O digest e o tamanho são o que permite ao cliente conferir o que baixou. Sem eles,
    // "baixei o arquivo" seria uma afirmação sobre o que o storage devolveu.
    expect(vista.sha256).toHaveLength(64);
    expect(vista.size_bytes).toBe(2048);
  });

  it("a resposta é tipada como `AnalysisExportDownloadView` no cliente", () => {
    // O gate `contract-operations` reprova cliente cuja projeção não seja um tipo declarado; aqui
    // se ancora o nome, para que trocá-lo por `any`/`unknown` fique vermelho neste arquivo também.
    expect(FONTE_CLIENTE).toContain("pedir<AnalysisExportDownloadView>");
    expect(FONTE_TIPOS).toContain("export interface AnalysisExportDownloadView");
  });

  it("`object_key` NÃO é campo público, e o front não o nomeia", () => {
    const tipo = FONTE_TIPOS.slice(FONTE_TIPOS.indexOf("export interface AnalysisExportDownloadView"));
    const corpo = tipo.slice(0, tipo.indexOf("}"));
    expect(corpo, "a chave do storage virou campo público").not.toMatch(/\bobject_key\b/);
    expect(FONTE_CLIENTE, "o cliente passou a falar de `object_key`").not.toMatch(/\bobject_key\b/);
    expect(FONTE_DADOS, "a camada de dados passou a falar de `object_key`").not.toMatch(/\bobject_key\b/);
  });

  it("o transporte é PASS-THROUGH: um campo extra do fio atravessa, e isso é deliberado", async () => {
    // Escrevi este caso primeiro afirmando que `object_key` seria REMOVIDO, e ele reprovou —
    // corretamente. O cliente faz `dados as T`, um cast, e cast não apaga campo em runtime.
    //
    // A correção foi no teste, não no cliente, e a razão importa: `getProgress`, `getAnalytics` e
    // `getResult` também repassam. Filtrar campos só nesta rota criaria uma exceção silenciosa e,
    // pior, ESCONDERIA dos gates de contrato um campo novo do produtor — que é exatamente o que
    // eles existem para acusar. A proteção real não é o filtro: é `object_key` não estar no tipo
    // e ninguém no front nomeá-lo (caso acima).
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () =>
        HttpResponse.json({ ...RESPOSTA, object_key: "exports/an-abc/ex-1.zip" }),
      ),
    );

    const vista = await cliente().getExportDownload("an-abc", ESCOPO);

    // Atravessa em runtime…
    expect(Object.keys(vista)).toContain("object_key");
    // …e mesmo assim é inalcançável pelo tipo: `AnalysisExportDownloadView` não o declara, então
    // qualquer leitura no produto não compila.
    expect(FONTE_TIPOS.slice(FONTE_TIPOS.indexOf("export interface AnalysisExportDownloadView"))
      .slice(0, 400)).not.toMatch(/\bobject_key\b/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Uma exportação só — a do backend
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M22 · 4. o front não gera export", () => {
  // D16: "Uma única noção de exportação: o artefato do backend. O CSV local SAI."
  const GERACAO_LOCAL =
    /\b(new\s+Blob|URL\.createObjectURL|text\/csv|application\/zip|JSZip|toCSV|gerarCsv|montarZip|createWriteStream|saveAs)\b/;

  it("nem o cliente, nem os tipos, nem a camada de dados montam pacote", () => {
    for (const [nome, fonte] of [
      ["client.ts", FONTE_CLIENTE],
      ["public-v1.types.ts", FONTE_TIPOS],
      ["data/analysis.ts", FONTE_DADOS],
    ] as const) {
      expect(GERACAO_LOCAL.test(fonte), `${nome} passou a gerar export local`).toBe(false);
    }
  });

  it("a capability é pedida por INTENÇÃO — `useMutation`, nunca `useQuery`", () => {
    const bloco = FONTE_DADOS.slice(FONTE_DADOS.indexOf("export function useExportDownload"));
    const corpo = bloco.slice(0, bloco.indexOf("\n}"));
    expect(corpo, "uma query cachearia uma credencial de 5 minutos").toContain("useMutation");
    expect(corpo, "a URL assinada não pode entrar em cache nem ser revalidada sozinha").not.toContain(
      "useQuery",
    );
  });

  it("a URL assinada não ganha chave de cache", () => {
    // A 1ª versão casava `/export|download/i` no arquivo inteiro e reprovava na palavra-chave
    // `export const workspaceKeys` — o teste media a sintaxe do módulo, não a intenção. Aqui a
    // âncora é uma ENTRADA nomeada do mapa de chaves.
    const chaves = readFileSync(resolve(RAIZ, "src/lib/v1/queryKeys.ts"), "utf-8");
    const entradas = [...chaves.matchAll(/^\s{2}([a-zA-Z]+):\s*\(/gm)].map((m) => m[1]);
    expect(entradas, "âncora quebrada: nenhuma entrada lida em queryKeys").not.toHaveLength(0);
    expect(entradas, "credencial de 5 minutos não se guarda por chave de cache").not.toContain(
      "exportDownload",
    );
    expect(entradas.filter((e) => /export|download/i.test(e))).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Erros — só os códigos públicos, e nenhum ramo para código interno
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M22 · 5. as negativas", () => {
  it("as quatro causas colapsadas chegam como UM `forbidden_or_not_found`", async () => {
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () =>
        HttpResponse.json(
          {
            type: "urn:sentinela:error:forbidden_or_not_found",
            title: "Não encontrado",
            status: 404,
            code: "forbidden_or_not_found",
            detail: "analytics_export_not_available",
            instance: "corr-1",
            retryable: false,
          },
          { status: 404, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );

    const erro = await cliente()
      .getExportDownload("an-abc", ESCOPO)
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ProblemError);
    const p = (erro as ProblemError).problem;
    expect(p.code).toBe("forbidden_or_not_found");
    expect(p.status).toBe(404);
    expect(p.retryable).toBe(false);
  });

  it("o cliente NÃO ramifica por causa — não há `expired`, `purged` nem `export_expired`", () => {
    // Distinguir reabriria o oráculo que a MF5.2 fechou, e `export_expired` não existe no
    // catálogo — foi inventado duas vezes e reprovado pelo typecheck nas duas.
    expect(FONTE_CLIENTE).not.toMatch(/export_expired|\bpurged\b/);
    expect(FONTE_DADOS).not.toMatch(/export_expired|\bpurged\b/);
    expect(PROBLEM_CODES).not.toContain("export_expired");
  });

  it("`upstream_unavailable` do produtor NÃO vira código público nem ganha ramo no cliente", async () => {
    // Dívida REGISTRADA do produtor (`analyses_v1.py:829`): ele emite um `code` fora dos 9 e o
    // `problem()` cai no default, devolvendo 500. A M22 não corrige isso e não o contrata — ela
    // só não pode quebrar. A normalização defensiva que já existe resolve, e é ela que se prova
    // aqui; transformar essa defesa em contrato seria adotar o defeito.
    expect(PROBLEM_CODES).not.toContain("upstream_unavailable");
    expect(FONTE_CLIENTE).not.toContain("upstream_unavailable");
    expect(FONTE_DADOS).not.toContain("upstream_unavailable");

    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () =>
        HttpResponse.json(
          { code: "upstream_unavailable", detail: "analytics_export_unavailable" },
          { status: 500, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );

    const erro = await cliente()
      .getExportDownload("an-abc", ESCOPO)
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ProblemError);
    const p = (erro as ProblemError).problem;
    // Cai no fallback por STATUS, e não no código desconhecido: 500 → transitório e retentável.
    expect(p.code).toBe("temporarily_unavailable");
    expect(p.retryable).toBe(true);
  });

  it("nenhum erro carrega a URL assinada nem o host do storage", async () => {
    server.use(
      http.get(`${MSW_BASE}${CAMINHO}`, () =>
        HttpResponse.json(
          { code: "forbidden_or_not_found", detail: `boom ${RESPOSTA.download_url}` },
          { status: 404, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    );

    const erro = await cliente()
      .getExportDownload("an-abc", ESCOPO)
      .catch((e: unknown) => e);

    const texto = JSON.stringify((erro as ProblemError).problem) + String((erro as Error).message);
    expect(texto).not.toContain("X-Amz-Signature");
    expect(texto).not.toContain("storage.local");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. A dívida encolheu — e só ela
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M22 · 6. `SEM_CLIENTE_NO_FRONT`", () => {
  it("o download do export SAIU da declaração", () => {
    expect(SEM_CLIENTE_NO_FRONT, "a dívida não encolheu: a M22 não fechou").not.toContain(OPERACAO);
  });

  it("a declaração não contém mais o export — e o resto é a dívida vigente", () => {
    // Quando este caso nasceu, ele exigia `["…/timeline"]`: encolher demais teria declarado
    // fechado o que a M23 ainda devia. A M23 fechou e a catraca subiu para o vazio. A **BD02**
    // publicou três operações de Instance sem cliente, e a catraca desceu de novo — de
    // propósito. Ela continua sendo catraca: operação nova NÃO declarada reprova aqui.
    expect([...SEM_CLIENTE_NO_FRONT].sort()).toEqual(["GET /v1/instances", "GET /v1/instances/{analysis_id}", "POST /v1/instances"].sort());
  });
});
