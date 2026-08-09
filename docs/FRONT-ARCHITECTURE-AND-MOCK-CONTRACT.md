# FRONT ARCHITECTURE & MOCK CONTRACT

> **Autoridade de ENGENHARIA do frontend:** fronteiras, contrato, mock, validadores, gates. Não
> contém decisão de produto (→ `PRODUCT-EXPERIENCE-FREEZE-V1.md`), regra visual
> (→ `FRONT-DESIGN-SYSTEM-CONSTITUTION.md`) nem mapa de superfícies
> (→ `EXPERIENCE-BLUEPRINT-V1.md`).
>
> **Roteador:** `INDICE-DE-AUTORIDADE-V1.md` · **Acima deste documento:** Regras de Ouro globais ·
> DEC anti-monólito · Architecture Freeze Ondas 1–8 · **contrato público *authoritative***.

---

## 1. A pilha, e o que cada camada não pode fazer

```
Page                 compoe; NAO interpreta payload bruto
  |
Product component    conhece dominio; recebe VIEW MODEL
  |
View model / Query   TanStack Query + adapters puros
  |
lib/v1               cliente canonico do contrato publico
  |
HTTP                 fetch real, SEMPRE
  |
MSW  |  Gateway      trocado por AMBIENTE, nunca por codigo de UI
```

**Invariantes:**

- nenhuma página conhece fixture;
- nenhum componente de Design conhece query ou backend;
- nenhum mock cria domínio paralelo;
- nenhuma biblioteca externa vira API pública de página;
- o front **formata**, nunca **recalcula** — `escalar()` devolve string CSS pronta;
- a fronteira de versão do resultado é **uma só** (`result/adaptar.ts`), com adapters v1 e v2
  **separados** e **sem fallback silencioso**: um v2 que falha validação **não** é oferecido ao
  adapter v1.

---

## 2. Autoridade do contrato público

### 2.1 As três representações — classificação formal

| # | representação | classificação | provenance |
|---|---|---|---|
| 1 | **`sentinela-facts/docs/contracts/public-v1.json`** | 🟢 **AUTHORITATIVE** — enquanto vigente pelo freeze atual | digest SHA-256 calculado a cada execução; `version: public-v1`; **11 operações** |
| 2 | `sentinela/docs/contracts/public-v1.json` | 🔴 **STALE MIRROR** — **não é fonte de verdade** | mesma `version`, **6 operações**. Não é versão anterior declarada: é a mesma versão com conteúdo menor |
| 3 | `src/lib/v1/contract/public-v1.types.ts` | 🟡 **DERIVED / ADAPTED** (escrito à mão) | declara `ORIGEM` e `docs/contracts` no cabeçalho; gate exige que continue declarando |

### 2.2 Resolução da origem — `src/test/v1/contractOrigin.ts`

🔒 **Enquanto os digests divergirem, seleção implícita de origem NÃO é aceita.**

`resolverOrigemDoContrato()` devolve um fato: `motivo` · `escolhida` (caminho, digest, versão,
nº de operações) · `candidatas` · `divergencia`.

| motivo | comportamento |
|---|---|
| `declarada-por-env` | `SENTINELA_CONTRACT_ORIGIN` apontou — vence |
| `candidata-unica` | só uma existe |
| `candidatas-identicas` | várias, **mesmo digest** — não há o que arbitrar |
| **`ambigua`** | várias com digests **diferentes** e ninguém declarou → **`escolhida = null`, o gate FALHA** |
| `ausente` | nenhuma — exige `SENTINELA_CONTRACT_ORIGIN_ABSENT=1` |

**O que substituiu:** `ORIGENS.find(existe)` escolhia pela **ordem de pasta**. Com dois checkouts
divergentes no disco, a autoridade era consequência de quais pastas alguém clonou.

### 2.3 Regras enquanto B9 estiver aberto

1. **CI e dev declaram `SENTINELA_CONTRACT_ORIGIN`.** Sem isso o gate de autoridade fica vermelho —
   e isso é correto: é o estado real.
2. **A cópia TS não é editada como se fosse o contrato.** Ela é derivada; o dono está em outro repo.
3. **Nenhum campo novo entra na cópia** sem existir na origem resolvida.
4. **B9 não bloqueia desenvolvimento nem planejamento. Bloqueia declarar integração/release
   fechada.**

---

## 3. Os gates de contrato

Todos em `src/test/v1/` — camada de teste, **nenhum código de produto**.

| gate | prova | mutação que precisa matá-lo |
|---|---|---|
| `contract-authority` | autoridade resolvida com digest; **recusa ambiguidade**; a cópia TS declara de onde veio | tornar duas origens divergentes sem declarar → vermelho |
| `contract-operations` | **inventário normalizado de operações** dos dois lados; diff em `missing_in_front` / `extra_in_front` / `method_mismatch` / `path_mismatch` / `projection_mismatch` | remover operação · alterar path |
| `contract-sync` | vocabulário de estados, read-models de status/result/listagem, `nunca_publicos`, documentos do resultado | remover campo top-level · alterar enum |
| `contract-nested` | **projeções aninhadas** contra os contratos do produtor, **por projeção**, com nullability | remover campo aninhado |
| `canonical-boundary` | nenhum conceito interno atravessa a fronteira pública | — |

**Prova negativa executada: 5/5**, com **controle verde antes**. As mutações rodaram em **cópias**
no scratchpad, com os gates apontados por variável de ambiente — o repo congelado nunca foi escrito
e **não houve nada a restaurar**. O harness exige o **nome do caso** na saída, não apenas exit code.

### 3.1 Por que operações e não só campos

O gate antigo comparava **campos de interface**. Isso responde *"o read-model mudou?"* e não
responde *"existe operação pública que o frontend nem sabe que existe?"*. Quatro operações
contratadas ficaram sem cliente com a suíte verde. Agora:

```
operacoes no contrato ........ 11
com cliente no front .......... 7
sem cliente (B1) .............. 4
no cliente, fora do contrato .. 1   (GET /v1/me — C2)
```

### 3.2 Por que aninhados

`analytics_read_model_fields` lista `snapshot` **e não o abre**. Procurar `method_id` no contrato de
topo devolve *"não existe"* — com a mesma confiança com que devolveria *"existe"*. Foi exatamente
esse erro. O gate compara **por projeção nomeada** contra os contratos Pydantic do produtor,
resolvendo herança de bases privadas.

| direção | tratamento |
|---|---|
| **campo do fio lido e não publicado** | 🔴 **invenção** — zero tolerância (hoje: zero) |
| **`camelCase` só no front** | derivação legítima do view model — **declarada** |
| **publicado e não lido** | dívida — **declarada por projeção** |
| **nullability divergente** | zero tolerância |

> A comparação **por projeção** revelou o que um conjunto agregado esconderia: `min_group_size` é
> lido em `ResumoDeDistribuicao` e **não** em `ResumoDeConcentracao` nem `SerieTemporal`.

### 3.3 Dívida declarada

Em `src/test/v1/divergenciaDeclarada.ts`. O gate compara a divergência **real** com a **declarada**:
item novo fica vermelho, **item resolvido também** — a lista precisa encolher junto com a dívida,
senão vira folclore.

---

## 4. Arquitetura de mock

### 4.1 D36 — mock é transporte, não domínio

🔒 O modo mock consome **exatamente** os mesmos contratos e view models do modo real. É **proibido**
componente ou página importar fixture, scenario ou flag de mock. A troca mock↔real **não altera
nenhum arquivo de UI** — muda uma variável de ambiente.

```
UI                     nao sabe que mock existe
  |
Queries / View Models
  |
lib/v1
  |
HTTP                   fetch real, sempre
  |
MSW (worker)           LIGADO por env, nunca por codigo de UI
```

Depois: **MSW OFF → Gateway real**, sem tocar em componente.

### 4.2 Estrutura

```
src/mocks/
  handlers/     um arquivo por recurso do contrato publico
  fixtures/     payloads que SAO do contrato — nada exclusivo do mock
  scenarios/    composicoes nomeadas
  browser.ts    setupWorker — so em dev/mock
  node.ts       setupServer — testes
```

`scenarios/` é a unidade compartilhada por Storybook, Playwright e Vitest. Um cenário é **nome +
lista de handlers**, nada mais.

### 4.3 As quatro barreiras, e a prova de cada uma

| barreira | prova |
|---|---|
| **propriedade exclusiva do mock** | toda fixture passa pelo **validador canônico**; `additionalProperties: false` reprova campo a mais |
| **`if (mock)` na UI** | identificadores `mock`/`fixture`/`scenario`/`MSW` proibidos em `features/**/ui/**` e `design/**`, **por AST** — grep é cego a alias |
| **fixture importada por componente** | import graph: `src/mocks/**` só importável por `src/mocks/**`, `src/test/**`, `*.stories.tsx` e o bootstrap de dev |
| **divergência silenciosa fixture × contrato** | fixtures **derivam do schema publicado**; gate compara o digest do schema consumido com o do contrato |

> A quarta é a que mata em silêncio: o contrato evolui, a fixture não, e a suíte segue verde porque
> testa a fixture contra ela mesma. Amarrar no **schema publicado** é o que dá dentes.

### 4.4 Estado atual

MSW é **test-only** (`msw/node`) e **zero produto importa fixture** — a barreira já existe de fato.
`package.json` declara `msw.workerDirectory`, mas o **worker nunca é montado**: a arquitetura de
§4.1 exige montá-lo (gate B10, delta de frontend).

### 4.5 Storybook

Pode consumir `scenarios/` **desde que não crie segundo domínio fictício**. Uma story **não pode
declarar dado inline**; só pode **escolher um cenário**. Estado sem cenário não tem story — cria-se
o cenário primeiro.

---

## 5. Validadores e adapters

🔒 **D18 — Zod não substitui validação canônica.** `validator.ts`, `validatorV2.ts`, `leitores.ts`
ficam como estão. Zod só em **formulários de entrada da UI**. Barreira sugerida: `zod` proibido em
`features/**/result/**` e `lib/v1/**`. Trocar fronteira validada exigiria missão de **paridade
formal**.

**Desenho preservado:** união discriminada tornando o ramo impossível uma garantia de tipo ·
`listaEstrita` (tudo-ou-nada dentro de um bloco) × `lista` (entre blocos) · discriminador é o campo
**contratado do envelope** (`result_schema_version`), nunca marcador dentro do blob · bloco
ilegível é **descartado e contado**, nunca adivinhado.

---

## 6. Fronteiras de privacidade

🔒 Lock `privacidadeNoNavegador`.

- `withheld` significa **existe e não pode ser mostrado** — `snapshot` vem nulo. **Nunca** vira 0.
- `partial` **não é erro**: terminou e parte foi omitida para não reconstruir grupos pequenos.
- `measure_id` é **chave de saída** e **não atravessa a fronteira pública** — `unsupported_measure_ids`
  e `unauthorized_measure_ids` são **contados, nunca nomeados**. Publicá-los na lista do que foi
  retido faria a metadata contar a história que o payload decidiu esconder.
- Nenhuma persistência no browser pode violar os privacy gates. Se a preferência exigir contrato
  inexistente, **registrar delta — não criar hack**.
- `nunca_publicos`: `engine_version`, `assembly_manifest`, `dataset_fingerprint`.

---

## 7. Fronteira de auth

🔒 **Keycloak é o auth canônico** (`src/lib/auth/`, `oidc-client-ts`). `GET /v1/me` é a **única
autoridade de membership**: a projeção vem das claims do provedor, **nunca de tabela** — pedir um
workspace jamais é prova de pertencer a ele.

🔒 Query keys são **sempre tenant-scoped** (`["workspace", workspaceId, …]`), de modo que a troca de
workspace isola o cache **por construção** e resposta tardia do workspace antigo não contamina o novo.

> 🔴 **Supabase está APOSENTADO por decisão arquitetural**, e o resíduo de Auth continua **vivo e
> roteado** (`/login`, `/forgot-password`). É **delta obrigatório de erradicação, frente própria**
> (gate B6) — não é frente de Design nem autorização de remoção.
>
> **Sequenciamento:** as duas rotas são caminho de autenticação **real**. A erradicação precisa
> provar que o fluxo Keycloak cobre login, recuperação e callback **antes** de remover.

---

## 8. Anti-monólito

🔒 Regra da casa, literal: *"Arquivo de produção acima de 1.000 linhas **bloqueia fechamento**,
salvo exceção explicitamente justificada e registrada. Arquivos acima de 500/800 linhas acionam
revisão/plano."*

**Em violação hoje:** `LandingPage.tsx` (1.215) e `AionPage.tsx` (1.180) — juntos, 17 % de todo o
`.tsx` do repo. **D17**: decomposição é **missão própria**, e **nenhuma responsabilidade nova entra
nesses arquivos**.

---

## 9. Gates de fronteira propostos (ainda não implementados)

| gate | mutação que precisa matá-lo |
|---|---|
| um só vocabulário de token | reintroduzir `--background` num segundo arquivo |
| zero `#hex` em componente | trocar um token por literal |
| primitive não conhece domínio | escrever `analysis` em `src/design/**` |
| DS não acessa query | importar `@tanstack/react-query` em `src/design/**` |
| fixture não vaza | importar `src/mocks/**` de um componente |
| fixture × contrato | remover campo obrigatório da fixture |
| segundo canal (V6) | remover o ícone do chip, deixando só cor |
| **nome × valor do token** | apontar `--success` para um azul |

🔒 **Nenhum gate entra sem uma mutação que o faça falhar.** Gate verde sem prova vermelha é
decoração — e esta casa já pagou esse preço.

---

## 10. Ferramentas: o que fica, o que consolida, o que sai

| classe | itens |
|---|---|
| **fica** | React 18.3 · TS 5.8 · Vite 5.4 · React Router 6.30 · TanStack Query 5.83 · Radix (implementação interna) · CVA · clsx/tailwind-merge · Keycloak · Vitest · Testing Library · Playwright · axe-core |
| **consolidar** | Tailwind 3.4 (config aponta para variáveis que o arquivo vivo define diferente) · tokens (três vocabulários → um) · MSW no browser |
| **adicionar sob condição** | Motion for React (escopo de §5 do DS) · **Recharts** (renderer, nunca owner semântico) · React Hook Form · Zod (só forms) · Storybook |
| **saiu (M03)** | ✅ `sonner`, `jspdf`, `next-themes` — removidos |
| **fica, contra o previsto** | 🔴 `tailwindcss-animate` — **não** tem zero uso: é plugin do Tailwind e 5 componentes Radix consomem suas classes |
| **sai (pendente)** | `@supabase/supabase-js` (B6, missão M02) |
| **não recomendamos** | MUI / Ant / Chakra / Mantine — determinariam a identidade visual |

**Nenhum upgrade por "há versão nova".** Não subir React 19 nem Tailwind 4 nesta frente.

---

## 11. Deltas em repo congelado — identificados, **não aplicados**

| # | repo | patch |
|---|---|---|
| 1 | `sentinela-facts` | acrescentar `{"method":"GET","operationId":"get_me","path":"/v1/me",…}` em `operations[]` |
| 2 | `sentinela` | alinhar o mirror com a origem **ou** declará-lo snapshot histórico com `version` própria |
| 3 | `sentinela-analytics-service` | publicar schema canônico da superfície aninhada do snapshot, para o gate parar de atravessar fronteira de repo |
| 4 | `sentinela-facts` + Ingestion | expor `profile`/`mapping` no `/v1` e ligar `analysis_id ↔ ingestion_id` (B2) |

**Nenhum aplicado.** Evidência completa: `WS-A-AUTORIDADE-DO-CONTRATO.md`.
