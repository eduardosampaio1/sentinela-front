# Fatia 3c — Front OIDC/PKCE (Keycloak) + dados via gateway — Implementation Plan

> **For agentic workers:** TDD para a lógica (adapters/seleção de provider); validação no browser para o fluxo de redirect. Commits locais por fatia. Nunca `git add -A` (há WIP do usuário no working tree — QuickScan/supabase/scripts).

**Goal:** O front autentica via Keycloak (Authorization Code + PKCE, login hospedado pelo Keycloak) e lê dados exclusivamente pelo gateway — flag-gated (`VITE_AUTH_PROVIDER`, default `supabase`), sem quebrar o deploy atual Vercel+Supabase.

**Architecture:** Introduzir uma costura `AuthClient` (interface provider-neutra) com duas implementações — `supabaseAuthClient` (embrulha o atual) e `keycloakAuthClient` (oidc-client-ts `UserManager`). `AuthContext`, `lib/api.ts` (`getAuthHeaders`), `lib/auth.ts` e `AuthCallbackPage` consomem a costura, não o Supabase direto. Login/Register/Forgot viram redirect ao Keycloak no modo keycloak. As 3 leituras `supabase.from()` residuais passam pelo gateway.

**Tech Stack:** Vite + React 18 + TS + shadcn + TanStack Query + react-router 6; `oidc-client-ts@^3`; vitest.

**Decisões (do usuário):** redirect ao Keycloak (SPA não toca senha); paridade total de auth; flag default `supabase`; lib `oidc-client-ts` (sem react-oidc-context).

---

## Modelo neutro (contrato da costura)

```ts
// src/lib/auth/types.ts
export interface AuthUser { id: string; email: string | null }
export interface AuthSession { accessToken: string; user: AuthUser }
export interface AuthClient {
  provider: "supabase" | "keycloak";
  getSession(): Promise<AuthSession | null>;
  getAccessToken(): Promise<string | null>;
  onAuthStateChange(cb: (s: AuthSession | null) => void): () => void; // retorna unsubscribe
  signOut(): Promise<void>;
  // modelo redirect:
  startLogin(nextPath?: string): Promise<void>;
  startRegister(): Promise<void>;
  startPasswordReset(): Promise<void>;
  completeLoginCallback(): Promise<AuthSession | null>;
  accountManagementUrl(): string | null; // Keycloak Account Console; null no supabase
  supportsPasswordForms(): boolean;       // true=supabase (forms), false=keycloak (redirect)
}
```

## Envs novas (`.env.example`)
```
VITE_AUTH_PROVIDER=supabase            # ou keycloak
VITE_KEYCLOAK_ISSUER=http://localhost:8081/realms/sentinela
VITE_KEYCLOAK_CLIENT_ID=sentinela-front
```

## Config do realm (backend repo: deploy/railway/keycloak/realm-sentinela.json + aplicar no KC rodando)
- client `sentinela-front`: `redirectUris:["http://localhost:5173/auth/callback"]`, `postLogoutRedirectUris` (attribute `post.logout.redirect.uris`), `webOrigins:["http://localhost:5173"]`, standard flow on, audience mapper `sentinela-gateway`.
- realm: `registrationAllowed:true`, `resetPasswordAllowed:true` (paridade register/forgot via páginas do Keycloak).

---

### Task 3c.1: Costura AuthClient + supabaseAuthClient + keycloakAuthClient (TDD)
**Files:** Create `src/lib/auth/types.ts`, `src/lib/auth/supabaseAuthClient.ts`, `src/lib/auth/keycloakAuthClient.ts`, `src/lib/auth/index.ts` (seleção por flag). Test: `src/lib/auth/authClient.test.ts`.
- [ ] RED: teste de seleção por `VITE_AUTH_PROVIDER` (default supabase; keycloak quando setado; valor inválido → erro fail-closed).
- [ ] RED: `keycloakAuthClient.getSession` mapeia `User`(oidc) → `AuthSession` (accessToken, user.id=profile.sub, email=profile.email); expira → null. UserManager injetável (fake) — hermético, sem rede.
- [ ] GREEN: implementar. `supabaseAuthClient` embrulha o atual; `supportsPasswordForms()=true`, `accountManagementUrl()=null`.
- [ ] `keycloakAuthClient`: UserManager (authority=issuer, client_id, redirect_uri=origin+/auth/callback, response_type=code, scope="openid profile email", WebStorageStateStore localStorage, automaticSilentRenew). `startLogin`→signinRedirect({state:{next}}); `completeLoginCallback`→signinRedirectCallback; `signOut`→signoutRedirect; `onAuthStateChange`→events.addUserLoaded/UnLoaded; `supportsPasswordForms()=false`; `accountManagementUrl()`=issuer+"/account".
- [ ] Commit.

### Task 3c.2: supabase.ts provider-aware (não exige Supabase no modo keycloak)
**Files:** Modify `src/lib/supabase.ts` (tem WIP do usuário — preservar o guard, só condicionar ao provider). Test: `src/lib/auth/supabaseLazy.test.ts`.
- [ ] RED: em modo keycloak, importar supabase NÃO lança mesmo sem `VITE_SUPABASE_URL`.
- [ ] GREEN: pular o require/throw quando `VITE_AUTH_PROVIDER==="keycloak"`; manter o comportamento atual (guard do usuário) no modo supabase.
- [ ] Commit.

### Task 3c.3: AuthContext + api.ts + lib/auth.ts consomem a costura
**Files:** Modify `src/contexts/AuthContext.tsx`, `src/lib/api.ts` (`getAuthHeaders` L421, `invalidateSessionIfNeeded` L511), `src/lib/auth.ts`. Test: `src/contexts/authContext.provider.test.tsx` (fake AuthClient).
- [ ] RED: AuthContext usa `authClient.onAuthStateChange`/`getSession`/`signOut` (não `supabase.auth`). User/session neutros. Teste com fake client emitindo sessão.
- [ ] GREEN: trocar as 3 chamadas `supabase.auth.*` do AuthContext por `authClient.*`; tipar `user` como `AuthUser`. `getAuthHeaders`→`authClient.getAccessToken()`. `lib/auth.ts` roteia por `supportsPasswordForms()` (senão erro claro "use redirect").
- [ ] Regressão vitest + typecheck. Commit.

### Task 3c.4: Páginas de auth — redirect no modo keycloak
**Files:** Modify `src/features/auth/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `src/pages/AuthCallbackPage.tsx`, `src/features/profile/ProfilePage.tsx`, `src/features/settings/SettingsPage.tsx`, `src/components/dashboard/DashboardSidebar.tsx` (signOut).
- [ ] LoginPage/Register/Forgot: se `!authClient.supportsPasswordForms()` → botão único que chama `startLogin/startRegister/startPasswordReset` (esconde form de senha).
- [ ] AuthCallbackPage: `authClient.completeLoginCallback()` (mantém o path supabase por trás da costura).
- [ ] Profile/Settings: troca de senha → no modo keycloak, link para `accountManagementUrl()`.
- [ ] signOut (sidebar) já chama `useAuth().signOut` → cai na costura. Verificar.
- [ ] Commit.

### Task 3c.5: 3 leituras residuais `supabase.from()` → gateway
**Files:** Modify `src/lib/analysisRuns.ts` (L101 lista, L118 por id), `src/lib/workspaces.ts` (L317 fallback delete).
- [ ] Rotear por provider: modo keycloak usa endpoints do gateway (`/analyses`… conferir contrato) em vez de `supabase.from`. Manter supabase no default.
- [ ] Commit.

### Task 3c.6: Validação no browser (loop completo)
- [ ] `.env` local com `VITE_AUTH_PROVIDER=keycloak`, `VITE_SENTINELA_API_URL=http://127.0.0.1:8080`, `VITE_KEYCLOAK_*`. Gateway local up (uvicorn) + Keycloak.
- [ ] preview_start `sentinela-front` (:5173). Fluxo: acessar rota protegida → redirect Keycloak → login (usuário seed) → callback → dashboard lê do gateway → logout (end-session).
- [ ] Evidência: screenshot + read_network_requests (chamadas ao gateway com Bearer Keycloak, zero supabase.co). Console sem erros.
- [ ] VAL no vault + HANDOFF + memória.

## Riscos / notas
- Keycloak-hosted login muda a UX (telas do Keycloak, não as de marca) — tematizar depois se o demo exigir.
- `redirectUris`/`webOrigins`/`postLogoutRedirectUris` precisam bater com a origem (5173 local; domínio do Railway depois).
- `workspaces`/`systemRegistry` já usam gateway? confirmar na 3c.5 se restam outras `.from()` além das 3.
- WIP do usuário no working tree: **nunca** `git add -A`; commitar arquivos nominais.
