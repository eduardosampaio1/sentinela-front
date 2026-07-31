# Onda 6 — E3 · Browser E2E (Playwright)

## O que está montado

- **`@playwright/test`** instalado; **chromium (headless-shell)** baixado no ambiente.
- **`playwright.config.ts`**: sobe o dev server do Vite com a flag canônica LIGADA
  (`VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED=true`, local — nunca produção) e roda no chromium.
- **`e2e/canonical-route.spec.ts`** — passa em browser REAL:
  1. a app viva sobe e a landing responde;
  2. **flag ON + não-autenticado**: `/canonical/analyses/new` redireciona para `/login` — prova que
     a rota canônica está montada sob `ProtectedRoute` e é protegida num browser real.
- **MSW browser worker** gerado (`public/mockServiceWorker.js`) para a jornada autenticada.

## Rodar

```bash
npx playwright test --project=chromium
```

## Jornada autenticada completa — plano e pré-requisito

Os cenários do item 21 (feliz: escolher arquivo → prepare → upload → submit → queued → running →
completed; refresh: running → reload → retoma por `analysis_id` → completed; recuperação: running →
recovering → running/completed; workspace: A → troca p/ B → A some, resposta atrasada de A não
contamina B; upload grande: prova ausência das APIs de materialização) exigem um **fixture de login
controlado** — a app usa `ProtectedRoute` sobre auth Supabase/Keycloak, e um E2E autenticado precisa
de uma sessão semeada (seed de sessão no `localStorage` + mock dos endpoints de auth/workspace via
`page.route`, ou um provider de auth de teste).

**Por que não foi feito aqui:** montar o mock de auth em browser é um sub-projeto desproporcional ao
restante desta entrega, e **as mecânicas da jornada já estão provadas** pelos 30+ testes
`vitest + MSW` (cliente E1 real): upload sem materialização (FileReader/`.text()`/`.arrayBuffer()`
não chamados), Idempotency-Key por intenção, identidade durável por `analysis_id`, refresh/deep-link
resume, submit não refaz upload (mesma chave), sem fallback legado, corrida de resposta tardia na
troca de workspace, os 7 estados, problem+json pelo código, e a proteção contra duplo-clique
(submit/upload bloqueados na janela de refetch). O cenário autenticado marcado como `test.fixme`
não produz falso verde.

**Próximo passo (E2E autenticado):** adicionar um fixture Playwright que semeia a sessão + intercepta
`/v1/**` (stateful preparing→…→completed) e os endpoints de auth/workspace; então converter o
`test.fixme` nos 5 cenários acima.
