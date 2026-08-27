// M33 · AN-01 — prepare → data → submit, e os três desfechos que a jornada precisa nomear.
//
// Escopo literal do PLAN: *"`prepare → data → submit`; upload inválido, falha de rede,
// `idempotency_conflict`"*. **Fora:** cancelar (D15 — fora da V1, e nenhum CTA pode sugerir).
//
// `capacity_wait` e `temporarily_unavailable` NÃO estão aqui: pertencem a ERR-503 pelo §365, e o
// scenario 29 é de AN-03/ERR-503. O scenario 22 também não: está `bloqueado` por BD03/B4 e serve
// RES-01/EVO-02. Reusar scenario de outra superfície só porque o estado parece útil foi
// explicitamente recusado.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import { ProblemError, TransportError, createV1Client } from "@/lib/v1";
import { ehFalhaDeTransporte } from "@/features/canonical-analysis/ui/falhaDeTransporte";
import { UploadStep } from "@/features/canonical-analysis/ui/UploadStep";
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

const AN01 = [
  "src/features/canonical-analysis/ui/StartAnalysisPage.tsx",
  "src/features/canonical-analysis/ui/UploadStep.tsx",
];

/** M37: a INTENCAO de iniciar saiu da pagina para um hook, porque ganhou uma segunda chamadora
 *  (INST-04, em `/instances/:instanceId`). O que estes casos provam nao mudou — mudou o endereco.
 *  Ler so a pagina deixaria o gate medindo um arquivo que nao decide mais nada, e ele ficaria
 *  verde por ausencia. */
const INTENCAO = "src/features/canonical-analysis/ui/useIniciarAnalise.ts";

const problema = (code: string) =>
  new ProblemError({ type: "about:blank", title: code, status: 400, code } as never);

/**
 * Cliente injetado pelo seam que o `CanonicalClientProvider` já oferece.
 *
 * Sem ele o cliente real curto-circuita em `authentication_required` antes de chegar ao `fetch`, e
 * o teste mediria a ausência de sessão em vez do tratamento do erro. O que está sob prova aqui é o
 * que a TELA faz com uma mutation rejeitada — o comportamento do cliente tem suíte própria.
 */
function clienteQue(enviarParte: () => Promise<unknown>) {
  return {
    renameAnalysis: async () => ({ analysis_id: "an-1", display_name: "base" }),
    openDataUpload: async () => ({
      analysis_id: "an-1",
      status: "receiving",
      upload_session_id: "up-1",
      part_size_bytes: 5 * 1024 * 1024,
      uploaded_parts: [],
    }),
    uploadDataPart: async () => {
      await enviarParte();
      return { analysis_id: "an-1", upload_session_id: "up-1", part_number: 1, etag: '"e-1"' };
    },
    completeDataUpload: async () => ({ analysis_id: "an-1", status: "receiving" }),
  } as unknown as Parameters<typeof CanonicalClientProvider>[0]["client"];
}

function montar(ui: React.ReactElement, client?: ReturnType<typeof clienteQue>) {
  window.localStorage.setItem("sentinela:language", "pt");
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CanonicalClientProvider client={client}>
        <MemoryRouter>
          <LanguageProvider>{ui}</LanguageProvider>
        </MemoryRouter>
      </CanonicalClientProvider>
    </QueryClientProvider>,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Cancelar está FORA — D15
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 1. pausa do transporte não se disfarça de cancelamento", () => {
  const CANCELA = /cancelar|cancel analysis|cancelar análise/i;

  it("a jornada não tem botão, rótulo nem chave de cancelar", () => {
    // Abortar no navegador não cancela nada no backend: a análise fica onde está e o dado pode
    // ter chegado. O botão prometia operação inexistente — CTA sem owner.
    for (const arq of AN01) {
      const f = semComentarios(ler(arq));
      // Case-INSENSÍVEL: a 1ª versão procurava `cancelar` minúsculo, e o gate provou que um
      // `<Button>Cancelar</Button>` passava batido. Fonte não basta — ver o caso seguinte.
      expect(f, `${arq} ainda oferece interromper`).not.toMatch(CANCELA);
    }
  });

  it("NA TELA, a pausa aparece durante o envio sem prometer cancelar a Analysis", async () => {
    const u = userEvent.setup();
    let resolver: (v: unknown) => void = () => {};
    montar(
      <UploadStep analysisId="an-1" scope={{ workspaceId: "ws-1" }} onUploaded={vi.fn()} />,
      clienteQue((() => new Promise((r) => { resolver = r; })) as unknown as () => Promise<never>),
    );
    const semCancelamento = () => {
      for (const c of screen.queryAllByRole("button")) {
        expect(c.textContent ?? "", "controle de cancelamento na tela").not.toMatch(CANCELA);
      }
    };
    semCancelamento();
    await u.upload(
      screen.getByLabelText(pt.canonicalAnalysis.upload.dropHint, { selector: "input" }),
      new File(["{}"], "base.jsonl", { type: "application/x-ndjson" }),
    );
    await u.click(screen.getByRole("button", { name: pt.canonicalAnalysis.upload.send }));
    // Durante o envio é exatamente quando o botão existia.
    expect(await screen.findByText(pt.canonicalAnalysis.upload.sending)).toBeTruthy();
    semCancelamento();
    expect(screen.getByRole("button", { name: pt.canonicalAnalysis.upload.pause })).toBeTruthy();
    resolver({});
  });

  it("a chave de i18n de cancelar sumiu dos dois idiomas", () => {
    for (const idioma of ["pt", "en"]) {
      const j = JSON.parse(ler(`src/i18n/${idioma}.json`));
      expect(j.canonicalAnalysis.upload.cancel, `${idioma} ainda oferece cancelar`).toBeUndefined();
    }
  });

  it("controle positivo: a varredura enxerga termos que existem nesses arquivos", () => {
    expect(semComentarios(ler(AN01[1]))).toContain("upload.mutate");
    expect(semComentarios(ler(INTENCAO))).toContain("create.mutate");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Falha de transporte ≠ rejeição do conteúdo ≠ falha permanente
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 2. falha de rede (scenario 5)", () => {
  it("o discriminador separa transporte de envelope público", () => {
    expect(ehFalhaDeTransporte(new TypeError("Failed to fetch"))).toBe(true);
    expect(ehFalhaDeTransporte(problema("invalid_input"))).toBe(false);
    expect(ehFalhaDeTransporte(problema("non_retryable_failure"))).toBe(false);
    expect(ehFalhaDeTransporte(null)).toBe(false);
    // Aborto é decisão de quem chamou, não queda de rede.
    expect(ehFalhaDeTransporte(new DOMException("x", "AbortError"))).toBe(false);
  });

  it("a queda de rede deixou de ser silenciosa e NÃO afirma que o dado não chegou", async () => {
    const u = userEvent.setup();
    montar(
      <UploadStep analysisId="an-1" scope={{ workspaceId: "ws-1" }} onUploaded={vi.fn()} />,
      clienteQue(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
    await u.upload(
      screen.getByLabelText(pt.canonicalAnalysis.upload.dropHint, { selector: "input" }),
      new File(["{}"], "base.jsonl", { type: "application/x-ndjson" }),
    );
    await u.click(screen.getByRole("button", { name: pt.canonicalAnalysis.upload.send }));

    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toContain(pt.canonicalAnalysis.upload.transport.title);
    // O que isto significa: incerteza declarada, não sucesso nem perda.
    expect(alerta.textContent).toContain(pt.canonicalAnalysis.upload.transport.meaning);
    // A ação é PERGUNTAR o estado, não adivinhar nem reenviar às cegas.
    expect(screen.getByRole("button", { name: pt.canonicalAnalysis.upload.transport.check })).toBeTruthy();
    // Multipart é retomável: além de consultar, pode continuar enviando somente as partes ausentes.
    expect(screen.getByRole("button", { name: pt.canonicalAnalysis.upload.continue })).toBeTruthy();
    expect(screen.queryByRole("button", { name: pt.canonicalAnalysis.upload.retry })).toBeNull();
    expect(screen.queryByRole("button", { name: pt.canonicalAnalysis.upload.send })).toBeNull();
  });

  it("a frase de transporte não promete nem nega o recebimento", () => {
    const m = pt.canonicalAnalysis.upload.transport.meaning.toLowerCase();
    // Nada de "não foi enviado" / "falhou o envio": `POST /data` não exige `Idempotency-Key` no
    // contrato, então não há repetição segura publicada para sustentar essa afirmação.
    expect(m).not.toContain("não foi enviad");
    expect(m).not.toContain("não chegou");
    expect(m).toContain("não é possível saber");
  });

  it("transporte NÃO importa vocabulário de ERR-503", () => {
    const f = semComentarios(ler(AN01[1]));
    for (const alheio of ["capacity_wait", "temporarily_unavailable", "capacityWait"]) {
      expect(f, `AN-01 importou semântica de ERR-503: ${alheio}`).not.toContain(alheio);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Upload inválido (scenario 4) — erro SEM consumir a operação
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 3. invalid_input", () => {
  it("é estado inline com papel de alerta, nunca toast", () => {
    const f = semComentarios(ler(AN01[1]));
    // Nenhum toast nesta jornada: o erro mora onde ele aconteceu.
    expect(f).not.toContain("toast");
    expect(f).not.toContain("useToast");
    expect(f).toContain("ProblemFeedback");
  });

  it("nenhuma regra de arquivo é inventada no navegador", () => {
    // O backend valida a base canonicamente. Tamanho, contagem de linhas e formato não são
    // decididos aqui — inventar limite seria recusar dado que o contrato aceitaria.
    const f = semComentarios(ler(AN01[1]));
    for (const inventado of ["maxSize", "MAX_", "byteLength", "FileReader", ".text()", "JSON.parse"]) {
      expect(f, `regra de arquivo inventada: ${inventado}`).not.toContain(inventado);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. Seleção ≠ envio ≠ aceito ≠ análise iniciada
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 4. as distinções da jornada", () => {
  it("escolher arquivo NÃO envia nada", async () => {
    const u = userEvent.setup();
    const chamou = vi.fn(() => Promise.reject(new Error("não deveria ter sido chamado")));
    montar(
      <UploadStep analysisId="an-1" scope={{ workspaceId: "ws-1" }} onUploaded={vi.fn()} />,
      clienteQue(chamou as unknown as () => Promise<never>),
    );
    await u.upload(
      screen.getByLabelText(pt.canonicalAnalysis.upload.dropHint, { selector: "input" }),
      new File(["{}"], "base.jsonl", { type: "application/x-ndjson" }),
    );
    expect(chamou, "a seleção disparou a operação de upload").not.toHaveBeenCalled();
    // E o nome aparece como SELECIONADO, não como enviado.
    expect(screen.getByText(new RegExp(pt.canonicalAnalysis.upload.selectedFile))).toBeTruthy();
  });

  it("o upload não avança a jornada por conta própria — quem avança é o estado público", () => {
    const f = semComentarios(ler(AN01[1]));
    // Nada de navegar, nem de marcar `receiving` local: `onUploaded` revalida o status e o
    // backend diz onde a análise está.
    expect(f).not.toContain("navigate(");
    expect(f).not.toContain('"receiving"');
    expect(f).toContain("onUploaded");
  });

  it("o upload é alcançável sem mouse: input nativo com label", () => {
    const f = semComentarios(ler(AN01[1]));
    expect(f).toContain('type="file"');
    expect(f).toContain("htmlFor");
    // Nenhum caminho exclusivo de arrastar-e-soltar.
    expect(f).not.toContain("onDrop");
    expect(f).not.toContain("dragover");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. idempotency_conflict (scenario 31)
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 5. o 409 do prepare", () => {
  // O estado do 409 mora no hook; a COPY que o nomeia, na pagina. Os dois juntos sao a
  // superficie que este describe julga.
  const INICIO = () => semComentarios(ler(INTENCAO)) + semComentarios(ler(AN01[0]));

  it("tem estado próprio, e não vira erro genérico", () => {
    const f = INICIO();
    expect(f).toContain('problemCodeOf(create.error) === "idempotency_conflict"');
    expect(f).toContain("conflictTitle");
    expect(f).toContain("conflictMeaning");
  });

  it("não cria análise em silêncio: nenhum retry automático, nenhuma navegação no erro", () => {
    const f = INICIO();
    // `reset` da intenção acontece no erro — mas nada é reenviado. Um segundo início exige um
    // segundo clique, que é uma segunda intenção declarada por uma pessoa.
    // A forma literal antiga sumiu com a M37, e asserção que proíbe texto inexistente passa por
    // vacuidade. O que vale é a garantia: existe UM único disparo, e ele é o do clique.
    expect(f.split("create.mutate(").length - 1, "mais de um disparo de prepare").toBe(1);
    const trecho = f.slice(f.indexOf("onError:"), f.indexOf("onError:") + 150);
    expect(trecho).not.toContain("mutate");
    expect(trecho).not.toContain("navigate");
  });

  it("a chave é reusada no retry da MESMA intenção e trocada só em desfecho definitivo", () => {
    // Lifecycle provado antes de mexer: `intent.ts` cria na primeira vez, reusa depois, e o reset
    // é para desfecho definitivo. Sucesso é um; recusa por repetição é outro — insistir com a
    // mesma chave conflitaria para sempre.
    const intent = semComentarios(ler("src/features/canonical-analysis/data/intent.ts"));
    expect(intent).toContain("if (keyRef.current === null) keyRef.current = novoId();");
    const f = INICIO();
    expect(f).toContain("intent.ensure()");
    expect(f).toContain("intent.reset()");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. Os quatro scenarios da missão, e só eles
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 6. scenarios 3, 4, 5, 31", () => {
  const CATALOGO = () => ler("src/mocks/scenarios/catalogo.ts");

  it("os quatro existem, estão disponíveis e pertencem a AN-01", () => {
    const c = CATALOGO();
    for (const nome of ["analysis-uploading", "upload-invalid", "upload-network-failure", "idempotency-conflict"]) {
      const i = c.indexOf(`id: "${nome}"`);
      expect(i, `scenario ausente: ${nome}`).toBeGreaterThan(-1);
      const bloco = c.slice(i, i + 260);
      expect(bloco, `${nome} não é de AN-01`).toContain('"AN-01"');
      expect(bloco, `${nome} não está disponível`).toContain('estado: "disponivel"');
    }
  });

  it("o scenario 22 continua bloqueado e fora desta missão", () => {
    const c = CATALOGO();
    const i = c.indexOf('id: "recommendation-persisted"');
    expect(c.slice(i, i + 200)).toContain('estado: "bloqueado"');
    // E AN-01 não o menciona em lugar nenhum.
    for (const arq of AN01) expect(semComentarios(ler(arq))).not.toContain("recommendation");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 7. O CLIENTE REAL, não o injetado
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 7. a queda de rede atravessa o cliente canônico", () => {
  // Os casos da seção 2 injetam um cliente que rejeita com `TypeError` cru — e passavam ANTES
  // da correção, porque o cliente real não fazia isso. A captura em navegador mostrou a AN-01
  // dizendo "O serviço está temporariamente indisponível" numa queda de rede: o cliente
  // colapsava a rejeição do `fetch` em `temporarily_unavailable`, importando o vocabulário de
  // ERR-503 para um caso em que o dado PODE ter sido recebido.
  //
  // O seam injetável tinha reduzido a saída do teste. Este caso usa o cliente de verdade.
  const clienteReal = (rejeitar: unknown) =>
    createV1Client({
      baseUrl: "https://gw.test/",
      getAccessToken: async () => "tok",
      fetchImpl: (() => Promise.reject(rejeitar)) as unknown as typeof fetch,
      newCorrelationId: () => "corr-1",
      newIdempotencyKey: () => "idem-1",
    });

  it("rejeição do `fetch` vira `TransportError`, e a AN-01 a reconhece", async () => {
    const client = clienteReal(new TypeError("Failed to fetch"));
    const erro = await client
      .uploadData("an-1", { workspaceId: "ws-1" }, new Blob(["{}"]))
      .then(() => null, (e: unknown) => e);
    expect(erro).toBeInstanceOf(TransportError);
    expect(ehFalhaDeTransporte(erro), "a superfície trataria como resposta do servidor").toBe(true);
  });

  it("o código público continua sendo um dos nove — nada novo foi publicado", async () => {
    const client = clienteReal(new TypeError("Failed to fetch"));
    const erro = (await client
      .uploadData("an-1", { workspaceId: "ws-1" }, new Blob(["{}"]))
      .catch((e: unknown) => e)) as ProblemError;
    expect(erro).toBeInstanceOf(ProblemError);
    expect(erro.problem.code).toBe("temporarily_unavailable");
  });

  it("resposta do SERVIDOR com 503 NÃO é transporte — o servidor respondeu", async () => {
    const client = createV1Client({
      baseUrl: "https://gw.test/",
      getAccessToken: async () => "tok",
      fetchImpl: (async () =>
        new Response(JSON.stringify({ code: "temporarily_unavailable" }), {
          status: 503,
          headers: { "content-type": "application/problem+json" },
        })) as unknown as typeof fetch,
      newCorrelationId: () => "corr-1",
      newIdempotencyKey: () => "idem-1",
    });
    const erro = await client
      .uploadData("an-1", { workspaceId: "ws-1" }, new Blob(["{}"]))
      .then(() => null, (e: unknown) => e);
    expect(erro).toBeInstanceOf(ProblemError);
    expect(erro).not.toBeInstanceOf(TransportError);
    expect(ehFalhaDeTransporte(erro)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 8. A jornada é visível — achado do /ux-heuristics
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M33 · 8. onde a pessoa está", () => {
  it("a tela de upload diz que a análise foi RESERVADA", () => {
    // Medido em 8,46: vindo de `/analyses/new` nada confirmava a criação. Não é stepper: é o
    // estado público dito em palavras.
    //
    // 🔎 **A segunda metade deste caso subiu de nível, e não sumiu.**
    //
    // Ele também afirmava "e QUAL é ela", montando `UploadStep` isolado e procurando o
    // identificador dentro dele. O identificador estava ali porque `preparing` era o ÚNICO dos
    // oito estados que o mostrava — os outros sete não diziam qual análise era.
    //
    // A identidade passou a viver no cabeçalho da página, uma vez, para os oito. Repeti-la aqui
    // daria duas respostas para a mesma pergunta na mesma tela, e foi assim que este caso
    // reprovou: `getByText` achou o identificador DUAS vezes.
    //
    // Quem prova a identidade agora é `an01-m33-barra.test.tsx`, que monta a PÁGINA em
    // `preparing` e exige `an-abc` no corpo — o nível certo, porque o fato sempre foi sobre a
    // tela e nunca sobre este componente. Aqui fica o que `UploadStep` de fato possui.
    montar(<UploadStep analysisId="an-xyz" scope={{ workspaceId: "ws-1" }} onUploaded={vi.fn()} />);
    expect(screen.getByText(pt.canonicalAnalysis.upload.journeyReserved)).toBeTruthy();
    // E o componente NÃO reintroduz a identidade por conta própria: se alguém a trouxer de volta
    // para cá, a tela volta a responder duas vezes e este caso reprova.
    expect(screen.queryByText("an-xyz")).toBeNull();
  });

  it("o subtítulo do prepare descreve o que AQUELA tela faz", () => {
    // A reserva agora é automática: a tela comunica a abertura segura sem pedir um segundo clique.
    const sub = pt.canonicalAnalysis.entry.subtitle.toLowerCase();
    expect(sub).toContain("espaço seguro");
    expect(sub).toContain("base");
  });

  it("os dois avisos da jornada usam UM componente, não duas cópias", () => {
    for (const arq of AN01) {
      const f = semComentarios(ler(arq));
      expect(f, `${arq} voltou a desenhar o cartão à mão`).toContain("AvisoDaJornada");
      expect(f).not.toContain('role="alert" className="space-y-2 rounded-md');
    }
  });
});
