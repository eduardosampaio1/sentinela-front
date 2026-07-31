# Onda 6 — E1 · MSW e fixtures (decisão honesta)

## Decisão

Na E1, os testes do cliente canônico `/v1` usam **fetch injetado** (`fetchImpl`) alimentado por
**fixtures do contrato público**. **MSW (biblioteca) NÃO é instalado nesta etapa** — fica declarado
para a E2, não silenciosamente ausente.

- MSW no `package.json`: **não instalado** (verificado).
- Fixtures: [`src/test/fixtures/public-v1/analyses.ts`](../../src/test/fixtures/public-v1/analyses.ts)
  — só conceitos públicos (handle, 7 estados, result, listagem com cursor, 9 categorias de
  problem+json). **Nenhum** campo interno (job/worker/engine/lease/attempt/presigned/…).
- Injeção: `createV1Client({ fetchImpl })` recebe um `vi.fn` que devolve `Response` construídas a
  partir das fixtures (ver [`src/test/v1/client.test.ts`](../../src/test/v1/client.test.ts)).

## Por que basta na E1

O que a E1 precisa provar é **unidade** do cliente: montagem de URL/headers, `workspace_id`,
Idempotency-Key, auth-antes-da-rede, cancelamento, parsing de sucesso, parsing de problem+json,
resposta malformada, ausência de fallback multi-base, redaction. Tudo isso é observável
**injetando o `fetch`** — sem precisar interceptar a rede real. O fetch injetado é, inclusive, mais
estrito: permite asseverar **exatamente uma** chamada (prova de "sem fallback") e inspecionar os
headers enviados, o que um mock de rede genérico não garante.

## Por que MSW entra só na E2

MSW (interceptação em nível de Service Worker / `setupServer`) agrega valor quando houver:

- componentes/telas reais consumindo o cliente via React Query (fluxos de request em árvore);
- testes de integração de jornada (upload → submit → poll de status → result);
- necessidade de simular latência/ordem/erros de rede no nível do browser.

Nada disso existe na E1 (fundação, sem migração de telas). Instalar MSW agora seria dependência sem
consumidor. **Dívida:** SENT-FE-E1-MSW — instalar e configurar MSW (`setupServer` + handlers
derivados das MESMAS fixtures public-v1) quando a E2 trouxer as primeiras jornadas.

## Invariante ao adotar MSW (E2)

Os handlers MSW devem derivar das fixtures `public-v1` (fonte única) — **nunca** reintroduzir mocks
do contrato legado nem campos internos na camada canônica.
