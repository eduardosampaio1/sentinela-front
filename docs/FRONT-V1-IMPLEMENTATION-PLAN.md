# FRONT V1 — IMPLEMENTATION PLAN

> **Autoridade de EXECUÇÃO.** Ordem, missões, gates e Definition of Done. Não redefine produto
> (→ `PRODUCT-EXPERIENCE-FREEZE-V1.md`), visual (→ `FRONT-DESIGN-SYSTEM-CONSTITUTION.md`), mapa
> (→ `EXPERIENCE-BLUEPRINT-V1.md`) nem engenharia (→ `FRONT-ARCHITECTURE-AND-MOCK-CONTRACT.md`).
>
> **Roteador:** `INDICE-DE-AUTORIDADE-V1.md` · **Base:** `0deeac3`
>
> **Só planejamento.** Nenhuma linha implementada nesta missão.

---

## 0. Decisões do owner incorporadas

| # | decisão | efeito no plano |
|---|---|---|
| 1 | **Tema:** D23 permanece. Light/Dark **fora** da V1. P31 futura | D37 vira `2 idiomas × 1 tema × 2 breakpoints` = **4 combinações**. `next-themes` **sai**. Token único continua — vale por si |
| 2 | **`/` pertence à landing/site público.** Home autenticada permanece em `/home` | **B11 RESOLVIDO.** O Shell pode congelar. `/home/welcome` (duplicata sem diferença) sai |
| 3 | **Instância:** delta **autorizado** como requisito da V1, em **missão backend própria** com contrato/testes/freeze próprios. Não reabre Ondas 1–8 | **B3 autorizado.** Vira `BD02`, e as superfícies dependentes destravam **só após o freeze dela** |
| 4 | **Patches de contrato do WS-A:** autorizados como **missões técnicas explícitas** | **B9 tem caminho.** Viram `BD07` e `BD08` — nunca alteração silenciosa |
| 5 | **Supabase Auth:** erradicação **obrigatória**; cada fluxo **substituído/provado no Keycloak antes** de remover o equivalente | **B6 autorizado**, e a ordem é lei: `M03` (prova) **antes** de `M04` (remoção) |

**Continuam sem autorização:** nada. Os cinco pontos que dependiam do owner foram decididos.
**Permanece proposta:** P31.

---

## 1. Estrutura: 17 fases, 46 missões

| fase | nome | missões | fecha com |
|---|---|---|---|
| **0** | Higiene e segurança | M01–M07 · BD07 · BD08 | árvore sem dívida silenciosa |
| **1** | Fundação do Design System | M08–M15 | primitive+pattern provados |
| **2** | Arquitetura de mock | M16–M19 | 27 scenarios por nome |
| **3** | Clientes públicos faltantes | M20–M23 | B1 fechado |
| **4** | Shell e navegação | M24–M25 | IA pública congelada |
| **5** | Resultado (crash test) | M26–M31 | RES-01 nos 18 gates |
| **6** | Home operacional | M32 | HOME-01 aprovada |
| **7** | Jornada de análise | M33–M35 | jornada REAL completa |
| **8** | Backend delta de Instância | BD02 | freeze próprio |
| **9** | Instância | M36–M37 | INST-01/03/04 navegáveis · INST-02/07 declaradas sem produtor |
| **10** | Evolução | M38–M40 | comparação canônica |
| **11** | Configurações | M41–M42 | ownership de D22 |
| **12** | Comunicação / re-entry | M43–M44 | deep links corretos |
| **13** | Hardening | M45 | 18 gates verdes |
| **14** | **UI EXPERIENCE FREEZE** | M46 | 🏁 marco |
| **15** | Integração | M47 | 🏁 MSW OFF |
| **16** | Pre-Big-Bang | M48 | 🏁 evidência final |

> **A coluna "fecha com" é o CRITÉRIO DE SAÍDA da fase, não o estado de hoje.** A Fase 3 fechou com
> B1 fechado em 2026-08-10, e o B1 foi **reaberto pela BD02**; hoje está em 1. O estado corrente de
> cada missão está no marcador da sua entrada.

**Deltas de backend, cada um com contrato/testes/freeze próprios:** `BD01` mapping bridge ·
`BD02` Instância · `BD03` `recommendation_id` · `BD04` preferências · `BD05` `prepared` lifecycle ·
`BD06` exclusão de análise · `BD07` canonicalização de contrato · `BD08` schema aninhado do
Analytics · `BD09` resolução de destinatário (**condicional** à prova de Q15).

**Total: 46 missões de front + 9 de backend = 55.**

---

# FASE 0 — Higiene e segurança

> **Gate de saída:** nenhuma dívida silenciosa na árvore. Todo gate de fronteira falha por mutação.

### BD07 · Canonicalização dos contratos (C1 + C2)
- **Objetivo:** eliminar a ambiguidade física entre as três representações do contrato.
- **Existe porque:** hoje `sentinela-facts` tem 11 operações e `sentinela` tem 6 com a **mesma
  `version`**, e `/v1/me` está implementado mas fora de `operations[]`.
- **Pré:** autorização do owner (decisão 4 — ✅). **Depende de:** nada. **Paraleliza com:** tudo.
- **Escopo:** (a) acrescentar `{"method":"GET","operationId":"get_me","path":"/v1/me","required_headers":[],"required_query":[],"success_status":[200]}` em `operations[]`; (b) alinhar o mirror **ou** declará-lo snapshot histórico com `version` própria.
- **Fora:** qualquer mudança de comportamento do Gateway. É manifesto, não código.
- **Repos:** `sentinela-facts`, `sentinela`. **Contratos:** `public-v1.json`.
- **Superfícies:** nenhuma. **Componentes:** nenhum. **Scenarios:** nenhum.
- **Testes/Gates:** `contract-authority` passa a resolver por `candidata-unica` **ou**
  `candidatas-identicas`, **sem** `SENTINELA_CONTRACT_ORIGIN`. `contract-operations`:
  `extra_in_front` fica **vazio**, e `SEM_ENTRADA_NO_CONTRATO` é **esvaziado** no mesmo commit.
- **DoD:** o gate de autoridade fica verde **sem env var**. **Evidência:** digests iguais ou
  candidata única, no log do gate.
- **Blocker:** **B9** (parte documental). **Autorização backend:** ✅ decisão 4.

### BD08 · Publicação do schema aninhado do Analytics (C5)
- **Objetivo:** o produtor publicar canonicamente a superfície de `snapshot`.
- **Existe porque:** hoje o gate `contract-nested` compara o front com **modelos Pydantic de outro
  repo**. Funciona, e atravessa fronteira que não deveria atravessar.
- **Pré:** BD07 fechado (ordem, não dependência técnica). **Paraleliza com:** Fase 1.
- **Escopo:** publicar `analytics-snapshot-v*.json` em `docs/contracts/` do Analytics, derivado dos
  modelos existentes. **Fora:** mudar qualquer campo. É publicação, não redesenho.
- **Repos:** `sentinela-analytics-service`. **Superfícies/Componentes/Scenarios:** nenhum.
- **Testes/Gates:** `contract-nested` passa a ler o JSON publicado; a prova de mutação nº 4
  (remover campo aninhado) precisa continuar matando.
- **DoD:** `nestedProjection.ts` não importa mais `.py`. **Evidência:** mutação 4 re-executada.
- **Blocker:** **B9** (parte técnica). **Autorização:** ✅ decisão 4.

### M01 · Cadeia Keycloak provada (pré-erradicação) — CONCLUIDA
- **Objetivo:** provar que Keycloak cobre **login, recuperação e callback** antes de remover
  qualquer equivalente Supabase.
- **Existe porque:** `/login` e `/forgot-password` são caminho de autenticação **real**. Remover
  sem substituto tira o acesso de quem entra por ali.
- **Pré:** autorização (decisão 5 — ✅). **Depende de:** nada. **Paraleliza com:** BD07, BD08.
- **Escopo:** provar os três fluxos contra Keycloak, com teste. **Fora:** remover Supabase.
- **Repos:** `sentinela-front-e1`. **Contratos:** `/v1/me` (membership autoritativa).
- **Superfícies:** AUTH-01, AUTH-02, AUTH-03. **Scenarios:** `session-expired`.
- **Testes/Gates:** teste de fluxo por rota; `me.test.ts` estendido.
- **DoD:** os três fluxos verdes **sem** Supabase no caminho. **Evidência:** log do teste.
- **Entregue:** `src/lib/auth/keycloak-cadeia.test.tsx` — 8 casos, **3/3 mutações**. Espião que
  registra **qualquer** acesso a `supabase.auth` (Proxy), não só os métodos hoje chamados.
- 🔎 **Corrigido durante a execução:** a tela de login sob Keycloak é **híbrida** — vive na SPA
  com os botões sociais e o "Continue with email", e só a **senha** é digitada no provedor. Meus
  primeiros casos esperavam redirect ao montar e falharam; a leitura errada era minha. Não
  contraria D19, que trata de credencial.
- 🔴 **Duas pré-condições para a M02, descobertas aqui:**
  1. **o módulo ainda está no caminho.** `lib/auth/index.ts` importa `@/lib/supabase`
     **estaticamente**, e as três páginas também. Nenhuma **função** é chamada sob Keycloak —
     isso está provado — mas o módulo é avaliado no carregamento. Remover o import é M02.
  2. **a recuperação depende de configuração de realm.** `startPasswordReset()` redireciona para a
     tela hospedada do Keycloak, que só oferece "esqueci a senha" com `resetPasswordAllowed`
     ligado. O front não consegue provar isso. **A M02 não pode remover `/forgot-password` antes
     de essa configuração ser verificada no realm**, sob pena de a recuperação sumir em silêncio.
- **Blocker:** **B6** (metade). **Autorização:** ✅ decisão 5.

### M02 · Erradicação do Supabase Auth — CONCLUIDA
- **Objetivo:** zero `@supabase/*` no `src/`, zero rota dependente, dependência fora do `package.json`.
- **Existe porque:** Supabase está **aposentado** por decisão arquitetural e o resíduo continua
  roteado.
- **Pré:** 🔴 **M01 fechada** — ordem obrigatória (decisão 5). **Paraleliza com:** M03–M07.
- **Escopo:** remover `lib/supabase`, reescrever `LoginPage`/`ForgotPasswordPage`, remover a
  dependência. **Fora:** redesenhar as telas (isso é Fase 4).
- **Repos:** `sentinela-front-e1`. **Superfícies:** AUTH-01, AUTH-03, AUTH-06.
- **Testes/Gates:** **gate por AST** que falha se `@supabase/*` reaparecer — grep não prova
  ausência.
- **DoD:** gate AST verde + suíte verde. **Evidência:** mutação que reintroduz o import → vermelho.
- **Blocker:** **B6 FECHADO no front.** Zero import, zero `supabase.auth`, pacote removido,
  Keycloak como único provider. 4/4 mutações.
- 🔴 **Release gate SEPARADO, ainda aberto:** antes de deploy sem Supabase Auth em ambiente já
  provisionado, provar **no realm em execução** `resetPasswordAllowed=true` + SMTP funcional. O
  JSON versionado **não basta** — `--import-realm` não reimporta realm existente.

### M03 · Remoção de dependências e arquivos mortos
- **Objetivo:** tirar peso e superfície sem dono.
- **Existe porque:** `sonner`, `jspdf`, `tailwindcss-animate` e `next-themes` têm **zero uso**;
  `src/index.css` e `src/App.css` **não são importados por ninguém** — e um deles guarda a única
  regra `.dark` do repo, que é fantasma.
- **Pré:** nenhuma. **Paraleliza com:** M02, M04–M07.
- **Escopo:** remover os pacotes sem uso e os dois CSS mortos. **`next-themes` sai** — decisão 1
  tirou tema da V1. **Fora:** tocar `tokens.css`/`globals.css` (isso é M08).
- 🔴 **Corrigido na execução:** eram **três** pacotes, não quatro. `tailwindcss-animate` **fica** —
  é **plugin** em `tailwind.config.ts:98`, e 5 componentes Radix vivos consomem suas classes. A
  auditoria da Design 0 mediu importação de módulo, que ele não tem, e concluiu "zero uso".
- **Repos:** `sentinela-front-e1`. **Superfícies:** nenhuma.
- **Testes/Gates:** build + suíte + gate de "arquivo CSS órfão".
- **DoD:** `package.json` sem os quatro; nenhum CSS não importado. **Evidência:** diff + build.
- **Blocker:** nenhum. Higiene.

### ✅ M04 · Gate de fronteira: DS não conhece domínio nem query — **CONCLUÍDA**
- **Escopo:** gate AST — `src/design/**` não pode conter `analysis|instance|workspace` nem importar
  `@tanstack/react-query`.
- **Pré:** nenhuma (o gate pode nascer antes da pasta). **Paraleliza com:** M02, M03, M05–M07.
- **Testes/Gates:** o próprio. **DoD:** mutação (escrever `analysis` em `src/design/**`) → vermelho.
- **Evidência:** `fronteiraDoDesign.ts` (AST via API do TypeScript, zero dependência nova) +
  `design-boundary.test.ts`. **4/4 mutações** mataram o caso esperado, com controle verde antes:
  domínio no DS · import de query · import na camada TOKENS · **apagar `src/design/`**.
- ⚠️ **Acrescentado ao previsto, com motivo:** a pasta tem **zero arquivos `.ts`**, então varrê-la
  passaria por vacuidade. O analisador foi separado do teste e provado contra fontes sintéticas —
  cada regra com um caso que pega e um vizinho que **não** pode pegar — e o gate reprova se a
  pasta desaparecer. Sem isso, o gate nasceria verde por não ter olhado nada.
- **Blocker:** prepara Fase 1.

### M05 · Gate de fronteira: mock não vaza — ✅ EXECUTADA
> **Estado:** executada. `src/test/v1/fronteiraDoMock.ts` (analisador AST) +
> `src/test/v1/mock-boundary.test.ts` (13 casos, 8 mutações mortas + 1 controle invertido).
>
> **Divergência plano ↔ árvore:** `src/mocks/**` **não existe**. A matéria de teste mora em
> `src/test/msw/` e `src/test/fixtures/`. Um gate apontado para pasta inexistente passaria por
> vacuidade, então ele segue a árvore real — e mantém `mocks?/` no padrão, para que a pasta já
> nasça coberta quando a **M16–M18** a criarem. A **M19** segue devendo o apontamento contra a
> árvore de `src/mocks/` depois que ela existir; a M05 não a antecipou.
>
> **Licença nominal:** só `src/e2e/bypass.ts` importa matéria de teste fora de teste. A licença é
> por arquivo (não por pasta), carrega o motivo escrito, e há caso que a reprova se sobrar.

- **Escopo:** import graph — `src/mocks/**` só importável por `src/mocks/**`, `src/test/**`,
  `*.stories.tsx` e bootstrap de dev; identificadores `mock|fixture|scenario|MSW` proibidos em
  `features/**/ui/**` e `design/**`, **por AST**.
- **Pré:** nenhuma. **Paraleliza com:** M02–M07.
- **DoD:** mutação (importar `src/mocks` de um componente) → vermelho. **Blocker:** prepara Fase 2.

### M06 · Gate de fronteira: biblioteca externa não é API pública de página — ✅ EXECUTADA
> **Estado:** executada. `src/test/v1/fronteiraDaBiblioteca.ts` (analisador AST) +
> `src/test/v1/biblioteca-boundary.test.ts` (11 casos, 8 mutações mortas + 2 controles invertidos).
>
> **Dívida DECLARADA e MEDIDA — `DIVIDA_SHADCN`, 7 arquivos.** `src/components/ui/{button,dialog,`
> `dropdown-menu,label,sheet,toast,tooltip}.tsx` importam Radix e ficam onde estão pela decisão já
> registrada na **M10** (27 consumidores de `components/ui/button`; segunda versão reproduziria no
> nível do componente o defeito que a M08 matou no nível do token). A lista é **nominal**, não por
> pasta: um caso reprova se ela crescer, e outro reprova se um arquivo deixar de importar sem a
> linha sair — é o que força a dívida a encolher no mesmo commit em que for resolvida.
>
> ⚠️ **Duas divergências, ambas registradas:**
> 1. **`recharts` e `motion` não estão instalados.** A proibição dos dois é **preventiva**,
>    declarada como tal, e provada só contra fonte sintética. O gate precisa existir antes da
>    instalação — chegar depois é chegar tarde, porque a primeira página que importar já cria o
>    precedente. `framer-motion` entrou junto: é o mesmo pacote com o nome antigo.
> 2. **`src/design/**` não importa Radix hoje.** A permissão do plano existe e está provada por
>    controle invertido, mas hoje **ninguém a exerce** — o Design System não depende de Radix.

- **Escopo:** `@radix-ui/*`, `recharts`, `motion` só importáveis dentro de `src/design/**`.
- **Pré:** nenhuma. **Paraleliza com:** M02–M07.
- **DoD:** mutação (importar Radix em `features/**/ui/**`) → vermelho.

### M07 · Gate anti-monólito ativo — ✅ EXECUTADA
> **Estado:** executada. `src/test/v1/anti-monolito.test.ts` (12 casos, 8 mutações mortas +
> 1 controle invertido).
>
> **Baseline — 3 arquivos, nominal, com TETO congelado:**
> `LandingPage.tsx` **1215** · `AionPage.tsx` **1180** · `test/fixtures/canonical-result/`
> `massasV2.ts` **1035**. Nome sem teto seria permissão vitalícia; com teto, a dívida é catraca —
> desce e nunca sobe, e um caso reprova a folga se o teto não descer no mesmo commit.
>
> ⚠️ **Divergência:** o plano previu **dois** arquivos; a árvore tem **três**. `massasV2.ts` é
> massa de teste, mas a regra da casa não abre exceção por tipo nem por pasta — entrou
> nominalmente, com motivo escrito, em vez de sair por `src/test/**`.
>
> **Fora do escopo, como o plano manda:** decompor os monólitos (D17, missão própria).
- **Pré:** nenhuma. *(Decisão de owner: a ausência deste campo era omissão editorial, não*
  *dependência escondida. M07 está no mesmo bloco de M05–M07, que declara paralelismo com M02–M07.)*
- **Objetivo:** transformar a regra literal em gate.
- **Existe porque:** *"acima de 1.000 linhas bloqueia fechamento"* é regra da casa, e
  `LandingPage` (1.215) e `AionPage` (1.180) a violam **hoje**.
- **Escopo:** gate com **baseline declarada** dos dois arquivos — novo arquivo acima de 1.000 falha,
  e **os dois só podem encolher**. **Fora:** decompor (D17: missão própria).
- **DoD:** gate verde com baseline; mutação (crescer 1 linha em `LandingPage`) → vermelho.
- **Blocker:** transforma dívida invisível em dívida medida.

---

# FASE 1 — Fundação do Design System

> **Gate de saída (Foundation → Surface):** um vocabulário de token existe e a duplicidade falha
> por mutação; **um primitive** (`StatusBadge`) e **um pattern** (`ProvenanceMargin`) provados nas
> **4 combinações** de D37; tokens de motion existem com reduced motion.
> **Sem Light/Dark** (decisão 1).

### ✅ M08 · Vocabulário único de tokens, nomeado por papel — **CONCLUÍDA**
- **Objetivo:** três vocabulários → **um**, com nomes por papel (V3/A2).
- **Existe porque:** `tokens.css` fala `--color-*` em hex, `globals.css` fala shadcn/HSL, e
  `--background`/`--primary` estão definidos **duas vezes com valores diferentes** (colisão
  adormecida, hoje inerte só porque um arquivo está morto).
- **Pré:** M03 (CSS mortos removidos). **Paraleliza com:** M09, M12.
- **Escopo:** `src/design/tokens/`; `surface-base|raised|overlay`, `text-primary|secondary|muted`,
  `border-default|strong`, `accent`, semânticos, `state-*`, `chart-*`; alinhar `tailwind.config`.
  **Fora:** segundo tema (decisão 1); `color-scheme` fica, com **um** valor.
- **Repos:** `sentinela-front-e1`. **Superfícies:** todas (transversal).
- **Testes/Gates:** um só namespace no `:root`; **zero `#hex` em componente**; **nome × valor**
  (apontar `--success` para azul falha).
- **DoD:** mutação que reintroduz `--background` num segundo arquivo → **vermelho**.
- **Evidência:** 3/3 mutações mataram o gate esperado; **zero regressão visual provada** — 32 dos
  34 tokens legados resolvem valor idêntico e **todas as regras de pintura são byte-idênticas**
  (42535 = 42535). Os 2 que mudaram são `--critical`/`--critical-foreground`, removidos por terem
  **0 consumidores**. **Blocker: R1 fechado.**
- ⚠️ **Corrigido na execução:** o escopo previa tratar a colisão `--background`/`--primary`, mas a
  M03 já a eliminara ao apagar `index.css` — os dois arquivos vivos tinham **zero** nome em comum.
  A colisão real era outra e mais perigosa: `--accent` significa **superfície** no shadcn e **cor
  de ação** na Constituição. Resolvida por namespace `--ds-`.

### M09 · Tokens de motion + reduced motion — ✅ EXECUTADA
> **Estado:** executada. Tokens em `src/design/tokens/tokens.css`; reduced motion em
> `src/styles/globals.css`; gate `src/test/v1/motion-tokens.test.tsx` (25 casos, 12 mutações).
>
> 🔴 **Defeito real corrigido — o reduced motion existia e estava ERRADO.** O bloco anterior fazia
> `transition-duration: 0.01ms !important` em `*`: o *"desligar tudo"* que a D34 proíbe com essas
> palavras. A mudança de COR que comunica estado virava um salto sem transição — quem pedia menos
> movimento recebia menos **informação**. A separação correta é por PROPRIEDADE, não por duração.
>
> **Dívida de timing literal — medida, 5 arquivos / 24 ocorrências:** `globals.css` 13 ·
> `AionPage` 5 · `LoadingState` 4 · `sheet.tsx` 1 · `LandingPage` 1. Migrá-los é migração em massa,
> vetada nesta missão. `src/design/**` ficou em **zero**.
>
> ⚠️ **Divergência:** `--ds-skeleton-pulse-period` (1200ms) **não é uma sexta duração** — é outra
> grandeza. As cinco medem transições; esta mede o período de um ritmo de espera, restrito pela
> regra própria *"esqueleto não pulsa mais rápido que 1 Hz"*. A maior duração (480ms) pulsaria a
> ~2 Hz. Nome separado é o que mantém o FROZEN de cinco durações intacto.
>
> **Nenhuma dependência instalada** — `motion`/`framer-motion` seguem proibidos pelo gate da M06.
- **Escopo:** 5 durações, 4 curvas, `spring-direct`; tabela de reduced motion que **preserva a
  informação e remove o deslocamento**. **Fora:** instalar Motion for React (Fase 5, se necessário).
- **Pré:** M08. **Paraleliza com:** M10, M12.
- **Testes/Gates:** nenhum timing fora dos tokens; `prefers-reduced-motion` provado por teste.
- **DoD:** mutação (timing literal em componente) → vermelho.

### ✅ M10 · Primitives — **CONCLUÍDA**
- **Escopo:** `src/design/primitives/` — promover `analytics/primitivas.tsx` (a barra) e criar
  `Button`, `Chip`, `Text`, `Stack`, `Field`, `Disclosure`, `Table`, `Icon`. **Fora:** migração em
  massa do legado.
- **Pré:** M08, M04. **Paraleliza com:** M12, M13.
- **Testes/Gates:** M04 ativo; nenhum primitive conhece domínio.
- **DoD:** cada primitive nas **4 combinações**; `axe` limpo.
- **Entregue:** 9 primitives — `Bar`, `DefinitionGrid`, `Note`, `Panel` (promovidos, com os 4
  consumidores migrados) e `Chip`, `Stack`, `Text`, `Icon`, `Disclosure` (novos). 53 casos, 44
  deles cobrindo as 4 combinações com `axe`.
- ⚠️ **Três divergências, todas registradas:**
  1. **`Button`, `Field` e `Table` NÃO foram criados.** `components/ui/button` tem **27
     consumidores**, e `input`/`label` têm 6 cada — criar segundas versões produziria no nível de
     componente exatamente o defeito que a M08 matou no nível do token. Convergem quando forem
     tocados por missão própria, não por cópia. `Table` fica para o pattern `DataTable` (M13):
     primitive sem consumidor é API especulativa.
  2. **A barra importava `useLanguage`** e por isso não era primitive — o gate da M04 a reprovaria.
     O rótulo do caso suprimido virou **prop**, preenchida pela camada de produto, que é quem
     conhece o vocabulário congelado.
  3. **`Icon` nasceu como dois componentes** (`IconeInformativo`/`IconeDecorativo`) em vez de um
     com flag: ícone informativo sem nome acessível é informação que o leitor de tela não recebe, e
     ícone decorativo anunciado é ruído. Sem default — quem usa escolhe.

### M11 · `StatusBadge` — semântica única de estados — CONCLUIDA
- **Objetivo:** **um** componente para os **dois** vocabulários (análise e eixos).
- **Existe porque:** é a defesa contra `HomeStatus`/`InstanceStatus`/`AnalysisStatus` com três
  linguagens para o mesmo estado — o critério 17 de UI COMPLETE.
- **Pré:** M08, M10. **Paraleliza com:** M12, M14.
- **Escopo:** variantes **explícitas** (não modo por string); V6 obrigatório — cor **+** forma/ícone
  **+** rótulo. **Fora:** ler backend.
- **Superfícies:** HOME-01, AN-02/03/04, RES-01, EVO-01, INST-01/03.
- **Testes/Gates:** cobre `preparing receiving queued running recovering needs_mapping completed
  failed` **e** os 4 eixos; prova em **escala de cinza** e sob **deuteranopia**.
- **DoD:** as 4 combinações + as duas provas de canal. **Evidência:** mutação (remover o ícone,
  deixar só cor) → vermelho.
- **Entregue:** `src/design/patterns/` com `estados.ts` (a **única** tradução estado→aparência,
  cobrindo os **8** estados públicos e os **10** de eixo) e `StatusBadge.tsx`. 36 casos, 4/4
  mutações. **Nenhum token novo** — os 18 estados usam 4 tons já existentes.
- **Três achados da execução:** (1) o gate da M04 reprovou meus tipos batizados a partir de objeto
  de domínio, com razão — renomeados para o vocabulário do contrato, sem exceção; (2) o teste de V6
  achou três colisões no meu próprio mapa, resolvidas com as formas `reservado`, `recebendo` e
  `montando`; (3) `success` × `warning` medem 1,14:1 — registrado como aberto.
- **Blocker:** habilita critério **17**.

### M12 · `ProvenanceMargin` — a assinatura — ✅ EXECUTADA
> **Estado:** executada. `src/design/patterns/ProvenanceMargin.tsx` +
> `provenanceMargin.test.tsx` (14 casos próprios) + as 4 combinações de D37 registradas no lugar
> canônico (`patterns.test.tsx`). **10 mutações mortas**, incluindo as 5 exigidas.
>
> **API neutra:** `rotuloDoIndicador` · `procedencia: {rotulo, valor: string|null}[]` ·
> `rotuloDaMargem` · `textoQuandoAusente` · `children`. Nenhum payload, nenhum campo de contrato,
> nenhum vocabulário de domínio — o gate da M04 reprova se o DS aprender qualquer um deles.
>
> **A3 sem media query em JS:** as duas versões existem no DOM e quem escolhe é o CSS
> (`hidden md:block` / `md:hidden`). `display:none` sai da árvore de acessibilidade sozinho, então
> o leitor de tela lê uma vez só — e nada depende de decidir o breakpoint antes da primeira pintura.
>
> **Ausência é declarada, nunca convertida:** `valor: null` vira a palavra que o **produto**
> passou; procedência vazia mantém a margem de pé dizendo o mesmo. Não saber de onde veio não é
> uma procedência ruim, e a margem que sumisse devolveria o número à solidão que a V9 fecha.
>
> **Fora, como o plano manda:** decidir *quais* campos de trust aparecem (M22/M28).
- **Objetivo:** o pattern `valor → procedência acessível` (V9 + A3).
- **Pré:** M08, M10. **Paraleliza com:** M11, M13.
- **Escopo:** desktop persistente; abaixo de tablet **disclosure presa ao dado**;
  `<button aria-expanded>` + `aria-controls`; alvo ≥ 44×44. **Fora:** decidir *quais* campos de
  trust aparecem (isso é M22/M28).
- **Testes/Gates:** **nunca** some no mobile; **nunca** só hover; teclado ponta a ponta.
- **DoD:** as 4 combinações + prova mobile sem hover.

### M13 · Patterns fundamentais — CONCLUIDA
- **Escopo:** `EmptyState`, `ErrorState`, `LoadingState`, `ProgressiveState`, `ActionRequired`,
  `ConfirmDestructive`, `DataTable`, `ComparisonRow`, `Toolbar`.
- **Pré:** M10, M11. **Paraleliza com:** Fase 2.
- **Testes/Gates:** `ErrorState` cobre os 9 `problem_codes`; `ProgressiveState` **nunca** inventa
  percentual agregado; `ConfirmDestructive` exige **correspondência exata**.
- **DoD:** cada pattern nas 4 combinações.
- **Entregue:** os 9 patterns em `src/design/patterns/`. 71 casos, **4/4 mutações**. Nenhum token
  novo: `chart-*`, `info` e `border-strong` seguem sem valor, sem consumidor.
- **Garantias que viraram estrutura, não convenção:** `ErrorState` **lança** se declarar ação sem
  botão · `Toolbar` **lança** se houver secundárias sem menu mobile · `ConfirmDestructive` compara
  **estritamente** (nem `trim`, nem caixa, nem acento) · `ProgressiveState` não tem prop de total
  · `DataTable` renderiza as **mesmas** colunas nas duas formas.
- ⚠️ **Divergências:** (1) `EmptyState`, `ErrorState`, `LoadingState` e `ConfirmDestructive` já
  tinham equivalentes legados em `src/shared/` com **15 consumidores**. Não migrei (seria migração
  em massa) e não dupliquei em silêncio: o canônico passou a ser `src/design/patterns/`, e um gate
  **congela a contagem** do legado para que tela nova não nasça no vocabulário antigo.
  (2) `ActionRequired` e `ComparisonRow` nasceram com **duas formas explícitas** cada — com e sem
  operação, comparável e quebrada — porque a diferença não é de aparência: no caso quebrado o delta
  **não existe**, e uma prop booleana convidaria a passar `null` e mostrar zero.

### M14 · i18n — infraestrutura e paridade — ✅ EXECUTADA
> **Estado:** executada. `src/test/v1/i18n-paridade.test.ts` (20 casos, 14 mutações mortas).
> **Paridade: 506 × 506**, agora com gate — antes quebrava em silêncio, como o plano dizia.
>
> 🔴 **Defeito real corrigido — DUAS sintaxes de interpolação vivas.** `interpolate()` substitui
> só `{{nome}}`; havia 5 chaves com `{n}` e **dois** consumidores fazendo `.replace("{n}", …)` na
> mão. Funcionava naqueles dois pontos e em nenhum outro: qualquer `t(chave, params)` teria
> deixado o literal `{n}` na tela. As 5 chaves foram convertidas nos dois idiomas e os dois
> consumidores passaram ao caminho canônico. Um caso tranca a porta contra a interpolação manual.
>
> **Orfandade é INDECIDÍVEL hoje, e o gate diz isso** em vez de mentir. Há 9 chamadas
> `t(variavel)` que não carregam chave nenhuma no texto do programa; uma detecção ingênua acusou
> **319 de 506** chaves inocentes. O gate congela esse número numa catraca: quando chegar a zero,
> orfandade passa a ser mensurável. **Fantasmas** (código pedindo chave inexistente) são
> decidíveis e estão em **zero**, com gate duro.
>
> **Hardcoded: zero** em `features/**/ui/**`, incluindo atributos visíveis
> (`placeholder`/`title`/`alt`/`aria-label`). O gate nasce antes da primeira superfície TO-BE.
>
> **Orçamento D37:** razão agregada PT/EN = **1.094** (teto 1.30). 45 frases estouram
> individualmente — não são defeito, são a matéria que testa os patterns; congeladas em catraca.
- **Escopo:** gate de **paridade `pt.json` × `en.json`** (hoje 506/506, quebra em silêncio); gate de
  texto hardcoded; orçamento de **+30 %** verificado nos patterns.
- **Pré:** M13. **Paraleliza com:** M15.
- **DoD:** mutação (remover uma chave de `en.json`) → vermelho. **Blocker:** critério **18**.

### M15 · Storybook + infraestrutura visual — ✅ EXECUTADA
> **Estado:** executada. `.storybook/{main.ts,preview.tsx}`, 22 stories em `src/design/**`, gate
> `src/test/v1/storybook-fonte-unica.test.ts` (12 casos, 10 mutações mortas).
>
> **Verificado no navegador de verdade** — o que nem a M09 nem a M12 conseguiram. Os 11 tokens de
> motion resolvem (`--ds-duration-fast: 120ms`), e a A3 foi medida com CSS computado:
> `1280px` → margem persistente `block`, colapsável `none`; `375px` → o inverso, gatilho de 44px.
>
> ⚠️ **Divergências:**
> 1. O escopo cita `scenarios/`, que a **M18** ainda vai criar (`Pré: M17` → `Pré: M16, BD07`).
>    O campo `Pré:` da M15 estava satisfeito, mas o escopo aponta três missões adiante.
> 2. **Não há payload a escolher no DS.** A primeira versão das stories importou a fixture do
>    contrato para cumprir "nenhuma story declara payload" ao pé da letra — e o gate da M04
>    reprovou, com razão: o caminho carrega domínio. Os componentes do DS não consomem payload por
>    construção; onde não há payload, não há cenário. A regra vale para quem consumir dado de
>    contrato, e isso mora fora de `src/design/**`.
> 3. **Regressão visual não entrou** — o plano põe fora até que uma mutação de token a faça falhar.

- **Escopo:** Storybook consumindo **`scenarios/`**; story **não pode declarar dado inline**.
  Baseline de visual regression. **Fora:** colocar visual regression em gate (só depois de uma
  mutação de token o fazer falhar).
- **Pré:** M13, M16. **Paraleliza com:** Fase 3.
- **DoD:** toda story escolhe um cenário; nenhuma declara payload.

---

# FASE 2 — Arquitetura de mock

> **Gate de saída (Mock → UI):** os **27 scenarios não bloqueados** reproduzíveis **por nome**,
> toda fixture validando contra o **schema publicado**, e nenhuma UI conhecendo mock.

### M16 · MSW no browser — ✅ EXECUTADA
> **Estado:** executada. `src/mocks/browser.ts` + `src/mocks/node.ts`, arranque em `main.tsx`,
> gate `src/test/v1/msw-browser.test.ts` (15 casos, 11 mutações mortas).
>
> **A variável é `VITE_SENTINELA_MOCK=on`.** Lida em UM lugar só, sob `import.meta.env.DEV`.
> Ausente ou diferente disso → Gateway real, sem tocar em arquivo nenhum.
>
> **A base vem de `resolveGatewayBaseUrl()`** — a mesma função do cliente canônico. Handlers numa
> base própria deixariam o worker inerte: ele sobe, diz que está ligado, e não intercepta nada.
> Lendo da mesma fonte, divergir é impossível por construção.
>
> **Cadeado provado no BUNDLE, não na leitura do código:** 216 módulos no sourcemap de produção,
> **zero** de `/mocks/`, `msw` ou `/test/`.
>
> ⚠️ **Divergências:**
> 1. O plano diz *"o worker nunca é montado"*. Ele **é** — por `src/e2e/bypass.ts`, sob
>    `DEV && VITE_E2E`, para o Playwright. O que não existia era a infraestrutura de mock de
>    desenvolvimento.
> 2. `node.ts` nasce como **fachada** de `src/test/msw/server.ts`, não como segunda
>    implementação — reescrevê-lo criaria o universo paralelo que a Fase 2 existe para impedir.
>    Migrar os 18 importadores fica como dívida de arrumação.
> 3. **Não verifiquei no browser.** O `.env.local` do repo aponta para o Gateway de homologação no
>    Railway, e subir o dev server faria a app conversar com ele.
- **Existe porque:** `package.json` declara `msw.workerDirectory` e o **worker nunca é montado**.
  A arquitetura exige `MSW OFF → Gateway` sem tocar em componente.
- **Escopo:** `src/mocks/browser.ts` + `node.ts`; ligado **por env**, nunca por código de UI.
- **Pré:** M05. **Paraleliza com:** Fase 1 tardia.
- **DoD:** trocar mock↔real muda **uma variável**, zero arquivo de UI. **Blocker:** B10-front.

### M17 · Fixtures presas ao schema publicado — EXECUTADA
> **Estado:** executada. `src/test/fixtures/public-v1/selo.ts` +
> `src/test/v1/fixtures-presas-ao-schema.test.ts` (13 casos, 8 mutacoes mortas).
>
> **Tres ligacoes, nenhuma duplicando schema:**
> 1. **DIGESTO** — as fixtures selam o SHA-256 do contrato do qual foram derivadas. `version` nao
>    serve de sentinela: continuou `public-v1` depois da BD07, que acrescentou uma operacao e
>    alinhou 16 chaves. O digest muda com qualquer byte.
> 2. **NAO INVENTAR** — toda chave existe no `*_fields` publicado.
> 3. **NAO OMITIR** — obrigatorio = publicado pelo contrato **E** nao-opcional no tipo. A lista vem
>    do contrato, a cardinalidade vem da AST do tipo canonico, e o gate nao redeclara nenhuma das
>    duas — redigitar o schema aqui criaria a terceira representacao que a WS-A passou uma missao
>    reduzindo a duas.
>
> **Cobertura declarada:** `PUBLICADO_SEM_FIXTURE` = 1 item
> (`list_item_fields.observed_conversations`). Achado da missao: as fixtures de LISTA nao
> exercitam esse campo, que o contrato publica e que a BD07 acabou de alinhar no mirror. Nao e
> erro — o tipo o marca opcional — mas deixou de ser silencioso. A lista bate exatamente com a
> realidade nos dois sentidos e so pode encolher.
### M17 · Fixtures presas ao schema publicado
- **Existe porque:** é a barreira que mata em silêncio — o contrato evolui, a fixture não, e a
  suíte segue verde porque testa a fixture contra ela mesma.
- **Escopo:** fixtures **derivadas** do schema publicado; gate que compara o digest do schema
  consumido com o do contrato.
- **Pré:** M16, BD07. **DoD:** mutação (remover campo obrigatório da fixture) → vermelho.

### M18 · Catálogo dos 27 scenarios — EXECUTADA
> **Estado:** executada. `src/mocks/scenarios/{catalogo,index}.ts` +
> `src/test/v1/scenarios-catalogo.test.ts` (52 casos, 11 mutacoes mortas).
>
> **O catalogo tem 32 entradas, nao 27.** O Blueprint §11 lista 32: **27 disponiveis**,
> **1 parcial** (`needs-mapping`) e **4 BLOQUEADOS**. Os 5 nao-executaveis ficam declarados em vez
> de sumirem — um catalogo que so mostra o que funciona faz o que falta parecer inexistente.
>
> **Bloqueado LANCA, nao devolve vazio.** `handlersDoScenario()` de um bloqueado joga
> `ScenarioIndisponivel` com a razao e o blocker. Uma lista vazia seria "completar pelo mock" com
> outro nome: a tela montaria, o estado vazio pareceria legitimo, e o delta ausente ficaria
> invisivel.
>
> **Achado:** dois codigos de problema foram INVENTADOS na primeira versao (`export_expired`,
> `unauthenticated`); o typecheck reprovou. O catalogo canonico tem 9 codigos, e a distincao
> expirado/purgado e do PRODUTO, nao do envelope de erro.
### M18 · Catálogo dos 27 scenarios
- **Escopo:** os 32 do Blueprint **menos os 4 bloqueados** (`instance-empty`,
  `recommendation-persisted`, `no-baseline`, `baseline-active`) e menos o parcial
  (`needs-mapping`, que entra só como **exibição**). **Nenhuma fixture inventada** para os bloqueados.
- **Pré:** M17. **DoD:** cada scenario invocável por nome; os 4 bloqueados **falham explicitamente**
  com a razão.

### M19 · Gates de import do mock — EXECUTADA
> **Estado:** executada. `src/test/v1/mock-import-gates.test.ts` (12 casos, 9 mutacoes mortas).
>
> **A direcao que faltava.** A M05 protegia `produto -> mock`. Nada impedia o inverso: um cenario
> de `src/mocks/**` importando o Design System ou uma tela. Isso nao vaza mock para producao —
> vaza PRODUTO para dentro do mock, e o cenario passa a depender da UI que deveria alimentar.
> Camadas permitidas: `msw`, `@/test/**`, `@/lib/v1/**` e relativo interno.
>
> **Anti-vacuidade real:** quando a M05 rodou, `src/mocks/` nao existia. Agora existe e esta
> povoada — e ha caso que reprova a pasta sumir ou esvaziar.
>
> **Achado:** DUAS listas de excecao estavam sem trava (a licenca nominal e a lista de camadas
> permitidas). Ampliar qualquer uma cegava o gate e nada reprovava. Excecao sem trava nao e
> excecao, e porta.
- **Pré:** M05, M18. *(Decisão de owner: o campo ausente era omissão editorial.)*
- **Escopo:** ativar M05 contra a árvore real de `src/mocks/`. **DoD:** mutação → vermelho.

---

# FASE 3 — Clientes públicos faltantes — ✅ ENCERRADA

> **Gate de saída:** `missing_in_front` **vazio** e `SEM_CLIENTE_NO_FRONT` **esvaziada no mesmo
> commit**. B1 fechado.
>
> **✅ SATISFEITO em 2026-08-10.** As quatro operações contratadas ganharam cliente, uma por
> missão: `/progress` (M20), `/analytics` (M21), `/analytics/export/download` (M22) e `/timeline`
> (M23). `missing_in_front` está **vazio** — e `path_mismatch`, `method_mismatch` e
> `projection_mismatch` também, senão o vazio mentiria. `SEM_CLIENTE_NO_FRONT` ficou `[]`,
> **vazia e não apagada**: é ela que acusa a próxima operação contratada sem consumidor.
> **B1 FECHADO.**
>
> ⚠️ **Qualificação de 2026-08-12 — o registro acima descreve 2026-08-10 e continua correto como
> história.** O B1 **foi reaberto depois**, pela **BD02**: o contrato passou de 12 para 15
> operações e as três de Instance nasceram sem cliente. A M36 entregou duas e o levou de 3 para 1.
> **Estado corrente: B1 aberto em 1**, com `create_instance` — que não tem superfície no Blueprint
> nem missão neste PLAN. A Fase 3 continua encerrada; o que não vale é ler "B1 FECHADO" como
> estado de hoje.

### M20 · Cliente `/progress` — EXECUTADA
> **Estado:** executada em `bc9e625` (2026-08-09). `data/analysis.ts`, `lib/v1/client.ts`,
> `contract/public-v1.types.ts`, `lib/v1/queryKeys.ts` + `src/test/v1/progress-client.test.ts`
> (253 linhas) e `canonical-boundary.test.ts`. A operação saiu de `SEM_CLIENTE_NO_FRONT`.
>
> *(Marcação de sincronização factual, 2026-08-10: a missão estava executada e commitada desde
> 08-09, e só o PLAN não refletia. Nenhum escopo alterado.)*
- **Escopo:** cliente + tipos dos **4 eixos** com seus vocabulários próprios; query key
  tenant-scoped. **Fora:** qualquer agregação — **nunca** um percentual único.
- **Pré:** BD07. **Paraleliza com:** M21–M23.
- **Superfícies:** AN-03, HOME-01, RES-01. **Scenarios:** 7–10, 13–15, 17–19.
- **DoD:** `contract-operations` deixa de listar a operação; `contract-sync` cobre os 4 eixos.

### M21 · Cliente `/analytics` + leitura de trust — EXECUTADA
> **Estado:** executada em `f86218d` (2026-08-09), sobre a **BD08(front)** `87192b4` e o gate
> `f8fb036`. `analyticsProjection.ts` (+141), `client.ts`, `public-v1.types.ts`;
> `PUBLICADO_E_NAO_LIDO` reduzida aos deliberados.
>
> **O custo registrado:** a primeira versão agrupou a procedência sob `procedenciaPublicada` em
> camelCase e a suíte ficou verde com o **observador cego** — o gate `contract-nested` separa
> campo do fio de derivação do view model pelo camelCase, então tratou o bloco como derivação e
> deixou de enxergar que os campos eram lidos. **Campo do fio se chama como no fio.**
>
> ⚠️ **Os 4 `TS2322` do baseline de typecheck estão em `analyticsProjection.ts`** (290, 363, 446,
> 519) — superfície desta missão. Não corrigidos, sem dono declarado.
>
> *(Marcação de sincronização factual, 2026-08-10: executada e commitada desde 08-09; só o PLAN
> não refletia. Nenhum escopo alterado.)*
- **Escopo:** cliente + `component_status`, `snapshot`, `withheld`; **passa a ler** `method_id`,
  `method_version`, `method_parameters`, `method_definition_digest`, `privacy_policy_version`,
  `top_k`, `max_tracked_categories`, `max_tracked_values`, `max_time_buckets`,
  `series_contract_version`, e **`min_group_size` em Concentração e Série** (hoje lido só em
  Distribuição). **Fora:** qualquer cálculo analítico novo.
- **Pré:** BD08. **Paraleliza com:** M20, M22, M23.
- **DoD:** `PUBLICADO_E_NAO_LIDO` reduzida aos **deliberados**; `lido_sem_publicacao` continua zero.
- **Blocker:** fecha a faixa "contratado e não consumido" do Trust.

### M22 · Cliente `/analytics/export/download` — EXECUTADA
> **Estado:** executada em `ca11b89` (2026-08-10). `getExportDownload` +
> `AnalysisExportDownloadView` + `useExportDownload`; `src/test/v1/export-download-client.test.ts`
> (18 casos, 8/8 mutações mortas). `SEM_CLIENTE_NO_FRONT`: 2 → 1.
>
> **`useMutation`, não `useQuery`:** a `download_url` é assinada com TTL de 5 min. Uma query a
> cachearia e revalidaria sozinha, e o usuário clicaria num link morto. A credencial também não
> ganha chave em `queryKeys`.
>
> 🔧 **CORREÇÃO DE AUTORIDADE.** *(Esta nota citava "discovery da BD09-A". Não existe `BD09-A`, e
> `BD09` é **resolução de destinatário** (B5/M43 → M44, M48) nas outras sete citações do programa —
> tabela §2, `INDICE-DE-AUTORIDADE-V1.md:117`, gate 12→13. A canonicalização de contrato é a
> **BD07**. Referência corrigida em 2026-08-10; o conteúdo da correção abaixo continua válido.)*
> O escopo dizia `expired` ≠ `purged`, e a
> leitura natural disso era exigir dois estados/problems públicos distintos. O **produtor
> contradiz essa leitura, e deliberadamente**: `persistence/exports.py` projeta
> `purged_at is not None → "expired"`, porque *"para quem consulta, 'venceu' e 'os bytes já
> saíram' têm a mesma ação possível"*.
>
> **Semântica corrigida:** `expired` e `purged` são distintos **no domínio** — `expires_at` e
> `purged_at` são campos diferentes, com eventos diferentes —, mas **`purged` projeta publicamente
> como `expired`**. O escopo da M22 é o estado público, então ela vê **uma** condição de
> indisponibilidade, não duas.
>
> Não confundir nenhuma das duas com o **TTL de 5 minutos da capability interna**, que é transporte
> recuperável e nunca chega ao frontend.
>
> A distinção interna **não deve ser removida**: o tombstone `purged_at` é o que permitiria evoluir
> o contrato no dia em que as ações públicas divergirem, sem reconstruir a história do domínio.
> Enquanto elas não divergem, aumentar a cardinalidade do contrato público seria transformar
> observabilidade interna em superfície de produto sem necessidade.
- **Escopo:** download + estados do eixo `export`; indisponibilidade pública é **uma** condição
  (`expired`, que já inclui o purgado). **Fora:** gerar export.
- **Pré:** **BD07** (canonicalização de contrato — ✅ decisão 4) + implementação do produtor no
  Gateway. **Scenarios:** 17–19. **DoD:** operação sai do `missing_in_front`.
- 🟢 **DESBLOQUEADA em 2026-08-10.** O blocker era `CONTRATO_DECLARA_OPERACAO_SEM_PRODUTOR` — "a
  operação está em `operations[]` e o Gateway não a implementa". **A premissa era de branch.** O
  produtor existe em `api/routes/analyses_v1.py:739` do tip `develop` (worktree `sentinela-facts`,
  `4cd8bf9`), registrado em `api/main.py:123` atrás de `public_api_v1_enabled()`; suíte
  `test_mf52_export_download_fachada.py` **15/15**, mutação anti-bypass **5/5 mortas**. A rota é
  ausente só em `fix/argos-analysis-pipeline` e `main` — e é lá que a árvore principal do repo
  `sentinela` está parada, 83 commits atrás. Ver [[project_argos_onda8_topologia]].
- **Contrato observado, para a M22 não redescobrir:** sucesso é **`200` com JSON** —
  `download_url` (assinada pelo broker, TTL de 5 min, **transporte**, nunca produto),
  `expires_in_seconds`, `sha256`, `size_bytes`, `export_contract_version`, `format`. O Gateway
  **não** proxia bytes, não monta ZIP e não deriva `object_key`. Indisponibilidade é **`404`
  `forbidden_or_not_found`** com `detail` fixo `analytics_export_not_available` — e o front já
  tem esse código em `src/lib/v1/problem.ts:16`, com `status`/`retryable`/`title` idênticos aos
  do Gateway. **A M22 não precisa de problem code novo.**
  > ⚠️ O antigo `410 result_not_available` do scenario `export-expired` **nunca foi o produtor**:
  > o Gateway não emite `410`, e o corpo de `result_not_available` já declara `status: 404`.
  > Corrigido em `src/mocks/scenarios/catalogo.ts` na mesma passada.

### M23 · Cliente `/timeline` — EXECUTADA
> **Estado:** executada em 2026-08-10. `getTimeline` + `AnalysisTimelineView` +
> `useAnalysisTimeline` + `workspaceKeys.timeline`; `src/test/v1/timeline-client.test.ts`
> (18 casos, 9/9 mutações mortas). **`SEM_CLIENTE_NO_FRONT`: 1 → 0. B1 FECHADO.**
>
> **`TimelineEvent` é união DISCRIMINADA por `event_type`**, como os eixos da M20, e o gate
> compara os oito tipos e os `data_keys` de cada um contra `public-events-v1` do produtor — nas
> DUAS direções. Um tipo inventado no front reprova; um tipo novo do produtor também, porque um
> evento que a tela não sabe nomear não pode chegar calado.
>
> **`record_count` e `result_available` ficaram `unknown`:** o contrato publica a CHAVE, não o
> tipo escalar (só `data_enums` fecha valores, e esses viraram uniões literais). Escrever
> `number`/`boolean` seria o front inferindo um tipo que o produtor não declarou.
>
> **`useQuery` aqui está certo**, ao contrário da M22: o que se guarda são eventos duráveis, não
> credencial de cinco minutos.
- **Escopo:** leitura dos eventos duráveis (`public-events-v1`); **não remontar** do estado atual —
  remontar produz uma história plausível em vez da que aconteceu, e as duas divergem no caso
  interessante. **Sem percentual.**
- **Pré:** BD07. **DoD:** operação sai do `missing_in_front`; **B1 fechado**.

---

# FASE 4 — Shell e navegação

> **Gate de saída:** IA pública congelada; todo deep link resolve; `/canonical/*` só redireciona.

### M24 · Rotas públicas e redirects — ✅ EXECUTADA
> **Estado:** executada. Gate: `src/test/v1/rotas-publicas.test.tsx` (17 casos, 5 mutações mortas).
> **B11 fechado.** `/canonical/*` e `/home/welcome` sobrevivem **só** como redirect: saem como
> destino, não como endereço. 404 numa URL que já circulou é defeito que só aparece para quem
> não está por perto para reclamar.

- **Escopo:** `/analyses`, `/analyses/new`, `/analyses/:id`, `/analyses/:id/result`,
  `#comparison`; `/canonical/*` → redirect permanente; remover `/home/welcome` (duplicata).
  **`/` permanece landing pública e `/home` permanece a Home autenticada** (decisão 2).
- **Pré:** M02. **Paraleliza com:** M25.
- **Testes/Gates:** gate que proíbe `canonical` em rota **nova**; todo deep link do Blueprint resolve.
- **DoD:** nenhuma rota pública nova carrega nome de camada interna. **Blocker:** **B11 fechado**.

### M25 · Shell, workspace context e menu do usuário — EXECUTADA
> **Estado:** executada em `92bd174` (2026-08-10). shell canônico: escopo visível, papel que governa sem rotular, conta fora da SPA.
- **Escopo:** navegação principal, seletor de Workspace (escopo **sempre visível**), menu do usuário
  com link externo de conta (D19), `color-scheme` no `<html>` com **um** valor.
- **Fora:** *(omissão editorial fechada por decisão de owner em 2026-08-10, antes da implementação —
  esta é a missão com a maior superfície de alargamento do plano, e era a única da Fase 4 sem cerca)*
  criação/configuração de Workspace sem operação pública · **CTA fake para WS-02/WS-04** ·
  seletor ou persistência de idioma enquanto **BD04/B7** não existir · theme switcher, dark mode
  como opção ou segundo valor de tema · redesign de Settings/Profile · gestão de credencial dentro
  da SPA · criação de rotas públicas novas · navegação canônica para `/dashboard*` · persistência de
  membership/role como verdade local · mudança de backend ou de contrato · expansão do Storybook
  para produto · correção de dívida herdada.
- **IA do shell canônico** *(decisão de owner, 2026-08-10)*: Home → `/home` · Análises →
  `/analyses` · Workspaces → `/workspaces` · Conta → Account Management **externo** do provedor.
  `/dashboard*` permanece só como legado/compatibilidade — **compatibilidade ≠ navegação
  canônica**. Não inventar `/settings` nem outra rota ainda não congelada.
- **Pré:** M13, M24. **Contratos:** `GET /v1/me` (**única** autoridade de membership).
- **Testes/Gates:** troca de workspace **invalida o cache por construção** (`workspaceKeys.root`);
  `role` governa o que aparece e **nunca vira rótulo** (D3).
- **DoD:** 4 combinações + teclado; resposta tardia do workspace antigo **não contamina** o novo.

---

# FASE 5 — Resultado (o crash test)

> RES-01 é a primeira superfície porque tensiona **tudo**: DS, analytics, trust, estados,
> comparação, export, responsive, i18n, motion, data viz — e é a única que já tem contrato,
> adapter, validador e Gateway provados.
>
> **Gate de saída:** RES-01 passa nos **18 critérios** sozinha.

### M26 · RES-01 — composição, atenção e indicadores — EXECUTADA
> **Estado:** executada em `95b9956` (2026-08-10). atenção por ordenação; procedência ao lado do número.
- **Escopo:** página que **compõe**; nenhuma interpretação de payload bruto; "o que merece atenção"
  por ordenação (sem recálculo); `IndicatorCard` com `ProvenanceMargin`.
- **Pré:** M11, M12, M13, M21. **Superfícies:** RES-01. **Scenarios:** 16, 30.
- **DoD:** v1 e v2 discriminados por `result_schema_version`; **sem fallback silencioso**.

### M27 · RES-01 — analytics, partial/withheld e qualidade — EXECUTADA
> **Estado:** executada em `f6280eb` (2026-08-10). `partial` ≠ falha e `withheld` ≠ zero, por asserção separada.
- **Escopo:** `AnalyticsBlock` por união discriminada; `PrivacyNotice` com
  `{applied, output_count, reason_code}`; as **contagens A/B/C**; `withheld` **some da escala**,
  nunca vira 0.
- **Pré:** M21, M26. **Scenarios:** 11, 12, 23.
- **DoD:** `partial` ≠ falha e `withheld` ≠ zero, provados por asserção separada.

### M28 · RES-01 — Trust e timeline — EXECUTADA
> **Estado:** executada em `7e247cb` (2026-08-10). Trust com origem apontável; timeline como régua, não feed.
- **Escopo:** superfície de procedência com os **11 elementos**; `ProvenancePopover`; timeline lida
  do `/timeline`. **Fora:** qualquer "trust score" — não existe e não se inventa.
- **Pré:** M21, M23, M12. **DoD:** cada elemento exibido tem origem canônica apontável.

### M29 · RES-01 — export — EXECUTADA
> **Estado:** executada em `41df5ab` (2026-08-10). o CSV do navegador saiu; `expired` deixou de prometer.
- **Escopo:** um botão **por estado** do eixo, não um botão que mente. **Pré:** M22.
- **Scenarios:** 17–19. **DoD:** `expired` oferece o caminho certo, sem prometer o que não há.

### M30 · RES-01 — comparação com a anterior — EXECUTADA
> **Estado:** executada em `fed4157` (2026-08-10). a ruptura não aparece como delta.
- **Escopo:** resumo *"esta vs. imediatamente anterior"*; pareamento **só por `indicator.id`**;
  **quebra de `indicator_registry_version` interrompe a comparabilidade** com descontinuidade
  explícita. **Fora:** série de Instância (Fase 10).
- **Pré:** M26. **Scenarios:** 20, 21. **DoD:** a quebra **nunca** vira aumento ou queda.

### M31 · RES-01 — hardening — EXECUTADA
> **Estado:** executada em `29d534d` (2026-08-10). cinco rodadas; alvo de toque do índice corrigido para o mínimo do WCAG 2.2 AA.
- **Escopo:** responsive (§8 do DS), PT/EN, `axe`, teclado, `/design-critique`,
  `/ux-heuristics` ≥ 8, `/ux-copy`. **DoD:** os 18 critérios **nesta superfície**.
- **Pré:** M26, M27, M28, M29, M30. *(Omissão editorial fechada por decisão de owner em
  2026-08-10: era a única missão da Fase 5 sem `Pré:`, enquanto M26–M30 todas tinham. Satisfeitas
  em `95b9956`, `f6280eb`, `7e247cb`, `41df5ab`, `fed4157`.)*
- **Fora:** Light/Dark ou segundo tema · **P31** · Behavior Score, Drift e Confidence, que não são
  publicados · features novas · BDs novas · correção de backend · correção do baseline técnico
  herdado · **fabricar fixture para melhorar screenshot** · redesenhar outras superfícies ·
  qualquer escopo além dos 18 critérios de UI Complete.
- **Evidência:** relatório por critério. **Gate de fase: Fase 5 → 6.**
- **EXECUTADA em 2026-08-10 — o gate de fase NÃO fechou.** 17 dos 18 critérios passam; o **9**
  (`/ux-heuristics` ≥ 8/10) ficou em **7,7/10**, contra 6,2/10 medidos antes. O critério **12**
  não foi ativado: a infraestrutura de visual regression não existe no repositório (a única
  ocorrência de `toHaveScreenshot`/Chromatic/Percy em toda a árvore é o comentário do teste da
  M31 dizendo que ela não existe). O que separa a superfície do 8/10 está registrado como
  **P2-1** (a comparação repete os catorze indicadores e é ~40% da altura da página) e **N7** (uma
  página de ~2900px sem nenhum atalho entre as sete regiões) — os dois são decisão de produto, não
  de hardening, e por isso não foram tomados aqui.
> **A unidade de julgamento é a SUPERFÍCIE.** O gate diz *"RES-01 passa nos 18 critérios
> **sozinha**"*, o critério 8 pede `/design-critique` *"a cada superfície"* e o 9 impõe
> `/ux-heuristics` **≥ 8/10 por superfície**. "Cada fatia passou" não satisfaz nenhum dos três:
> uma tela pode ter dez pedaços corretos e tirar 6/10 de usabilidade.

---

# FASE 6 — Home operacional

### M32 · HOME-01 — EXECUTADA
> **Estado:** executada em `6e2f017` (2026-08-10). a Home operacional substituiu o `/home` legado; quatro regiões de D9.
- **Escopo:** as 4 regiões de D9 — ações necessárias, em andamento, Instâncias, resultados
  recentes — mais empty/loading/error **distintos**. A região de Instâncias fica **inalcançável**
  até BD02 (não meio-construída).
- **Pré:** M25, M20, M31. **Superfícies:** HOME-01. **Scenarios:** 1, 6, 7–10, 16, 26–29, 32.
- **DoD:** 18 critérios; a Home responde *"o que precisa de mim"*, não *"quantos temos"*.

---

# FASE 7 — Jornada de análise

### M33 · AN-01 — nova análise, upload e erros — EXECUTADA
> **Estado:** executada em `b148977` (2026-08-10). cancelamento sai por D15; a queda de rede deixou de ser silenciosa.
- **Escopo:** `prepare → data → submit`; upload inválido, falha de rede, `idempotency_conflict`.
  **Fora:** cancelar (D15 — fora da V1, e nenhum CTA pode sugerir).
- **Pré:** M25, M13. **Scenarios:** 3, 4, 5, 31.

### M34 · AN-03 — processamento, recovery e disponibilidade progressiva — EXECUTADA
> **Estado:** executada em `10c444d` (2026-08-10). quatro eixos lado a lado; o mock deixou de poder expressar estado não publicado.
- **Escopo:** 4 eixos lado a lado; `recovering` ≠ falha; **analytics aparece com `ready|partial`
  mesmo com `final_result` pendente** (D13) — e isso **não** se chama "resultado parcial".
- **Pré:** M20, M33. **Scenarios:** 7–10, 29.

### M35 · AN-04 — falhas terminais — EXECUTADA
> **Estado:** executada em `9883a73` (2026-08-11). falha granular; retomada só onde `retry_allowed` autoriza.
- **Escopo:** `retry` só quando `retry_allowed`; `non_retryable_failure` **sem** "tentar novamente";
  `capacity_wait` com espera. **Pré:** M33. **Scenarios:** 13–15, 29.
- 🔴 **AN-02 (`needs_mapping`) fica INACESSÍVEL** até `BD01`. Exibir sim, **agir não** — CTA sem
  operação é o erro que custou D21.

---

# FASE 8 — Backend delta de Instância

### BD02 · Instância (missão backend própria) — EXECUTADA E CONGELADA
> **Estado:** executada e congelada com `FREEZE: PASS` e E2E por processos reais. **B3 fechado.**
> Publicou `create_instance`, `list_instances`, `get_instance` e `instance_id` no read model de
> Analysis — e **reabriu o B1**, que a M36 levou de 3 para 1.
- **Objetivo:** o nível `Instância` existir no contrato, com contrato/testes/**freeze próprios**.
- **Existe porque:** o Gateway hoje executa `del project_id, environment_id`; sem isso não há
  identidade entre execuções (camada 2 de longitudinalidade).
- **Pré:** ✅ decisão 3. **Não reabre Ondas 1–8.** **Paraleliza com:** Fases 5–7.
- **Critérios mínimos congelados:** `create`/`list`/`get` Instance · Analysis **associada** à
  Instance · associação **persistida** · read models recuperam o contexto · histórico e listagem
  **por Instance** · timeline e deep link · **refresh preserva o contexto**.
- **DoD:** freeze próprio, com E2E por processos reais. **Blocker:** **B3**.
- **Gate:** nenhuma superfície da Fase 9 abre antes do freeze desta.

---

# FASE 9 — Instância

### M36 · INST-01/03 — visão e histórico — EXECUTADA
> **Estado:** executada em `34d65e2` (2026-08-12). INST-01 e INST-03 na mesma página, alcançáveis pela região 3 da Home.
- **Pré:** ✅ **BD02 congelada** (`FREEZE: PASS`, B3 fechado). **Scenarios:** 2 `instance-empty`,
  agora **disponível**.
- **Escopo:** **INST-01** visão atual da Instance · **INST-03** histórico de Analyses da Instance
  em ordem canônica. Consumir **somente** capacidades já publicadas pela BD02. Navegação e
  contexto têm de sobreviver ao refresh pela identidade durável.
- **INST-02 SAIU desta missão** — retirada da autoridade ANTES do primeiro write, não dispensada
  no fim. Ela pede *"leitura do estado corrente"*, e o contrato de Instance publica três campos:
  `instance_id`, `name`, `created_at`. A BD02 congelou deliberadamente **sem** `status`, `health`,
  contadores ou `updated_at`, e as derivações possíveis estão todas proibidas: última Analysis
  como estado, histórico como saúde, `created_at` como status, contagem no Front. Não é falta de
  fixture — é contradição entre o Blueprint visual e o produto entregue. Ver o delta declarado
  abaixo.
- **Fora:** criar/editar/remover Instance · health sintético · métrica nova · timeline própria de
  Instance · re-parenting · Default Instance · configuração técnica/secrets · Workspace CRUD ·
  qualquer backend novo.
- **DoD:** INST-01/03 conforme Blueprint · scenario 2 exercitado · estado vazio honesto ·
  histórico a partir do read model publicado, **sem cálculo no Front** · refresh/deep link
  reconstrói o contexto pela identidade · PT/EN · desktop/tablet/mobile · teclado · axe ·
  `/ux-copy` · `/design-critique` · `/ux-heuristics` com gate de owner **≥ 9,0** · typecheck,
  lint, testes e gates de mutação aplicáveis verdes.
- **Gates:** o Front não calcula estado de backend · o Front não inventa Instance · `instance_id`
  é a identidade da navegação · legado/`null` não vira Default · nenhuma superfície da missão
  depende de estado efêmero do browser.
- **Autoridades:** Product Freeze · Blueprint §11 · Blueprint §§460/465 (`StatusBadge`,
  `AnalysisListItem`) · DS Constitution · Architecture & Mock · scenario 2. Sem Discovery nova.
> **DELTA DECLARADO — INST-02 · Estado da Instância, sem produtor.**
> **Dono:** Produto/Arquitetura de Instância. **Sem número de BD**: a convenção do registro abaixo
> é `BD01`…`BD09`, e cunhar `BD10` aqui seria decidir que existe delta de backend antes de existir
> a decisão de produto que o define.
> **Razão:** o contrato não publica estado corrente de Instance, e o Front não pode inferi-lo.
> **Reentrada, nesta ordem:** 1) definir o que "estado corrente da Instância" significa ·
> 2) definir o produtor · 3) publicar contrato/read model · 4) só então autorizar a superfície.
> Criar um campo `status` genérico para satisfazer uma tela poria a mentira no servidor em vez do
> Front.

### M37 · INST-04 — nova análise a partir da Instância — CHECKPOINT 0 CONCLUÍDO
> **Estado:** **implementação NÃO iniciada.** O **Checkpoint 0** — alinhamento de autoridade e
> scenario oficial, sem uma linha de código visual — fechou em `064247b` (2026-08-12).
- **Pré:** ✅ **M36** (fechada em `34d65e2`). **Scenarios:** `instance-new-analysis`.
- **Escopo:** **INST-04** — iniciar o fluxo canônico de nova Análise **a partir de** uma Instância
  existente, com o contexto dela pré-preenchido. Usa capacidade já publicada: `prepare_analysis`
  aceita `instance_id`. Não criar uma segunda experiência de Análise se o fluxo canônico existente
  puder receber esse contexto.
- **INST-07 SAIU desta missão.** *"Configuração da Instância"* não tem produtor: o contrato publica
  três operações — `create`/`list`/`get` — e **nenhuma** de `update`, `PATCH`, `PUT` ou `delete`;
  os campos são `instance_id`, `name`, `created_at`, e nem renomear é possível. Além disso o D22
  depende de **BD04** (contrato de preferências), que segue sem autorização. Ver o delta abaixo.
- **Fora:** `create_instance` · INST-07 · configuração/preferências · BD04 · rename/update/delete
  de Instância · status/health · backend novo · nova arquitetura de Análise · M38+.
- **DoD:** a partir de uma Instância existente o usuário inicia o fluxo canônico de nova Análise ·
  o contexto usa a identidade durável · `prepare_analysis` recebe o `instance_id` correto ·
  nenhuma associação inferida por nome · o fluxo geral de nova Análise **fora** de Instância
  continua igual · PT/EN · responsivo · teclado · axe · `/ux-copy` · `/design-critique` ·
  `/ux-heuristics` **≥ 9,0** · typecheck, lint, testes e mutação verdes.
- **Gates:** o Front não cria Instância · não inventa configuração · a Instância viaja como
  `instance_id` explícito, nunca pelo nome · ausência de contexto continua válida, porque o
  contrato aceita o campo como opcional · INST-07 não reaparece informalmente.
- **Autoridades:** Product Freeze · Blueprint §11 · Discovery §9.1 (o ramo "nova análise a partir
  da Instância") · DS Constitution · Architecture & Mock · contrato público `@ ac81633` ·
  scenario `instance-new-analysis`.

> **DELTA DECLARADO — INST-07 · Configuração da Instância, sem produtor e bloqueada por BD04.**
> **Dono:** Produto/Arquitetura de Instância, com dependência de **BD04** — que já existe no
> registro e **não** precisa de BD nova.
> **Reentrada:** 1) BD04 autorizada · 2) semântica da configuração definida · 3) contrato de
> leitura/escrita publicado · 4) operação provada · 5) scenario oficial · 6) superfície autorizada.
> Não decidir hoje quais campos existirão: preferências, environment, tags, descrição, rename,
> status e secrets são todos hipótese.

> **DELTA DECLARADO — `create_instance` · capacidade pública sem superfície nem missão.**
> **Dono:** Produto/Arquitetura de Instância. **Sem número**, pela mesma razão da INST-02.
> A operação existe no contrato desde a BD02 e o Discovery §9.1 tem o nó *"Criar primeira
> Instância"* — a necessidade está registrada. O que não existe é **superfície no Blueprint**
> (zero ocorrências de criação nas sete INST) e **missão no PLAN**.
>
> A afirmação de que *"a M37 fecha o B1"* foi **inferência de execução, não autoridade**: o escopo
> literal da M37 sempre foi INST-04/07, e nenhuma das duas é criar Instância. **B1 permanece
> aberto depois da M37.**
>
> **Reentrada:** produto define a superfície → Blueprint a incorpora → PLAN atribui missão →
> scenario oficial → client/UX → só então B1 pode fechar.

---

# FASE 10 — Evolução

### M38 · EVO-01 — histórico cronológico — PRONTA, NÃO INICIADA
> **Estado:** não iniciada, e **sem impedimento conhecido**: `Pré: M25` satisfeita em `92bd174` e o
> scenario `list-pagination` está disponível no catálogo. Auditada em 2026-08-12.
- **Pré:** M25. **Paraleliza com:** Fase 5. **Scenarios:** 32. É a superfície mais barata do plano.
### M39 · EVO-02 — comparação A×B e quebra de comparabilidade
- **Pré:** M30, M38. **Escopo:** **uma** regra canônica compartilhada com RES-01 (D29).
  **Scenarios:** 20, 21.
### M40 · EVO-03 + INST-05 — baseline explícito — BLOQUEADA POR FALTA DE PRODUTOR
- **Pré:** ✅ **BD02** (satisfeita em 2026-08-12) **— e isso NÃO a destrava.**
- 🔴 **A BD02 entregou Instância, não Baseline.** A `Pré:` desta missão dizia apenas `BD02` e os
  scenarios 24/25 apareciam como *"destravados"* por ela. Era consequência falsa: os dois seguem
  **bloqueados** no catálogo, com a razão literal *"Baseline NÃO existe no contrato público.
  Nenhuma operação a cria, lê ou compara."* Fechar a BD02 não mudou nada disso.
- **Bloqueio real:** não há produtor de Baseline — nem operação, nem read model, nem lifecycle — e
  **nenhuma BD existente o cria**. BD03 é `recommendation_id`; BD04 é preferências. Nenhum número
  novo é atribuído aqui: antes de qualquer backend será preciso **definir a semântica de Baseline**
  e só então abrir um delta próprio.
- **Baseline permanece requisito da V1.** EVO-03 e INST-05 continuam no mapa; o que muda é a razão
  documentada do bloqueio.
- **Escopo (quando destravar):** marcar/substituir/remover; **nunca muda em silêncio**; baseline
  ativo **bloqueia exclusão**. **Superfícies:** EVO-03, **INST-05**. **Scenarios:** `no-baseline`,
  `baseline-active` — **os dois seguem bloqueados; não desbloquear enquanto não houver produtor**.

> **Recomendação longitudinal só após `BD03`.** Sem `recommendation_id` no documento canônico,
> **nenhuma afirmação** de persistiu/apareceu/sumiu. **Delta ≠ drift**, e drift continua fora.

---

# FASE 11 — Configurações

### M41 · CFG-01/02 — conta e idioma
- **Pré:** 🔴 **BD04** (contrato de preferências). **Escopo:** leitura de `/v1/me`; alteração de
  credencial **delegada** ao provedor (D19); idioma. **Tema não entra** (decisão 1).
### M42 · CFG-03/04 + WS-02/04 — Workspace e Instância
- **Pré:** ✅ **BD02** · 🔴 **BD04** · 🔴 **delta de lifecycle/configuração de Workspace, inexistente**.
- 🔴 **Três impedimentos distintos, e BD04 cobre só um.** (a) **CFG-02** espera o contrato de
  preferências — é BD04. (b) **CFG-04 / INST-07** espera configuração de *Instância*: o contrato
  publica `create`/`list`/`get` e **nenhuma** operação de `update`, `PATCH` ou `delete` — nem
  renomear é possível. (c) **WS-02 e WS-04** esperam criar e configurar *Workspace*, e **não existe
  operação nenhuma** — BD04 é preferências, **não** lifecycle de Workspace, e nenhuma BD existente
  cobre isso. Nenhum número novo é atribuído aqui.
- **Escopo:** ownership de D22. Ações destrutivas **só** quando suportadas — `ConfirmDestructive`
  exige digitar o nome da Instância (D28).

---

# FASE 12 — Comunicação e re-entry

### M43 · Q15 — prova da cadeia do destinatário
- **Objetivo:** provar `Workspace owner → identidade → e-mail → Mensagem.destino`.
- **Existe porque:** `Mensagem.destino` **nasce vazio** e é preenchido fora do compositor.
- **DoD:** cadeia provada **ou** `BD09` aberta com o delta exato. **Blocker:** **B5**.
- **Regra:** **comunicação externa não pode ser declarada fechada** antes disto.
### M44 · Deep links e eventos suportados
- **Escopo:** corrigir o link do e-mail (hoje aponta para rota **inexistente**); mapear
  `analysis.completed`, `analysis.failed`, `result.available`. **Ação necessária, conclusão com
  restrição e export pronto entram só se o evento existir** — não se inventa evento para justificar
  CTA. **Pré:** M43, M24.

---

# FASE 13 — Hardening

### M45 · Os 18 gates de UI COMPLETE
Rodar sobre **todas** as superfícies REAL: superfícies navegáveis · 27 scenarios · nenhum dado
exclusivo do mock · todo CTA com operação **ou explicitamente bloqueado** · responsive · PT/EN ·
a11y · critique · heuristics ≥ 8 · copy · erro/vazio/carregando · visual regression (**só entra em
gate depois de uma mutação de token a fazer falhar**) · fronteiras · vocabulário interno ·
zero `#hex` · token único · **semântica única de estado** · paridade i18n.

---

# FASE 14 — 🏁 UI EXPERIENCE FREEZE

### M46 · UI EXPERIENCE FREEZE
**Ponto exato:** ao fim de M45, com **M46 registrando o marco**.
**Requisito:** Front inteiro da V1 **navegável e aprovado em modo mock**. Backend real **pode**
estar desconectado das jornadas que não precisam dele para validação visual.
**Não inclui:** superfícies bloqueadas por delta não congelado — elas ficam **inalcançáveis**, não
meio-construídas.
**Evidência:** relatório dos 18 critérios por superfície + HEADs congelados.

---

# FASE 15 — 🏁 Integração

### M47 · MSW OFF → Gateway ON
**Ponto exato de MSW OFF:** primeira ação de M47, **depois** de M46.
**Regra:** a troca **não altera nenhum componente ou página** — muda **uma variável de ambiente**.
Se algum arquivo de UI precisar mudar, a Fase 2 falhou e a integração **para**.
**Escopo:** contract parity (o gate de operações contra o Gateway **real**) + E2E por processos reais.
**DoD:** jornada canônica ponta a ponta contra Gateway real, com o corredor da MF6.4c.

---

# FASE 16 — 🏁 Pre-Big-Bang

### M48 · Pacote pré-Big-Bang
**Critérios:** B5 provado · B6 fechado · **B9 fechado fisicamente** (BD07+BD08) · lifecycle
(`prepared` expira — BD05) · segurança · **contract sync sem env var** · E2E · performance ·
acessibilidade · evidências · freeze final.
**Mais:** o blocker herdado do freeze global — **publicação do `sentinela-result-assembler`**, sem a
qual o Orchestrator não compõe o v2 e **não falha visivelmente** (o gatilho é fail-open).
**Ordem de rollout preservada:** Migrations → Assembler → **FRONTEND** → Analytics → Engine →
Dispatcher → **ORCHESTRATOR** → Gateway.

---

## 2. Deltas de backend — cada um com contrato, testes e freeze próprios

| id | delta | blocker | autorizado? | destrava |
|---|---|---|---|---|
| **BD01** | **Mapping public bridge** — expor `profile`+`mapping` no `/v1` e ligar `analysis_id ↔ ingestion_id`. **Não** é criar domínio: ele existe e é testado | B2 | ⏳ **falta autorizar** | AN-02 |
| **BD02** | **Instância** | B3 | ✅ decisão 3 | Fase 9, M40, M42 |
| **BD03** | **`recommendation_id`** no documento canônico | B4 | ⏳ falta autorizar | recomendação longitudinal |
| **BD04** | **Preferências** (idioma) | B7 | ⏳ falta autorizar | M41, M42 |
| **BD05** | **`prepared` lifecycle** — hoje **nunca expira** | B8 | ⏳ falta autorizar | M48 |
| **BD06** | **Exclusão de análise** (D28/D30) | B10 | ⏳ falta autorizar | ação destrutiva real |
| **BD07** | **Canonicalização de contrato** (C1+C2) | B9 | ✅ decisão 4 | Fase 3, M48 |
| **BD08** | **Schema aninhado do Analytics** (C5) | B9 | ✅ decisão 4 | M21 |
| **BD09** | **Resolução de destinatário** — **condicional** ao resultado de M43 | B5 | condicional | M44, M48 |

> **A coluna "autorizado?" é AUTORIZAÇÃO, não execução.** Estado de execução em 2026-08-10:
> **BD07 ✅ EXECUTADA** (`746abec` no front + o mirror byte-a-byte no repo do Gateway — as duas
> cópias de `public-v1.json` têm o mesmo SHA-256, e a origem resolve `candidatas-identicas`) ·
> **BD08 ✅ EXECUTADA** (`87192b4`, com o gate `f8fb036`) · **BD02 ✅ EXECUTADA e CONGELADA**
> (`FREEZE: PASS`, E2E por processos reais; **B3 fechado**). **BD01, BD03, BD04, BD05 e BD06
> continuam não executadas.**
> **B9 permanece FECHADO** por BD07 + BD08 — não reabrir por divergência de inventário.
>
> **Classificação das cinco pendentes (2026-08-12).** Não são entidades indefinidas: são
> **obrigações reconhecidas da V1, autorizadas para especificação e preflight, e NÃO autorizadas em
> bloco para implementação**. Cada uma ainda precisa, individualmente, de objetivo literal,
> pré-condições, contrato, critérios, freeze próprio e missão dependente nomeada — e de
> autorização explícita do owner para começar. **Existir no plano não é estar pronta para código.**
>
> **Duas obrigações da V1 não têm BD alguma** e por isso não aparecem na tabela acima:
> **Baseline** (EVO-03/INST-05 — ver M40) e **lifecycle/configuração de Workspace** (WS-02/WS-04 —
> ver M42). Nenhum número foi criado para elas aqui: falta a semântica antes do delta.

---

## 3. DAG de execução e critical path

```mermaid
flowchart LR
  BD07["BD07 canonicalizacao"]:::auth
  BD08["BD08 schema aninhado"]:::auth
  M01["M01 Keycloak provado"]:::auth
  M02["M02 erradicar Supabase"]:::auth
  M03["M03 deps mortas"]
  M04["M04-M07 gates de fronteira"]

  M08["M08 TOKEN UNICO"]:::cp
  M09["M09 motion"]
  M10["M10 primitives"]:::cp
  M11["M11 StatusBadge"]:::cp
  M12["M12 ProvenanceMargin"]
  M13["M13 patterns"]:::cp
  M14["M14 i18n"]
  M15["M15 Storybook"]

  M16["M16 MSW browser"]:::cp
  M17["M17 fixtures"]:::cp
  M18["M18 27 scenarios"]:::cp

  M20["M20 /progress"]:::cp
  M21["M21 /analytics + trust"]:::cp
  M22["M22 export"]
  M23["M23 /timeline"]

  M24["M24 rotas publicas"]
  M25["M25 Shell"]:::cp
  M26["M26-M30 RES-01"]:::cp
  M31["M31 RES-01 hardening"]:::cp
  M32["M32 HOME-01"]
  M33["M33-M35 jornada"]
  M38["M38 EVO-01"]

  BD02["BD02 INSTANCIA backend"]:::auth
  M36["M36-M37 Instancia"]
  M39["M39 EVO-02"]
  M40["M40 baseline"]
  M41["M41-M42 Config"]
  M43["M43 Q15"]
  M44["M44 deep links"]
  M45["M45 18 gates"]:::cp
  M46["M46 UI FREEZE"]:::marco
  M47["M47 MSW OFF -> Gateway"]:::marco
  M48["M48 pre-Big-Bang"]:::marco

  M01 --> M02
  M03 --> M08
  M04 --> M10
  M08 --> M09 --> M13
  M08 --> M10 --> M11 --> M13
  M10 --> M12 --> M13
  M13 --> M14 --> M45
  M13 --> M15
  BD07 --> M17
  BD07 --> M20 & M22 & M23
  BD08 --> M21
  M16 --> M17 --> M18 --> M26
  M02 --> M24 --> M25
  M13 --> M25
  M20 & M21 & M22 & M23 --> M26
  M25 --> M26 --> M31 --> M32 & M33
  M25 --> M38
  M31 --> M39
  BD02 --> M36 --> M37
  BD02 --> M36
  %% M40 NAO depende de BD02: depende de um delta de Baseline que ainda nao existe
  BASELINE["delta de Baseline — INEXISTENTE"] --> M40
  BD02 --> M41 --> M42
  M43 --> M44
  M32 & M33 & M36 & M39 & M40 & M42 & M44 --> M45 --> M46 --> M47 --> M48

  classDef cp fill:#842029,stroke:#842029,color:#fff
  classDef auth fill:#664d03,stroke:#664d03,color:#fff
  classDef marco fill:#0f5132,stroke:#0f5132,color:#fff
```

### Critical path (vermelho)

```
BD07 -> M17 -> M18 -> M26 -> M31 -> M45 -> M46 -> M47 -> M48
        (com M08 -> M10 -> M11 -> M13 -> M25 entrando em M26,
         e M20/M21 como co-requisitos de M26)
```

**14 missões no caminho crítico.** O gargalo real é **M26–M31 (RES-01)**: tudo converge nela e nada
depois começa sem ela.

### O que corre em paralelo

| trilha | missões | independente de |
|---|---|---|
| **higiene** | M03, M04–M07 | tudo |
| **auth** | M01 → M02 | Fase 1 |
| **contrato backend** | BD07, BD08 | Fase 1 |
| **DS** | M08 → M09/M10 → M11/M12 → M13 → M14/M15 | Fases 2 e 3 |
| **mock** | M16 → M17 → M18 | Fase 1 (converge em M26) |
| **clientes** | M20, M21, M22, M23 — **os quatro em paralelo** | Fases 1 e 2 |
| **Instância backend** | BD02 | Fases 5, 6, 7 inteiras |
| **barata e cedo** | M38 (EVO-01) | Fase 5 |

**Não paralelizar:** M01 ∥ M02 (ordem é lei — decisão 5) · M08 com qualquer coisa que escreva token
· BD07 com M17 · duas missões que alterem a mesma autoridade documental.

---

## 4. Mapas

### Missão → blocker

| blocker | fecha em |
|---|---|
| **B1** | M20, M21, M22, **M23** |
| **B2** | BD01 (destrava AN-02) |
| **B3** | **BD02** |
| **B4** | BD03 |
| **B5** | **M43** (+ BD09 se a prova revelar delta) |
| **B6** | M01 → **M02** |
| **B7** | BD04 |
| **B8** | BD05 |
| **B9** | **BD07 + BD08** |
| **B10** | BD06 |
| **B11** | **M24** (decisão 2 já resolveu; M24 executa) |

### Missão → superfície

| superfície | missão |
|---|---|
| AUTH-01/02/03/04 | M01, M02, M25 |
| WS-01/03 | M25 · **WS-02/04 → M42 — mas sem produtor**: não existe operação de criação nem de configuração de Workspace, e **nenhuma BD a cria**. BD04 é *preferências*, não lifecycle de Workspace |
| **HOME-01** | M32 |
| AN-01 | M33 · AN-03 → M34 · AN-04 → M35 · **AN-02 → bloqueada por BD01** |
| **RES-01** | M26–M31 |
| EVO-01 | M38 · EVO-02 → M39 · EVO-03 → M40 (**bloqueada: Baseline sem produtor**) |
| INST-01/03 | M36 · **INST-04** → M37 · **INST-05** → M40 (bloqueada: Baseline sem produtor) · **INST-06** → M39 (junto de EVO-02) · **INST-02 e INST-07: delta declarado, sem produtor** · **criar Instância: sem superfície nem missão** |
| CFG-01/02 | M41 · CFG-03/04 → M42 |
| erros globais | M13 (`ErrorState`) + M25 |

### Missão → repo

| repo | missões |
|---|---|
| **`sentinela-front-e1`** | M01–M48 (46) |
| `sentinela-facts` | BD07, BD01(gateway), BD02(gateway) |
| `sentinela` | BD07 (mirror) |
| `sentinela-analytics-service` | BD08 |
| `sentinela-orchestrator` | BD02, BD03, BD04, BD05, BD06 |
| `sentinela-ingestion-service` | BD01 |
| `sentinela-result-assembler` | BD03 |
| `sentinela-event-dispatcher` | BD09 |

### Pontos exatos de autorização backend

| momento | o que autorizar | se não autorizar |
|---|---|---|
| **agora** | ✅ BD07, BD08, BD02 — já autorizados | — |
| **antes da Fase 7 fechar** | **BD01** | AN-02 fica inacessível na V1; a jornada tem um estado que informa e não age |
| **antes da Fase 10** | **BD03** | recomendação longitudinal sai da V1 (contradiz D27) |
| **antes da Fase 11** | **BD04** | CFG-02 sem operação; idioma vira preferência sem casa |
| **após M43** | **BD09**, se a prova revelar delta | comunicação externa não pode ser declarada fechada |
| **antes da Fase 16** | **BD05**, **BD06** | `prepared` acumula para sempre; D28 fica sem operação |

---

## 5. Definition of Done — por missão e por fase

### Baseline oficial de medição — 2026-08-12, `064247b`

Um comando por gate. Variante mais estreita **não é evidência substituta**.

| gate | comando oficial | baseline |
|---|---|---|
| suíte | `SENTINELA_CONTRACT_ORIGIN=../sentinela-facts/docs/contracts npx vitest run` | **1238 passed · 97 arquivos · 0 skips** |
| typecheck | `npm run typecheck` | 🔴 **19 ocorrências / 11 defeitos** — ver `TYPECHECK-GATE.md` |
| lint | `npm run lint` | 🟡 **9 erros / 14 warnings** |
| mutação | script por missão, **controle verde nas duas pontas** | por missão |
| visual | `npx playwright test` — mock local, **zero Railway** | 10 specs em `e2e/` |

**Regra de linguagem.** Enquanto houver defeito aberto, **não se escreve "typecheck verde" nem
"lint verde"**: escreve-se o número e o **delta da missão**, que precisa ser **≤ 0**. `0` e `19`
só voltam a ser comparáveis depois do `TYPECHECK RECOVERY`, que é **missão própria** — nenhuma
missão de produto corrige esses defeitos de passagem.

**Não são evidência de typecheck:** `npx tsc --noEmit` na raiz (verifica **zero** arquivos) e
`npm run typecheck:e2e` (cobre só as specs de browser). Os dois retornam 0 e não provam nada.

### Padrão de DoD por missão (todas)

1. escopo entregue e **fora de escopo intocado**;
2. testes da missão verdes;
3. **gate próprio provado por mutação** — verde sem vermelho não fecha;
4. `npm run typecheck` (nunca `npx tsc` na raiz — verifica **zero** arquivos) e `lint` no baseline;
5. suíte `src/test/v1/` verde;
6. nenhuma fronteira de §17 violada;
7. commit com evidência citável;
8. dívida declarada **atualizada no mesmo commit** (as listas encolhem junto).

### Gates de fase

| passagem | gate objetivo |
|---|---|
| **0 → 1** | todo gate de fronteira falha por mutação; zero dependência morta; Supabase erradicado com gate AST |
| **1 → 2** | **um** vocabulário de token com mutação de duplicidade falhando; `StatusBadge` e `ProvenanceMargin` provados nas **4 combinações** + escala de cinza + daltonismo |
| **2 → 3** | 27 scenarios por nome; toda fixture validando contra o schema publicado; mutação de fixture → vermelho |
| **3 → 4** | `missing_in_front` **vazio**; `SEM_CLIENTE_NO_FRONT` esvaziada no mesmo commit |
| **4 → 5** | todo deep link resolve; nenhuma rota pública com nome de camada interna |
| **5 → 6** | **RES-01 passa nos 18 critérios sozinha** |
| **6 → 7** | HOME-01 nos 18 critérios |
| **7 → 9** | jornada REAL completa; AN-02 **inacessível e declarada**, não meio-feita |
| **8 → 9** | **freeze próprio de BD02**, com E2E por processos reais |
| **12 → 13** | Q15 provada **ou** BD09 aberta com delta exato |
| **13 → 14** | **os 18 critérios em todas as superfícies REAL** |
| **14 → 15** | UI FREEZE registrado; HEADs congelados |
| **15 → 16** | backend real + **contract parity** + E2E verdes |

---

## 6. Os três marcos, com o ponto exato

| marco | ponto exato | condição |
|---|---|---|
| 🏁 **UI EXPERIENCE FREEZE** | **fim de M45, registrado em M46** | Front V1 navegável e aprovado **em modo mock**; 18 critérios em todas as superfícies REAL; bloqueadas por delta ficam **inalcançáveis** |
| 🏁 **MSW OFF** | **primeira ação de M47**, após M46 | a troca **não altera nenhum componente ou página**. Se alterar, a Fase 2 falhou e a integração **para** |
| 🏁 **Integração** | **M47 completa** | contract parity contra o Gateway **real** + E2E por processos reais |
| 🏁 **Pre-Big-Bang** | **M48** | B5, B6, B9 fechados; `prepared` expira; contract sync **sem env var**; assembler publicado; rollout na ordem congelada |

---

## 7. Primeira missão de implementação recomendada

# ▶ M08 — Vocabulário único de tokens

**Por que ela e não outra:**

1. **É o delta nº 1 medido**, e o único que destrava a Fase 1 inteira — nada do DS existe antes;
2. **vale por si, sem tema.** A decisão 1 tirou Light/Dark da V1, e o token único continua sendo
   pré-requisito de tudo — não é trabalho investido num tema que não vem;
3. **é a colisão adormecida:** `--background` e `--primary` estão definidos duas vezes com valores
   diferentes, hoje inertes só porque um arquivo está morto. A primeira pessoa que importar
   `index.css` acorda o defeito;
4. **tem gate óbvio e mutação óbvia** — reintroduzir `--background` num segundo arquivo deve ficar
   vermelho. Fecha com prova no primeiro dia;
5. **não depende de nenhuma autorização pendente.**

**Pré-requisito imediato:** **M03** (remover os CSS mortos e os quatro pacotes sem uso) — é pequena
e evita unificar tokens com dois arquivos fantasmas ainda na árvore.

**Sequência sugerida das primeiras cinco:** `M03 → M08 → M04 → M10 → M11`.
Em paralelo, e sem conflito: **BD07** e **M01**.
