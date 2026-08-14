// M41 — massa da conta: identidade (CFG-01) e preferência de idioma (CFG-02, BD11).
//
// ## A massa é deliberadamente PERIGOSA
//
// `SEM_ESCOLHA` e `ESCOLHEU_EN` têm a **mesma identidade** e o **mesmo `effective_language`**. A
// única diferença entre elas é `stored_language`, que é exatamente o fato que não pode ser
// perdido:
//
//     stored_language = null   →  "ainda não escolheu; o produto está usando o default"
//     stored_language = "en"   →  "escolheu inglês"
//
// Qualquer adapter que faça `stored ?? effective`, `stored || effective` ou
// `language = stored ?? "en"` transforma as duas no MESMO objeto — e não quebra nada: a tela
// monta, o seletor mostra "English", e o produto passa a afirmar sobre a pessoa uma escolha que
// ela nunca fez. Por isso as duas massas existem em par, e por isso há gate exigindo que elas não
// colapsem.
//
// ## O que estas fixtures se recusam a representar
//
// - **não há `language` solto.** O contrato publica DUAS chaves, e `null` nunca é omitido —
//   devolver `{language: "en"}` apagaria a distinção acima na própria serialização;
// - **não há partição.** Nem `workspace_id`, nem `instance_id`, nem `tenant_id`. A preferência é
//   **global por usuário**: trocar de Workspace não muda o idioma, e outro dispositivo recupera a
//   mesma preferência. O contrato diz isso literalmente, e uma massa particionada ensinaria a tela
//   a mandar um escopo que o produtor não aceita;
// - **não há `theme`.** D23 continua valendo. O produto ser visualmente escuro não faz do tema uma
//   preferência persistida;
// - **não há senha, nem exclusão de conta.** D19 delega a credencial ao provedor de identidade;
//   D21 está `FUTURE / DO NOT BUILD`;
// - **não há `CLEAR`.** A V1 tem READ e SET. Voltar para inglês termina em `stored = "en"`, nunca
//   em `null` — não existe operação que devolva a conta ao estado "nunca escolheu";
// - **não há `es`, `pt-BR` nem `en-US`.** O enum é fechado em dois valores, e normalizar região no
//   Front seria a tela decidindo produto.
//
// ## Identidade
//
// A chave da preferência é o usuário AUTENTICADO, e nada mais. Nenhuma fixture usa e-mail, nome,
// workspace ou tenant como chave — e nenhum handler aceita subject escolhido pelo cliente. Do lado
// público não existe `user_subject`: ele é do lado interno, e o mock é da fronteira pública.

/** O tipo publicado, com as duas chaves SEMPRE presentes. */
export interface PreferenciaDeIdioma {
  readonly stored_language: "en" | "pt" | null;
  readonly effective_language: "en" | "pt";
}

/** Os dois únicos valores do enum. Fechado — o produto não negocia região. */
export const IDIOMAS = ["en", "pt"] as const;

/**
 * A identidade da CFG-01, com os campos que `me_read_model_fields`/`me_user_fields`/
 * `me_workspace_fields`/`me_capabilities` publicam, e **nenhum a mais**.
 *
 * Sem `role` de produto, sem `preference`, sem dado do banco do Account, sem configuração de
 * Workspace. Um campo inventado aqui viraria requisito de tela para algo que a fronteira pública
 * não entrega.
 */
export const IDENTIDADE = {
  user: { id: "u-kc-4417", email: "ana.ribeiro@cliente.test", name: "Ana Ribeiro" },
  workspaces: [
    { id: "ws-acme", name: "Acme", role: "owner" },
    { id: "ws-acme-lab", name: "Acme · Laboratório", role: "member" },
  ],
  capabilities: { canonical_analysis_enabled: true },
} as const;

/**
 * A. Nunca escolheu. O produto está em inglês **por default**, não por decisão da pessoa.
 *
 * É o primeiro estado de toda conta que nunca abriu Configurações — e o estado em que o produto
 * fica se ninguém nunca abrir.
 */
export const SEM_ESCOLHA: PreferenciaDeIdioma = {
  stored_language: null,
  effective_language: "en",
};

/**
 * B. Escolheu inglês. Mesma identidade e mesmo `effective` de `SEM_ESCOLHA` — a diferença é
 * inteira em `stored_language`, e ela é o motivo de a BD11 existir.
 */
export const ESCOLHEU_EN: PreferenciaDeIdioma = {
  stored_language: "en",
  effective_language: "en",
};

/** C. Escolheu português. */
export const ESCOLHEU_PT: PreferenciaDeIdioma = {
  stored_language: "pt",
  effective_language: "pt",
};

/**
 * A projeção que o Account faz, replicada aqui **para a massa**, não para a tela.
 *
 * Existe para que os handlers mutáveis respondam ao `PUT` como o produtor responde. O Front
 * **não** resolve `stored → effective` — quem possui essa semântica é o Account, e calculá-la na
 * fronteira pública faria o Gateway decidir produto. Se um dia esta função aparecer importada por
 * `src/features` ou `src/lib`, o erro não é dela: é de quem a importou.
 */
export function projetar(stored: "en" | "pt" | null): PreferenciaDeIdioma {
  return { stored_language: stored, effective_language: stored ?? "en" };
}

/**
 * F. O Account fora do ar, como o Gateway o traduz.
 *
 * `503`, e **nunca** `200` com `stored_language: null`. Mascarar indisponibilidade como ausência
 * de preferência faria a tela dizer *"você nunca escolheu"* para quem escolheu ontem — uma
 * afirmação sobre a pessoa que o sistema, naquele momento, não tem como sustentar.
 */
export const INDISPONIVEL = {
  type: "https://sentinela.app/problems/temporarily_unavailable",
  title: "Temporarily unavailable",
  status: 503,
  code: "temporarily_unavailable",
  detail: "account_unavailable",
} as const;

/** Valor fora do enum. O produtor recusa; o Gateway traduz para `invalid_input`. */
export const IDIOMA_INVALIDO = {
  type: "https://sentinela.app/problems/invalid_input",
  title: "Invalid input",
  status: 400,
  code: "invalid_input",
  detail: "invalid_language",
} as const;

/**
 * Valores que a massa usa para provar a RECUSA, nunca para oferecer.
 *
 * `es` é idioma que o produto não fala; `pt-BR` e `en-US` são os que alguém tentaria normalizar
 * no Front. Nenhum deles pode virar opção de UI, e nenhum pode ser silenciosamente convertido.
 */
export const FORA_DO_ENUM = ["es", "pt-BR", "en-US", "EN", "", "portugues"] as const;
