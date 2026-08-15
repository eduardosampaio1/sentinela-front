# M45.2 · JORNADA DA ANÁLISE (Home · lista · nova análise · ciclo de vida) — DOC-CLOSE

Fechamento local. **Sem push, sem deploy, sem Railway.** A M45.2 é uma tranche da umbrella M45; o
Experience Freeze é da **M46**.

---

## 1. Por que esta tranche existia

A M45.1 mediu o crédito real das 40 missões anteriores e classificou estas superfícies como
**INCIDENTAL** (E1 Home — *"J7 só provou estado terminal e axe"*) e **PARTIAL** (E2 lista, E4
análise — *"não cobriram upload, recovery, progressão"*).

O crédito era sobre a **matriz transversal**, não sobre as suítes por missão — que continuam verdes
e cobrem a jornada feliz ponta a ponta em browser real (`canonical-authenticated.spec.ts`). A
distinção é a mesma que a M45.4 provou, e é o assunto deste documento:

> **REGRESSÃO COBERTA ≠ EXPERIÊNCIA ENDURECIDA.**

## 2. O buraco, dito com precisão

**As sete journeys da matriz pousavam TODAS em estado terminal**, e duas delas montavam a lista e a
Home **vazias**. Axe, geometria e vocabulário interno nunca tinham sido medidos onde a jornada
**anda** — nem onde há **conteúdo**.

Uma tela vazia não estoura largura, não tem contraste para errar e quase não tem o que o leitor de
tela anuncie. **Ela passa em tudo por não ter o que reprovar** — a massa vazia, com outra roupa.

## 3. Cinco defeitos de produto, todos em superfícies verdes

| # | Defeito | Onde |
|---|---|---|
| 1 | `503`, `404` e *"ainda não voltou"* imprimiam **"Não medido" quatro vezes** — a mesma frase que o produtor usa quando de fato não mediu | `eixos.ts` → `PainelDeEixos` |
| 2 | A página de `needs_mapping` omitia que **a operação que a resolve não existe**; só a Home dizia | `AnalysisPage` |
| 3 | O rótulo de **carregando** era o nome de um estado real ("Preparando") | `AnalysisPage` |
| 4 | Ausência de contagem dita como **"indisponíveis"** — a palavra da queda | `list.recordsUnknown` |
| 5 | A barra de topo dizia **"Nova análise"** numa análise existente, inclusive numa que **falhou** | `AnalysisPage` |

### 3.1. O primeiro merece o próprio parágrafo

`lerEixos(vista?.axes ?? [])` devolve os quatro eixos com `entrada: null` quando `data` é
`undefined`. E `entrada: null` significa, **pelo docstring do próprio tipo**, *"o produtor não
publicou este eixo"*.

Só que `data` também é `undefined` quando a leitura **falhou**, quando foi **recusada** e enquanto
**não voltou**. Três causas distintas — duas delas sobre o SISTEMA — colapsadas numa afirmação sobre
os **dados do usuário**. É o `ausência ≠ indisponibilidade` que este programa trata como o seu
defeito recorrente, dentro de um `?? []`.

Agora o painel recebe o estado da **leitura**, separado do estado dos eixos. Com erro, a grade
**não** é desenhada: afirmar quatro ausências ao lado do aviso deixaria a mentira na tela do mesmo
jeito.

### 3.2. A primeira versão da correção quebrou um invariante

Passei `onRetry` ao painel. Isso pôs um **segundo "Try again"** na tela — inclusive em
`failed + retry_allowed=false`, que existe exatamente para **não** oferecer retry. E dois botões com
o mesmo nome deixam ambíguo qual refaz o quê: um retenta a **análise**, o outro releria o
**progresso**. A suíte da E6 reprovou os dois problemas.

## 4. Quatro defeitos de INSTRUMENTO — dois deles meus, nesta sessão

### 4.1. A matriz foi de 28 para 43 testes

Sete journeys novas (**J8–J14**): nova análise, aguardando a base, processando, confirmação
necessária, falha terminal, Home povoada e lista povoada. Cada uma traz a própria sobreposição de
montagem; o produto base continua um só.

A âncora da Home povoada é *"Em andamento"*, e **não** *"Ações necessárias"* — esta segunda aparece
na Home vazia também, e ancorar nela mediria a Home vazia de novo, com outro nome.

**Prova de que a extensão consegue reprovar:** injetei `min-w-[2000px]` na grade do painel de eixos
e o gate de responsive ficou vermelho apontando **J10** (processando), em desktop e tablet. Antes
desta tranche nenhuma journey renderizava aquele painel.

### 4.2. Minha primeira sonda acusou o produto quatro vezes, e estava errada

Ela mostrava **todos** os estados como "Running" e a Home com dados que eu não servi. Não era
defeito: faltava `test.use({ serviceWorkers: "block" })`, e o MSW do dev respondia antes do
`page.route`. Quatro acusações desfeitas antes de virarem achado.

### 4.3. Minha massa documentou uma tela que não existe

A captura 05 saiu com **"Couldn't complete"** no cabeçalho e **"PROCESSAMENTO: Em execução ·
RESULTADO FINAL: Pendente"** logo abaixo — a mesma imagem afirmando que a análise morreu e que ela
ainda está andando.

Era a **massa**, não o produto: eu servia um payload de eixos fixo para todo estado. Os eixos são
independentes do estado por contrato, e a tela apresenta o que o produtor diz sem interpretar — mas
uma combinação que o produtor **nunca publicaria** não prova nada e vira evidência de uma tela
inexistente. As duas specs passaram a servir eixos coerentes com o estado.

### 4.4. Uma correção ficou desprotegida até a campanha exigir

O painel deixou de afirmar "não medido" enquanto a leitura não voltou, e **nada media isso** — só o
caso de erro tinha gate. Ganhou o próprio, com resposta atrasada de propósito, e com a contraprova
de que a grade **aparece** quando a resposta chega: sem ela, esconder para sempre passaria.

### 4.5. Duas suítes quebraram com as correções, e as duas estavam certas

Seis das minhas capturas usavam o "Nova análise" da barra como **marca de idioma**; cada estado vivo
passou a declarar a sua. E `evo01-m38-historico` prendia a redação antiga de `recordsUnknown` — o
invariante dele (**ausência ≠ zero**) segue idêntico, e ganhou a direção que faltava.

## 5. Duas correções que NÃO fiz, e por quê

Três dos oito estados têm dois nomes conforme a superfície, e `state.preparing` diz *"Preparando"*
enquanto o estado de fato espera o arquivo do usuário — o chip da família congelada diz
*"Reservada"*, que é mais exato.

| estado | `estadoPublico` (lista, Home, histórico) | `state.*.title` (página) |
|---|---|---|
| `preparing` | Reservada / Reserved | Preparando / Preparing |
| `needs_mapping` | Ação necessária / Action required | Confirmação necessária / Confirmation needed |
| `failed` | Falha / Failed | Não concluída / Couldn't complete |

**Não alinhei.** *"Ação necessária"* é rótulo **congelado no §15 do Blueprint**, o grafo da jornada
nomeia o nó assim e a região da Home tem o mesmo nome. Mudar seria eu contradizendo autoridade — o
espelho exato do gate da M36 que a M45.4 achou contradizendo a M45.0.

E o que sobra depois disso é mais estreito e mais verdadeiro: **o problema não era o rótulo, era a
página calar o motivo.** Foi isso que a correção 2 fez.

A barra de topo eu **mudei**, e a diferença importa: ali a M33 já tinha escrito a regra — *a barra
não diz "Nova análise" numa análise que já existe* — e deixado um guarda dizendo que quem mexesse
nos outros estados teria de passar por **M34/M35**. Esta tranche é a delas. O guarda não sumiu:
virou o invariante correto e ficou **mais forte** — varre `PUBLIC_STATES` inteiro e recusa
`entry.title` em qualquer estado, inclusive num estado novo do contrato.

## 6. Mutação — 7/7

`docs/m45/mutacoes_m45_2.py`. Uma mutação por correção; cada uma morta pelo **gate nomeado**.

| # | Mutação | Gate |
|---|---|---|
| 1 | a leitura que FALHOU volta a virar "não medido" | `indisponível ≠ não medido no painel de progresso` |
| 2 | a leitura que NÃO VOLTOU volta a virar "não medido" | `carregando ≠ não medido no painel de progresso` |
| 3 | a parada de mapping para de dizer o que a bloqueia | `mostra o que falta e oferece reconsultar` |
| 4 | o carregando volta a ser o nome de um estado | `o rótulo de CARREGANDO não é o nome de nenhum estado` |
| 5 | a contagem não publicada volta a ser indisponibilidade | `contagem não publicada NÃO é dita como indisponibilidade` |
| 6 | a barra volta a dizer "Nova análise" | `ela nunca é uma análise nova` |
| 7 | **a matriz** para de aplicar a montagem por journey | `alcança estado terminal` |

A sétima não ataca produto, ataca o **instrumento**: sem a sobreposição, as sete journeys novas
pousam no `completed` da montagem base e os estados vivos deixam de ser medidos sem ninguém notar —
que é exatamente como o buraco desta tranche existiu por sete missões.

## 7. Stack de qualidade — gate ≥ 9,0, sem waiver

| Passada | Nota | Achados |
|---|---|---|
| `/ux-copy` | **9,3** | defeitos 3 e 4 |
| `/design-critique` | **9,2** | defeito 5 e a massa incoerente (4.3) |
| `/ux-heuristics` | **9,2** | nenhum novo; confirmou prevenção de erro no upload nas duas camadas |

## 8. Provas

| Prova | Resultado |
|---|---|
| `npm run typecheck` | 6 projetos · **367 arquivos** · cobertura completa · raiz inerte |
| `eslint .` | sem erro |
| Vitest | **117/117** arquivos · **1655/1655** testes |
| Playwright | **322/322** |
| Mutação M45.2 | **7/7** mortas pelo gate nomeado |
| Matriz transversal | 28 → **43** testes · 7 → **14** journeys |
| axe | 0 violações aplicáveis nas 14 journeys |
| Responsivo | 0 estouro em 1280 / 768 / 375, por **geometria** |
| Capturas | **12** em `docs/m45-2`, todas por provador |

## 9. Dívidas — enumeradas, nenhuma mascarada

| Dívida | Por que não foi feita aqui |
|---|---|
| Três estados com dois nomes, e `state.preparing` menos exato que o chip | Rótulos congelados no **§15 do Blueprint**. Decisão de owner, não minha |
| O `503` do painel sai em **vermelho com `role="alert"`** numa tela cujo cabeçalho diz que a análise está bem | O tom é decidido pelo **código**, por regra escrita da casa (`notices.tsx`). Sobrepor localmente contradiz a regra; reclassificar afeta toda superfície. Decisão de owner |
| A lista não tem busca nem filtro | Item 6 do teste do porta-malas, falha no produto inteiro. É feature — já registrada na M45.4 |
| Os estados de espera não têm saída na própria página | A saída é a barra lateral, que existe e está a um clique. Diferente da Instância, que não tinha item no shell |
| No teste da mutação de largura, **J10 acusou e J12 não**, embora as duas rendam o painel | Não investigado. Fica registrado como pergunta em aberto sobre o laço do gate de responsive, que reusa a mesma página entre journeys |

## 10. Commits

`eb25542` · `81535ed` · `2c00e88` · `98578e4` · `fb5acd2` · `f27f368` · `a59d80f`

Todos locais. **Zero push.**

## 11. Estado

### **M45.2 · JORNADA DA ANÁLISE — CLOSED · 5 defeitos de produto · 4 de instrumento · mutação 7/7**

A umbrella **M45 segue OPEN**. Abertas: M45.3 (resultado, P0 — herda três nomes divergentes achados
na M45.4), M45.5 (Instância e baseline, P1), M45.6 (fundação, P2), M45.7 (público, auth e shell,
P1), M45.8 (consolidação, fecha a umbrella).
