# M42 · CFG-03 / CFG-04 — DOC-CLOSE do fechamento de QUALIDADE

Fechamento local. **Sem push, sem deploy, sem Railway.**

---

## 0. O que este documento corrige no anterior

O `DOC-CLOSE-IMPLEMENTACAO.md` declarou **M42 · CLOSED** sem ter executado os três gates visuais
obrigatórios: `/ux-copy`, `/design-critique` e `/ux-heuristics`. Eles não foram medidos, e a
ausência não estava registrada — o documento simplesmente não os mencionava, o que é pior do que
registrá-los como pendentes: quem lesse aquele fechamento concluiria que a qualidade visual tinha
sido avaliada e aprovada.

**Esse registro fica.** Não foi apagado do documento anterior, e não é reescrito aqui como se a
ordem tivesse sido outra. O que este documento acrescenta é: as três skills foram executadas
agora, nesta ordem, e o gate congelado (`score >= 9.0`) foi satisfeito **depois** das correções
que elas exigiram.

E a execução não foi cerimônia: ela achou um defeito de severidade 4 que quatro suítes verdes,
219 testes de browser e treze capturas publicadas não tinham achado.

---

## 1. `/ux-copy` — 4 achados, todos aplicados nos dois locales

| # | achado | correção |
|---|---|---|
| C1 | `saveFailed` não dizia **qual** nome falhou; as duas seções usavam a mesma frase | "We could not save the **workspace** name…" / "…the **instance** name…" |
| C2 | `workspaceConfig.loadFailed` soava a ausência | "Workspace settings are **unavailable right now**." — temporal, não existencial |
| C3 | `loading` longo demais | "Loading workspace settings" |
| C4 | `instanceConfig.body` não dizia a quem o nome serve | "**The name your team sees.** …" |

Restrições respeitadas: nenhuma frase expõe `producer`, `claim`, `Gateway`, `cache` ou `503`;
indisponível nunca é redigido como inexistente; nada afirma sucesso antes da confirmação.

## 2. `/design-critique` — 4 achados, todos aplicados

| # | sev | achado | correção |
|---|---|---|---|
| D1 | 🔴 | três nomes para o mesmo espaço no mesmo quadro | rótulo `account.workspaces` → "You can open" |
| D2 | 🟡 | configuração de espaço no meio das seções de conta | Workspace passou a ser a **última** seção |
| D3 | 🟡 | o ID aparecia **depois** do botão, como rodapé | ID passou a vir **antes** do campo, como contexto |
| D4 | 🟡 | subtítulo da página não mencionava o espaço | `account.subtitle` reescrito |

## 3. `/ux-heuristics` — o que ela achou que o resto não achou

### H1 · 🔴 severidade 4 — a tela AFIRMAVA inexistência numa falha transitória

`InstancePage` usava `t("instances.notFound")` — *"We couldn't find this instance in this
workspace."* — para **todo** `isError`, inclusive `503 temporarily_unavailable`. Quando o produtor
apenas não respondia, o produto dizia que a Instância não existe naquele workspace. A resposta
racional de quem lê isso é parar de procurar uma coisa que existe.

É exatamente a inversão que a CFG-03 já evitava do outro lado, e que a missão nomeia:
**indisponível ≠ inexistente**. O raciocínio do anti-oráculo estava correto para as **duas** causas
de `forbidden_or_not_found` — "de outro workspace" e "inexistente" colapsam de propósito — e foi
aplicado a uma terceira causa que não é nenhuma das duas.

**Corrigido** com a régua do catálogo (`problem.retryable`), não com comparação de string: o
catálogo espelha o Gateway e já sabe que `capacity_wait` também é transitório. Ler o `code` na mão
daria a esta tela uma segunda opinião sobre o que é transitório.

### H2 · 🔴 severidade 3 — o gate que devia pegar H1 era verde sobre uma página vazia

O teste `N` afirmava, literalmente, *"503 da Instância NÃO vira 'não encontrada'"*. Ele lia
`main.innerText()` no instante seguinte ao `goto` e checava a **ausência** de "not found".

Só que a política de retry transitório são 2 tentativas com backoff de 1 s e 2 s: naquele instante
a página ainda é esqueleto, `innerText` volta **vazio**, e negativa sobre string vazia passa
sempre. O gate esteve verde durante toda a implementação enquanto o estado terminal dizia o
contrário do que ele afirmava.

**Corrigido**: âncora positiva primeiro (o alerta tem de estar visível), massa não-vazia asserida
antes da negativa, e uma **contraprova `N2`** — o `404` do contrato continua dizendo "não
encontramos", e não oferece "tentar de novo". Sem ela, trocar o ramo inteiro por "indisponível"
passaria no `N` e apagaria o anti-oráculo.

### H3 · 🟡 severidade 2 — o estado de erro era um beco

O novo estado transitório nasceu só com "Tentar novamente". A rota `/instances/{id}` não tem item
próprio na navegação lateral: quem tentasse e desistisse ficava sem saída. **Corrigido** — duas
saídas, a que costuma funcionar primeiro e a desistência depois.

### H4 · 🟡 severidade 2 — capturas que não continham o que o nome prometia

`01`, `03` e `09` eram **byte a byte idênticas** (mesmo SHA-256). E `08`, publicada como "instance
unavailable", era um esqueleto cinza: ela disparava após `waitForTimeout(400)`, dentro da janela de
retry, e era a **única** das treze que não passava pela função `capturar` — justamente porque não
tinha conteúdo que provasse idioma. O desvio era o sintoma, e foi tratado como exceção aceitável.

**Corrigido**: `03` passou a ser um quadro alto que contém as duas coisas que o nome promete (o
nome velho da claim e o nome canônico do produtor); `08` passou a usar a âncora `Try again`, que só
existe quando o estado terminal renderizou; `09` foi **removida** e não substituída — `/dashboard/
settings` não emite requisição de Instância, então aquele quadro é idêntico ao de `01` por
construção, e os dois donos vivem em rotas diferentes. Nenhuma imagem única os mostra ao mesmo
tempo, e inventar uma tela que os juntasse seria inventar produto.

**12 capturas, 12 hashes distintos.**

### H5 · 🟡 severidade 2 — CORRIGIDA DEPOIS DO CLOSEOUT (ver §9)

Depois de um rename, a lateral e a lista "You can open" continuam exibindo o nome **velho**: as
duas leem a projeção da claim (`workspace?.name` do `WorkspaceSwitcher`), e a claim é projeção de
bootstrap que só envelhece — o token não é reescrito. O campo de configuração mostra o nome novo.
A pessoa vê o mesmo espaço com dois nomes e nenhuma explicação.

Não há correção do lado do front: refazer `/v1/me` devolve a mesma claim velha. A correção real é
de ciclo de vida de sessão/token, que é BD12 e não M42. **Registrado, não fingido.**

*(Os três nomes visíveis na captura `03` são dois em produção: `E2E Workspace` na lateral é
artefato do bypass `__SENTINELA_E2E_AUTH__`, que semeia a própria lista de memberships.)*

### H6 · 🟡 severidade 2 — PERMANECE, fora do escopo congelado

Trunk Test: quem quer renomear o espaço tende a clicar em **Workspaces** na navegação, que é uma
lista e não oferece o rename. A operação mora em Conta. Um ponteiro da lista para a configuração
resolveria — e a lista de Workspaces não é uma das duas superfícies congeladas desta missão.

### H7 · 🟢 severidade 1 — aceito

Sob indisponibilidade, a seção de Workspace mantém a linha "The name your team sees…" acima de um
estado onde não há campo. Descreve um controle que não está ali. É a linha que diz **o que a seção
é**, e removê-la tornaria o bloco anônimo — mantida de propósito.

## 4. As 10 heurísticas, verificadas uma a uma

| # | heurística | estado | evidência |
|---|---|---|---|
| 1 | Visibilidade do estado | ✅ | salvando/salvo/falhou/carregando/indisponível, todos com texto + `aria-busy` e `role` |
| 2 | Sistema ↔ mundo real | ✅ | zero `producer`/`claim`/`cache`/`503` na copy; captura 08 |
| 3 | Controle e liberdade | ✅ | rascunho sobrevive à falha; duas saídas no erro; nenhuma operação destrutiva |
| 4 | Consistência | ✅ | mesmo `CampoDeNome`, mesmas formas congeladas ("Save name", "Try again"), ID igual nos dois |
| 5 | Prevenção de erro | ✅ | nome vazio bloqueado antes do envio; salvar desabilitado sem mudança; trava síncrona de duplo envio |
| 6 | Reconhecer > lembrar | ✅ | nome corrente pré-preenchido; ID como contexto **antes** do campo |
| 7 | Flexibilidade | ✅ | caminho de teclado provado (campo → Tab → botão → Enter) |
| 8 | Minimalismo | ✅ | título, corpo, ID, campo, botão — nada mais por seção |
| 9 | Reconhecer/diagnosticar/recuperar | ✅ **após H1/H3** | as duas superfícies dizem o que houve e oferecem a volta |
| 10 | Ajuda contextual | ✅ | a linha de corpo responde ao medo real: "não afeta acesso nem análises" / "histórico, análises e referência continuam" |

Além das dez:

| eixo | estado | evidência |
|---|---|---|
| Acessibilidade | ✅ | axe `wcag2a`+`wcag2aa` **0 violações** nas duas superfícies; rótulo ligado por `useId`; alvos `min-h-11` |
| Responsividade | ✅ | sem rolagem horizontal em 1280 / 768 / 375, nas duas |
| Independência dos dois donos | ✅ | tipos e chaves próprios; gate estrutural; captura 04 mostra Idioma vivo com Workspace fora |
| Claim desatualizada | ⚠️ | não vence o produtor (teste A/B); divergência residual = **H5** |
| Contenção de falha | ✅ | `F` (espaço fora, resto vivo) e `N` (Instância fora, página inteira contida) |

## 5. Score

| momento | score |
|---|---|
| Antes das correções | **6,5 / 10** — uma superfície afirmava inexistência numa falha transitória, com gate verde por cima |
| **Depois das correções** | **9,2 / 10** |

**Gate congelado: `>= 9.0` — SATISFEITO.** Sem waiver.

Os 0,8 que faltam são **H5** e **H6**: dois achados de severidade 2 cuja correção fica fora das
duas superfícies congeladas desta missão. Não foram convertidos em nota por decreto.

## 6. Provas depois das correções

| medida | resultado |
|---|---|
| Typecheck | **APROVADO** — 6 projetos, 354 arquivos, cobertura completa |
| Playwright | **221/221** (eram 219; `N2` e a captura `03` viraram testes próprios) |
| axe (`wcag2a`+`wcag2aa`) | **0 violações** |
| Lint | 23 problems (9 erros, 14 warnings) — **delta ZERO** |
| Capturas | **12**, 12 hashes distintos |
| Vitest | **109 passed · 5 failed · 1 skipped** (115) — ver §7 |

## 7. As 5 suítes vermelhas NÃO são desta missão — medido, não deduzido

`export-download-client`, `progress-client`, `timeline-client`, `contract-authority` e
`fixtures-presas-ao-schema`: 12 testes, com a raiz em *"AUTORIDADE DO CONTRATO AMBÍGUA: existem
múltiplas origens com conteúdo DIFERENTE e ninguém declarou"*.

Medido com `git stash` sobre a árvore limpa do HEAD `52598d3`: **as mesmas 5 suítes, os mesmos 12
testes, sem nenhuma alteração desta missão**. Nada aqui toca contrato, fixtures ou selo — as
mudanças são copy, um ramo de erro, specs e capturas.

O `DOC-CLOSE-IMPLEMENTACAO.md` registrou **115/115** e aquilo era verdade quando foi medido. A
divergência de contrato entrou depois, de fora deste repositório. **Fica aberto, e não é fechado
por esta missão.**

## 8. Estado

| item | estado |
|---|---|
| `/ux-copy` | **EXECUTADA** · 4 achados · 4 aplicados |
| `/design-critique` | **EXECUTADA** · 4 achados · 4 aplicados |
| `/ux-heuristics` | **EXECUTADA** · 7 achados · 5 corrigidos · 2 registrados fora de escopo |
| Escopo congelado | respeitado — só CFG-03 e CFG-04 |
| Release | **não promovido**; sem push, sem deploy, sem Railway |

---

## 9. Microcorreção posterior — o rótulo do espaço no shell

**O Quality Closeout permanece PASS, score 9,2.** Ele não é reaberto nem recalculado: a
composição não mudou, nenhuma string mudou, e a mudança é de **proveniência do rótulo**.

O que a microcorreção fecha é o **H5** registrado acima como "permanece". O achado estava certo no
diagnóstico e errado numa premissa: eu concluí que não havia correção do lado do front porque
tentei consertar a **claim** — e a claim é mesmo irreparável aqui, o token não é reescrito. A
correção não era consertar a claim: era **parar de perguntar a ela** o que o produtor já respondeu.

### O que mudou

`useNomeDoWorkspace(workspaceId, nomeDeBootstrap)` — uma leitura derivada sobre a **mesma
`queryKey`** que a CFG-03 já materializou. Sem store novo, sem `localStorage`, sem sincronização
com o provedor de identidade, sem uma segunda requisição: o `PATCH` já escreve nessa chave, então a
lateral acompanha o rename sem ir à rede de novo.

Três superfícies passaram a lê-la: o rótulo do escopo na lateral, o item **ativo** do seletor de
workspace, e a linha `You can open` da seção de identidade. As demais entradas da lista continuam
com a projeção da claim — para elas nenhum produtor foi consultado, e identificar é exatamente o
papel que a claim tem.

### A precedência, e o que cada ramo protege

| situação | nome exibido |
|---|---|
| produtor resolvido | **do produtor** |
| produtor ainda não resolvido | bootstrap, que é identificação e não configuração |
| produtor cai **depois** de resolver, na mesma sessão | continua o **do produtor** — não regride |
| recarga com o produtor fora | bootstrap: é uma resolução nova, não uma degradação |

### O limite desta prova, registrado para ninguém lê-la como mais forte

A primeira versão do gate `W6` derrubava o produtor e dava `page.reload()`. Falhou — e o **teste**
é que estava errado: um reload descarta o cache em memória, então ele não é "caiu depois de
resolver", é uma resolução do zero, que a regra permite servir com bootstrap. Um gate que
confundisse as duas coisas só passaria se o nome fosse persistido fora da memória — ou seja,
exigiria justamente o `localStorage` como autoridade que o `W4` proíbe.

### Gates de browser (`W1`–`W7`)

`W1` bootstrap A + produtor B → lateral B · `W2` rename com token velho → Configurações e lateral
juntas, **um** `GET`, identidade intacta · `W3` reentrada resolve o produtor · `W4` zero
`POST/PATCH/PUT` em `/v1/me`, zero Keycloak, e nem `localStorage` nem `sessionStorage` contêm o
nome · `W5` produtor fora antes de resolver: bootstrap identifica e **não** vira valor confirmado ·
`W6` queda depois de resolver: não regride · `W7` a claim segue dando identidade e acesso, e o nome
velho **não sobrevive em pixel nenhum**.

**Contraprova de instrumento:** revertida a linha do switcher para `workspace?.name`, `W1`, `W2`,
`W3` e `W6` falharam — os gates matam a regressão, não decoram.

### Efeito nas capturas

Todas as 12 foram refeitas: a lateral agora diz o nome canônico. A captura `03` mudou de sentido —
existia para mostrar a divergência **na tela**, que é o que esta correção elimina, e passou a ser
`03-desktop-workspace-reconciled-en.png`: a tela inteira sob um nome só, com a claim ainda velha no
fio. A `04` saiu **byte a byte idêntica**, e isso é a checagem certa: com o produtor fora não há
nome canônico, então a lateral fica em bootstrap exatamente como antes.

### Provas

Typecheck **APROVADO** · Playwright **228/228** · axe **0 violações** · Lint **23 problems —
delta ZERO** · Vitest **109 passed / 5 failed / 1 skipped**, as mesmas 5 suítes externas da §7,
inalteradas · **12 capturas, 12 hashes distintos**.

`shell-m25` passou a montar `<CanonicalClientProvider>` com um cliente que **recusa**: o shell
agora depende do cliente canônico, e recusar mantém aqueles casos medindo o que sempre mediram (o
nome de bootstrap) em vez de mascarar a mudança.

### O que NÃO foi feito

Nada de token, Keycloak, `/v1/me`, Workspace API, membership, `workspace_id` ou semântica de
Settings. **H6** (o rename não é alcançável pela lista de Workspaces) continua aberto e fora de
escopo.

---

### **M42 · CFG-03/CFG-04 — CLOSED · QUALITY GATE PASS · 9,2**

**Próximo checkpoint:** M44 · COMMUNICATION + REENTRY — SCENARIO MATERIALIZATION.
