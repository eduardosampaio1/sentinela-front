// M18 — o CATÁLOGO canônico dos cenários de mock.
//
// ## Por que o catálogo tem 44 entradas e não 41
//
// O Blueprint §11 lista **44**. Destes, **41 são executáveis**, **1 é parcial** (`needs-mapping`:
// exibir sim, resolver não) e **2 estão BLOQUEADOS** por delta de backend que não existe.
//
// (Este bloco dizia 35/31/3 até a M41. Ele tinha ficado para trás em três missões — o número
// aqui não é gate de ninguém, e por isso envelheceu em silêncio.)
//
// Eram 32/27/1/4. A **BD02** desbloqueou `instance-empty` (o delta de Instância deixou de faltar),
// a **M36** acrescentou `instance-present` e `instance-history`, e o **Checkpoint 0 da M37**
// acrescentou `instance-new-analysis` — os três representam produtor que já existe. O total cresce
// por DECISÃO de produto, registrada no Blueprint antes de chegar aqui — nunca porque o código
// precisou de mais um caso.
//
// E há o simétrico: **INST-02 e INST-07 não entram**, porque lhes falta PRODUTOR, não massa. Não
// existe estado corrente publicado nem operação de configuração (`update`/`PATCH`/`delete` não
// estão no contrato), e o D22 da INST-07 depende da BD04. Ficam declaradas no Blueprint.
//
// Os 5 não-executáveis ficam aqui, declarados, em vez de sumirem da lista. Um catálogo que só
// mostra o que funciona faz o que falta parecer inexistente — e é assim que alguém "descobre",
// três meses depois, que a tela de Instância nunca teve como ser montada.
//
// ## A regra que dá sentido a isso
//
// **Nenhuma fixture é inventada para os bloqueados.** Um mock que devolvesse um `instance` ou um
// `recommendation_id` plausível faria a tela montar, a demo funcionar e o delta de backend
// parecer feito. O bloqueio existe para ser visível, então pedir um bloqueado **lança** com a
// razão — não devolve vazio, não devolve "quase".
//
// Ausência ≠ zero · partial ≠ failed · withheld ≠ erro · delta ≠ drift.

import { http, HttpResponse } from "msw";
import type { HttpHandler } from "msw";
import type {
  AnalysisListPage,
  AnalyticsAxisState,
  EngineAxisState,
  ExportAxisState,
  FinalResultAxisState,
} from "@/lib/v1";
import {
  HANDLE,
  LIST_PAGE_1,
  LIST_PAGE_2,
  RESULT_VIEW,
  problem,
  statusView,
} from "@/test/fixtures/public-v1/analyses";
import {
  HISTORICO_PAGINA_1,
  HISTORICO_PAGINA_2,
  INSTANCIA,
  OUTRA_INSTANCIA,
} from "@/test/fixtures/public-v1/instances";
// M40 — a massa da Baseline Reference (BD10).
import {
  BASELINE_ESCOLHIDO,
  CANDIDATOS,
  COM_BASELINE,
  SEM_BASELINE,
  baselineEm,
  type BaselineView,
} from "@/test/fixtures/public-v1/baseline";
// A massa v3 da comparação. JSON, e não módulo TS, porque ela é SAÍDA de produtor: transcrevê-la
// para código convidaria a "ajustar um número" numa revisão, e o número deixaria de ser o que o
// motor produziu.
import V3_MASSA from "@/test/fixtures/canonical-result/v3-comparacao.json";
// M41 — a massa da conta: identidade (CFG-01) e preferência de idioma (CFG-02, BD11).
import {
  IDENTIDADE,
  IDIOMA_INVALIDO,
  INDISPONIVEL,
  projetar,
} from "@/test/fixtures/public-v1/account-language";
// M42 — a massa de configuração: Workspace (CFG-03, BD12) e Instance (CFG-04, BD13).
import {
  BASELINE_DA_INSTANCIA,
  CLAIM_DESATUALIZADA,
  INSTANCIA_CONFIG,
  INSTANCIA_VIZINHA,
  NOME_DUPLICADO,
  WORKSPACE_CORRENTE,
  type InstanceView,
  type WorkspaceView,
} from "@/test/fixtures/public-v1/workspace-instance-config";

export type EstadoDoScenario = "disponivel" | "parcial" | "bloqueado";

/** Os documentos v3 da comparação — produzidos pelo caminho real, não escritos aqui. */
const V3_COMPARACAO = V3_MASSA as {
  A: Record<string, unknown>;
  B: Record<string, unknown>;
  B_QUEBRA: Record<string, unknown>;
};

/**
 * O envelope PÚBLICO do resultado. Só os campos que `public-v1.json` declara — o artefato do
 * orchestrator traz mais (versão do assembler, do engine, fingerprint), e servi-los aqui faria o
 * scenario ensinar a tela a ler o que a fronteira pública não entrega.
 */
function envelopeV3(analysisId: string, documento: Record<string, unknown>) {
  return {
    analysis_id: analysisId,
    result_schema_version: "analysis-result-v3",
    indicator_registry_version: String(documento.indicator_registry_version),
    result: documento,
  };
}

export interface Scenario {
  /** Nome estável e único. É por ele que o cenário é invocado. */
  readonly id: string;
  /** Superfícies do Blueprint que ele alimenta. */
  readonly superficies: readonly string[];
  readonly estado: EstadoDoScenario;
  /**
   * Obrigatória em `bloqueado` e `parcial`. É o que a pessoa lê quando pede o cenário e ele
   * recusa — e é a diferença entre "não funciona" e "não existe ainda, por este motivo".
   */
  readonly razao?: string;
  /** Ausente em `bloqueado`, de propósito: não há o que servir sem inventar. */
  readonly handlers?: (base: string) => HttpHandler[];
}

const json = (b: unknown, s = 200) => HttpResponse.json(b as Record<string, unknown>, { status: s });

/**
 * M40 — os quatro seams da Baseline Reference (BD10), com estado por invocação.
 *
 * O estado mutável não é arquitetura nova: é o mesmo padrão do `instance-new-analysis`, um `let`
 * no escopo de `handlers()`. Cada `handlersDoScenario()` nasce sem memória, e um teste não herda o
 * que o anterior escreveu.
 *
 * Ele existe porque o contrato da BD10 **é** observável por transição: `POST` elege, `GET` lê,
 * `DELETE` limpa, e os dois últimos são idempotentes. Um mock estático não conseguiria dizer que
 * a troca A→B **não passa por `NO_BASELINE`** — que é justamente a garantia que a BD10 dá.
 *
 * ## O que estes handlers deliberadamente NÃO fazem
 *
 * - **não filtram candidatos.** A lista chega pronta; a elegibilidade tem dono, e não é o Front
 *   nem o mock. Recortar aqui por `status === "completed"` ensinaria a tela que a regra é dela;
 * - **não validam a eleição.** O produtor recusa Analysis inelegível com `409`, e essa recusa é
 *   gate do backend — não estado da UI de seleção normal;
 * - **não escolhem sozinhos.** Sem `POST`, o baseline fica `null` para sempre. `SENTINELA_AUTO_BASELINE`
 *   é o caminho legado que elege "a última concluída", D25 proíbe, e nenhuma massa daqui o imita.
 *
 * `baseline_eligible` é EXIGIDO no filtro: sem ele o handler devolve o histórico geral, como o
 * produtor real faria. Um mock que ignorasse o parâmetro aceitaria um Front que esqueceu de
 * enviá-lo — e a tela pareceria funcionar montando o seletor com a lista errada.
 */
function baselineHandlers(
  b: string,
  inicial: string | null,
  candidatos: AnalysisListPage["items"] = CANDIDATOS,
): HttpHandler[] {
  let atual: BaselineView = inicial === null ? SEM_BASELINE : COM_BASELINE;
  return [
    http.get(`${b}/v1/instances`, () => json({ items: [INSTANCIA], next_cursor: null })),
    http.get(`${b}/v1/instances/:id`, () => json(INSTANCIA)),

    http.get(`${b}/v1/instances/:id/baseline`, () => json(atual)),

    http.post(`${b}/v1/instances/:id/baseline`, async ({ request }) => {
      const corpo = (await request.json()) as { baseline_analysis_id?: string };
      const alvo = corpo?.baseline_analysis_id;
      if (!alvo) {
        // O produtor recusa corpo sem o campo. `null` NÃO é CLEAR disfarçado: remover a régua tem
        // operação própria, e uma operação faz uma coisa só.
        return json(problem("invalid_input"), 400);
      }
      atual = baselineEm(alvo);
      return json(atual);
    }),

    http.delete(`${b}/v1/instances/:id/baseline`, () => {
      // Idempotente: sem régua, continua `NO_BASELINE` — e é 200. Recusar o no-op obrigaria todo
      // cliente a "consulta-depois-limpa", que é a corrida de volta.
      atual = SEM_BASELINE;
      return json(atual);
    }),

    http.get(`${b}/v1/analyses`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      if (q.get("instance_id") !== INSTANCIA.instance_id) return json({ items: [], next_cursor: null });
      if (q.get("baseline_eligible") !== "true") {
        // Sem o filtro, isto é o HISTÓRICO da Instance, não a lista de candidatos. Devolver os
        // elegíveis aqui seria o mock completando o que o Front esqueceu de pedir.
        return json(HISTORICO_PAGINA_1);
      }
      return json({ items: candidatos, next_cursor: null });
    }),
  ];
}

/** Envelope problem+json, do catálogo canônico do cliente — não redigitado aqui. */
const erro = (base: string, rota: string, status: number, code: Parameters<typeof problem>[0]) =>
  http.get(`${base}${rota}`, () => json(problem(code), status));

const status1 = (base: string, s: Parameters<typeof statusView>[0]) =>
  http.get(`${base}/v1/analyses/:id`, () => json(statusView(s)));

/**
 * Progresso por eixo — TIPADO por eixo, desde a M34.
 *
 * A assinatura era `Record<string, string>`, e é exatamente o *"`estado: string` comum"* contra o
 * qual a M20 escreveu a união discriminada: ela aceita qualquer nome de eixo com qualquer estado.
 * O resultado foi `export: "pending"` em SETE scenarios — um estado que o eixo `export` não tem
 * (`unavailable · preparing · ready · expired · failed · unknown`), renderizado como
 * "Exportação — Pendente" nas capturas da AN-03.
 *
 * Agora cada eixo carrega o seu próprio vocabulário e o compilador recusa o impossível. O mock
 * deixa de poder expressar aquilo que o produtor público não pode publicar — que é a única forma
 * de o defeito não voltar. Nenhum tipo foi afrouxado para acomodar o catálogo; foi o catálogo que
 * se ajustou ao contrato.
 */
const progresso = (
  base: string,
  eixos: {
    engine: EngineAxisState;
    analytics: AnalyticsAxisState;
    export: ExportAxisState;
    final_result: FinalResultAxisState;
  },
) =>
  http.get(`${base}/v1/analyses/:id/progress`, () =>
    json({
      analysis_id: "an-abc",
      axes: Object.entries(eixos).map(([axis, state]) => ({ axis, state })),
    }),
  );

const analytics = (base: string, corpo: Record<string, unknown>) =>
  http.get(`${base}/v1/analyses/:id/analytics`, () => json({ analysis_id: "an-abc", ...corpo }));

/**
 * O catálogo. A ordem é a do Blueprint §11 — mantê-la é o que permite conferir os dois lado a
 * lado sem traduzir numeração.
 */
/**
 * M41 — os seams da conta: identidade e preferência de idioma (BD11).
 *
 * ## Duas rotas, e elas NÃO se fundem
 *
 * `GET /v1/me` é projeção de identidade a partir das claims, **sem I/O**. `GET /v1/me/language`
 * atravessa o Gateway até o `sentinela-account`. O backend as mantém separadas de propósito —
 * compor a preferência dentro da identidade faria uma leitura que hoje nunca falha passar a falhar
 * quando o Account cair, e a identidade é o que decide se a pessoa entra.
 *
 * Estes handlers respeitam isso: **duas respostas, nunca um objeto `account` que junte as duas**.
 * Um mock que as funde ensina a tela a esperar uma fusão que o backend não faz, e o defeito só
 * aparece contra o servidor real.
 *
 * ## Estado por invocação
 *
 * Mesmo padrão do baseline (M40) e do `instance-new-analysis` (M37): um `let` no escopo de
 * `handlers()`. Cada `handlersDoScenario()` nasce sem memória, e um teste não herda o que o
 * anterior escreveu. **Nenhum store paralelo**, nenhum `PreferenceEngine`.
 *
 * ## O que o handler deliberadamente NÃO faz
 *
 * - **não escreve na leitura.** `GET` é leitura e nada mais. Um mock que criasse a preferência no
 *   primeiro acesso fabricaria uma escolha para todo usuário, e a distinção `null` × `"en"` morreria
 *   no próprio mock;
 * - **não aceita subject do cliente.** Não há `user_subject` em corpo nem em query: do lado público
 *   quem determina o usuário é o contexto autenticado. Aceitá-lo aqui ensinaria a tela a mandá-lo;
 * - **não conhece a API interna.** Sem `x-internal-token`, sem `/internal/v1/accounts`, sem shape de
 *   banco. Mock é da fronteira PÚBLICA;
 * - **não oferece `CLEAR`.** Não há `DELETE`. Voltar para inglês é um `PUT` que termina em
 *   `stored: "en"`, e não em `null`;
 * - **não normaliza região.** `pt-BR` e `en-US` são recusados como qualquer outro valor fora do
 *   enum — converter no mock ensinaria a tela que a regra é dela.
 */
// ── M42 · configuração ────────────────────────────────────────────────────────────────────
//
// Dois construtores SEPARADOS, e a separação é a decisão. Um `configHandlers(b)` que servisse
// Workspace e Instance juntos seria o primeiro passo do `settingsStore` que nenhum contrato
// autoriza: a M42 compõe duas configurações na mesma tela, e compor não é fundir. Os donos são
// `sentinela-workspace` e o Orchestrator, e nenhum estado atravessa de um para o outro.
//
// A mutabilidade vive DENTRO do construtor, como em `contaHandlers`: cada invocação do scenario
// parte do estado canônico. Estado de módulo faria o segundo teste herdar o rename do primeiro.

/** `GET`/`PATCH` do Workspace, mutável. `name` é o único campo que a escrita aceita e move. */
function workspaceHandlers(b: string): HttpHandler[] {
  let atual: WorkspaceView = { ...WORKSPACE_CORRENTE };

  return [
    // `workspace_id` no CAMINHO, não na query: o recurso É o workspace. E ele não é prova de
    // autorização — o mock reproduz só o resultado público de quem JÁ está autorizado.
    http.get(`${b}/v1/workspaces/:workspaceId`, ({ params }) =>
      params.workspaceId === atual.workspace_id
        ? json(atual)
        : json(problem("forbidden_or_not_found"), 404)),

    http.patch(`${b}/v1/workspaces/:workspaceId`, async ({ params, request }) => {
      if (params.workspaceId !== atual.workspace_id) {
        return json(problem("forbidden_or_not_found"), 404);
      }
      const corpo = (await request.json()) as Record<string, unknown> | null;
      const chaves = Object.keys(corpo ?? {});
      // `extra=forbid` é do contrato: um corpo com `slug`/`members`/`settings` é recusado, e não
      // ignorado. Ignorar ensinaria a tela que o campo passou.
      if (chaves.length !== 1 || chaves[0] !== "name") {
        return json(problem("invalid_input"), 400);
      }
      const nome = corpo?.name;
      if (typeof nome !== "string" || nome.length < 1) {
        return json(problem("invalid_input"), 400);
      }
      // Renomear para o MESMO nome é 200 — o contrato não declara conflito, e inventar um aqui
      // seria a massa criando uma regra de produto que ninguém decidiu.
      //
      // **Spread, e não os três campos digitados.** Redigitar `workspace_id`/`created_at` aqui
      // reconstruiria o read model à mão — e o cadeado M18.5 do repositório acusou exatamente
      // isso. Além do gate, a razão é boa: um campo novo no contrato passaria a ser SILENCIOSAMENTE
      // descartado pelo rename, e o sintoma seria "o campo some quando eu renomeio".
      //
      // O que sobrevive vem do estado anterior, nunca do caminho nem do corpo: a resposta é a
      // linha persistida, não o eco da intenção.
      atual = { ...atual, name: nome };
      return json(atual);
    }),
  ];
}

/** `GET`/`PATCH` de Instance + o ponteiro de baseline, que o rename NÃO toca. */
function instanceHandlers(b: string, iniciais: readonly InstanceView[]): HttpHandler[] {
  const porId = new Map(iniciais.map((i) => [i.instance_id, { ...i }]));
  // O baseline vive FORA da view da Instance, como no contrato: ele é capacidade própria (BD10),
  // e não "mais uma configuração". Estar aqui serve a uma prova só — a de que renomear não o move.
  const baseline = { ...BASELINE_DA_INSTANCIA };

  return [
    http.get(`${b}/v1/instances`, () =>
      json({ items: [...porId.values()], next_cursor: null })),

    http.get(`${b}/v1/instances/:instanceId`, ({ params }) => {
      const i = porId.get(String(params.instanceId));
      return i ? json(i) : json(problem("forbidden_or_not_found"), 404);
    }),

    http.get(`${b}/v1/instances/:instanceId/baseline`, ({ params }) =>
      porId.has(String(params.instanceId))
        ? json(baseline)
        : json(problem("forbidden_or_not_found"), 404)),

    http.patch(`${b}/v1/instances/:instanceId`, async ({ params, request }) => {
      const id = String(params.instanceId);
      const i = porId.get(id);
      if (!i) return json(problem("forbidden_or_not_found"), 404);
      const corpo = (await request.json()) as Record<string, unknown> | null;
      const chaves = Object.keys(corpo ?? {});
      if (chaves.length !== 1 || chaves[0] !== "name") {
        return json(problem("invalid_input"), 400);
      }
      const nome = corpo?.name;
      if (typeof nome !== "string" || nome.length < 1) {
        return json(problem("invalid_input"), 400);
      }
      // Nome duplicado é LEGÍTIMO: o contrato declara a ausência de unicidade, e recusar aqui
      // ensinaria a tela a validar uma regra que o produtor não tem. Identidade é `instance_id`.
      //
      // Spread pelo mesmo motivo do Workspace: redigitar a view faria um campo novo do contrato
      // sumir no rename, em silêncio.
      const atualizada: InstanceView = { ...i, name: nome };
      porId.set(id, atualizada);
      return json(atualizada);
    }),
  ];
}

function contaHandlers(b: string, inicial: "en" | "pt" | null): HttpHandler[] {
  let stored: "en" | "pt" | null = inicial;

  return [
    // Identidade: a mesma em todos os scenarios de idioma, porque a preferência é do USUÁRIO e a
    // identidade não muda quando ele troca de idioma.
    http.get(`${b}/v1/me`, () => json(IDENTIDADE)),

    http.get(`${b}/v1/me/language`, () => json(projetar(stored))),

    http.put(`${b}/v1/me/language`, async ({ request }) => {
      const corpo = (await request.json()) as Record<string, unknown> | null;
      const chaves = Object.keys(corpo ?? {});

      // Campo a mais é RECUSADO, como no produtor (`extra="forbid"`). É isto que impede um corpo
      // com `user_subject` de escrever a preferência de outra pessoa — e um mock permissivo
      // aceitaria um Front que manda o subject, com o servidor real recusando só em produção.
      if (chaves.length !== 1 || chaves[0] !== "language") {
        return json(IDIOMA_INVALIDO, 400);
      }

      const pedido = corpo?.language;

      // Enum fechado, e a recusa é do PRODUTOR. Nada de normalizar `pt-BR` → `pt`.
      if (pedido !== "en" && pedido !== "pt") {
        return json(IDIOMA_INVALIDO, 400);
      }

      // Last-write-wins, sem CAS e sem `version`: preferência não é máquina de estados, e dois
      // dispositivos escolhendo idiomas diferentes produzem duas configurações legítimas.
      stored = pedido;
      return json(projetar(stored));
    }),
  ];
}

export const CATALOGO: readonly Scenario[] = [
  {
    id: "workspace-empty",
    superficies: ["WS-01"],
    estado: "disponivel",
    handlers: (b) => [http.get(`${b}/v1/me`, () => json({ user: { id: "u-1", email: "a@b.test", name: "A" }, workspaces: [], capabilities: { canonical_analysis_enabled: true } }))],
  },
  {
    id: "instance-empty",
    superficies: ["INST-01"],
    // Desbloqueado pela BD02 (`FREEZE: PASS`, B3 fechado). A razão do bloqueio nomeava três
    // ausências — operação, read model e campo — e as três acabaram: `create_instance`/
    // `list_instances`/`get_instance` estão no contrato público, `instance_read_model_fields`
    // existe, e `instance_id` entrou nas projeções de Analysis.
    //
    // O vazio aqui NÃO é fixture inventada: é a resposta que o produtor real devolve para
    // workspace autorizado sem Instances, medida por Gateway real em
    // `sentinela-facts/scripts/gate_bd02_instancia_e2e.py`.
    //
    // Workspace AUTORIZADO e sem Instances, e não workspace alheio: o alheio devolveria
    // `forbidden_or_not_found`, que mede autorização e não lista vazia. A primeira versão
    // daquele gate confundiu as duas coisas e ficou vermelha com razão.
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/instances`, () => json({ items: [], next_cursor: null })),
    ],
  },
  {
    // M36. `instance-empty` prova o vazio, e só ele — não se constrói "visão atual da Instância"
    // sem nenhuma Instância. Este é o par populado dela.
    //
    // O shape é o publicado, e nada além: `instance_read_model_fields` do contrato @ ac81633 é
    // exatamente `["instance_id", "name", "created_at"]`. Sem `status`, `health`, contador,
    // `description`, `tags` ou `updated_at` — nenhum deles existe no produtor, e é a MESMA razão
    // pela qual INST-02 (Estado) não tem scenario nem missão.
    //
    // `get` devolve a mesma identidade que `list`: é o que sustenta o deep link e o refresh, em
    // que a tela chega sabendo só o `instance_id`.
    id: "instance-present",
    superficies: ["INST-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/instances`, () => json({ items: [INSTANCIA], next_cursor: null })),
      http.get(`${b}/v1/instances/:id`, () => json(INSTANCIA)),
    ],
  },
  {
    // M36. O histórico é a listagem canônica FILTRADA — não existe subrecurso
    // `/v1/instances/{id}/analyses`, e a BD02 recusou criá-lo de propósito.
    //
    // O handler afirma a associação em vez de presumi-la: só responde quando o `instance_id`
    // pedido é o desta Instance, e devolve itens que carregam esse mesmo `instance_id`. Um mock
    // que ignorasse o filtro deixaria passar um Front que esqueceu de enviá-lo — e a tela
    // pareceria funcionar mostrando análise de outra Instância.
    //
    // Duas páginas com `next_cursor` real: a prova de histórico precisa atravessar fronteira de
    // página, e uma página feliz não distingue paginação correta de ausência de paginação.
    id: "instance-history",
    superficies: ["INST-03"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/instances`, () => json({ items: [INSTANCIA], next_cursor: null })),
      http.get(`${b}/v1/instances/:id`, () => json(INSTANCIA)),
      http.get(`${b}/v1/analyses`, ({ request }) => {
        const q = new URL(request.url).searchParams;
        if (q.get("instance_id") !== INSTANCIA.instance_id) {
          // Sem o filtro, o histórico não existe. Devolver a lista geral aqui seria o mock
          // completando o que o Front esqueceu.
          return json({ items: [], next_cursor: null });
        }
        return json(q.get("cursor") ? HISTORICO_PAGINA_2 : HISTORICO_PAGINA_1);
      }),
    ],
  },
  {
    // M37 · Checkpoint 0 — INST-04. A única entrada do catálogo que LEMBRA o que recebeu.
    //
    // ## Por que a memória é necessária, e não é invenção
    //
    // No produtor real (`prepare_analysis` @ ac81633) o `instance_id` é **query param OPCIONAL e
    // ADITIVO**, e a resposta do prepare é `{analysis_id, status}` — a associação NÃO volta nela.
    // Ela só se torna legível depois, no status (`instance_id` é campo publicado do read model).
    //
    // Um handler sem memória devolveria 201 com ou sem contexto, exatamente como o Gateway real —
    // e um Front que perdesse o `instance_id` no caminho passaria: a análise nasceria solta e a
    // tela pareceria funcionar. Guardar o que o write recebeu e refleti-lo no read é o produtor
    // sendo representado por inteiro, e não um oráculo acrescentado ao mock.
    //
    // ## Por que a ausência NÃO vira erro aqui
    //
    // Tentador, e seria mentira: publicamente, preparar sem Instância continua válido — é o
    // caminho de toda análise legada e de toda análise fora de Instância. O mock que recusasse
    // faria o Front pensar que o campo é obrigatório. A detecção vem do status, não do 4xx.
    //
    // ## Duas Instâncias, de propósito
    //
    // Com uma só, mandar "a Instância errada" é indistinguível de mandar a certa. `OUTRA_INSTANCIA`
    // é o que transforma *"envia um `instance_id`"* em *"envia EXATAMENTE o desta tela"*.
    id: "instance-new-analysis",
    superficies: ["INST-04"],
    estado: "disponivel",
    handlers: (b) => {
      // Escopo por invocação: cada `handlersDoScenario()` nasce sem memória, e um teste não
      // herda o contexto que o anterior enviou.
      let recebido: string | null = null;
      return [
        http.get(`${b}/v1/instances`, () =>
          json({ items: [INSTANCIA, OUTRA_INSTANCIA], next_cursor: null }),
        ),
        http.get(`${b}/v1/instances/:id`, ({ params }) =>
          json(params.id === OUTRA_INSTANCIA.instance_id ? OUTRA_INSTANCIA : INSTANCIA),
        ),
        http.post(`${b}/v1/analyses`, ({ request }) => {
          // QUERY, e não body: é onde o Gateway real lê o campo. Um mock que o lesse do corpo
          // aceitaria um Front que envia no lugar errado — e o defeito só apareceria no
          // Gateway de verdade.
          recebido = new URL(request.url).searchParams.get("instance_id");
          return json(HANDLE, 201);
        }),
        http.get(`${b}/v1/analyses/:id`, () => json(statusView("preparing", { instance_id: recebido }))),
      ];
    },
  },
  {
    id: "analysis-uploading",
    superficies: ["AN-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.post(`${b}/v1/analyses`, () => json(HANDLE, 201)),
      http.post(`${b}/v1/analyses/:id/data`, () => json(statusView("receiving"))),
    ],
  },
  {
    id: "upload-invalid",
    superficies: ["AN-01"],
    estado: "disponivel",
    handlers: (b) => [http.post(`${b}/v1/analyses/:id/data`, () => json(problem("invalid_input"), 400))],
  },
  {
    id: "upload-network-failure",
    superficies: ["AN-01"],
    estado: "disponivel",
    // Falha de TRANSPORTE, não envelope de erro: a distinção importa porque uma é retomável pelo
    // mesmo caminho e a outra consumiu a operação.
    handlers: (b) => [http.post(`${b}/v1/analyses/:id/data`, () => HttpResponse.error())],
  },
  {
    id: "needs-mapping",
    superficies: ["AN-02", "HOME-01"],
    estado: "parcial",
    razao:
      "EXIBIR sim, RESOLVER não. O estado `needs_mapping` é público e chega no status; a operação " +
      "que o resolve (`POST /ingestions/{id}/profile` + `/mapping`) NÃO está exposta no contrato " +
      "público nem tem ponte `analysis_id ↔ ingestion_id`. É o B2.",
    handlers: (b) => [status1(b, "needs_mapping")],
  },
  { id: "engine-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "running", analytics: "pending", export: "unavailable", final_result: "pending" })] },
  { id: "analytics-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "running", export: "unavailable", final_result: "pending" })] },
  { id: "analytics-ready-engine-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "running", analytics: "ready", export: "unavailable", final_result: "pending" })] },
  { id: "engine-ready-analytics-running", superficies: ["AN-03"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "running", export: "unavailable", final_result: "pending" })] },
  {
    id: "analytics-partial",
    superficies: ["RES-01"],
    estado: "disponivel",
    // `partial` NÃO é `failed`: parte mediu, parte não. A tela precisa poder dizer as duas coisas.
    handlers: (b) => [analytics(b, { component_status: "partial", snapshot: { blocos: [] }, withheld: null })],
  },
  {
    id: "analytics-withheld",
    superficies: ["RES-01"],
    estado: "disponivel",
    // `withheld` NÃO é erro: a medida existe e foi RETIDA por regra de privacidade.
    handlers: (b) => [analytics(b, { component_status: "withheld", snapshot: null, withheld: { reason_code: "min_group_size" } })],
  },
  { id: "engine-failed-analytics-ready", superficies: ["AN-04", "RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "failed", analytics: "ready", export: "unavailable", final_result: "pending" })] },
  { id: "analytics-failed-engine-ready", superficies: ["AN-04", "RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "failed", export: "unavailable", final_result: "pending" })] },
  // M35 — o único scenario que publica o STATUS da análise além dos eixos.
  //
  // Ele já dizia `final_result: "failed"`, mas deixava o status global no default (`running`): o
  // progresso afirmava que o resultado final falhou enquanto o status afirmava execução em curso.
  // A superfície terminal (AN-04) ficava inalcançável por qualquer scenario do catálogo.
  //
  // A correção é de COERÊNCIA do mock com o que ele mesmo declara — não de produto. Os scenarios
  // 13 e 14 continuam `running` de propósito: um componente falho com `final_result: pending` não
  // autoriza terminalizar a análise inteira, e forçá-los a `failed` só para caírem em AN-04 seria
  // inventar terminalidade que nenhuma autoridade publica.
  {
    id: "both-failed",
    superficies: ["AN-04"],
    estado: "disponivel",
    handlers: (b) => [
      progresso(b, { engine: "failed", analytics: "failed", export: "unavailable", final_result: "failed" }),
      status1(b, "failed"),
    ],
  },
  { id: "final-ready", superficies: ["RES-01"], estado: "disponivel", handlers: (b) => [http.get(`${b}/v1/analyses/:id/result`, () => json(RESULT_VIEW))] },
  { id: "export-preparing", superficies: ["RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "ready", export: "preparing", final_result: "ready" })] },
  { id: "export-ready", superficies: ["RES-01"], estado: "disponivel", handlers: (b) => [progresso(b, { engine: "ready", analytics: "ready", export: "ready", final_result: "ready" })] },
  {
    id: "export-expired",
    superficies: ["RES-01"],
    estado: "disponivel",
    // `expired` ≠ purged no DOMÍNIO — campos e eventos diferentes. Publicamente são a MESMA
    // condição: o produtor colapsa quatro causas (inexistente, de outro workspace, expirado e
    // purgado) num único `forbidden_or_not_found`/`404`, para a rota não virar oráculo de
    // existência. É decisão da MF5.2, e a mutação `g4-detalhe-distingue-as-negativas` mata quem
    // tentar distinguir uma das quatro no `detail`.
    //
    // O contrato NÃO publica um `export_expired` — inventei esse código na primeira versão e o
    // typecheck reprovou. O que veio no lugar, `410 result_not_available`, também não era o
    // produtor: o Gateway nunca emite `410`, e o corpo de `result_not_available` já declara
    // `status: 404` — o mock contradizia a si mesmo antes de contradizer o backend. Conferido
    // contra `api/routes/analyses_v1.py:739` e `infra/analyses_public.py:111`.
    handlers: (b) => [
      erro(b, "/v1/analyses/:id/analytics/export/download", 404, "forbidden_or_not_found"),
    ],
  },
  // ── EVO-02 · cobertura HISTÓRICA (v1) ────────────────────────────────────────────────────
  //
  // Os dois abaixo foram criados quando EVO-02 lia o documento legado, e servem `RESULT_VIEW`,
  // que é **v1**. Continuam válidos como cobertura de `indicators` sobre o documento histórico —
  // e **não provam a M39**, que compara `analysis-result-v3`. Renomeá-los para parecerem v3
  // seria maquiagem: a massa continuaria a mesma.
  {
    id: "comparison-compatible",
    superficies: ["EVO-02"],
    estado: "disponivel",
    handlers: (b) => [http.get(`${b}/v1/analyses/:id/result`, () => json(RESULT_VIEW))],
  },
  {
    id: "comparison-schema-break",
    superficies: ["EVO-02"],
    estado: "disponivel",
    // DESCONTINUIDADE, não delta: registries diferentes não são comparáveis, e um número de
    // variação aqui seria uma resposta correta para a pergunta errada.
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:id/result`, () =>
        json({ ...RESULT_VIEW, indicator_registry_version: "indicator-registry-2.0" })),
    ],
  },

  // ── EVO-02 · a M39 de verdade (v3) ───────────────────────────────────────────────────────
  //
  // A massa NÃO foi escrita à mão: os dois documentos saíram do código analítico REAL rodado
  // duas vezes, com entradas diferentes (custo 0,10 × 0,25 · 80 × 60 úteis · saúde própria),
  // atravessando a ponte de facts e o `assemble_v3`. Provêm-se 14 pares de indicador e 4 de
  // dimensão, com 7 e 3 valores efetivamente distintos — massa em que o comparador não pode
  // devolver zero linha e ainda passar.
  //
  // Os dois lados respondem pelo `analysis_id` da rota, que é como a comparação os distingue.
  {
    id: "comparison-v3-compatible",
    superficies: ["EVO-02"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:id/result`, ({ params, request }) => {
        // A visão ARGOS pede a versão EXPLICITAMENTE. Sem pedido, o scenario devolve o
        // comportamento histórico — não o v3 — porque é isso que a rota real faz.
        const pedida = new URL(request.url).searchParams.get("result_schema_version");
        if (!pedida) return json(RESULT_VIEW);
        const id = String(params.id);
        return json(envelopeV3(id, id === "an-cmp-b" ? V3_COMPARACAO.B : V3_COMPARACAO.A));
      }),
    ],
  },
  {
    id: "comparison-v3-document-break",
    superficies: ["EVO-02"],
    estado: "disponivel",
    // A quebra é de DOCUMENTO (D26) e mora num campo REAL do contrato: os dois lados divergem
    // em `indicator_registry_version` e em NADA mais. Nenhum campo paralelo foi inventado para
    // simular incompatibilidade.
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:id/result`, ({ params, request }) => {
        const pedida = new URL(request.url).searchParams.get("result_schema_version");
        if (!pedida) return json(RESULT_VIEW);
        const id = String(params.id);
        return json(envelopeV3(id, id === "an-cmp-b" ? V3_COMPARACAO.B_QUEBRA : V3_COMPARACAO.A));
      }),
    ],
  },
  {
    id: "recommendation-persisted",
    superficies: ["RES-01", "EVO-02"],
    estado: "bloqueado",
    razao:
      "`recommendation_id` NÃO chega ao documento de resultado. Sem identidade durável não há " +
      "recomendação longitudinal — inventar um id faria o front prometer um acompanhamento que " +
      "o backend não sustenta no próximo run. É o BD03.",
  },
  {
    id: "privacy-omission",
    superficies: ["RES-01"],
    estado: "disponivel",
    handlers: (b) => [analytics(b, { component_status: "withheld", snapshot: null, withheld: { reason_code: "min_group_size", min_group_size: 5 } })],
  },
  {
    // M40 — DESBLOQUEADO pela BD10. A razão antiga nomeava três ausências: *"Nenhuma operação a
    // cria, lê ou compara."* Duas acabaram (`GET`/`POST`/`DELETE` do sub-recurso + candidatos por
    // `baseline_eligible`). A terceira — comparar — continua verdadeira, e é por isso que nada
    // aqui compara nada.
    //
    // O objetivo deste scenario é uma frase: **ausência de baseline NÃO é ausência de
    // candidatos.** Uma Instance sem régua, com três análises elegíveis esperando escolha.
    id: "no-baseline",
    superficies: ["INST-05"],
    estado: "disponivel",
    handlers: (b) => baselineHandlers(b, null),
  },
  {
    // M40 — a régua CONFIGURADA, com troca e remoção dentro do próprio scenario.
    //
    // Nome novo, e não reuso do `baseline-active`: aquele carrega também *"régua ativa bloqueia
    // exclusão"*, que exige exclusão pública de Analysis (B10 → BD06) e não existe. Herdar o nome
    // herdaria a promessa.
    id: "baseline-set",
    superficies: ["INST-05"],
    estado: "disponivel",
    handlers: (b) => baselineHandlers(b, BASELINE_ESCOLHIDO),
  },
  {
    // M40 — o PRIMEIRO estado de toda Instance nova: sem régua e sem candidatos.
    //
    // `[]` aqui significa **o backend consultou e achou zero**. Não é endpoint ausente, não é
    // falha, não é "ainda carregando" — e a distinção importa porque as três se parecem na tela
    // se ninguém as separar. Sem este scenario, o caminho primário da INST-05 ficaria sem prova.
    id: "baseline-no-candidates",
    superficies: ["INST-05"],
    estado: "disponivel",
    handlers: (b) => baselineHandlers(b, null, []),
  },
  {
    // CONTINUA BLOQUEADO, e a razão foi reescrita para dizer POR QUE — não para fingir entrega.
    //
    // Ele é um scenario COMPOSTO herdado: carrega duas afirmações, e só uma destravou. Mostrar
    // régua ativa é o `baseline-set`. A outra — régua ativa BLOQUEIA EXCLUSÃO — depende de
    // exclusão pública de Analysis, que é o B10 → BD06 e não existe.
    //
    // E há consequência mais forte que "não provável": sem operação de exclusão, a INST-05 não tem
    // onde oferecer o botão, e a recusa é INALCANÇÁVEL pela superfície. A BD10 deixou a proteção
    // pronta no banco (FK `on delete no action`, provada nos dois sentidos) — mas constraint não é
    // capacidade publicada, e um scenario não encena recusa que não tem porta.
    id: "baseline-active",
    superficies: ["INST-05"],
    estado: "bloqueado",
    razao:
      "Scenario COMPOSTO histórico, e não prova canônica de INST-05. A metade 'mostrar régua " +
      "ativa' foi entregue pela BD10 e vive em `baseline-set`. A outra metade exige que baseline " +
      "ativo BLOQUEIE EXCLUSÃO — e exclusão pública de Analysis não existe (B10 → BD06). Sem " +
      "ela a recusa é inalcançável pela superfície: a FK está pronta no banco, mas constraint " +
      "não é capacidade publicada.",
  },
  { id: "session-expired", superficies: ["AUTH-04"], estado: "disponivel", handlers: (b) => [erro(b, "/v1/analyses/:id", 401, "authentication_required")] },
  { id: "forbidden", superficies: ["ERR-403/404"], estado: "disponivel", handlers: (b) => [erro(b, "/v1/analyses/:id", 404, "forbidden_or_not_found")] },
  {
    id: "not-found",
    superficies: ["ERR-403/404"],
    estado: "disponivel",
    // MESMA tela que `forbidden`, por contrato: distinguir as duas vazaria a existência do
    // recurso para quem não pode vê-lo.
    handlers: (b) => [erro(b, "/v1/analyses/:id", 404, "forbidden_or_not_found")],
  },
  { id: "capacity-wait", superficies: ["AN-03", "ERR-503"], estado: "disponivel", handlers: (b) => [erro(b, "/v1/analyses/:id", 503, "capacity_wait")] },
  {
    id: "result-v1-legacy",
    superficies: ["RES-01"],
    estado: "disponivel",
    handlers: (b) => [http.get(`${b}/v1/analyses/:id/result`, () => json({ ...RESULT_VIEW, result_schema_version: "analysis-result-v1" }))],
  },
  { id: "idempotency-conflict", superficies: ["AN-01"], estado: "disponivel", handlers: (b) => [http.post(`${b}/v1/analyses`, () => json(problem("idempotency_conflict"), 409))] },
  {
    id: "list-pagination",
    superficies: ["EVO-01", "HOME-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/analyses`, ({ request }) =>
        json(new URL(request.url).searchParams.get("cursor") ? LIST_PAGE_2 : LIST_PAGE_1)),
    ],
  },

  // ── M41 · a conta ────────────────────────────────────────────────────────────────────────
  //
  // `account-identity` serve SÓ `/v1/me`, e essa ausência é a prova: a CFG-01 é construível sem o
  // Account existir. Pedir `/v1/me/language` neste scenario não responde — é o que separa as duas
  // superfícies.
  {
    id: "account-identity",
    superficies: ["CFG-01"],
    estado: "disponivel",
    handlers: (b) => [http.get(`${b}/v1/me`, () => json(IDENTIDADE))],
  },

  // `stored: null` — nunca escolheu. O produto está em inglês por DEFAULT, não por decisão da
  // pessoa. É o primeiro estado de toda conta que nunca abriu Configurações.
  {
    id: "account-language-default",
    superficies: ["CFG-02"],
    estado: "disponivel",
    handlers: (b) => contaHandlers(b, null),
  },

  // `stored: "en"` — escolheu inglês. Massa estruturalmente diferente da anterior, com a MESMA
  // identidade e o MESMO `effective`. A única diferença é o fato que não pode ser perdido.
  {
    id: "account-language-en",
    superficies: ["CFG-02"],
    estado: "disponivel",
    handlers: (b) => contaHandlers(b, "en"),
  },

  // `stored: "pt"`. E daqui sai a prova de que voltar para inglês termina em `"en"`, nunca em
  // `null`: não existe CLEAR.
  {
    id: "account-language-pt",
    superficies: ["CFG-02"],
    estado: "disponivel",
    handlers: (b) => contaHandlers(b, "pt"),
  },

  // Contenção de falha. `/v1/me` continua 200 — a identidade não depende do Account —, e a
  // preferência vira `503`. NUNCA `200` com `stored: null`: mascarar indisponibilidade como
  // ausência faria a tela dizer "você nunca escolheu" para quem escolheu ontem.
  {
    id: "account-language-unavailable",
    superficies: ["CFG-02"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/me`, () => json(IDENTIDADE)),
      http.get(`${b}/v1/me/language`, () => json(INDISPONIVEL, 503)),
      http.put(`${b}/v1/me/language`, () => json(INDISPONIVEL, 503)),
    ],
  },

  // ── M42 · CFG-03 · Workspace ────────────────────────────────────────────────────────────
  //
  // Serve SÓ o produtor público. A ausência de `/v1/me` aqui é a prova, do mesmo jeito que a
  // ausência de `/v1/me/language` em `account-identity`: o nome do produto não vem da claim, e um
  // scenario que servisse as duas coisas alinhadas deixaria passar um Front que lê a errada.
  {
    id: "workspace-config-current",
    superficies: ["CFG-03"],
    estado: "disponivel",
    handlers: (b) => workspaceHandlers(b),
  },

  // A ARMADILHA. A claim diz "Suporte Regional", o produtor diz "Atendimento Norte", e o mesmo
  // `workspace_id` está nos dois. O contrato é literal: `me_workspace_fields.name` é projeção de
  // BOOTSTRAP e pode ficar velha após um rename; a leitura autoritativa é `get_workspace`.
  //
  // Quem ler o nome da claim não recebe erro nenhum — recebe o nome errado, com `200`.
  {
    id: "workspace-config-stale-claim",
    superficies: ["CFG-03"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/me`, () => json(CLAIM_DESATUALIZADA)),
      ...workspaceHandlers(b),
    ],
  },

  // Outage COM claim presente — o caso perigoso. A identidade responde `200` e carrega um nome; o
  // produtor está fora. Isso NÃO pode virar "nome confirmado = o da claim", e também não pode
  // virar "o workspace não existe": `temporarily_unavailable` nunca é traduzido em ausência, e o
  // contrato diz por escrito que não há fallback pela tabela legada.
  {
    id: "workspace-config-unavailable",
    superficies: ["CFG-03"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/me`, () => json(CLAIM_DESATUALIZADA)),
      http.get(`${b}/v1/workspaces/:workspaceId`, () =>
        json(problem("temporarily_unavailable"), 503)),
      http.patch(`${b}/v1/workspaces/:workspaceId`, () =>
        json(problem("temporarily_unavailable"), 503)),
    ],
  },

  // Anti-oracle. Fora do contexto autorizado, papel insuficiente e desconhecido pelo owner
  // colapsam nos TRÊS na mesma resposta. Reproduzir a colapsagem é o ponto: um mock que
  // distinguisse ensinaria a tela a revelar o que o backend esconde de propósito.
  {
    id: "workspace-config-invisible",
    superficies: ["CFG-03"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/workspaces/:workspaceId`, () =>
        json(problem("forbidden_or_not_found"), 404)),
      http.patch(`${b}/v1/workspaces/:workspaceId`, () =>
        json(problem("forbidden_or_not_found"), 404)),
    ],
  },

  // ── M42 · CFG-04 · Instance ─────────────────────────────────────────────────────────────
  //
  // Duas Instances com nomes DIFERENTES e identidades opacas. O rename acontece dentro dos
  // handlers: renomear a vizinha para o nome que a primeira já usa é sucesso, e o baseline da
  // primeira continua onde estava.
  {
    id: "instance-config-current",
    superficies: ["CFG-04"],
    estado: "disponivel",
    handlers: (b) => instanceHandlers(b, [INSTANCIA_CONFIG, INSTANCIA_VIZINHA]),
  },

  // ESTADO do mundo, não transição: duas Instances que JÁ se chamam igual, com `instance_id`
  // diferentes. Uma tela que infira unicidade por nome — para deduplicar uma lista, para casar
  // seleção, para rotular — quebra aqui e passa em qualquer massa simétrica.
  {
    id: "instance-config-duplicate-name",
    superficies: ["CFG-04"],
    estado: "disponivel",
    handlers: (b) =>
      instanceHandlers(b, [
        INSTANCIA_CONFIG,
        { ...INSTANCIA_VIZINHA, name: NOME_DUPLICADO },
      ]),
  },

  // `temporarily_unavailable`, e não `forbidden_or_not_found`. A Instance não some da tela como
  // se tivesse sido apagada: ela existe e o dono não respondeu, e as duas coisas levam a telas
  // diferentes.
  {
    id: "instance-config-unavailable",
    superficies: ["CFG-04"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/instances/:instanceId`, () =>
        json(problem("temporarily_unavailable"), 503)),
      http.patch(`${b}/v1/instances/:instanceId`, () =>
        json(problem("temporarily_unavailable"), 503)),
    ],
  },

  // Anti-oracle da Instance: inexistente e de outro workspace colapsam.
  {
    id: "instance-config-invisible",
    superficies: ["CFG-04"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/instances/:instanceId`, () =>
        json(problem("forbidden_or_not_found"), 404)),
      http.patch(`${b}/v1/instances/:instanceId`, () =>
        json(problem("forbidden_or_not_found"), 404)),
    ],
  },
] as const;
