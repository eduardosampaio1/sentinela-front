# Onda 6 — E3 reconciliação dos portões browser

Fecho formal da E3: os portões browser que ficaram como `test.fixme` na E3 agora rodam **verdes em
browser real**, via um **fixture de autenticação E2E fail-closed** e um **MSW browser worker
stateful**. Nenhuma mudança no backend nem no contrato `public-v1`. Flag OFF por padrão.

## Fixture de auth E2E (fail-closed)

Entrar na app protegida em browser real sem enfraquecer a autenticação de produção.

- **`src/lib/auth/e2eBridge.ts`** (bundle principal, SEM segredo): `readE2EInjection()` /
  `setE2EInjection()` / `clearE2EInjection()` / `createE2EAuthClient()`. Todo caminho é guardado por
  `import.meta.env.DEV`. O `AuthClient` E2E é 100% local — não fala com Supabase/Keycloak nem com
  qualquer backend de identidade; `signOut()` emite `null` aos listeners (destrava o logout).
- **`src/e2e/bypass.ts`** (dev-only, com a sessão/workspace fixos): `installE2EBypass()` injeta a
  sessão/workspace no contexto e sobe o MSW browser worker. Só é `import()`-ado por `main.tsx` sob o
  gate — em produção o Rollup NÃO inclui este arquivo, então o token fixo nunca chega ao bundle.
- **Dois seams** ligados ao mesmo gate `import.meta.env.DEV`:
  - `src/lib/auth/index.ts` (`build()`): se há injeção, devolve o `AuthClient` E2E antes do provider real.
  - `src/contexts/AuthContext.tsx` (`syncWorkspaceState`): se há injeção, seta o workspace direto
    (pula `listUserWorkspaces` + `syncProjectEnvironment`, que fariam queries Supabase).
- **`src/main.tsx`**: carrega o bypass só sob TRÊS condições simultâneas —
  `import.meta.env.DEV` (baked `false` em produção → `import()` eliminado) **E** `VITE_E2E === "true"`
  **E** opt-in por teste (`window.__SENTINELA_E2E_AUTH__`, via `addInitScript`). Sem o opt-in, o
  caminho real de auth é usado no MESMO dev server (por isso o cenário não-autenticado → `/login`
  continua válido).

### Cadeados de segurança

1. **`src/test/v1/e2e-bypass.test.ts`** (6 testes): sem injeção tudo é inerte; injeção inválida é
   rejeitada; cliente local; `signOut` zera+notifica+limpa; `DEV=false` torna o helper inerte.
2. **`scripts/verify-e2e-lockdown.mjs`** (prova de bundle): após `vite build`, varre `dist/` e FALHA
   se qualquer marcador do bypass (`e2e-local-session-not-a-real-credential`,
   `__SENTINELA_E2E_BYPASS__`, `installE2EBypass`) aparecer. Verde = token ausente + bypass
   impossível de ativar em produção.
   - **Prova de dentes**: forçar o import do bypass alcançável em produção (trocar o gate `DEV` por
     `true`) + `vite build` faz o cadeado FALHAR apontando `installE2EBypass` no `dist/`. Restaurar o
     gate volta ao verde. O cadeado não é vacuosamente verde.

## MSW browser worker stateful

- **`src/test/msw/journey.ts`**: sequência por `analysis_id` (nunca contador global). Backend de
  store plugável — memória (vitest, isolado por `resetJourney()`) e `sessionStorage`
  (`useSessionJourneyStore()`, browser: sobrevive ao reload, o Playwright limpa entre specs).
  `makeJourneyHandlers(base)` liga os handlers a uma origem (node = `MSW_BASE`; browser =
  `window.location.origin`, evitando CORS do Service Worker em cross-origin).
- **`src/test/v1/journey-sequence.test.ts`** (3 testes): prova a progressão
  `prepare→receiving→queued→running→recovering→…→completed` determinada pela operação.

## Portões browser (Playwright, browser real)

- **`e2e/canonical-authenticated.spec.ts`** (3):
  - **happy**: `prepare → upload (File direto) → submit → estados → completed`; só chamadas `/v1`
    (zero `/api|/rest|/graphql|/auth`); MESMO `analysis_id`; **exatamente 1** `POST /data` (submit não
    refaz upload); sem `progressbar`/percentual; ação terminal coerente (`View result` desabilitado).
  - **refresh**: em progresso → `reload` → a app monta do ZERO a partir da URL (não do Context/File),
    reconstrói por `analysis_id` e converge para `completed`.
  - **recovering**: apresentado como progresso (sem ação de erro/retry) e a jornada continua — não é
    desfecho definitivo.
- **`e2e/canonical-responsive.spec.ts`** (3 viewports: desktop/tablet/mobile): sem overflow
  horizontal, dropzone utilizável, ação alcançável na viewport, região de estado (`role=status`) visível.
- **`e2e/canonical-route.spec.ts`** (2, inalterado no comportamento): landing responde; flag ON +
  não-autenticado → `/login` (coexiste com o bypass no mesmo dev server graças ao opt-in por teste).

## Logout dedicado

- **`src/test/v1/logout-cache.test.ts`** (2): com polling in-flight, `clearCanonicalCache` dispara o
  `AbortSignal` do request, remove o cache canônico e uma resposta tardia NÃO reaparece; um `401`
  numa query aciona `onAuthRequired` (→ `/session-expired`).

## Gates

```bash
npm run typecheck                    # 2 camadas => 0 na jornada; 3/3 legados congelados
npx vitest run                       # 34 arq / 145 testes verdes
npx vite build && node scripts/verify-e2e-lockdown.mjs   # cadeado de bundle OK
npx playwright test                  # 8 verdes (2 rota + 3 autenticados + 3 responsivos)
codex exec review --base 90f958f     # 2 rodadas — R1 limpo
```

O `VITE_E2E`/bypass é **exclusivo do dev server sob Playwright**; produção nunca o carrega.
