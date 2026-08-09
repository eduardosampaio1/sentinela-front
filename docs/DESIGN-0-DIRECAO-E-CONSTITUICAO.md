# DESIGN 0 — Direção visual, skills, stack e constituição do Front

> **Frente nova.** Não é continuação do Discovery funcional — aquele está encerrado em `e8e4a12`
> (`FUNCTIONAL EXPERIENCE MAPPING — COMPLETE`). Nada aqui reabre D1–D30.
>
> **Zero implementação de página TO-BE · zero alteração de backend/contrato · zero deploy/push ·
> zero dependência runtime instalada.** As únicas instalações desta missão são **skills do agente**,
> fora do produto.
>
> **Base:** `sentinela-front-e1` @ `e8e4a12`, branch `develop`.

---

## 1. Skills — inventário e prova

### 1.1 Obrigatórias

| skill | situação | prova de invocação (alvo descartável, fora do produto) |
|---|---|---|
| `/design-system` | **disponível** — `~/.claude/skills/design-system` | Auditou o probe: **0 tokens de cor definidos, 4 hex hardcoded**; `StatusChip` sem estados/variantes/docs → 1/10 |
| `/design-critique` | **disponível** | Achou que o `EmptyState` **mistura vazio com erro** e hesita ("Something went wrong maybe"); CTA "OK" sem consequência |
| `/ux-heuristics` | **disponível** | Nota **3/10**. Severidade 4: `<div onClick>` sem teclado nem `role`. Severidade 3: valor cru `"running"` na UI |
| `/ux-copy` | **disponível** | Reescreveu o empty state no padrão *what + why + how to start*; nota de localização: EN→PT-BR expande ~20% |

### 1.2 Instaladas nesta missão

| skill | fonte | commit | prova |
|---|---|---|---|
| `frontend-design` | `anthropics/skills` → `skills/frontend-design/` | `f17010c` | Carregou. Traz calibração útil: nomeia **três "defaults de IA"** a evitar (creme + serifa + terracota; quase-preto + acento ácido; broadsheet com fio de cabelo e raio zero) |
| `web-design-guidelines` | `vercel-labs/agent-skills` → `skills/web-design-guidelines/` | `7c180d9` | Carregou e produziu achados no formato `file:line` — ver 1.4 |

Ambas foram baixadas com `gh api` e gravadas em `~/.claude/skills/`. `frontend-design` traz
`LICENSE.txt` (10 KB) — preservado junto.

### 1.3 Capacidades pedidas sem skill dedicada

| capacidade | situação | o que assume o papel |
|---|---|---|
| `accessibility` | ✅ **equivalente encontrado** — `accessibility-review` (local) | **Invocada e provada**: WCAG 2.1 AA, mediu `#fff` sobre `#FCD34D` = **1.45:1** contra 4.5:1 exigido. Reforçada por `axe-core@4.12.1`, já no repo |
| `information-architecture` | ❌ **indisponível** como skill | Coberto parcialmente por `/ux-heuristics` (Trunk Test) e pelo que **já está decidido**: a IA global é **D22**, não é pergunta aberta |
| `data-visualization` | ❌ **indisponível** — nenhuma skill local ou nos dois repos consultados | Lacuna real. Tratada nesta missão por regra própria (§9.3) em vez de skill |

**Não inventei skill.** `information-architecture` e `data-visualization` não existem em
`~/.claude/skills`, nem em `anthropics/skills`, nem em `vercel-labs/agent-skills` (listas completas
consultadas via API).

**Adjacentes encontradas e NÃO instaladas** (registro, não recomendação): `theme-factory`,
`brand-guidelines`, `canvas-design`, `webapp-testing` (anthropics); `composition-patterns`,
`react-best-practices`, `react-view-transitions` (vercel-labs). Nenhuma foi baixada — instalar por
curiosidade é ruído.

### 1.4 Saída literal do `web-design-guidelines` no probe

```
skill-probe/StatusChip.tsx:11  <div onClick> para acao — usar <button>
skill-probe/StatusChip.tsx:11  sem aria-label; "x" nao e nome acessivel
skill-probe/StatusChip.tsx:11  sem estado de foco visivel
skill-probe/StatusChip.tsx:7   cor inline por estado — sem color-scheme nem variante dark
skill-probe/StatusChip.tsx:9   {state} cru na UI — sem i18n
```

> ⚠️ **A régua desta skill mora fora do repo.** Ela busca as regras de
> `raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` **a cada
> execução**. Isso é conteúdo externo mutável: serve como *consultoria*, **nunca como gate**, a
> menos que congelemos um snapshot versionado. Ver risco **R7**.

---

## 2. Auditoria do stack e do DS atual — o que está medido

### 2.1 O achado que muda a estimativa: **três sistemas de token concorrentes**

| arquivo | vivo? | o que define | tem `.dark`? |
|---|---|---|---|
| `src/styles/tokens.css` | ✅ importado em `main.tsx:6` | `--color-*`, `--space-*`, `--radius-*`, `--shadow-*` em **hex literal** | ❌ |
| `src/styles/globals.css` | ✅ importado em `main.tsx:7` | tokens shadcn em HSL — `--background: 220 50% 5%`, `--primary: 236 77% 61%` | ❌ |
| `src/index.css` | ❌ **morto** — ninguém importa | os **mesmos nomes** com **outros valores** — `--background: 222 24% 7%`, `--primary: 195 100% 50%` | ✅ **só aqui** |
| `src/App.css` | ❌ **morto** | resíduo de template | — |

Três consequências, todas medidas e nenhuma cosmética:

1. **Light Mode tem infraestrutura ZERO.** A única regra `.dark` do repo está num arquivo **que
   não é carregado**. `tailwind.config.ts` declara `darkMode: ["class"]`, mas a classe não comuta
   nada: os valores dark estão assados direto no `:root` de `globals.css`.
2. **`--background` e `--primary` existem duas vezes com valores diferentes.** Hoje não colide
   porque um dos arquivos está morto — é uma colisão *adormecida*, não inexistente.
3. **`tokens.css` e `globals.css` não conversam.** Um fala `--color-primary: #4F5AE8`, o outro
   `--primary: 236 77% 61%`. São o mesmo azul em dois vocabulários. Um componente pode consumir
   qualquer um dos dois e nenhum lint reclama.

> Isto é o custo que **D23 manda provar antes de autorizar tema**, e é bom sabê-lo: Light Mode não é "adicionar um
> bloco `.dark`" — é **unificar três vocabulários em um** e depois derivar dois temas dele.

### 2.2 Dependências: declarado × instalado × usado

| pacote | versão | arquivos que usam | leitura |
|---|---|---|---|
| `@tanstack/react-query` | 5.83.0 | **23** | espinha dorsal, saudável |
| `react-router-dom` | 6.30.1 | roteador único (`src/app/router.tsx`, 304 linhas) | ok |
| `@radix-ui/*` | 10 pacotes | `src/components/ui` (10 arquivos) | ok, e é implementação interna |
| `class-variance-authority` | 0.7.1 | 4 | subutilizado para o tamanho do sistema |
| `clsx` + `tailwind-merge` | 2.1.1 / 2.6.0 | via `cn()` | ok |
| `lucide-react` | 0.462.0 | 6 | ok |
| `oidc-client-ts` | 3.5.0 | 2 (`lib/auth`) | auth canônico (Keycloak) |
| `@supabase/supabase-js` | 2.99.0 | **2 — e ambos roteados** | 🔴 ver **R2** |
| `next-themes` | 0.3.0 | **0** | instalado e nunca usado |
| `sonner` | 1.7.4 | **0** | idem |
| `jspdf` | 4.2.0 | **0** | idem |
| `tailwindcss-animate` | 1.0.7 | **0 importações** | 🔴 **medição errada** — é **plugin** em `tailwind.config.ts:98`, com 5 consumidores vivos. **Fica** |
| `msw` | 2.15.0 | só `src/test/msw` | test-only hoje — ver §6 |
| `axe-core` | 4.12.1 | suíte a11y | ok |
| `@playwright/test` | 1.62.1 | `e2e-mf64c/` | ok |

**Três pacotes runtime com zero uso** — corrigido de quatro. Peso e superfície sem dono.

> 🔴 **Correção da M03 (2026-08-09): eram TRÊS, não quatro.** Esta contagem mediu **importações do
> nome do módulo em `.ts`/`.tsx`**, e `tailwindcss-animate` não é importado — ele é **registrado
> como plugin** em `tailwind.config.ts:98` e entrega **classes utilitárias**. Cinco componentes
> Radix vivos usam `animate-in`, `animate-out`, `fade-in-0`, `zoom-in-95` e `slide-in-from-*`.
> Medir importação de módulo e concluir "zero uso" foi medir a coisa errada — e a remoção teria
> passado em toda a suíte, porque classe utilitária ausente vira string inerte, não erro.

### 2.3 Estado do que a constituição vai exigir

| dimensão | medido hoje |
|---|---|
| **i18n** | `pt.json` e `en.json` com **506 chaves cada** (paridade exata), usados em **65** arquivos. Base sólida |
| **Responsive** | apenas **24 de 96** arquivos `.tsx` usam qualquer breakpoint Tailwind (**25 %**); **1** `@media` em CSS no total |
| **Reduced motion** | ✅ existe e está **vivo** (`globals.css:134`) — bloco global que zera animações |
| **Gráficos** | **não há biblioteca**. Toda a "visualização" é **uma** primitiva de barra CSS (`analytics/primitivas.tsx:41`), largura vinda do `escalar()` **puro** do adapter |
| **Monólitos** | `LandingPage.tsx` **1.215** linhas · `AionPage.tsx` **1.180** linhas. Juntos = **17 %** de todo o `.tsx` do repo |
| **Storybook** | não existe |

Sobre os monólitos, a regra da casa é literal e não admite leitura generosa:

> *"Arquivo de produção acima de 1.000 linhas **bloqueia fechamento**, salvo exceção explicitamente
> justificada e registrada. Arquivos acima de 500/800 linhas acionam revisão/plano."*
> — `04 - Decisões/DEC - Arquitetura modular anti-monólito e topologia multi-repo.md:35`

Os dois arquivos estão **acima de 1.000**. Isso confirma a decisão já tomada (Q7: decomposição vira
missão própria) e dá a ela um critério objetivo de pronto.

### 2.4 O que preservar — a engenharia boa do AS-IS

Não é retórica; é o que a auditoria mostrou funcionando e que a estética nova **não pode tocar**:

- a fronteira de versão **única** (`result/adaptar.ts`) e os adapters v1/v2 separados;
- os validadores canônicos com união discriminada (`validatorV2.ts`);
- `escalar()` puro: o front **formata**, nunca recalcula — a barra recebe string CSS pronta;
- os locks `backend-first-result`, `fonte-unica-do-resultado`, `privacidadeNoNavegador`;
- `prefers-reduced-motion` já respeitado globalmente;
- MSW sem vazamento (§6.1);
- as suítes verdes e os gates de typecheck por projeto (`npm run typecheck`, nunca `npx tsc` na raiz).

---

## 3. Stack alvo — classificação item a item

| item | classificação | justificativa / delta |
|---|---|---|
| React 18.3 | **já existe e fica** | Não subir para 19 nesta frente: ganho estético zero, risco em Radix/Query. Reavaliar quando houver motivo próprio |
| TypeScript 5.8 | **já existe e fica** | Usar sempre `npm run typecheck` |
| Vite 5.4 | **já existe e fica** | — |
| React Router 6.30 | **já existe e fica** | Roteador único, sem migração para 7 nesta frente |
| TanStack Query 5.83 | **já existe e fica** | Camada de queries/view models já é o contrato da UI |
| Tailwind 3.4 | **existe mas precisa consolidar** | Config aponta para variáveis que o arquivo vivo define com outros valores (§2.1). **Não subir para v4 agora** — v4 troca o modelo de config e misturaria duas migrações |
| CSS semantic tokens | **existe mas precisa consolidar** | **É o delta nº 1.** Três vocabulários → um. Ver §9 |
| Radix Primitives | **já existe e fica** | **Implementação interna.** Nunca aparece na API pública de uma página |
| CVA | **já existe e fica** | Usar mais: é o lugar canônico de variante |
| clsx / tailwind-merge | **já existe e fica** | — |
| **Motion for React** | **não existe — recomendamos adicionar** | Com escopo: transições de estado e continuidade (§10). Só depois dos tokens de motion existirem. Antes de instalar: auditar peso e tree-shaking, e provar que respeita `prefers-reduced-motion` |
| **Recharts** | **não existe — adicionar sob restrição** | ⚠️ **Pode** renderizar geometria, eixos e escalas. **Nunca** pode ser dona de **transformação ou semântica analítica** — binning, agregação, estatística, interpolação de faltantes ou escolha de domínio que altere a leitura. O domínio chega **decidido** pelo view model. Se a API não permitir separar isso, **não adotamos**. Ver **R6** |
| **React Hook Form** | **não existe — recomendamos adicionar** | Escopo: formulários de Configurações e o modal destrutivo de D28 (digitar o nome da Instância) |
| **Zod** | **não existe — adicionar SOMENTE em UI/forms** | D-Q8 congelou: **não substitui validador canônico**. Sugiro barreira de lint: `zod` proibido em `features/**/result/**` e `lib/v1/**` |
| Keycloak (`oidc-client-ts`) | **já existe e fica** | Auth canônico. **Não substituir** |
| **MSW no browser** | **existe mas precisa consolidar** | Hoje é `msw/node`, test-only. O alvo (§6) exige o **worker**. `package.json` já declara `workerDirectory: ["public"]`, mas o worker nunca é montado |
| **Storybook** | **não existe — recomendamos adicionar** | Como devDependency, consumindo **os mesmos cenários** (§6). Sem segundo domínio fictício |
| Vitest 3.2 · Testing Library · Playwright · axe-core | **já existem e ficam** | Base de teste completa |
| `next-themes` | **não recomendamos manter como está** | Instalado, **zero uso**. Só faz sentido **se** o owner autorizar tema (P31); enquanto isso, é peso sem dono |
| `sonner` · `jspdf` · `tailwindcss-animate` | **não recomendamos** | Zero uso. Toast já é Radix. Remover na primeira missão que tocar o `package.json` |
| `@supabase/supabase-js` | **não recomendamos — mas é decisão de produto** | Ver **R2**. Não é remoção de design |
| MUI / Ant / Chakra / Mantine | **não recomendamos** | Determinariam a identidade visual. Fora de questão sem decisão explícita |

**Nenhum upgrade proposto por "há versão nova".** Todos os *fica* ficam na versão instalada.

---

## 4. Constituição provisória — P31 (proposta) e D32 a D37

> **Provisória por definição.** Só congela depois de sobreviver às primeiras superfícies reais.
> Nenhuma destas é Regra de Ouro ainda.

### P31 — PT-BR/EN é requisito; Light/Dark é **proposta técnica não autorizada**

> 🔶 **P, não D.** Corrigido em 2026-08-09 pelo owner: **D23 continua sendo a autoridade de produto
> sobre tema.** Design 0 **não pode** superseder D23 autonomamente. O que segue vale como
> **proposta técnica com custo e viabilidade provados** — e só vira decisão com autorização
> explícita do owner.
>
> **O que está autorizado hoje:** a cláusula de **idioma** de D23 (*"Idioma entra na V1"*) — PT-BR
> e EN são requisito da V1.
> **O que NÃO está:** Light/Dark. D23 diz *"Tema não entra sem prova de suporte canônico completo"*,
> e essa prova **não existe** — §2.1 mediu infraestrutura **zero**.

**Custo medido de habilitar tema** (a prova que D23 pede, e a razão de não ser barato):

| item | estado |
|---|---|
| vocabulário de token | **três concorrentes**, dois deles definindo os mesmos nomes com valores diferentes |
| regra `.dark` | existe em **um arquivo morto**; a classe do `tailwind.config` não comuta nada |
| valores dark | **assados no `:root`** do arquivo vivo — não há tema, há um tema só |
| comutador | `next-themes` instalado, **zero uso** |
| persistência da preferência | **sem contrato** — ver P31.8 |

**Conclusão da prova:** Light/Dark é **viável**, e o caminho é conhecido (§9.2), mas exige
unificar três vocabulários **antes** de qualquer tema existir. Enquanto o owner não decidir, a
Design 1 entrega **token único** — que é pré-requisito dos dois temas e vale por si — e **não**
entrega tema.

Regras **se e quando** autorizado:

1. todo componente funciona em **PT-BR e EN**;
2. todo componente funciona em **Light e Dark**;
3. preferência conceitual **System | Light | Dark** — `System` é o default;
4. **nenhum texto hardcoded** fora da solução canônica de i18n;
5. o layout tolera **expansão e contração de copy** entre idiomas (orçamento: **+30 %** de EN para
   PT-BR; nenhum componente pode depender de largura fixa de rótulo);
6. tema usa **tokens semânticos** — nunca `#hex` de tema dentro de componente;
7. **não introduzir persistência no browser que viole os privacy gates existentes**;
8. se a persistência da preferência exigir contrato inexistente, **registrar delta — não criar
   hack**. Ver §9.4.

### D32 — Responsive by default

Desktop, tablet e mobile fazem parte do **aceite** da superfície. Responsive não é retrofit. Uma
superfície que só foi provada em desktop **não está pronta**.

### D33 — Component-first

Página **compõe** componentes. Página **não cria linguagem visual local**. Se uma página precisou
inventar um visual, ou ele vira componente, ou não existe.

### D34 — Motion é parte da experiência

Movimento comunica **estado, hierarquia, continuidade ou feedback**. Motion decorativo **não pode
competir com conteúdo**. `prefers-reduced-motion` é **obrigatório** — e a versão reduzida preserva a
*informação*, removendo o *deslocamento* (§10.4).

### D35 — Design tokens são a fonte única visual

Cor, tipografia, spacing, radius, shadow, border e motion **não nascem dentro das páginas**. Valor
literal em componente é defeito, não estilo.

### D36 — Mock é transporte, não domínio

O modo mock consome **exatamente** os mesmos contratos e view models do modo real. É **proibido**
componente ou página importar fixture, scenario ou flag de mock. A troca mock↔real não altera
nenhum arquivo de UI.

### D37 — EN/PT-BR, Light/Dark e breakpoints são estados de teste do componente

Não são tarefas finais de QA. Um componente sem prova nessas dimensões está **incompleto**, não
"pendente de QA".

---

## 5. Arquitetura do Design System

### 5.1 Topologia-alvo

```
TOKENS              valor bruto e semantico; zero React
   |
PRIMITIVES          Button, Input, Chip, Bar, Stack, Text ...
   |                nao conhecem Analise/Instancia/Workspace
PATTERNS            EmptyState, ErrorState, ConfirmDestructive,
   |                ProgressiveDisclosure, DataTable, Toolbar
PRODUCT COMPONENTS  AnalysisStatus, IndicatorCard, WithheldNotice,
   |                ComparisonRow ... conhecem dominio, recebem VIEW MODEL
PAGE COMPOSITION    compoe; nao interpreta payload bruto
```

### 5.2 Pastas e ownership propostos

| camada | pasta | pode importar | **não** pode importar |
|---|---|---|---|
| TOKENS | `src/design/tokens/` | nada | tudo |
| PRIMITIVES | `src/design/primitives/` | tokens, Radix, CVA | domínio, queries, i18n de produto |
| PATTERNS | `src/design/patterns/` | tokens, primitives | domínio, queries |
| PRODUCT | `src/features/*/components/` | design/*, view models | `lib/v1` direto, fixtures |
| PAGES | `src/features/*/ui/` | product components, queries | payload bruto, adapters, fixtures |

Regras que valem como gate:

- **primitive não conhece domínio** — proibido o identificador `analysis`, `instance`, `workspace`
  em `src/design/**`;
- **product component recebe view model**, nunca o payload;
- **página compõe**, não interpreta;
- **o DS não acessa backend nem query** — proibido `@tanstack/react-query` em `src/design/**`;
- **biblioteca externa nunca vira API pública da página** — proibido importar `@radix-ui/*`,
  `recharts` ou `motion` fora de `src/design/**`;
- **estado visual canônico existe uma vez** — `ready | partial | withheld | running | failed |
  pending` têm **um** componente, não um por área;
- **variante recorrente é promovida** — a terceira ocorrência do mesmo ajuste vira token ou variante
  CVA.

> **Não há migração em massa nesta missão.** A topologia é alvo. O caminho é: superfícies novas
> nascem nela; superfícies legadas convergem quando forem tocadas por missão própria.

### 5.3 O que já está certo e vira ponto de partida

`src/features/canonical-analysis/ui/analytics/` já é *quase* a camada PRODUCT: uma área por
arquivo, `primitivas.tsx` separado, adapter puro fora da UI. A promoção é **mover `primitivas.tsx`
para `src/design/primitives/`** e tirar dele qualquer resquício de domínio — não é reescrita.

---

## 6. Arquitetura de mock — congelada antes da primeira tela

### 6.1 A boa notícia medida

Hoje **zero** arquivo de produto importa `src/test/msw` ou `src/test/fixtures`. A barreira já
existe de fato; falta torná-la **verificável** e estendê-la ao browser.

### 6.2 Alvo

```
UI                      componente/pagina — nao sabe que mock existe
  |
Queries / View Models   TanStack Query + adapters puros
  |
lib/v1                  cliente canonico do contrato publico
  |
HTTP                    fetch real, sempre
  |
MSW (worker)            intercepta no browser — LIGADO por env, nunca por codigo de UI
```

Depois: **MSW OFF → Gateway real**, sem tocar em nenhum arquivo de UI. O que muda é **uma variável
de ambiente**, não uma linha de componente.

### 6.3 Estrutura

```
src/mocks/
  handlers/     um arquivo por recurso do contrato publico
  fixtures/     payloads que SAO do contrato — nada exclusivo do mock
  scenarios/    composicoes nomeadas: "resultado v2 parcial + export expirado"
  browser.ts    setupWorker — montado so em dev/mock
  node.ts       setupServer — testes
```

`scenarios/` é a unidade que Storybook, Playwright e Vitest compartilham. Um cenário é um **nome +
uma lista de handlers**, nada mais.

### 6.4 As quatro barreiras — e como cada uma é provada

| o que impedir | barreira | prova |
|---|---|---|
| **propriedade exclusiva do mock** | toda fixture passa pelo **validador canônico** antes de ser servida | teste que valida **todas** as fixtures contra `validatorV2`/`validator`; propriedade a mais → `additionalProperties: false` reprova |
| **`if (mock)` na UI** | lint: identificadores `mock`, `fixture`, `scenario`, `MSW` proibidos em `src/features/**/ui/**` e `src/design/**` | gate de grep **por AST**, não por texto — grep é cego a alias ([[feedback_grep_cego_a_alias]]) |
| **fixture importada por componente** | lint de fronteira: `src/mocks/**` só pode ser importado por `src/mocks/**`, `src/test/**`, `*.stories.tsx` e o bootstrap de dev | teste de import graph que falha listando o infrator |
| **divergência silenciosa fixture × contrato** | as fixtures **não são escritas à mão**: derivam do mesmo JSON Schema publicado que o Assembler usa | gate que compara o hash do schema consumido com o do contrato publicado; divergiu, vermelho |

> A quarta é a que costuma matar em silêncio: o contrato evolui, a fixture não, e a suíte continua
> verde porque testa a fixture contra ela mesma. Amarrar no **schema publicado** é o que dá dentes.

### 6.5 Storybook

Pode consumir `scenarios/` — **desde que não crie segundo domínio fictício**. Regra: uma story não
pode declarar dado inline; só pode **escolher um cenário**. Se um estado não tem cenário, ele não
tem story: cria-se o cenário primeiro.

---

## 7. Referências por problema — princípio extraído, não screenshot

Método: **Mobbin** para comportamento e jornada, **Cosmos** para identidade e composição,
**Awwwards** para acabamento e motion. Awwwards **não vence usabilidade** — entra como provocação
de acabamento, nunca como argumento de estrutura.

| problema | padrão que interessa | por que serve ao Sentinela | o que **não** copiar | fonte | implicação |
|---|---|---|---|---|---|
| **Navigation / Sidebar** | sidebar com seções nomeadas por **objeto do domínio**, não por feature | nossa IA já é objeto-orientada (D22: Conta / Workspace / Instância) | ícone sem rótulo ("mystery meat"); sidebar que colapsa e some com o "você está aqui" | Mobbin (Linear, Vercel) | primitive `NavItem` com estado *current* obrigatório |
| **Workspace switching** | switcher que mostra **escopo atual** no topo e exige confirmação para trocar | erro de escopo aqui é vazamento entre tenants | switcher que troca em hover ou sem confirmar | Mobbin | product component com escopo sempre visível |
| **Operational Home** | home que responde *"o que precisa de mim agora?"*, não *"quantos temos?"* | nosso valor é ação necessária, não vaidade | grade de KPI cards sem hierarquia | Mobbin (PagerDuty, Datadog) | Home nasce de **fila de ação**, não de métricas |
| **Instance overview** | objeto com **linha do tempo** e estado corrente lado a lado | é exatamente D29 + D26 | timeline decorativa sem densidade de informação | Mobbin | pattern `ObjectOverview` |
| **Async progress** | progresso por **componente**, com estado por eixo | `/progress` já tem 4 eixos independentes | barra única que finge saber a porcentagem total | Mobbin | product component lê os 4 eixos, sem inventar agregado |
| **Action required** | separar *"precisa de você"* de *"está andando"* | D15/`needs_mapping` já distingue | badge de contagem sem dizer o que fazer | Mobbin | padrão de fila com CTA por item |
| **Analytics** | número grande **com** a régua ao lado (n, período, cobertura) | nossa promessa é evidência | número grande sozinho | Cosmos + Mobbin | todo indicador carrega procedência |
| **Data visualization** | *small multiples* e comparação lado a lado em vez de um gráfico grande | comparação é par a par por `indicator.id` | gráfico 3D; donut; **escala que engana** — domínio recortado sem dizer (§9.5) | Cosmos | biblioteca renderiza geometria e escala; **nunca** é dona da transformação nem da semântica |
| **Comparison** | diff explícito com **direção nomeada** e unidade | D26 exige descontinuidade explícita | seta verde/vermelha sem valor nem base | Mobbin | `ComparisonRow` com base declarada |
| **Trust / Methodology** | "como isto foi calculado" **a um clique**, não em página escondida | explicabilidade é severidade alta, não cosmético | selo de confiança sem conteúdo | Cosmos | pattern `ProvenancePopover` |
| **Settings** | configurações por **escopo do objeto** | é D22 literal | tela única com 40 toggles | Mobbin | uma superfície, três escopos |
| **Destructive actions** | confirmação por **digitação do nome do objeto** | é D28 literal | "Tem certeza?" com OK/Cancelar | Mobbin (GitHub, Stripe) | pattern `ConfirmDestructive` com match exato |
| **Empty states** | vazio como **convite à ação**, com causa | ausência ≠ zero ≠ resolveu | ilustração fofa sem próximo passo | Mobbin | pattern `EmptyState` com CTA obrigatório |
| **Errors** | o quê + por quê + como resolver | vocabulário congelado já separa falha de retido | "Algo deu errado" | Mobbin | `ErrorState` com código público, nunca `str(exc)` |
| **Onboarding** | onboarding **do estado**, não tutorial | já decidido no Discovery | tour de 6 passos com overlay | Mobbin | vazio ensina; não há coach mark |
| **Data-heavy mobile** | tabela vira **lista de cartões com hierarquia**, não scroll horizontal | D32 | tabela desktop espremida | Mobbin | `DataTable` com modo `stacked` |
| **Dark interfaces** | dark com **elevação por superfície**, não por sombra | sombra não funciona no escuro | preto puro + neon + glow | Cosmos | `surface-base/raised/overlay` (§9) |
| **Motion / transitions** | transição que **carrega continuidade** entre lista e detalhe | navegação Análise → Resultado | parallax, reveal por scroll, easter egg | Awwwards | token `move` + view transition |

---

## 8. Direção visual — três territórios

Restrições que os três respeitam: B2B operacional · observabilidade e governança de IA · confiança ·
evidência · precisão · densidade controlada · dados complexos · Light/Dark · EN/PT-BR · responsive ·
motion · acessibilidade.

Evitados por decisão: dashboard SaaS genérico · visual de template · estética hacker · preto + neon +
glow como sinônimo de segurança · glassmorphism gratuito · animação gratuita · excesso de cards sem
hierarquia. **E também** os três defaults que a skill `frontend-design` nomeia: creme + serifa de
alto contraste + terracota; quase-preto com um acento ácido; broadsheet com fio de cabelo e raio zero.

### T1 — **Bancada** (instrumento de medição)

| eixo | definição |
|---|---|
| **personalidade** | calibrado, sóbrio, exato. A tela é um **instrumento**, não um relatório nem um painel |
| **tipografia** | grotesca neutra de alta legibilidade para UI; **mono para todo número** com **numerais tabulares obrigatórios** — número que dança entre estados destrói leitura de série |
| **densidade** | alta, com ritmo vertical constante. Escala de espaçamento curta (4/8/12/16/24/32) para não haver "quase igual" |
| **superfície** | painel, não cartão. Hierarquia por **régua e alinhamento**, quase sem sombra |
| **contraste** | alto no dado, baixo na moldura. A moldura nunca compete |
| **cor** | neutro dominante + **um** acento. Cor semântica é **reservada** — se tudo é colorido, nada é sinal |
| **gráficos** | linha e barra finas, grid discreto, sem preenchimento gratuito; **escala honesta e exposta** (§9.5) |
| **iconografia** | linear, peso único, sempre com rótulo |
| **motion** | curto e preciso; o movimento é *assentar*, não *entrar* |
| **Light/Dark** | Light = bancada clara com tinta escura; Dark = painel de instrumento. Mesma estrutura, luminância invertida — **não** inversão de cor |
| **riscos** | pode ficar frio ou austero; "painel em vez de card" exige disciplina de espaçamento, senão vira sopa |

### T2 — **Laudo** (documento probatório)

| eixo | definição |
|---|---|
| **personalidade** | editorial-técnico, autoridade. O resultado **é um documento**, com marginália de evidência |
| **tipografia** | serifa de texto para leitura longa + sans para UI + mono para dado |
| **densidade** | média, com coluna de leitura confortável |
| **superfície** | tinta sobre papel; **marginália** carrega procedência e método |
| **contraste** | editorial: títulos fortes, corpo calmo |
| **cor** | quase monocromático; acento só onde há **decisão** |
| **gráficos** | pequenos e embutidos no texto — *sparkline*, *small multiples* |
| **iconografia** | mínima; o texto carrega |
| **motion** | quase nenhum; paginado |
| **Light/Dark** | Light nasce natural; Dark exige cuidado para a serifa não afinar demais |
| **riscos** | 🔴 **briga com densidade operacional e com mobile**; e passa perto do default *broadsheet* que a skill alerta — precisaria evitar ativamente fio de cabelo + raio zero + coluna de jornal |

### T3 — **Sala de operação** (controle industrial)

| eixo | definição |
|---|---|
| **personalidade** | operacional, alerta calmo. **Estado antes de número** |
| **tipografia** | sans condensada para rótulo, mono para leitura |
| **densidade** | alta, em zonas fixas — o olho aprende onde as coisas moram |
| **superfície** | camadas por **elevação real** (`base / raised / overlay`) |
| **contraste** | forte em estado, contido em conteúdo |
| **cor** | neutro + faixa semântica forte; **estado tem forma além de cor** |
| **gráficos** | barras e faixas; comparação lado a lado |
| **iconografia** | pictogramas de estado, consistentes |
| **motion** | transições de estado explícitas e nomeadas |
| **Light/Dark** | Dark nasce natural; Light exige recalibrar o alerta para não gritar |
| **riscos** | 🔴 **é o mais próximo do "dashboard SaaS genérico"** — sem uma assinatura forte, vira template |

### Recomendação

**T1 Bancada como base, com a marginália de evidência do T2 como assinatura.**

Por quê: o produto vende **precisão e evidência**, e T1 é o único cuja personalidade *é* isso — os
outros dois a representam. T3 tem o risco mais alto de cair no genérico, que é justamente o que foi
proibido como default. T2 puro não aguenta a densidade operacional nem sobrevive bem ao mobile
exigido por D32.

A assinatura — **a marginália de procedência** — é onde gasto a ousadia: todo número carrega, ao
lado, de onde veio e sobre quantos registros. É a única coisa memorável da tela, e é a que o
concorrente não copia porque exige o backend que nós temos.

> **Não congelado.** Falta crítica adversarial (`/design-critique` sobre o território, não sobre
> componente) e falta sobreviver à primeira superfície real. Missão Design 1.

---

## 9. Light / Dark — tokens semânticos

### 9.1 Vocabulário mínimo

```
surface-base      surface-raised     surface-overlay
text-primary      text-secondary     text-muted
border-default    border-strong
accent
success   warning   danger   info
state-running     state-partial      state-withheld
chart-1 .. chart-n     chart-grid     chart-axis     chart-emphasis
```

Regra dura: **o componente consome semântica, nunca `#hex` de tema.** `bg-[#0D1525]` num componente
é defeito, e o gate de hardcode da E7 (31 → 0) já provou que dá para manter em zero.

### 9.2 Como os dois temas se derivam

Não por inversão. Cada tema declara sua **rampa de luminância** e os papéis semânticos apontam para
degraus dessa rampa. Em Light, `surface-raised` é **mais claro** que `surface-base`; em Dark, é
**mais claro também** — elevação é sempre "mais perto da luz", nunca "mais escuro". É por isso que
inverter cor quebra: inverter troca a direção da elevação.

Alvos de contraste, verificáveis: texto **≥ 4.5:1**; UI e não-texto **≥ 3:1**; séries de gráfico
adjacentes **≥ 3:1** entre si.

### 9.3 A prova que gráficos e estados precisam passar

Cor **não pode ser o único canal**. Três testes, em Light e em Dark:

1. **Escala de cinza** — a tela impressa em P&B ainda distingue as séries e os estados?
2. **Deuteranopia e protanopia** simuladas — `running` ainda se distingue de `partial`, e
   `withheld` de `failed`?
3. **Segundo canal obrigatório** — todo estado semântico carrega **forma ou rótulo** além da cor;
   toda série de gráfico carrega **padrão ou rótulo direto** além da cor.

Isto responde à lacuna da skill `data-visualization` ausente: em vez de uma skill, uma **regra
verificável**.

### 9.4 Persistência da preferência — onde pode virar delta

`System` não persiste nada: lê `prefers-color-scheme`. `Light`/`Dark` explícitos precisam de algum
lugar. Ordem de preferência:

1. **nada** — `System` como default cobre a maioria e não persiste;
2. **preferência do usuário no backend**, se e quando existir contrato de preferências (é o mesmo
   lugar de idioma, D23);
3. armazenamento local **só** se passar pelo privacy gate.

> Se (2) não existir, isto é **delta de contrato**, e a regra de P31.8 manda **registrar, não criar
> hack**. Não inventar `localStorage` para preferência de conta porque foi mais fácil.

### 9.5 Escala honesta — a regra que substitui "eixo nunca truncado"

> **Corrigida pelo owner em 2026-08-09.** A regra absoluta *"eixo nunca truncado"* era boa intenção
> e má regra: proibiria a leitura correta de uma série que varia 2 % em torno de 87 %, onde forçar
> o zero esconde exatamente o que importa. O que se proíbe não é o corte — é **enganar**.

**Regra: a escala nunca pode induzir leitura falsa, e nunca pode ser implícita.**

| tipo | domínio | condição |
|---|---|---|
| **barra quantitativa** (comparação de magnitude) | **parte de zero** | exceção **explícita**, marcada na própria peça — nunca silenciosa. Barra é comparação de **área**; cortar a base multiplica a diferença percebida |
| **série temporal** (leitura de variação) | **pode** ter domínio não-zero | os **limites ficam expostos** — eixo rotulado com mín/máx reais, sem depender de o leitor inferir |
| **delta / comparação A×B** | domínio **simétrico** em torno de zero | senão "subiu 2" e "caiu 2" ganham tamanhos diferentes |

Três regras de apoio, todas verificáveis:

1. **O domínio chega decidido pelo view model.** Nenhum "auto-domínio" de biblioteca escolhe o que o
   usuário vê. Domínio automático é uma decisão analítica disfarçada de default.
2. **Eixo cortado é declarado, não deduzido.** Se o domínio não começa em zero, isso aparece na
   peça — rótulo do eixo, marca de corte ou nota. O leitor nunca precisa desconfiar.
3. **Nada de interpolação sobre buraco.** Ponto ausente é **ausência** — a linha não atravessa, e a
   lacuna é visível. Ausência não é zero (é a mesma regra congelada em §11.2), e a série longitudinal
   **tolera buraco** por D-Q23.

**Consequência para a biblioteca:** Recharts (ou qualquer outra) **pode** desenhar geometria, eixos
e escalas. **Não pode** ser dona de transformação nem de semântica analítica — binning, agregação,
estatística, interpolação de faltantes ou escolha de domínio. Isso é `fonte-unica-do-resultado`, e
não é negociável pela conveniência da API.

---

## 10. Motion language

### 10.1 Tokens — poucos e nomeados

```
duration-instant     0ms      troca sem deslocamento
duration-fast      120ms      microinteracao (hover, press, foco)
duration-base      200ms      transicao de estado
duration-slow      320ms      entrada de overlay, mudanca de rota
duration-deliberate 480ms     so onde a demora COMUNICA (processamento)

easing-standard    cubic-bezier(0.2, 0, 0, 1)     movimento dentro da tela
easing-enter       cubic-bezier(0, 0, 0.2, 1)     desacelera ao chegar
easing-exit        cubic-bezier(0.4, 0, 1, 1)     acelera ao sair
easing-emphasis    cubic-bezier(0.2, 0, 0, 1.2)   um unico overshoot, raro

spring-direct      manipulacao direta apenas (arrastar, redimensionar)
```

Cinco durações e quatro curvas. Não mais. A regra existente do repo (150–300ms, ease-out na entrada,
ease-in na saída) é preservada e apenas formalizada.

### 10.2 Categorias

| categoria | quando | token |
|---|---|---|
| `enter` | elemento aparece | `duration-slow` + `easing-enter` |
| `exit` | elemento sai | `duration-fast` + `easing-exit` — sair é sempre mais rápido que entrar |
| `move` | elemento muda de lugar mantendo identidade (lista → detalhe) | `duration-base` + `easing-standard` |
| `emphasis` | algo mudou e o usuário precisa notar | `duration-base` + `easing-emphasis`, **uma vez**, sem repetir |
| `state` | transição de estado semântico | `duration-base`, cor e forma juntas |

### 10.3 Aplicação por superfície

| superfície | movimento |
|---|---|
| microinteractions | `fast`, só opacidade e transform |
| state transitions | `state`; `running → ready` é **assentar**, não piscar |
| navigation | `move` com continuidade do elemento clicado |
| overlays | `enter` na entrada, `exit` na saída, sem *bounce* |
| progressive loading | esqueleto que **não pulsa mais rápido que 1 Hz** |
| async processing | `deliberate`; o movimento indica *vivo*, não progresso falso |
| charts/data changes | anima **valor**, nunca eixo; eixo que se mexe mente sobre a escala |
| comparison | os dois lados entram **juntos**, nunca em cascata — cascata sugere ordem |
| success / warning / error | `emphasis` uma vez; erro **não** treme |

### 10.4 Reduced motion — o que muda de verdade

Não é "desligar tudo". É **preservar a informação e remover o deslocamento**:

| normal | reduced |
|---|---|
| elemento desliza para a posição | aparece na posição, `opacity` em `duration-fast` |
| esqueleto pulsa | esqueleto estático com rótulo textual de carregamento |
| barra cresce até o valor | barra já no valor final |
| transição de rota com continuidade | corte seco |
| `emphasis` com overshoot | mudança de cor/borda sem movimento |

O bloco global de `globals.css:134` já garante o piso. A tabela acima é o que o componente faz
**além** do piso — porque zerar duração global sem pensar transforma "carregando" em "nada acontece".

---

## 11. Copy PT-BR / EN e responsive

### 11.1 Princípios de copy

1. **Não traduzir literalmente termo técnico quando isso piora o entendimento.** `withheld` não é
   "retido" em toda frase; o que importa é o **significado congelado**, não a palavra.
2. **Um termo, um significado, em toda a interface.** Se `partial` virar "parcial" numa tela e
   "incompleto" noutra, o vocabulário morreu.
3. **Usuário não vê nome interno de infraestrutura.** Nem `job`, nem `tenant`, nem `outbox`, nem
   nome de tabela, nem nome de serviço.
4. **Voz ativa, sentença capitalizada, verbo + substantivo no CTA.** "Nova análise", não "OK".
5. **Erro é direção, não desculpa.** O quê + por quê + como resolver. Erro não pede desculpas e não
   é vago.
6. **Vazio é convite.** O que é isto + por que está vazio + como começar.
7. **Nenhum texto promete ação inexistente.** Sem CTA sem operação real (D21 já custou isso uma vez).

### 11.2 Os significados que a copy não pode borrar

| termo | significa | **não** significa |
|---|---|---|
| `partial` | parte do resultado existe e é publicável | resultado errado; resultado incompleto por falha |
| `withheld` | existe, mas **não pode** ser mostrado (privacidade) | não existe; deu zero |
| **falha** | a operação terminou e não produziu resultado | está demorando |
| **ação necessária** | o sistema parou esperando **você** | o sistema está processando |
| **disponibilidade progressiva** | partes ficam prontas em tempos diferentes | "resultado parcial" |
| **ausência** | não há sinal | zero; "resolveu"; "sumiu" |
| **delta** | diferença **medida** entre dois pontos comparáveis | drift |
| **drift** | mudança de comportamento ao longo do tempo | delta |

### 11.3 Responsive

| breakpoint | papel |
|---|---|
| `< 640` mobile | uma coluna; tabela vira lista com hierarquia; ação primária alcançável com o polegar |
| `640–1024` tablet | duas colunas; navegação colapsável mas com "você está aqui" preservado |
| `> 1024` desktop | densidade plena; comparação lado a lado |

Orçamento de copy: **+30 %** de EN para PT-BR. Nenhum componente com largura fixa de rótulo. Toda
superfície é aceita nos três tamanhos (D32) — e o teste roda nos três (D37).

---

## 12. Storybook, a11y e visual testing

| camada | ferramenta | o que prova | onde já estamos |
|---|---|---|---|
| unidade visual | **Storybook** (a adicionar) | cada componente em seus estados, consumindo `scenarios/` | não existe |
| a11y automatizada | `axe-core` | violações WCAG por story e por página | ✅ instalado e em uso |
| a11y manual | teclado + leitor de tela | foco, ordem, nome/papel/valor | pendente |
| interação | Vitest + Testing Library | comportamento | ✅ maduro |
| jornada | Playwright | fluxo real contra Gateway real | ✅ existe (`e2e-mf64c/`) |
| visual regression | Playwright screenshots | a matriz de D37 | não existe |

**A matriz de D37, concretamente:** para cada componente do DS, o conjunto mínimo é
`{ pt-BR, en } × { light, dark } × { mobile, desktop }` = **8 combinações**. Não são 8 tarefas de
QA — são 8 estados do componente. Um componente que não passa nos 8 está incompleto.

Contra o risco de snapshot que aprova tudo: screenshot só entra em gate **depois** que existir uma
mutação de token que o faça falhar. Antes disso é decoração — e a casa já pagou esse preço em outras
frentes ([[feedback_teste_verde_por_motivo_errado]]).

---

## 13. Riscos e contradições encontrados

| # | risco / contradição | gravidade | encaminhamento |
|---|---|---|---|
| ~~R1~~ | Três sistemas de token concorrentes | ✅ **RESOLVIDO — M03 + M08** | `index.css` e `App.css` removidos na M03; `styles/tokens.css` (82 props, 0 consumidores) removido na M08. Restou **um** vocabulário canônico em `src/design/tokens/`, e `globals.css` virou camada de **apelidos**. Gate `design-tokens-unico` com 3 mutações negativas |
| **R2** | **Auth Supabase está VIVA e roteada** (`/login`, `/forgot-password`), enquanto Keycloak é o auth canônico. A narrativa "Supabase está morto" era sobre **acesso a dados** | 🔴 alta | **Não é mais candidato.** A decisão arquitetural é que **Supabase está aposentado** → **DELTA OBRIGATÓRIO DE ERRADICAÇÃO**, em frente própria, **separada da Design**. Não implementado nesta missão. Ver §13.1 |
| ~~R3~~ | `next-themes` instalado com zero uso | ✅ **RESOLVIDO na M03** | **Removido.** A decisão 1 do owner tirou Light/Dark da V1; a peça saiu junto |
| **R4** | `LandingPage` (1.215) e `AionPage` (1.180) **violam a regra anti-monólito**, que diz *"bloqueia fechamento"* | 🟡 média | Já é missão própria (Q7). Agora com critério objetivo: **< 1.000 linhas** |
| **R5** | Responsive existe em **25 %** dos arquivos. D32 diz "não é retrofit", mas para o legado **será** | 🟡 média | D32 vale para superfície **nova**; legado converge por missão, sem promessa global |
| **R6** | Recharts pode virar **dona de transformação/semântica analítica** (binning, agregação, interpolação, domínio automático) e violar `fonte-unica-do-resultado` | 🟡 média | Adoção **condicional**: renderizar geometria/escala é permitido; transformar não. Provar a separação, senão primitivas próprias |
| **R7** | `web-design-guidelines` **busca a régua de uma URL externa em runtime** | 🟡 média | Vale como consultoria, **não como gate**. Para gate, congelar snapshot versionado no repo |
| ~~R8~~ | `jspdf`, `sonner`, `tailwindcss-animate` com "zero uso" | ⚠️ **PARCIALMENTE RESOLVIDO na M03** | `jspdf` e `sonner` **removidos**. 🔴 `tailwindcss-animate` **NÃO**: a auditoria estava errada — ele é **plugin em `tailwind.config.ts:98`** e 5 componentes Radix vivos consomem `animate-in`/`animate-out`/`fade-in-0`/`zoom-in-95`/`slide-in-from-*`. Removê-lo apagaria as animações de diálogo, dropdown, sheet, toast e tooltip **sem nenhum teste reagir** |
| **R9** | Zod pode virar validador canônico "por conveniência" | 🟢 baixa | Barreira de lint por pasta desde o primeiro commit que instalar Zod |
| **R10** | `package.json` declara `msw.workerDirectory`, mas o worker **nunca é montado** — a arquitetura de §6 depende dele | 🟢 baixa | Item explícito da Design 1 |

**Nenhuma destas reabre D1–D30.**

### 13.1 R2 — delta obrigatório de erradicação do Supabase

> **Corrigido pelo owner em 2026-08-09:** R2 **não é candidato**. A decisão arquitetural já está
> tomada — **Supabase está aposentado**. O que resta é erradicação, não avaliação.

**Frente própria, separada da Design.** Não é decisão de design, não entra na Design 1, e **não foi
implementada nesta missão**.

Escopo medido do que ainda respira:

| resíduo | onde | estado |
|---|---|---|
| `signInWithOAuth`, `signInWithPassword` | `src/features/auth/LoginPage.tsx` | **roteado** em `/login` |
| `resetPasswordForEmail` | `src/features/auth/ForgotPasswordPage.tsx` | **roteado** em `/forgot-password` |
| cliente | `src/lib/supabase` | vivo |
| dependência | `@supabase/supabase-js@2.99.0` | instalada |

Critério de pronto da erradicação: **zero** import de `@supabase/*` no `src/`, **zero** rota que
dependa dele, dependência fora do `package.json`, e um **gate por AST** que falhe se voltar
([[feedback_grep_cego_a_alias]] — grep não prova ausência).

⚠️ **Atenção de sequenciamento:** as duas rotas são **caminho de autenticação real**. Apagar sem
substituto tira o acesso de quem entra por ali. A erradicação precisa provar que o fluxo Keycloak
cobre login, recuperação e callback **antes** de remover — e isso é trabalho da frente própria, não
da Design.

---

## 14. As três primeiras superfícies — a ordem deve mudar

Proposta original: **Resultado → Instância → Home operacional**.

**Recomendo: Resultado → Home operacional → Instância.** Uma troca, com motivo objetivo.

| # | superfície | por que aqui |
|---|---|---|
| 1 | **Resultado da Análise** | **Mantém-se primeiro.** É a superfície mais densa e a única que tensiona *tudo* de uma vez: DS, analytics, trust, `ready/partial/withheld`, comparação, export, dark, i18n, motion, data-viz. E é a única que já tem **contrato real, adapter, validador e Gateway provados** — o TO-BE se apoia em engenharia que existe |
| 2 | **Home operacional** | **Sobe para segundo.** Compõe contratos que **existem hoje** (listagem por cursor, `/progress` de 4 eixos, estados terminais). Tensiona navegação, IA global, fila de ação necessária, empty/error states e o mobile de D32 |
| 3 | **Instância** | **Desce para terceiro** — porque **a Instância não existe no backend**. O delta continua **não autorizado**, e o Gateway ainda descarta `project_id`/`environment_id`. Construí-la em segundo lugar seria projetar contra um contrato inexistente, com mock como única fonte de verdade — exatamente o que D36 quer evitar. Em terceiro, ela entra como **superfície de contrato futuro**, declaradamente sob mock, depois que DS e navegação já estiverem provados contra o real |

Cobertura das três, somadas: DS ✅ · analytics ✅ · trust ✅ · estados ✅ · comparação ✅ ·
navegação ✅ · responsive ✅ · dark ✅ · i18n ✅ · motion ✅ · data visualization ✅.

---

## 15. Proposta da MISSÃO DESIGN 1 — não executada

**Nome:** *Fundação visual — token único, dois temas, dois idiomas, um componente provado.*

Escopo proposto, em ordem:

1. **Unificar os tokens.** Três vocabulários → um. Deletar `src/index.css` e `src/App.css`
   (mortos, e um deles contém a `.dark` fantasma). Colisão `--background`/`--primary` resolvida.
2. **Derivar Light e Dark** da rampa de luminância (§9.2), com os alvos de contraste como gate.
3. **Decidir `next-themes`** — adotar como comutador `System | Light | Dark`, ou remover.
4. **Criar `src/design/tokens/` e `src/design/primitives/`**, promovendo `analytics/primitivas.tsx`
   como primeiro morador. Sem migração em massa.
5. **Um componente ponta a ponta** — proposta: o **chip de estado semântico**, porque ele carrega
   `ready/partial/withheld/running/failed` e é onde a regra do segundo canal (§9.3) se prova.
   Aceite: as **8 combinações** de D37, mais a prova de escala de cinza e daltonismo.
6. **Tokens de motion** (§10.1) e a tabela de reduced motion (§10.4).
7. **Barreiras como gate**, não como intenção: as quatro de §6.4 e as de fronteira de §5.2.
8. **Crítica adversarial do território** com `/design-critique` e `/frontend-design`, antes de
   qualquer segunda superfície.

**Fora do escopo da Design 1:** qualquer página TO-BE, Storybook, Recharts, Motion for React,
React Hook Form, Zod, decomposição dos monólitos, e R2.

**Critério de pronto:** existe **um** vocabulário de token, **dois** temas derivados dele com
contraste provado, **um** componente que sobrevive às 8 combinações, e **quatro** barreiras que
falham quando violadas — provadas por mutação, não por leitura.

---

## Anexo — o que esta missão NÃO fez

Não implementou página TO-BE, não alterou backend, contrato ou infraestrutura, não instalou
dependência runtime, não redesenhou tela AS-IS incrementalmente, não congelou o Design System como
Regra de Ouro, não fez push, deploy, Railway nem Big Bang.

Instalou **duas skills de agente**, fora do produto, e criou **um arquivo descartável** no
scratchpad para prová-las.
