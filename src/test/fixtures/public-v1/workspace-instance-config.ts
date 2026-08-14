// M42 — massa de configuração: Workspace (CFG-03, BD12) e Instance (CFG-04, BD13).
//
// ## Dois donos, uma tela — e a massa recusa colapsá-los
//
// A M42 pode APRESENTAR configuração de Workspace e de Instance na mesma experiência. Isso não
// os torna um domínio. Não há aqui um `settings`, um `configuration` nem um objeto que carregue
// os dois estados: `sentinela-workspace` é dono de um, o Orchestrator é dono do outro, e um
// objeto compartilhado seria a primeira peça de um `configurationEngine` que nenhum contrato
// autoriza. Há gate provando a ausência.
//
// ## A massa é deliberadamente HOSTIL
//
// Nenhum identificador é derivável do nome, nenhum é sequencial, e nenhum se relaciona
// lexicalmente com o que representa:
//
//     ws-8f3a1c47-…  →  "Atendimento Norte"      (não "workspace-1" / "Workspace 1")
//     inst-4d92…     →  "Suporte"
//     inst-b7e5…     →  "Suporte"                 ← MESMO nome, outra identidade
//
// Um adapter que derive identidade de nome, ou que use `name` como chave, passa em massa
// simétrica e quebra aqui. É o mesmo motivo pelo qual `stored_language` e `effective_language`
// existem em par na massa da M41.
//
// ## A armadilha central: a claim NÃO é autoridade
//
// `GET /v1/me` projeta `workspaces[].name` das **claims** do provedor de identidade. O contrato
// é literal: *"a claim autoriza e identifica contexto, não decide como o espaço se chama"*, e
// *"`me_workspace_fields.name` continua existindo como projeção de BOOTSTRAP e pode ficar velho
// após um rename"*.
//
// Por isso `CLAIM_DESATUALIZADA.name` **diverge** de `WORKSPACE_CORRENTE.name` de propósito. Um
// Front que leia o nome do produto da claim mostra o valor errado, e mostra-o com confiança —
// sem nenhum erro, sem nenhum estado vazio, porque a claim respondeu `200`.
//
// ## O que estas fixtures se recusam a representar
//
// - **nenhum campo fora do read model publicado.** Workspace e Instance publicam exatamente
//   `["workspace_id" | "instance_id", "name", "created_at"]`. Sem `description`, `slug`, `tags`,
//   `theme`, `locale`, `settings`, `metadata`, `billing`, `members`, `roles`;
// - **nenhum `create` e nenhum `delete` de Workspace.** O contrato diz por escrito que o CRUD
//   legado **não foi promovido** — provisionar Workspace é ação administrativa, fora do produto;
// - **nenhuma listagem de Workspace.** Listar os espaços de alguém é MEMBERSHIP, e membership é
//   do provedor de identidade — `GET /v1/me` já a projeta, sem I/O;
// - **nenhuma gestão de membership.** Convite, papel, remoção e transferência não existem na
//   capacidade congelada;
// - **nenhuma unicidade de nome.** Nem em Workspace nem em Instance. O contrato declara a
//   ausência nos dois, e a massa exibe duas Instances homônimas para matar a inferência;
// - **nenhum `authorized: true` no corpo.** Autorização é comportamento da fronteira. Um mock
//   que aceitasse um campo desses ensinaria a tela a pedir permissão a si mesma.

/** O read model publicado do Workspace. Três campos, e nenhum a mais. */
export interface WorkspaceView {
  readonly workspace_id: string;
  readonly name: string;
  readonly created_at: string;
}

/** O read model publicado da Instance. A mesma forma de `instance_read_model_fields`. */
export interface InstanceView {
  readonly instance_id: string;
  readonly name: string;
  readonly created_at: string;
}

// ── CFG-03 · Workspace ──────────────────────────────────────────────────────────────────

/**
 * O estado CANÔNICO do Workspace — o que `get_workspace` devolve.
 *
 * Identidade opaca de propósito: ela é a mesma que circula nas claims, no `tenant_id` do
 * Orchestrator, nas Instances e nas assinaturas do Dispatcher. Renomear não a move.
 */
export const WORKSPACE_CORRENTE: WorkspaceView = {
  workspace_id: "ws-8f3a1c47-6b20-4e11-9d05-2a7c8e4f1b63",
  name: "Atendimento Norte",
  created_at: "2026-03-11T08:42:00Z",
};

/** O nome para o qual o fluxo de rename leva. Nada além de `name` muda. */
export const WORKSPACE_RENOMEADO = "Atendimento Nacional";

/**
 * A projeção de `GET /v1/me` com a claim **DESATUALIZADA**.
 *
 * `workspaces[0].id` é o MESMO Workspace, e `workspaces[0].name` é um nome que já não é o
 * corrente. É exatamente o estado que o contrato descreve depois de um rename: bootstrap velho,
 * produtor novo.
 *
 * Quem ler o nome daqui não recebe erro nenhum — recebe o nome errado.
 */
export const CLAIM_DESATUALIZADA = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [
    { id: WORKSPACE_CORRENTE.workspace_id, name: "Suporte Regional", role: "owner" },
  ],
  capabilities: { canonical_analysis_enabled: true },
} as const;

/** O nome que a claim carrega. Existe como constante para o gate poder afirmar a DIVERGÊNCIA. */
export const NOME_NA_CLAIM = CLAIM_DESATUALIZADA.workspaces[0].name;

// ── CFG-04 · Instance ───────────────────────────────────────────────────────────────────

/**
 * A Instance configurável. Identidade não derivável do nome, e nome que **não** é único.
 */
export const INSTANCIA_CONFIG: InstanceView = {
  instance_id: "inst-4d92e0b8-1f34-4c7a-8e56-90ab3d7f2c15",
  name: "Suporte",
  created_at: "2026-05-02T11:15:00Z",
};

/**
 * A SEGUNDA Instance, com nome DIFERENTE — e é ela que o fluxo de duplicidade renomeia para o
 * nome que a primeira já usa. Sem esta segunda linha, "nome duplicado é permitido" seria uma
 * afirmação sobre um conjunto de um elemento.
 */
export const INSTANCIA_VIZINHA: InstanceView = {
  instance_id: "inst-b7e5a316-8c02-4d99-a1f7-63e4c05b8d2a",
  name: "Cobrança",
  created_at: "2026-05-19T16:40:00Z",
};

/** O nome já ocupado por `INSTANCIA_CONFIG`. Renomear a vizinha para ele é SUCESSO. */
export const NOME_DUPLICADO = INSTANCIA_CONFIG.name;

/** Para onde o rename simples leva. */
export const INSTANCIA_RENOMEADA = "Suporte Nível 2";

/**
 * O ponteiro de Baseline da `INSTANCIA_CONFIG`.
 *
 * Ele está aqui por um motivo só: `instance_rename.nao_toca` inclui `baseline_analysis_id` e
 * `baseline_set_at`, e uma prova de que o rename não toca o baseline exige que exista baseline
 * para não ser tocado. Provar preservação sobre `null` provaria nada.
 *
 * Baseline continua capacidade PRÓPRIA (BD10) — não é "mais uma configuração", e o scenario não
 * a apresenta como tal.
 */
export const BASELINE_DA_INSTANCIA = {
  baseline_analysis_id: "an-7e14c0d9-3b58-4a06-9f21-c8d5e2417b30",
  baseline_set_at: "2026-06-08T10:05:00Z",
} as const;

// ── as duas ausências que a massa precisa saber representar ──────────────────────────────

/**
 * Os campos que NENHUMA das duas views pode ganhar sem decisão de produto.
 *
 * Exportado para o gate percorrer: uma lista escrita só na asserção envelhece junto com ela.
 */
export const CAMPOS_PROIBIDOS = [
  "description",
  "slug",
  "tags",
  "settings",
  "metadata",
  "theme",
  "locale",
  "members",
  "roles",
  "billing",
  "notification",
  "model",
  "runtime",
  "environment",
  "health",
  "policy",
  "updated_at",
] as const;

/** Os três campos publicados, por domínio. A fonte da asserção de forma. */
export const CAMPOS_DO_WORKSPACE = ["workspace_id", "name", "created_at"] as const;
export const CAMPOS_DA_INSTANCE = ["instance_id", "name", "created_at"] as const;
