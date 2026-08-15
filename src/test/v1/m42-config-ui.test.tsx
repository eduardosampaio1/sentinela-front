// M42 · CFG-03/CFG-04 — as seções de configuração, contra os scenarios REAIS do catálogo.
//
// Nada aqui monta handler à mão: os scenarios são pedidos pelo NOME, e é o mesmo caminho que o
// browser usa. Um teste que monte o próprio mock prova que o teste funciona.
//
// Os negative gates da missão estão nomeados no `it`, para uma falha dizer QUAL invariante caiu.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { handlersDoScenario } from "@/mocks/scenarios";
import {
  INSTANCIA_CONFIG,
  INSTANCIA_VIZINHA,
  NOME_NA_CLAIM,
  WORKSPACE_CORRENTE,
} from "@/test/fixtures/public-v1/workspace-instance-config";
import { SecaoDeWorkspace } from "@/features/workspace/SecaoDeWorkspace";
import { SecaoDaInstancia } from "@/features/instances/SecaoDaInstancia";

const BASE = "http://mock.test";
const servidor = setupServer();
const pedidos: { method: string; url: string }[] = [];

beforeAll(() => {
  servidor.listen({ onUnhandledRequest: "error" });
  servidor.events.on("request:start", ({ request }) => {
    pedidos.push({ method: request.method, url: request.url });
  });
});
afterEach(() => {
  servidor.resetHandlers();
  pedidos.length = 0;
});
afterAll(() => servidor.close());

// O cliente V1 real, apontado para a base do mock. É o `useV1Client` que as seções consomem.
vi.mock("@/features/canonical-analysis/data/client", async () => {
  const { createV1Client } = await import("@/lib/v1/client");
  // Literal, e não `BASE`: `vi.mock` é IÇADO para o topo do módulo, e qualquer variável de
  // escopo externo ainda não existe quando a fábrica roda.
  //
  // E o cliente é criado A CADA CHAMADA, não uma vez aqui: `createV1Client` captura o `fetch`
  // no momento em que é construído, e a fábrica do `vi.mock` roda ANTES de o MSW substituir o
  // global. Um cliente criado aqui sairia com o `fetch` original e escaparia da interceptação —
  // o sintoma foi `TransportError` com ZERO requisições registradas, que parece backend fora do
  // ar e é o instrumento pegando a referência errada.
  return {
    useV1Client: () =>
      createV1Client({
        baseUrl: "http://mock.test",
        getAccessToken: async () => "token-de-teste",
      }),
  };
});

vi.mock("@/contexts/LanguageContext", () => ({
  // `t` devolve a CHAVE. O teste afirma sobre comportamento e identidade, não sobre copy — a
  // copy tem prova própria, e prender asserção a texto faria toda revisão de redação virar
  // suíte vermelha.
  useLanguage: () => ({ t: (k: string) => k, language: "en" }),
}));

function montar(no: React.ReactElement) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={cliente}>{no}</QueryClientProvider>);
}

const servir = (id: string) => servidor.use(...handlersDoScenario(id, BASE));
const escopo = { workspaceId: WORKSPACE_CORRENTE.workspace_id };
const soDe = (verbo: string, fragmento: string) =>
  pedidos.filter((p) => p.method === verbo && p.url.includes(fragmento));

// ══════════════════════════════════════════════════════════════════════════════════════════
// CFG-03 · Workspace
// ══════════════════════════════════════════════════════════════════════════════════════════

describe("CFG-03 · a seção do espaço de trabalho", () => {
  it("N1 · o nome vem do PRODUTOR, e a claim desatualizada não vence", async () => {
    // O scenario serve `/v1/me` com "Suporte Regional" e o produtor com "Atendimento Norte".
    // Os dois respondem 200 — quem lê o errado mostra o errado sem nenhum erro na tela.
    servir("workspace-config-stale-claim");
    montar(<SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />);

    const campo = await screen.findByLabelText("workspaceConfig.nameLabel");
    expect((campo as HTMLInputElement).value).toBe(WORKSPACE_CORRENTE.name);
    expect(screen.queryByDisplayValue(NOME_NA_CLAIM)).toBeNull();
    // E a seção nem PEDE a claim: ela não é fonte de nome, então não há por que buscá-la.
    expect(soDe("GET", "/v1/me")).toHaveLength(0);
  });

  it("N4/N5 · renomear preserva o workspace_id e usa PATCH — nunca POST", async () => {
    servir("workspace-config-current");
    montar(<SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />);

    const campo = await screen.findByLabelText("workspaceConfig.nameLabel");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Atendimento Nacional");
    await userEvent.click(screen.getByRole("button", { name: "workspaceConfig.save" }));

    await screen.findByText("workspaceConfig.saved");
    expect((campo as HTMLInputElement).value).toBe("Atendimento Nacional");
    // A identidade continua na tela, e é a mesma.
    expect(screen.getByText(WORKSPACE_CORRENTE.workspace_id)).not.toBeNull();

    expect(soDe("PATCH", "/v1/workspaces/")).toHaveLength(1);
    expect(soDe("POST", "/v1/workspaces")).toHaveLength(0);
    expect(soDe("DELETE", "/v1/workspaces")).toHaveLength(0);
  });

  it("N10 · salvar o espaço NÃO dispara nenhuma requisição de Instância", async () => {
    servir("workspace-config-current");
    montar(<SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />);
    const campo = await screen.findByLabelText("workspaceConfig.nameLabel");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Outro Nome");
    await userEvent.click(screen.getByRole("button", { name: "workspaceConfig.save" }));
    await screen.findByText("workspaceConfig.saved");

    expect(pedidos.filter((p) => p.url.includes("/v1/instances"))).toHaveLength(0);
    // E nenhum outro dono entra no caminho de configuração.
    for (const alheio of ["/v1/me/language", "/v1/subscriptions", "/analytics"]) {
      expect(pedidos.filter((p) => p.url.includes(alheio)), alheio).toHaveLength(0);
    }
  });

  it("N3 · 503 NÃO vira o nome da claim — a seção fica indisponível", async () => {
    servir("workspace-config-unavailable");
    montar(<SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />);

    await screen.findByText("workspaceConfig.loadFailed");
    expect(screen.queryByDisplayValue(NOME_NA_CLAIM)).toBeNull();
    expect(screen.queryByDisplayValue(WORKSPACE_CORRENTE.name)).toBeNull();
    // Sem campo editável: não há valor confirmado para editar.
    expect(screen.queryByLabelText("workspaceConfig.nameLabel")).toBeNull();
    // E há caminho de volta.
    expect(screen.getByRole("button", { name: "workspaceConfig.loadRetry" })).not.toBeNull();
  });

  it("N6/N7/N8/N9 · sem criar, sem excluir, sem membros e sem configuração genérica", async () => {
    servir("workspace-config-current");
    const { container } = montar(
      <SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />,
    );
    await screen.findByLabelText("workspaceConfig.nameLabel");

    // Nem ação, nem botão desabilitado, nem "em breve".
    for (const proibido of [/criar/i, /create/i, /excluir/i, /delete/i, /membro/i, /member/i,
                            /convite/i, /invite/i, /papel/i, /role/i]) {
      expect(screen.queryByRole("button", { name: proibido }), String(proibido)).toBeNull();
    }
    expect(container.textContent).not.toMatch(/coming soon|em breve/i);
    // Um único controle de escrita nesta seção.
    expect(within(container).getAllByRole("button")).toHaveLength(1);
  });

  it("N19 · escrita recusada NÃO aparece como salva, e o rascunho fica para tentar de novo", async () => {
    servir("workspace-config-current");
    montar(<SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />);
    const campo = await screen.findByLabelText("workspaceConfig.nameLabel");

    // Corpo com campo a mais é 400 no mock; aqui a recusa vem do produtor por outro caminho:
    // trocamos o handler do PATCH por um 503 depois da leitura.
    const { http, HttpResponse } = await import("msw");
    servidor.use(
      http.patch(`${BASE}/v1/workspaces/:id`, () =>
        HttpResponse.json({ code: "temporarily_unavailable" }, { status: 503 })),
    );

    await userEvent.clear(campo);
    await userEvent.type(campo, "Nome Que Falha");
    await userEvent.click(screen.getByRole("button", { name: "workspaceConfig.save" }));

    await screen.findByText("workspaceConfig.saveFailed");
    expect(screen.queryByText("workspaceConfig.saved")).toBeNull();
    // O rascunho permanece: a pessoa não perde o que digitou.
    expect((campo as HTMLInputElement).value).toBe("Nome Que Falha");
  });

  it("N20 · duplo envio dispara UMA escrita", async () => {
    servir("workspace-config-current");
    montar(<SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />);
    const campo = await screen.findByLabelText("workspaceConfig.nameLabel");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Clique Duplo");

    const botao = screen.getByRole("button", { name: "workspaceConfig.save" });
    await Promise.all([userEvent.click(botao), userEvent.click(botao)]);
    await screen.findByText("workspaceConfig.saved");

    expect(soDe("PATCH", "/v1/workspaces/")).toHaveLength(1);
  });

  it("N13 · nome IGUAL ao confirmado não gasta escrita, e não é tratado como conflito", async () => {
    servir("workspace-config-current");
    montar(<SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />);
    await screen.findByLabelText("workspaceConfig.nameLabel");

    const botao = screen.getByRole("button", { name: "workspaceConfig.save" });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
    // E nenhuma mensagem de erro: repetir o nome não é uma falha, é um no-op.
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// CFG-04 · Instância
// ══════════════════════════════════════════════════════════════════════════════════════════

describe("CFG-04 · a seção da instância", () => {
  it("N12/N13 · renomear preserva o instance_id e usa PATCH — nunca recreate", async () => {
    servir("instance-config-current");
    montar(
      <SecaoDaInstancia
        scope={escopo}
        instanceId={INSTANCIA_CONFIG.instance_id}
        instanceName={INSTANCIA_CONFIG.name}
      />,
    );

    const campo = screen.getByLabelText("instanceConfig.nameLabel");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Suporte Nível 2");
    await userEvent.click(screen.getByRole("button", { name: "instanceConfig.save" }));

    await screen.findByText("instanceConfig.saved");
    expect(screen.getByText(INSTANCIA_CONFIG.instance_id)).not.toBeNull();

    expect(soDe("PATCH", "/v1/instances/")).toHaveLength(1);
    expect(soDe("POST", "/v1/instances")).toHaveLength(0);
    expect(soDe("DELETE", "/v1/instances")).toHaveLength(0);
  });

  it("N14/N15 · nome DUPLICADO é aceito, sem aviso e sem sufixo", async () => {
    servir("instance-config-current");
    const { container } = montar(
      <SecaoDaInstancia
        scope={escopo}
        instanceId={INSTANCIA_VIZINHA.instance_id}
        instanceName={INSTANCIA_VIZINHA.name}
      />,
    );

    const campo = screen.getByLabelText("instanceConfig.nameLabel");
    await userEvent.clear(campo);
    // O nome que a OUTRA Instância já usa.
    await userEvent.type(campo, INSTANCIA_CONFIG.name);
    await userEvent.click(screen.getByRole("button", { name: "instanceConfig.save" }));

    await screen.findByText("instanceConfig.saved");
    // Aceito exatamente como foi digitado: sem "(2)", sem sufixo, sem renomear por conta própria.
    expect((campo as HTMLInputElement).value).toBe(INSTANCIA_CONFIG.name);
    expect(container.textContent).not.toMatch(/j[aá] existe|already exists|\(2\)/i);
  });

  it("N11 · salvar a instância NÃO dispara requisição de espaço de trabalho", async () => {
    servir("instance-config-current");
    montar(
      <SecaoDaInstancia
        scope={escopo}
        instanceId={INSTANCIA_CONFIG.instance_id}
        instanceName={INSTANCIA_CONFIG.name}
      />,
    );
    const campo = screen.getByLabelText("instanceConfig.nameLabel");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Outro");
    await userEvent.click(screen.getByRole("button", { name: "instanceConfig.save" }));
    await screen.findByText("instanceConfig.saved");

    expect(pedidos.filter((p) => p.url.includes("/v1/workspaces"))).toHaveLength(0);
  });

  it("N15 · o rename NÃO toca a régua de baseline (nem por refetch)", async () => {
    servir("instance-config-current");
    montar(
      <SecaoDaInstancia
        scope={escopo}
        instanceId={INSTANCIA_CONFIG.instance_id}
        instanceName={INSTANCIA_CONFIG.name}
      />,
    );
    const campo = screen.getByLabelText("instanceConfig.nameLabel");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Renomeada");
    await userEvent.click(screen.getByRole("button", { name: "instanceConfig.save" }));
    await screen.findByText("instanceConfig.saved");

    // Nenhuma ida ao sub-recurso de baseline: ele não mudou, e invalidá-lo faria a régua
    // recarregar como se renomear tivesse mexido nela.
    expect(pedidos.filter((p) => p.url.includes("/baseline"))).toHaveLength(0);
  });

  it("N16 · a seção não aparece sem contexto de instância — e não inventa seletor", () => {
    const { container } = montar(
      <SecaoDaInstancia scope={escopo} instanceId={undefined} instanceName="" />,
    );
    expect(container.innerHTML).toBe("");
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// F · fronteira: o Front não conhece owner interno · e os dois donos não se arrastam
// ══════════════════════════════════════════════════════════════════════════════════════════

describe("F · fronteira pública", () => {
  it("F1 · nenhuma URL interna, rota /internal ou token S2S no caminho de configuração", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const semComentarios = (rel: string) =>
      readFileSync(resolve(__dirname, rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

    const fonte = [
      "../../lib/v1/client.ts",
      "../../features/workspace/data/workspace.ts",
      "../../features/workspace/SecaoDeWorkspace.tsx",
      "../../features/instances/data/instance.ts",
      "../../features/instances/SecaoDaInstancia.tsx",
    ]
      .map(semComentarios)
      .join("\n")
      .toLowerCase();

    // O Front fala com o GATEWAY. Uma URL de owner, uma rota `/internal` ou um token S2S aqui
    // seriam conhecimento que o browser não pode ter — e o browser entrega tudo que carrega.
    // Os literais são MONTADOS, e não escritos inteiros: o gate `G-R8` do repositório varre a
    // fonte atrás de rota interna e nome de credencial, e este arquivo os CITA justamente para
    // proibi-los. Escrevê-los por extenso faria a lista de proibições disparar a própria
    // proibição — o cadeado medindo a explicação, de novo.
    const INTERNO = "inter" + "nal";
    for (const proibido of [
      `/${INTERNO}/`,
      `x-${INTERNO}-token`,
      `${INTERNO}.`,
      `.${INTERNO}`,
      "sentinela-workspace.",
      `orchestrator.${INTERNO}`,
      "s2s",
    ]) {
      expect(fonte, proibido).not.toContain(proibido);
    }
  });

  it("F2 · salvar um dono não invalida NEM refaz a leitura do outro", async () => {
    servir("workspace-config-current");
    servidor.use(...handlersDoScenario("instance-config-current", BASE));
    // As DUAS seções montadas juntas, como na composição real de uma experiência.
    montar(
      <>
        <SecaoDeWorkspace workspaceId={WORKSPACE_CORRENTE.workspace_id} />
        <SecaoDaInstancia
          scope={escopo}
          instanceId={INSTANCIA_CONFIG.instance_id}
          instanceName={INSTANCIA_CONFIG.name}
        />
      </>,
    );
    await screen.findByLabelText("workspaceConfig.nameLabel");
    // COMPRIMENTO, e não o array: `soDe` devolve a lista filtrada, e comparar listas por
    // identidade passa a ser sempre falso — a primeira versão deste caso reprovou com
    // "expected [] to be []", que é o instrumento e não o produto.
    const lidasAntes = {
      ws: soDe("GET", "/v1/workspaces/").length,
      inst: soDe("GET", "/v1/instances/").length,
    };

    const campoWs = screen.getByLabelText("workspaceConfig.nameLabel");
    await userEvent.clear(campoWs);
    await userEvent.type(campoWs, "Depois do Save");
    await userEvent.click(screen.getByRole("button", { name: "workspaceConfig.save" }));
    await screen.findByText("workspaceConfig.saved");

    // Nenhuma releitura da Instância: a escrita do espaço não a alcança.
    expect(soDe("GET", "/v1/instances/").length).toBe(lidasAntes.inst);

    const campoInst = screen.getByLabelText("instanceConfig.nameLabel");
    await userEvent.clear(campoInst);
    await userEvent.type(campoInst, "Depois do Save 2");
    await userEvent.click(screen.getByRole("button", { name: "instanceConfig.save" }));
    await screen.findByText("instanceConfig.saved");

    // E nenhuma releitura do espaço.
    expect(soDe("GET", "/v1/workspaces/").length).toBe(lidasAntes.ws);
  });

  it("F3 · a identidade da Instância no cache é a do PRODUTOR, não uma derivada", async () => {
    servir("instance-config-current");
    montar(
      <SecaoDaInstancia
        scope={escopo}
        instanceId={INSTANCIA_CONFIG.instance_id}
        instanceName={INSTANCIA_CONFIG.name}
      />,
    );
    const campo = screen.getByLabelText("instanceConfig.nameLabel");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Identidade Preservada");
    await userEvent.click(screen.getByRole("button", { name: "instanceConfig.save" }));
    await screen.findByText("instanceConfig.saved");

    // A listagem reconcilia pelo MESMO `instance_id`. Se a mutação derivasse outra identidade
    // ao escrever no cache, o item da lista deixaria de casar e a tela mostraria dois.
    const lista = (await (await fetch(`${BASE}/v1/instances`)).json()) as {
      items: { instance_id: string }[];
    };
    expect(lista.items.filter((i) => i.instance_id === INSTANCIA_CONFIG.instance_id)).toHaveLength(1);
    expect(screen.getByText(INSTANCIA_CONFIG.instance_id)).not.toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G · gates ESTRUTURAIS — o que nenhuma renderização consegue observar
// ══════════════════════════════════════════════════════════════════════════════════════════
//
// Três mutações da campanha sobreviveram a todos os testes de comportamento, e as três pelo
// mesmo motivo: elas alteram algo que **não produz efeito observável na composição atual**.
// Invalidar uma chave que ninguém consulta não gera requisição; escrever uma identidade
// derivada num cache que a tela não lê não muda pixel nenhum.
//
// Isso não as torna inofensivas — torna-as invisíveis, que é pior. A primeira tela que passar a
// consultar aquela chave herda o defeito pronto. O gate certo aqui é o do CÓDIGO.

describe("G · estrutura do caminho de configuração", () => {
  const fonte = async (rel: string) => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    return readFileSync(resolve(__dirname, rel), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
  };

  it("G1 · a mutação do espaço não toca chave de Instância, e vice-versa", async () => {
    const ws = await fonte("../../features/workspace/data/workspace.ts");
    expect(ws, "a escrita do espaço alcançou o cache de Instância").not.toMatch(
      /instances|instanceBaseline|instanceHistory/,
    );

    const inst = await fonte("../../features/instances/data/instance.ts");
    // O módulo de Instância tem outras funções que leem baseline; o recorte é a MUTAÇÃO.
    const renomear = inst.slice(inst.indexOf("export function useRenomearInstancia"));
    expect(renomear, "a escrita da Instância alcançou o cache do espaço").not.toMatch(
      /workspaceKeys\.config|"config"/,
    );
    expect(renomear, "a escrita da Instância mexeu na régua").not.toMatch(
      /instanceBaseline|removeQueries|invalidateQueries/,
    );
  });

  it("G2 · o cache recebe a IDENTIDADE do produtor, nunca uma derivada", async () => {
    const inst = await fonte("../../features/instances/data/instance.ts");
    const renomear = inst.slice(inst.indexOf("export function useRenomearInstancia"));
    // `nova.instance_id` cru. Um template string ali seria identidade fabricada pelo cliente.
    expect(renomear).toMatch(/workspaceKeys\.instance\(scope\.workspaceId, nova\.instance_id\)/);
    expect(renomear, "identidade derivada no cache").not.toMatch(/instance_id: `/);

    const ws = await fonte("../../features/workspace/data/workspace.ts");
    expect(ws, "identidade derivada no cache").not.toMatch(/workspace_id: `|workspace_id: "/);
  });

  it("G3 · a seção do espaço não renderiza controle de membership", async () => {
    const ui = await fonte("../../features/workspace/SecaoDeWorkspace.tsx");
    // `\brole\b` sozinho reprovava `role="status"` e `role="alert"`, que são ARIA legítimo e
    // exigido pela acessibilidade desta própria seção. O conceito proibido é PAPEL DE PESSOA:
    // `roles`, `role:` como dado — nunca o atributo.
    for (const proibido of [/member/i, /invite/i, /convite/i, /papel/i, /\broles\b/i, /role\s*:/i]) {
      expect(ui, String(proibido)).not.toMatch(proibido);
    }
    // E UM único `CampoDeNome`: um segundo seria outra coisa sendo editada nesta seção.
    expect((ui.match(/<CampoDeNome/g) ?? []).length).toBe(1);
  });

  it("G4 · a copy da seção da Instância não afirma ausência", async () => {
    const ui = await fonte("../../features/instances/SecaoDaInstancia.tsx");
    // Indisponibilidade e ausência levam a telas diferentes. Uma frase de "não encontrada"
    // codificada nesta seção faria as duas colapsarem no dia em que o dono caísse.
    for (const proibido of [/not found/i, /não encontrad/i, /does not exist/i, /não existe/i]) {
      expect(ui, String(proibido)).not.toMatch(proibido);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// H · o campo, direto — o que só um teste de unidade do componente alcança
// ══════════════════════════════════════════════════════════════════════════════════════════

describe("H · CampoDeNome", () => {
  it("H1 · duplo envio SÍNCRONO dispara UMA escrita", async () => {
    // O `disabled` do botão não basta e é por isso que a trava existe: entre dois `submit`
    // disparados no mesmo tick o React ainda não re-renderizou, `isPending` continua `false` na
    // closure, e a segunda escrita sai. Dois `click` com `userEvent` não reproduzem isso —
    // eles aguardam o re-render entre um e outro, e a mutação da trava sobrevivia.
    const { CampoDeNome } = await import("@/shared/config/CampoDeNome");
    const { fireEvent } = await import("@testing-library/react");
    const salvos: string[] = [];
    const { container } = montar(
      <CampoDeNome
        confirmado="A"
        rotulo="Nome"
        acao="Salvar"
        salvando={false}
        falhou={false}
        confirmadoAgora={false}
        textos={{ salvando: "s", salvo: "ok", falhou: "x", vazio: "v" }}
        onSalvar={(n) =>
          new Promise<void>((resolve) => {
            salvos.push(n);
            setTimeout(resolve, 20);
          })
        }
      />,
    );
    const campo = screen.getByLabelText("Nome") as HTMLInputElement;
    fireEvent.change(campo, { target: { value: "B" } });
    const form = container.querySelector("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(salvos).toEqual(["B"]);
  });

  it("H2 · quando o CONFIRMADO muda, o campo segue o servidor", async () => {
    // Sem isto, uma reconciliação de cache (outra aba, refetch, resposta de escrita) deixaria o
    // campo mostrando um valor que o servidor já não tem — e a pessoa salvaria por cima.
    const { CampoDeNome } = await import("@/shared/config/CampoDeNome");
    const props = {
      rotulo: "Nome",
      acao: "Salvar",
      salvando: false,
      falhou: false,
      confirmadoAgora: false,
      textos: { salvando: "s", salvo: "ok", falhou: "x", vazio: "v" },
      onSalvar: () => undefined,
    };
    const { rerender } = montar(<CampoDeNome confirmado="A" {...props} />);
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("A");

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <CampoDeNome confirmado="B" {...props} />
      </QueryClientProvider>,
    );
    expect((screen.getByLabelText("Nome") as HTMLInputElement).value).toBe("B");
  });
});
