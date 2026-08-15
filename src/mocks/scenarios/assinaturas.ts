// M44 · COM-01 / COM-02 — os cenários de Subscription e de reentrada.
//
// ## Por que em arquivo próprio
//
// Duas catracas pediram, e as duas estavam certas. O `catalogo.ts` passou de 1000 linhas com as
// dez entradas da M44 (M07 · anti-monólito), e o gate da M18 pegou este arquivo redigitando
// `created_at` à mão em vez de usar a fixture. Separar resolve os dois pelo mesmo movimento: o
// catálogo volta a ser índice, e a massa volta a morar na massa.
//
// ## O que estes handlers representam
//
// A fronteira PÚBLICA do Gateway — quatro operações, e só elas. O Dispatcher tem ciclo de vida
// interno maior (chaveiro de segredos, entregas, lease, dead letter), e nada disso atravessa:
// servir um método interno aqui só porque ele existe no backend faria a tela nascer sabendo ler
// o que a fronteira pública não entrega.

import { http, HttpResponse } from "msw";
import type { HttpHandler } from "msw";
import { problem, statusView } from "@/test/fixtures/public-v1/analyses";
import { IDENTIDADE, projetar } from "@/test/fixtures/public-v1/account-language";
import {
  ASSINATURA_ATIVA,
  ASSINATURA_DESATIVADA,
  ASSINATURA_NAO_VERIFICADA,
  CRIADA_EM,
  POR_WORKSPACE,
  WS_PRINCIPAL,
  type SubscriptionView,
} from "@/test/fixtures/public-v1/subscriptions";
import type { Scenario } from "./catalogo";

const json = (b: unknown, s = 200) =>
  HttpResponse.json(b as Record<string, unknown>, { status: s });

/**
 * Os quatro seams públicos de Subscription (BD14), com estado por invocação.
 *
 * ## O `workspace_id` da QUERY é quem decide, em toda operação
 *
 * As quatro operações o exigem, e aqui ele é lido em todas — inclusive nas que já têm
 * `subscription_id` no caminho. Um handler que resolvesse a assinatura só pelo id do caminho
 * deixaria o workspace B desativar a assinatura do A, e o isolamento passaria sem existir.
 *
 * ## O que estes handlers NÃO fazem, e por quê
 *
 * * **`GET` não cria.** Ler nunca acrescenta linha ao mapa. Auto-criar na primeira leitura faria
 *   "ausente" desaparecer do mundo no instante em que alguém abrisse a tela;
 * * **não resolvem destinatário.** `destination` vem do corpo do `POST`, e nada aqui lê `/v1/me`,
 *   claim, Account ou Workspace para preenchê-lo. É a mesma ausência que o Gateway tem gate
 *   provando;
 * * **não sincronizam idioma.** `language` vem do corpo, com o mesmo default `"pt"` do produtor —
 *   e não da preferência da conta;
 * * **não reativam.** O owner recusa `active: true` com `reativacao_nao_suportada`, então
 *   desativar é terminal aqui também;
 * * **não apagam.** `DELETE` marca `active = false` e a linha FICA na lista. Removê-la do mapa
 *   seria implementar exclusão que o domínio não tem;
 * * **não verificam.** `verified_at` só existe como veio na massa: é estado observado de uma
 *   entrega real, e não há operação que o produza.
 */
export function assinaturaHandlers(
  b: string,
  iniciais: Readonly<Record<string, readonly SubscriptionView[]>>,
): HttpHandler[] {
  // Cópia PROFUNDA por invocação: sem ela, um `DELETE` de um teste desativaria a assinatura que o
  // próximo teste espera encontrar ativa — as views são compartilhadas entre cenários.
  const porWorkspace = new Map<string, SubscriptionView[]>(
    Object.entries(iniciais).map(([ws, lista]) => [ws, lista.map((s) => ({ ...s }))]),
  );
  const escopo = (url: string) => new URL(url).searchParams.get("workspace_id") ?? "";
  const lista = (ws: string) => porWorkspace.get(ws) ?? [];

  return [
    http.get(`${b}/v1/subscriptions`, ({ request }) =>
      // Workspace sem entrada no mapa devolve `items: []` — ausência, e não `404`. O owner é
      // literal: lista vazia é estado legítimo.
      json({ items: lista(escopo(request.url)) })),

    http.post(`${b}/v1/subscriptions`, async ({ request }) => {
      const ws = escopo(request.url);
      const corpo = (await request.json()) as {
        channel?: string;
        destination?: string;
        event_types?: string[];
        language?: string;
      };
      // O produtor recusa corpo com campo extra (`extra="forbid"`), e `workspace_id` no corpo é o
      // caso que a recusa existe para pegar: o escopo já veio autorizado pela query, e aceitá-lo
      // aqui abriria a porta para o corpo discordar do que foi autorizado.
      if ("workspace_id" in corpo) {
        return json(problem("invalid_input"), 400);
      }
      if (!corpo.channel || !corpo.destination || !corpo.event_types?.length) {
        return json(problem("invalid_input"), 400);
      }
      const nova: SubscriptionView = {
        subscription_id: `sub-criada-${lista(ws).length + 1}`,
        channel: corpo.channel as SubscriptionView["channel"],
        // Do CORPO. Nunca da identidade — é a intenção explícita de quem assina.
        destination: corpo.destination,
        event_types: [...corpo.event_types],
        // O mesmo default do produtor, e não a preferência da conta.
        language: (corpo.language ?? "pt") as SubscriptionView["language"],
        active: true,
        secret_version: 1,
        // Nasce NÃO verificada: verificação é consequência de entrega, não de criação.
        verified_at: null,
        created_at: CRIADA_EM,
      };
      porWorkspace.set(ws, [...lista(ws), nova]);
      // `201` com a forma literal de `create`: o segredo sai UMA vez, e é `null` para e-mail.
      return json(
        {
          subscription_id: nova.subscription_id,
          secret_version: nova.secret_version,
          secret: nova.channel === "webhook" ? "whsec_criado_uma_vez" : null,
        },
        201,
      );
    }),

    http.delete(`${b}/v1/subscriptions/:subscriptionId`, ({ params, request }) => {
      const ws = escopo(request.url);
      const alvo = lista(ws).find((s) => s.subscription_id === String(params.subscriptionId));
      // Inexistente, de OUTRO workspace e já inativa colapsam nos três — o owner recusa dizer
      // qual, e a primeira é a razão: revelar existência alheia é o oráculo que ele fecha.
      if (!alvo || !alvo.active) return json(problem("forbidden_or_not_found"), 404);
      porWorkspace.set(
        ws,
        lista(ws).map((s) => (s.subscription_id === alvo.subscription_id ? { ...s, active: false } : s)),
      );
      return json({ subscription_id: alvo.subscription_id, active: false });
    }),

    http.post(`${b}/v1/subscriptions/:subscriptionId/secret`, ({ params, request }) => {
      const ws = escopo(request.url);
      const alvo = lista(ws).find((s) => s.subscription_id === String(params.subscriptionId));
      if (!alvo) return json(problem("forbidden_or_not_found"), 404);
      // Só webhook tem segredo. E-mail devolve a recusa do domínio (`canal_sem_segredo`).
      if (alvo.channel !== "webhook") return json(problem("invalid_input"), 400);
      // Versão +1, MESMA identidade — rotação não é apagar e recriar. E `verified_at` volta a
      // `null`, como no owner: a chave mudou, e a verificação anterior era sobre a chave velha.
      const versao = alvo.secret_version + 1;
      porWorkspace.set(
        ws,
        lista(ws).map((s) =>
          s.subscription_id === alvo.subscription_id
            ? { ...s, secret_version: versao, verified_at: null }
            : s,
        ),
      );
      return json({
        subscription_id: alvo.subscription_id,
        secret_version: versao,
        secret: `whsec_rotacionado_v${versao}`,
      });
    }),
  ];
}

/** As dez entradas da M44, na ordem em que o Blueprint §11 as lista (53 a 62). */
export const CENARIOS_DE_COMUNICACAO: readonly Scenario[] = [
  {
    id: "subscription-absent",
    superficies: ["COM-01"],
    estado: "disponivel",
    // Ausência é `items: []` com `200`. Não é erro, não é `null`, e não é "desligado com
    // sucesso" — é zero destinatário configurado. E a leitura NÃO cria: o handler não guarda
    // estado nenhum, então dez `GET` seguidos continuam devolvendo vazio.
    handlers: (b) => assinaturaHandlers(b, {}),
  },

  {
    id: "subscription-current",
    superficies: ["COM-01"],
    estado: "disponivel",
    // Duas assinaturas no MESMO workspace: uma verificada e uma não. `verified_at: null` não é
    // "pendente de confirmação" — não há o que confirmar —, é a ausência de uma entrega aceita.
    handlers: (b) =>
      assinaturaHandlers(b, { [WS_PRINCIPAL]: [ASSINATURA_ATIVA, ASSINATURA_NAO_VERIFICADA] }),
  },

  // A ARMADILHA do destinatário. A conta responde `200` com `ana.ribeiro@cliente.test`, e a
  // assinatura manda para `alertas@operacoes.exemplo.test`. Quem resolver o destino pela
  // identidade não recebe erro nenhum — manda o alerta para a caixa errada, com `200`.
  {
    id: "subscription-destination-diverges",
    superficies: ["COM-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/me`, () => json(IDENTIDADE)),
      ...assinaturaHandlers(b, { [WS_PRINCIPAL]: [ASSINATURA_ATIVA] }),
    ],
  },

  // A ARMADILHA do idioma. A conta escolheu `pt` (BD11/M41) e a entrega é em `en`. Os dois são
  // estados legítimos e independentes: um diz em que língua o produto FALA com a pessoa, o outro
  // em que língua a mensagem SAI. Sincronizá-los apagaria a intenção de quem assinou.
  {
    id: "subscription-language-diverges",
    superficies: ["COM-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/me`, () => json(IDENTIDADE)),
      http.get(`${b}/v1/me/language`, () => json(projetar("pt"))),
      ...assinaturaHandlers(b, { [WS_PRINCIPAL]: [ASSINATURA_ATIVA] }),
    ],
  },

  // Desativada CONTINUA existindo. `active: false` não é ausência, e a lista a devolve — some-la
  // faria "desativei" virar "nunca configurei", e a pessoa reconfiguraria por cima.
  {
    id: "subscription-disabled",
    superficies: ["COM-01"],
    estado: "disponivel",
    handlers: (b) => assinaturaHandlers(b, { [WS_PRINCIPAL]: [ASSINATURA_DESATIVADA] }),
  },

  // Outage. `temporarily_unavailable` em leitura E escrita — a diferença entre "não há
  // destinatário" e "não consegui perguntar" é o eixo desta missão, e um `503` que virasse lista
  // vazia faria a tela dizer "você ainda não configurou" no dia em que o owner caiu.
  {
    id: "subscription-unavailable",
    superficies: ["COM-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/subscriptions`, () => json(problem("temporarily_unavailable"), 503)),
      http.post(`${b}/v1/subscriptions`, () => json(problem("temporarily_unavailable"), 503)),
      http.delete(`${b}/v1/subscriptions/:subscriptionId`, () =>
        json(problem("temporarily_unavailable"), 503)),
      http.post(`${b}/v1/subscriptions/:subscriptionId/secret`, () =>
        json(problem("temporarily_unavailable"), 503)),
    ],
  },

  // Anti-oracle. Inexistente, de outro workspace e já inativa colapsam nos TRÊS no mesmo
  // `forbidden_or_not_found` — o owner recusa revelar qual, e reproduzir a colapsagem é o ponto.
  {
    id: "subscription-invisible",
    superficies: ["COM-01"],
    estado: "disponivel",
    handlers: (b) => [
      http.get(`${b}/v1/subscriptions`, () => json({ items: [] })),
      http.delete(`${b}/v1/subscriptions/:subscriptionId`, () =>
        json(problem("forbidden_or_not_found"), 404)),
      http.post(`${b}/v1/subscriptions/:subscriptionId/secret`, () =>
        json(problem("forbidden_or_not_found"), 404)),
    ],
  },

  // Dois workspaces, cada um com a sua. O `workspace_id` da query é quem decide — e é por isso
  // que este cenário serve os DOIS: com um só, "isolamento" seria uma afirmação sobre um
  // conjunto de um elemento.
  {
    id: "subscription-other-workspace",
    superficies: ["COM-01"],
    estado: "disponivel",
    handlers: (b) => assinaturaHandlers(b, POR_WORKSPACE),
  },

  // ── COM-02 · Reentrada ──────────────────────────────────────────────────────────────────
  //
  // SEM handler de evento, e a ausência é a decisão. Não existe operação pública que devolva
  // evento ao Front — não há `GET /v1/events` no inventário de 27 —, então um handler aqui
  // inventaria fronteira. O que a reentrada precisa é a Analysis de destino respondendo, e isso
  // já é superfície de Analysis; o evento em si é FIXTURE, e é dela que os gates de deep link
  // leem.
  {
    id: "communication-completed-reentry",
    superficies: ["COM-02", "AN-04"],
    estado: "parcial",
    razao:
      "o evento não tem operação pública de leitura — a massa é fixture, não handler. O que o " +
      "Front serve nesta reentrada é a própria Analysis, pelos cenários que já existem.",
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:analysisId`, () => json(statusView("completed"))),
    ],
  },

  {
    id: "communication-failed-reentry",
    superficies: ["COM-02", "AN-04"],
    estado: "parcial",
    razao:
      "idem `communication-completed-reentry`: o evento é fixture. `failure_stage` é público e " +
      "vive no envelope, e nenhuma operação de Analysis o republica.",
    handlers: (b) => [
      http.get(`${b}/v1/analyses/:analysisId`, () => json(statusView("failed"))),
    ],
  },
];
