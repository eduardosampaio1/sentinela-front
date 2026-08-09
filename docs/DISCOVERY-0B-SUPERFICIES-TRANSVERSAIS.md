# DISCOVERY 0b — Superfícies transversais da V1

> **Estritamente documental.** Nada implementado, nenhuma dependência, nenhum wireframe, nenhum
> código alterado. Backend **congelado**. Delta de Instância **não autorizado**. Big Bang
> **bloqueado**. Zero push/deploy/Railway.
>
> **Data:** 2026-08-08 · **Repo:** `sentinela-front-e1` @ `02b349f`
> **Continua:** [[DISCOVERY-FRONT-EXPERIENCE.md]] (Etapa 0, decisões D1–D18, correções C1–C6)

---

## 1. Configurações AS-IS — mapa completo

### 1.1 `/profile` — `ProfilePage.tsx` (218 linhas)

| campo / ação | tipo | origem do dado | destino da escrita | contrato / API |
|---|---|---|---|---|
| Avatar (iniciais) | leitura | derivado de `user.user_metadata.full_name` ou `email` | — | nenhum (cálculo local de iniciais) |
| Nome de exibição | leitura | `user.user_metadata.full_name` ‖ `.name` ‖ `—` | — | sessão de auth |
| E-mail | leitura | `user.email` | — | sessão de auth |
| "Membro desde" | leitura | `user.created_at` | — | sessão de auth |
| Provedor de login | leitura | `user.app_metadata.provider` ‖ `"email"` | — | sessão de auth |
| **Nova senha + confirmação** | **escrita** | formulário local (`useState`) | **`supabase.auth.updateUser({password})`** | 🔴 **Supabase direto** |

**Não há** edição de nome, e-mail, avatar, idioma ou preferência. A única escrita é a senha.

### 1.2 `/dashboard/settings` — `SettingsPage.tsx` (186 linhas)

| seção | campo / ação | tipo | origem | destino | contrato |
|---|---|---|---|---|---|
| **Profile** | dados da conta | leitura | sessão de auth | — | — |
| **Security** | senha atual, nova, confirmação | **escrita** | formulário local | **`supabase.auth.updateUser({password})`** | 🔴 **Supabase direto** |
| **Security** | Sign out | ação | — | `signOut()` do `AuthContext` | abstração de auth ✅ |
| **Danger zone** | **"Delete your account"** | **ação prometida** | — | 🔴 **`window.alert("… contacting support …")`** | **nenhum** |

> 🔴 **Achado grave — viola a Regra de Ouro Zero §1.** O diálogo diz *"This is permanent and
> irreversible. All your workspaces, analyses, and data will be deleted immediately."* e o
> `onConfirm` executa um `window.alert` mandando enviar e-mail para o suporte.
>
> A regra é literal: *"Botão que abre confirmação e não faz nada é pior que botão desabilitado."*
> Também colide com **D15** (não prometer o que o backend não faz).

**Campo coletado e ignorado:** `currentPassword` é pedido no formulário e **nunca usado** —
`supabase.auth.updateUser` só recebe a nova senha. A tela sugere uma verificação que não acontece.

### 1.3 Duplicação

`Profile` e `Settings` têm **a mesma seção de perfil** (leitura) e **o mesmo formulário de troca
de senha**, com implementações separadas. São duas telas para um conteúdo.

---

## 2. Taxonomia proposta para a V1 (classificação, não decisão visual)

Quatro **responsabilidades**. Isto não implica quatro páginas.

| responsabilidade | o que pertence | estado na V1 |
|---|---|---|
| **Conta / Usuário** | identidade (nome, e-mail, provedor, membro desde), senha, sessões, sair, excluir conta | identidade ✅ existe (leitura); senha 🔴 via Supabase; excluir conta 🔴 promessa vazia |
| **Workspace** | nome do workspace, workspace ativo, troca de workspace | ✅ existe em `/workspaces`; **fora** de Configurações hoje |
| **Instância** | nada na V1 — a entidade não existe (**D11/D12**, delta futuro) | 🔒 **bloqueado por contrato** |
| **Preferências** | idioma, tema, densidade, unidades | ❌ **inexistente** (há `LanguageContext`, sem tela) |

### Classificação de cada superfície

| superfície | veredito |
|---|---|
| Ver identidade da conta | **V1** — já existe, precisa de casa única |
| Trocar senha | **V1** — mas **muda de mecanismo** (ver §4): no provedor canônico é redirect para o console de conta, não formulário na SPA |
| Sair | **V1** — já é abstração de auth |
| Sessões ativas | **futura** — nenhum backend expõe |
| Excluir conta | **futura** — 🔴 **remover a promessa agora** (D15) |
| Trocar/renomear workspace | **V1** — existe em `/workspaces`; decidir se aparece também em Configurações |
| Preferências (idioma/tema) | **futura ou V1 mínima** — `LanguageContext` existe sem superfície |
| Configurações de Instância | **bloqueada por contrato** (delta de Instância) |
| Equipe, Membros, Papéis, Billing, API Keys | **não aprovadas** — não entram (D2) |

---

## 3. Supabase — inventário completo do resíduo

**34 arquivos** citam Supabase. Dependência declarada: `@supabase/supabase-js@^2.99.0`.

### 3.1 O que JÁ foi eliminado (prova)

Os quatro módulos de **acesso a dados** que o gate `onda8.unknowns-e-supabase` congelou
(`analysisRuns.ts`, `analysisJobs.ts`, `workspaces.ts`, `systemRegistry.ts`) **não existem mais**.
Busca por `.from("…")`, `.rpc("…")` e `storage.from(` em `src/` (produção): **zero ocorrências**.

> ⚠️ **Consequência para o gate:** ele congela uma lista de arquivos ausentes e proíbe padrões que
> já não ocorrem. Está **verde por vacuidade** — não porque protege, mas porque não há mais o que
> medir. Ele precisa ser reescrito para o critério novo (**zero Supabase**), não só mantido.

### 3.2 O que RESTA — todas as chamadas em produção

| # | arquivo | chamada | classe |
|---|---|---|---|
| 1 | `features/auth/LoginPage.tsx` | `signInWithPassword`, `signInWithOAuth` | **2 — substituível** |
| 2 | `features/auth/RegisterPage.tsx` | `signUp` | **2 — substituível** |
| 3 | `features/auth/ForgotPasswordPage.tsx` | `resetPasswordForEmail` | **2 — substituível** |
| 4 | `pages/AuthCallbackPage.tsx` | `exchangeCodeForSession`, `setSession`, `getSession` | **2 — substituível** |
| 5 | `pages/ResetPasswordPage.tsx` | `setSession`, `exchangeCodeForSession`, `verifyOtp`, `updateUser`, `signOut` | **2 — substituível** |
| 6 | `features/profile/ProfilePage.tsx` | `updateUser({password})` | **2/3 — ver §4** |
| 7 | `features/settings/SettingsPage.tsx` | `updateUser({password})` | **2/3 — ver §4** |
| 8 | `lib/supabase.ts` | criação do client (`VITE_SUPABASE_URL`/`ANON_KEY`) | **4 — morre com os acima** |
| 9 | `lib/auth/supabaseAuthClient.ts` | implementação do `AuthClient` | **1 → 4** — ativa necessária **enquanto** o provider default for supabase |
| 10 | `lib/auth/supabaseGuard.ts` | guarda de env vars ausentes | **4 — morre junto** |
| 11 | `lib/auth/resolveProvider.ts` | **default `"supabase"`** | **3 — exige decisão** (virar `keycloak`) |
| 12 | `lib/auth/types.ts` | `AuthProviderName = "supabase" \| "keycloak"` | **4 — o tipo perde um valor** |
| 13 | `lib/auth/index.ts` | fábrica que escolhe o provider | **1 → simplifica** |
| 14 | `.env` / `.env.example` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` | **4** |
| 15 | `package.json` | `@supabase/supabase-js` | **4** |
| 16 | testes: `supabaseAuthClient.test.ts` (14), `supabaseGuard.test.ts` (17), `authClient.test.ts` (6), `auth-redirects-registrados.test.ts` (5) | — | **4 — saem com o código** |
| 17 | gates: `onda8.unknowns-e-supabase.gate.test.ts`, `supabase-zero.identidade.gate.test.ts` | — | **3 — reescrever para o critério novo** |
| 18 | menções em **comentário/doc**: `router.tsx`, `AuthContext`, `HistoryPage`, `RunRow`, `PrivacyPage`, `SecurityPage`, `WorkspacesPage`, `e2eBridge`, `lib/v1/*` | prosa | **4 — texto, some com a limpeza** |

> ⚠️ **Nota factual, não alarme:** `.env` (versionado) contém uma `VITE_SUPABASE_ANON_KEY` real
> apontando para um projeto Supabase vivo. Chave *anon* é publicável por desenho — mas ela some
> junto com o resíduo, e vale conferir na limpeza.

### 3.3 O caminho canônico JÁ EXISTE

`lib/auth/keycloakAuthClient.ts` implementa a mesma interface `AuthClient`, e
`lib/auth/index.ts` escolhe por `VITE_AUTH_PROVIDER` (`resolveProvider`, default `supabase`,
fail-closed em valor desconhecido). O contrato já prevê o modelo de **redirect**:

```
startLogin(nextPath, {idpHint})   startRegister(nextPath)   startPasswordReset()
completeLoginCallback()           accountManagementUrl()    supportsPasswordForms()
```

---

## 4. Mapa de substituição (cada resíduo → provedor canônico)

| uso hoje (Supabase) | substituto canônico | tipo |
|---|---|---|
| `signInWithPassword` / `signInWithOAuth` | `startLogin(next, {idpHint})` → Keycloak | **D** (existe, falta ligar) |
| `signUp` | `startRegister(next)` | **D** |
| `resetPasswordForEmail` | `startPasswordReset()` | **D** |
| `exchangeCodeForSession` / `setSession` / `getSession` | `completeLoginCallback()` / `getSession()` | **D** |
| `verifyOtp` (reset via link) | fluxo do Keycloak (redirect) | **D** — a **página `/auth/reset-password` deixa de existir** |
| **`updateUser({password})`** (Profile e Settings) | **`accountManagementUrl()`** → console de conta do Keycloak | **D**, com **mudança de experiência**: deixa de ser formulário na SPA e vira redirect |
| Excluir conta | **não existe em lugar nenhum** | **3 — delta novo** (ou permanece fora da V1) |
| `supportsPasswordForms() === false` | as telas de formulário de senha **somem** no modo canônico | consequência direta |

> A troca de senha é o ponto que muda produto, não só código: `supportsPasswordForms()` já existe
> exatamente para isso. Com Keycloak, "trocar senha" é **sair para o console de conta** — e essa é
> uma decisão de experiência, não um detalhe de implementação (ver §13, Q9).

---

## 5. Infraestrutura de comunicação existente — provada

### 5.1 No Front

| item | existe? |
|---|---|
| Toast (`components/ui/toast` + `toaster` + `hooks/use-toast`) | ✅ existe (Radix) |
| Banner / notice in-app | ✅ `ui/notices.tsx` (`StateBanner`, `ProblemNotice`, `ProblemFeedback`) |
| Push do navegador / Service Worker de push | ❌ **não existe** |
| Qualquer canal fora da aba | ❌ **não existe** |

### 5.2 No Backend — **existe, e é mais do que se esperava**

**`sentinela-event-dispatcher`** já é exatamente a infraestrutura que a regra §5 do enunciado
exige. Do README:

> Componente independente responsável por **entrega confiável de eventos externos**: webhook
> assinado, e-mail, tentativas, backoff, deduplicação, idempotência de entrega, auditoria de
> tentativas e dead letter. […] Ele lê eventos **já confirmados** e entrega. **Nunca produz
> verdade.**

E a lista do que ele **não pode** fazer inclui, literalmente, *"enviar notificação **antes** da
confirmação transacional"*.

| capacidade | prova |
|---|---|
| canal e-mail | `adapters/smtp.py` (SMTP real) + `adapters/email.py` |
| canal webhook assinado | README + chaveiro de segredos por versão (migration `0003`) |
| retry / backoff / dead letter | README + `0001_entrega.sql` |
| deduplicação / idempotência de entrega | idem |
| auditoria de tentativas | idem |
| retenção auditada | `0004_auditoria_de_retencao.sql` |
| origem = evento canônico do backend | outbox pública do Orchestrator (Onda 7) |
| destino congelado pela intenção | `0002_intencao_congela_o_destino.sql` |

### 5.3 Política de e-mail **já congelada no código**

```python
EVENTOS_COM_EMAIL = frozenset({"analysis.completed", "analysis.failed", "result.available"})
```

Com o comentário que explica a escolha — e que coincide com a regra de produto do enunciado:

> `analysis.queued`, `analysis.started` e `analysis.recovering` ficam de FORA: são transições
> normais do sistema, e um e-mail por transição transforma notificação em ruído.

Outras propriedades provadas de `adapters/email.py`:

- **dois idiomas** (`pt`, `en`);
- **falha alto** quando não há modelo (`ConteudoIndisponivel`) — *"não improvisa texto"*;
- **deep link montado do `url_base` configurado**, nunca de payload — *"URL vinda de payload é
  como um e-mail nosso passa a apontar para o site de outra pessoa"*;
- emissores reais confirmados para os três eventos (`analysis.completed`, `analysis.failed` e
  `result.available`, este em `adapters/postgres.py`).

### 5.4 🔴 O deep link do e-mail aponta para uma rota que não existe

```python
link = f"{url_base.rstrip('/')}/analyses/{analysis_id}"
```

O front **não tem** rota `/analyses/:id` — a canônica é **`/canonical/analyses/:analysisId`**.
Hoje esse link cai no `*` → `NotFoundPage`.

É a contradição mais barata de corrigir e a mais cara de descobrir em produção: o e-mail funciona,
entrega, e leva o usuário a um 404.

---

## 6. Templates existentes e aderência ao Design System

**Existe fonte única:** a função `montar(envelope, idioma, url_base)` em
`adapters/email.py` é o **único** compositor. Não há comunicação construída isoladamente.

| elemento | estado |
|---|---|
| estrutura | `_TEXTOS[tipo][idioma]` (assunto + primeira frase) + `_ACAO` + `_RODAPE` |
| HTML | mínimo: `<html lang>`, `<p>`, `<a>`, `<small>` |
| logo / marca | ❌ ausente |
| tipografia | ❌ ausente |
| cores / tokens | ❌ ausente |
| espaçamento | ❌ ausente |
| componentes | ❌ nenhum |
| responsividade | n/a (HTML fluido, sem layout) |
| acessibilidade | ✅ **acima da média**: `lang` no `<html>` e link com **texto descritivo** em vez de "clique aqui" |
| linguagem / nomenclatura | ✅ alinhada e sóbria; ⚠️ não usa ainda o vocabulário de produto da §9.6 da Etapa 0 |
| CTA | ✅ um só, claro ("Abrir no Sentinela") |
| estados sucesso/atenção/restrição/falha | ⚠️ **só três eventos**; não há template para "concluído com restrição" |
| erros públicos | n/a — e-mail não transporta erro público |

**Classificação:** *existentes, fonte única, deliberadamente mínimos — **fora da identidade visual**,
mas **dentro** da regra de honestidade.* Não são legado nem improviso: são um template system
enxuto, com política explícita e falha alta.

> A pergunta que sobra não é "estão feios?", é **"e-mail transacional do Sentinela deve carregar
> identidade visual?"** — decisão de produto (Q10), não dívida técnica.

---

## 7. Matriz da régua de comunicação

`in-app` = toast/banner enquanto o usuário está presente · `e-mail` = fora do produto, via
Dispatcher · **canal só existe se houver evento canônico**.

| evento | comunicar fora da tela? | canal | momento | template | CTA | deep link | dedup | retry | dado permitido | existe hoje? |
|---|---|---|---|---|---|---|---|---|---|---|
| **`needs_mapping`** / AÇÃO NECESSÁRIA | ✅ **sim** — traz o usuário de volta | e-mail | ao entrar no estado | ❌ **não existe** | "Confirmar leitura dos dados" | tela da análise | por evento | dispatcher | `analysis_id`, nunca conteúdo | ❌ **evento não é público** → **delta** |
| **análise concluída** (`final_result = ready`) | ✅ sim | e-mail | na confirmação | ✅ `analysis.completed` / `result.available` | "Abrir no Sentinela" | 🔴 link errado (§5.4) | ✅ | ✅ | id + estado | ✅ **existe** |
| **concluída com restrição** (`withheld`) | ✅ sim, **com texto próprio** | e-mail | idem | ❌ **não existe** | idem | idem | ✅ | ✅ | **jamais** o motivo interno | ⚠️ cairia em `completed` genérico |
| **falha definitiva** | ✅ sim | e-mail | na confirmação | ✅ `analysis.failed` | "Ver o que aconteceu" | idem | ✅ | ✅ | código público, nunca stack | ✅ **existe** |
| **falha só do Analytics** | ❌ **não** — intermediário | in-app | — | — | — | — | — | — | — | ❌ (nem in-app) |
| **falha só da Engine** | ❌ **não** — intermediário | in-app | — | — | — | — | — | — | — | ❌ (nem in-app) |
| **export pronto** | ⚠️ **só se a geração for assíncrona e longa** | e-mail | quando `export = ready` | ❌ não existe | "Baixar" | tela da análise | ✅ | ✅ | id | ❌ **evento não é público** |
| **export falhou** | ❌ não isoladamente | in-app | — | — | — | — | — | — | — | ❌ |
| **upload recusado** | ❌ **não** — síncrono | in-app | imediato | — | corrigir arquivo | — | — | — | motivo público | ✅ `ProblemFeedback` |
| **erro de validação** | ❌ não | in-app | imediato | — | corrigir | — | — | — | motivo público | ✅ |
| **erro de rede** | ❌ não | in-app | imediato | — | tentar de novo | — | — | — | genérico | ✅ |
| **sessão expirada** | ❌ não | in-app | imediato | — | entrar de novo | rota anterior | — | — | — | ⚠️ parcial (não volta à rota) |

**Exceção procurada e não encontrada:** nenhum erro síncrono justifica canal externo. O único
candidato-limite é *upload recusado* numa base muito grande enviada e rejeitada minutos depois —
mas hoje a rejeição é síncrona na resposta do `POST /data`, então **não** há exceção.

### O que a matriz revela

| | |
|---|---|
| eventos que **já** comunicam corretamente | 2 (concluída, falha) |
| eventos que **deveriam** e **não podem** hoje | 3 (`needs_mapping`, `withheld` com texto próprio, `export ready`) — **faltam eventos públicos** |
| eventos que corretamente **não** comunicam | 6 |
| defeito ativo | 1 (deep link errado, §5.4) |

---

## 8. Onde uma comunicação assíncrona pode ser disparada — prova

```
Orchestrator (transação)         Dispatcher (processo próprio)
  estado canônico muda
  → outbox pública (mesma transação)
       │  evento CONFIRMADO
       ▼
     leitura → entrega (webhook assinado | e-mail)
       → retry/backoff → dedup → auditoria → dead letter
```

**A arquitetura já satisfaz a regra §5 do enunciado**, e por construção:

- a origem é **estado/evento canônico do backend**, não o Front;
- a entrega é **idempotente**, com dedup e auditoria;
- o Dispatcher **não pode** enviar antes da confirmação transacional (cadeado declarado);
- **nada depende do browser aberto nem do polling do Front**.

**Não é delta novo.** O que **é** delta:

1. **Eventos públicos que faltam** — `needs_mapping`, `export.ready`, e a distinção
   `completed`-com-`withheld`. Sem evento, não há o que entregar.
2. **Destinatário** — não encontrei, nesta auditoria, de onde sai o e-mail do destinatário
   (o `Mensagem.destino` nasce `""` em `montar` e é preenchido depois). **Não afirmo que não
   existe**; afirmo que não provei. Fica como pergunta (Q11).
3. **Deep link** — corrigir o caminho (§5.4).

---

## 9. Matriz de navegação global (IA da V1)

### 9.1 Hoje

| superfície | onde vive | menu |
|---|---|---|
| Launchpad | `/home` | **principal** (Sidebar) |
| Dashboard | `/dashboard` | **principal** — rota de compatibilidade |
| History | `/dashboard/history` | **principal** — **legado**, duplica `/canonical/analyses` |
| Workspaces | `/workspaces` | **principal** |
| Settings | `/dashboard/settings` | **principal** *e* menu de usuário (TopBar) — **duplicado** |
| Profile | `/profile` | menu de usuário |
| Sign out | — | menu de usuário |
| **Análises canônicas** | `/canonical/analyses` | ❌ **em nenhum menu** — só por deep link |

> 🔴 **O eixo vivo do produto não está na navegação.** As telas canônicas (lista, jornada,
> resultado) só são alcançáveis por URL direta ou por links internos. O menu principal aponta para
> Launchpad, Dashboard de compatibilidade e o histórico **legado**.

### 9.2 Proposta de IA da V1 (classificação, não wireframe)

| conceito | onde vive | menu | observação |
|---|---|---|---|
| **Home do Workspace** | raiz autenticada | **principal** | as 4 faixas (D9) |
| **Instâncias** | dentro do Workspace | **principal** | 🔒 espaço declarado, vazio até o delta |
| **Análises / histórico** | dentro da **Instância** (hoje: do Workspace) | **principal** | uma só lista — o histórico legado sai (D17 não cobre; é higiene da Etapa 4) |
| **Configurações** | conta + workspace + preferências | **menu de usuário** | uma casa só; hoje está nos dois menus |
| **Conta / Perfil** | identidade + senha + sair | **menu de usuário** | funde com Configurações ou vira aba dela |
| **Troca de Workspace** | seletor de contexto | **nem um nem outro** — é **contexto**, não destino | erro comum: virar item de menu |

**Regra que fecha a questão:** *menu principal = **onde eu trabalho**; menu de usuário = **quem eu
sou e como o produto se comporta**; troca de workspace = **contexto**, e contexto não é destino.*

---

## 10. Lifecycle de `prepared` abandonado — prova (C1)

**Registro explícito, como pedido:** *interromper upload **≠** cancelar análise.* Nenhum CTA é
introduzido aqui.

### O que foi provado

| pergunta | resposta |
|---|---|
| existe expiração de operação em `prepared`? | ❌ **não** — as únicas transições de `op_state` são de progresso (`artifact_ready`, `profiled`, `submitted`, `failed_pre_job`) |
| existe job/comando de limpeza? | ❌ **não** — os entrypoints do módulo são `liveness` e `readiness` |
| existe retenção/purga? | ⚠️ **só para o export do Analytics** (`purge`), não para operações |
| e o multipart em staging? | ⚠️ o próprio código diz que as partes ficam *"até alguém abortar ou uma regra de ciclo de vida expirar"* — ou seja, depende de **lifecycle rule do bucket**, **fora da aplicação** |

### Conclusão

Uma análise abandonada em `prepared` **fica para sempre**: linha na operação, e possivelmente
partes de multipart no storage. Introduzir "interromper envio" hoje **produziria exatamente os
registros órfãos** que você quis evitar — a preocupação estava certa.

**Encaminhamento:** o CTA só faz sentido **depois** de existir expiração/limpeza server-side.
Enquanto isso, o lugar certo de tratar o abandono é a faixa **"Ações necessárias"** da Home (C2),
que transforma lixo invisível em pendência acionável — sem criar ação nova.

---

## 11. Novos deltas de backend encontrados

| # | delta | por quê | classe |
|---|---|---|---|
| **B1** | evento público de **`needs_mapping`** | sem evento canônico não há como comunicar AÇÃO NECESSÁRIA fora da tela | **E** |
| **B2** | evento público de **`export.ready`** (e `export.failed`) | idem, para o export | **E** |
| **B3** | distinguir **concluído com restrição** de concluído | hoje `withheld` cairia no texto genérico de `completed` | **E** (ou dado no envelope) |
| **B4** | **expiração/limpeza de `prepared` abandonado** | evita registros órfãos; pré-requisito de qualquer "interromper envio" | **E** |
| **B5** | **excluir conta** | hoje é promessa vazia (§1.2) | **E** — ou fica fora da V1 |
| **B6** | corrigir o **deep link** do e-mail (`/analyses/{id}` → rota canônica) | e-mail entrega e leva a 404 | **E pequeno** — 1 linha, mas é backend |
| — | **infraestrutura de entrega** | ✅ **já existe** (Dispatcher) — **não é delta** | — |

> **B6 é o único com defeito ativo hoje.** Os demais são capacidades ausentes.

---

## 12. Contradições com D1–D18

| # | contradição | com | encaminhamento |
|---|---|---|---|
| **X1** | "Delete your account" promete apagar tudo e chama `window.alert` | **D15** e Regra de Ouro Zero §1 | remover a promessa (desabilitar com motivo, ou tirar a seção) |
| **X2** | `currentPassword` é coletado e **nunca usado** | Regra de Ouro Zero §1 ("nada pode fingir sucesso") | remover o campo, ou usá-lo de verdade |
| **X3** | Deep link do e-mail aponta para rota inexistente | honestidade da comunicação | **B6** |
| **X4** | `withheld` cairia no e-mail genérico de `completed` | **D13** (restrição ≠ conclusão simples) | **B3** |
| **X5** | Troca de senha vira **redirect** no provedor canônico | D nenhum — é novo | decisão de experiência (**Q9**) |
| **X6** | O eixo canônico **não está na navegação**; o menu leva ao histórico legado | D7 (hierarquia orienta navegação) | resolver na Etapa 4 junto com a unificação do histórico |
| **X7** | Gate de Supabase está **verde por vacuidade** | critério novo "zero Supabase" | reescrever o gate junto com a limpeza |

Nenhuma contradiz D1–D18 no mérito. Todas são **lacunas ou defeitos** que as decisões já
existentes condenam.

---

## 13. Perguntas de produto realmente novas

| # | pergunta | por que é decisão, não implementação |
|---|---|---|
| **Q9** | Com o provedor canônico, "trocar senha" deixa de ser formulário na SPA e vira **redirect para o console de conta**. Aceitam essa mudança de experiência? | Muda a jornada de Configurações. A alternativa (formulário próprio) exigiria backend novo |
| **Q10** | E-mail transacional deve carregar **identidade visual** (logo, cores, tipografia), ou permanece mínimo e acessível como está? | Hoje é deliberadamente sóbrio. Trocar é decisão de marca, não dívida |
| **Q11** | **De onde vem o e-mail do destinatário?** Não provei nesta auditoria (`Mensagem.destino` nasce vazio e é preenchido fora do compositor) | Se não houver fonte, comunicação externa é bloqueada mesmo com toda a infra pronta |
| **Q12** | "Excluir conta" entra na V1 (**B5**) ou sai da tela até existir? | Hoje é promessa vazia — e as duas saídas são aceitáveis, mas precisam ser escolhidas |
| **Q13** | Configurações é **uma tela com abas** ou **duas rotas** (`/profile` + `/settings`)? Hoje são duas com conteúdo duplicado | Classificação já está feita (§2); a forma é decisão |
| **Q14** | Preferências (idioma/tema) entram na V1? `LanguageContext` existe sem superfície | Pequena, mas define se Configurações tem uma quarta área |

**Q5 da Etapa 0 fica ENCERRADA e reformulada por esta Discovery:** a pergunta não era se
`supabase.auth.*` viola a regra 19 — o resíduo total está em §3 e o mapa de substituição em §4.

---

## Anexo — o que esta Discovery NÃO fez

Não implementou, não removeu Supabase, não instalou nem desinstalou dependência, não redesenhou
template, não desenhou navegação, não introduziu CTA, não alterou backend ou contrato, não fez
push, deploy, Railway nem Big Bang.
