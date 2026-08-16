# DOC-CLOSE · M45.8 — consolidação transversal, e o fecho da umbrella M45

**Tranche:** M45.8 · **Umbrella:** M45 — Two-View Hardening · **Estado:** FECHADA
**Sem push · sem deploy · sem Railway.**

---

## 1. A pergunta que faltava

As sete tranches anteriores perguntaram *"esta superfície funciona?"*. A M45.8 pergunta outra:

> **quantas superfícies existem, e quantas alguém olhou?**

Nenhuma quantidade de journeys responde isso. Uma journey prova que **uma** rota funciona; a
afirmação *"não falta journey"* é sobre o **conjunto**, e só um gate que lê as duas listas a
alcança.

---

## 2. O que a resposta foi

O router tem **39 rotas**. A matriz da M45 tinha **24 journeys**, cobrindo **24 rotas**.

A umbrella inteira se chamou *endurecimento da experiência* e mediu **60% do produto** — sete
tranches fechando verdes, porque **nada media a cobertura**.

E o caso exemplar é a tranche imediatamente anterior:

> A M45.7 fechou anunciando **54 nós de a11y** como *"o total da dívida pública"*.
> Era o total do que ela tinha **olhado**. O que ela não olhou guardava **105**.

| superfície descoberta | `<main>` | axe (nós) |
|---|---|---|
| `/aion` | **não** | **76** |
| `/privacy` | sim | 10 |
| `/security` | sim | 9 |
| `/profile` | sim | **6** |
| `/rota-inexistente` (404) | **não** | 3 |
| `/error` (500) | **não** | 1 |
| `/register` | **não** | 0 |
| `/forgot-password` | **não** | 0 |

**Dívida real do produto: 159 nós**, não 54.

Três observações que a tabela não mostra sozinha:

1. **`/aion` sozinho tem 76** — mais que todas as quatro superfícies da M45.7 somadas.
2. **Os três documentos legais somam 27** (8 + 10 + 9). É **um template com um defeito**, contado
   três vezes. Corrigir o token do template baixa os três de uma vez — é a correção de melhor
   retorno do conjunto.
3. **`/profile` é a mais séria das oito.** As outras são marketing, legal ou desamparo. `/profile` é
   superfície de **produto**, autenticada, no caminho de quem paga.

---

## 3. O achado que fecha a umbrella

O gate acusou duas rotas que **nenhuma exceção justificava**:

```
/analyses/:analysisId/argos
/analyses/:analysisId/analytics
```

A umbrella se chama **Two-View Hardening**. As duas visões que lhe dão o nome nunca entraram na
própria matriz transversal. Tinham suítes próprias (M45.4) — e suíte própria é exatamente o que as
outras 24 superfícies também tinham, e não impediu nenhum dos buracos que esta tranche achou.

Adicionadas como **J33** e **J34**. E a J33 rendeu a melhor tela do dia: sob a montagem base, que
serve um documento **v2**, a visão ARGOS (que é v3-only) mostra uma **recusa nomeada** —

> *"The ARGOS document is not available for this analysis. What came back is a different kind of
> reading, and this view only shows ARGOS. The historical result is still available."*

Ausência nomeada, com causa e com saída. É o oposto exato do colapso que o G11 persegue no resto do
produto — e estava lá, sem ninguém tê-la atravessado.

---

## 4. O gate

[src/test/v1/matriz-cobre-o-router.test.ts](src/test/v1/matriz-cobre-o-router.test.ts) — estático,
2 segundos, sem browser. Lê `router.tsx` e `m45-matriz.spec.ts` e afirma quatro coisas:

1. as duas listas não estão vazias (**piso de instrumento**);
2. toda rota tem journey **ou motivo escrito** em `FORA_DA_MATRIZ`;
3. nenhum motivo é dado para rota que já não existe (poda o cemitério de exceções);
4. a dívida de cobertura é **nominal** e não cresce.

O motivo escrito não é decoração: é o que separa *"decidimos não medir"* de *"esquecemos"*.

**Dívida declarada:** `/analyses/compare/:a/:b` — superfície real, com suíte própria, fora da matriz
por orçamento desta tranche. Fica marcada `DÍVIDA`, e a mutação 4 prova que trocar esse rótulo por
uma justificativa que soa razoável reprova a suíte.

---

## 5. Errata do instrumento — o gate quase estreou mentindo

A primeira versão do extrator lia só `rota: "…"` entre aspas duplas. Ela acusou **quatro** rotas
como descobertas:

```
/instances/:instanceId          ← tem journey (J4, J19, J20)
/analyses/:analysisId/argos     ← REAL
/analyses/:analysisId/analytics ← REAL
/analyses/:analysisId/result    ← tem journey (J15, J16, J17)
```

Journey com identificador é montada com **template literal**, e o regex não a via. Duas acusações
verdadeiras, duas falsas — e nada no gate as distinguia.

**O piso de instrumento passou** (`> 20 rotas extraídas`), porque rotas sem parâmetro são a maioria
e são literais. Um piso que mede **volume** não pega um extrator cego a uma **forma**.

Só não publiquei quatro achados falsos porque conferi contra o que eu já sabia estar coberto. A
mutação 2 reencena exatamente esse defeito, e o mata.

`prove_o_instrumento_antes_de_acusar_o_codigo` — numa tranche que existe justamente porque um
instrumento não olhava para tudo.

---

## 6. Campanha de mutação — 5/5 mortas

[docs/m45/mutacoes_m45_8.py](docs/m45/mutacoes_m45_8.py)

| # | mutação | assassino real |
|---|---|---|
| 1 | uma rota perde o motivo escrito | toda rota tem journey ou motivo |
| 2 | extrator volta a ser cego a template literal | toda rota tem journey ou motivo |
| 3 | uma rota morta ganha motivo | motivo p/ rota inexistente **+** cobertura |
| 4 | rótulo `DÍVIDA` vira "coberta por suíte própria" | a dívida declarada é NOMINAL |
| 5 | teto de a11y 159 → 160 | G1-bis |

O driver roda o gate estático (2s) para as quatro primeiras e a matriz (40s) só para a quinta —
campanha cara é campanha que ninguém repete.

---

## 7. Evidência

[e2e/m458-shots.spec.ts](e2e/m458-shots.spec.ts) → `docs/m45-8/` — **5 capturas** com âncora de
estado: `/aion`, `/security`, `/profile`, `/error` (500) e a 404.

As duas visões já têm as suas em `docs/two-view` (29 imagens); `/privacy` saiu na M45.7.

---

## 8. Stack de qualidade

| gate | resultado |
|---|---|
| `npm run typecheck` | **APROVADO** — 6 projetos, **373** arquivos |
| `npx vitest run` | **119/119** arquivos · **1669/1669** testes |
| `npx playwright test` | **383/383** |
| matriz M45 isolada | **88/88** — **34 journeys** |
| cobertura do router | **4/4** — 39/39 rotas com journey ou motivo |
| mutação M45.8 | **5/5 mortas** |

`npm run lint` mantém os **9 erros pré-existentes** registrados desde a M45.2. Não são desta
tranche; não foram aumentados.

---

## 9. O saldo da umbrella M45

| | antes da M45 | depois |
|---|---|---|
| journeys transversais | 7 | **34** |
| rotas do router medidas | 7 de 39 | **39 de 39** (37 com journey, 2 declaradas) |
| dívida de a11y conhecida | *desconhecida* | **159 nós, travados** |
| gates que medem o CONJUNTO | 0 | 3 (evidência sem duplicata, G1-bis, cobertura do router) |

A M45 começou perguntando se as features que já passaram formam uma experiência coerente. Terminou
descobrindo que a pergunta anterior era mais básica: **quantas features existem?**

`NÃO MEDIDO ≠ VERDE`. `NÃO CORRIGIDO ≠ NÃO CONTADO`. E, a partir da M45.8:
**`NÃO OLHADO ≠ NÃO EXISTE`.**
