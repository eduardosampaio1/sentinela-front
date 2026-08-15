# M42 · CFG-03 / CFG-04 — DOC-CLOSE da implementação

Fechamento local. **Sem push, sem deploy, sem Railway.**

> **Correção posterior, e ela fica registrada.** Este documento declarou `M42 · CLOSED` **sem ter
> executado** os três gates visuais obrigatórios — `/ux-copy`, `/design-critique` e
> `/ux-heuristics`. Eles não foram medidos, e o documento nem sequer os listava como pendentes, o
> que faz qualquer leitor concluir que a qualidade visual havia sido avaliada.
>
> Foram executados depois, em `DOC-CLOSE-QUALIDADE.md`, e acharam um defeito de **severidade 4**
> que as quatro suítes verdes e as treze capturas deste fechamento não acharam: sob `503`, a tela
> da Instância afirmava que ela **não existe neste workspace** — e o teste que devia pegar isso
> era verde porque media a página durante a janela de retry, quando ela ainda está vazia.
>
> Os números das tabelas abaixo são os que valiam **naquele** momento. Os números vigentes estão
> no fechamento de qualidade.

---

## 1. A frase de produto, entregue

> *"O usuário pode consultar e alterar o nome do Workspace atual e o nome de uma Instância, sem
> alterar suas identidades."*

E **só** isso: sem criar espaço, sem excluir, sem membership, sem papéis, sem tema, sem
`description`/`tags`/`slug` na Instância, sem baseline como configuração genérica.

## 2. Onde cada configuração mora, e por quê

**CFG-03** na superfície canônica de Configurações (`/dashboard/settings`), como seção própria ao
lado da identidade (CFG-01) e do idioma (CFG-02).

**CFG-04** na página da Instância (`/instances/{id}`), entre a régua de baseline e o histórico.

A separação é decisão, não conveniência: renomear uma Instância exige saber **qual**, a página de
Configurações da conta não tem esse contexto, e criar um seletor só para ela inventaria superfície
sem authority e faria a pessoa escolher duas vezes. Compor duas configurações numa experiência não
obriga a empilhá-las na mesma rota — obriga a que cada uma esteja onde seu contexto existe.

## 3. Dois donos, e nenhum objeto compartilhado

`WorkspaceView` e `InstanceView` são tipos **próprios**. Não há `RenamableEntity`, `settingsStore`
nem `configurationService`: as duas têm um campo `name` e param aí — donos diferentes, operações
diferentes, escopos diferentes (`get_workspace` não leva `workspace_id` na query; `get_instance`
leva). Há gate estrutural provando que a mutação de um não toca a chave de cache do outro.

`CampoDeNome` compartilha **desenho**, não estado: sem query, sem mutation, sem cliente. Cada seção
mantém o próprio `confirmado`/`rascunho`/`salvando`/`erro`.

## 4. O nome do espaço vem do produtor

`GET /v1/workspaces/{id}` é a autoridade. A claim de `/v1/me` carrega um `name` que é projeção de
**bootstrap** e envelhece após um rename — o contrato diz isso por escrito. A seção de configuração
**nem pede** `/v1/me`: ela não é fonte de nome, então não há por que buscá-la.

Provado no browser com os dois respondendo `200` e divergindo, e provado **depois** do `PATCH`: a
claim continua velha, porque o token não é reescrito, e a tela não volta para ela.

Sob `503`, a seção fica indisponível com caminho de retry — e **não** cai para o nome da claim, nem
como "último valor conhecido". Um valor exibido no lugar do nome do espaço é lido como sendo o nome
do espaço.

## 5. Provas

| medida | resultado |
|---|---|
| Vitest | **115/115 arquivos** · 22 casos novos de M42 |
| Playwright | **219/219** · 11 de CFG-03 + 9 de CFG-04 + 9 de captura |
| axe (`wcag2a`+`wcag2aa`) | **0 violações** |
| Typecheck | **6 projetos, 354 arquivos, 0 erros** |
| Lint | 23 problems (9 erros, 14 warnings) — **delta ZERO**, baseline histórico |
| Mutação | **24/24 mortas pelo gate nomeado** |
| Capturas | **13**, com o idioma provado pelo conteúdo renderizado |

## 6. A campanha de mutação, e o que ela custou de verdade

Primeira rodada: **13/24**. Última: **24/24**. Entre uma e outra, quatro classes de defeito:

**(a) O driver mentia na direção pior.** `vitest -t GATE_QUE_NAO_EXISTE` seleciona zero casos, sai
`0`, e a mutação era registrada como **SOBREVIVEU**. Duas passaram por isso. Zero teste selecionado
não é evidência de nada — agora vira `GATE_VAZIO`.

**(b) Gates que não existiam.** Três mutações não tinham dono: nenhuma prova cobria "URL interna no
Front", "os dois donos não se arrastam" e "a identidade no cache é a do produtor". Foram criados
(`F1`, `F2`, `F3`, `G1`–`G4`).

**(c) Mutações inertes.** Uma prop que ninguém lê, um `const` que ninguém usa, uma invalidação de
chave que nenhuma tela consulta. Reescritas para atacar o que o invariante realmente diz.

**(d) Defesa em profundidade escondendo a mutação.** A que dizia "escrita recusada aparece como
salva" sobrevivia porque a guarda `confirmadoAgora && !mudou` do `CampoDeNome` a neutralizava.
Repontada para o sinal de falha, que é o que a seção usa para não mentir.

**Três mutações só são observáveis por gate ESTRUTURAL**, e isso está registrado: invalidar uma
chave que ninguém consulta não gera requisição, e escrever identidade derivada num cache que a tela
não lê não muda pixel nenhum. Não são inofensivas — são **invisíveis**, que é pior: a primeira tela
que passar a consultar aquela chave herda o defeito pronto.

## 7. Defeitos encontrados durante a implementação

**Um de produto, achado só pelo browser:** `useRenomearWorkspace` escrevia no cache com a chave do
`workspace_id` que o **servidor** devolveu, e `useWorkspaceConfig` lê pela chave do **escopo
canônico**. Quando as duas strings não coincidem, a escrita cai numa chave que ninguém lê e a seção
fica para sempre no valor anterior — com `200` na rede e sem erro na tela. O vitest não podia pegar:
lá os dois valores são iguais por construção do teste. É a diferença entre provar o componente e
provar a composição.

**Cinco de instrumento**, todos registrados no código onde aconteceram: `vi.mock` içado capturando o
`fetch` antes do MSW; `require` inexistente em ESM ao injetar o axe; prova de idioma ancorada num
elemento oculto da navegação mobile; comparação de arrays por identidade; e a tentativa de subir
`ACIMA_DO_ORCAMENTO` de 45 para 47 — eu media a razão PT/EN por caracteres e o gate mede outra
coisa, então **a régua do gate é a autoridade, não a minha aritmética**.

**Dois de copy, achados por gates existentes:** "de novo" viola a forma congelada do produto
(`Tentar novamente`), e meu arquivo de teste **citava** literais de rota interna que o gate `G-R8`
varre — os literais passaram a ser montados, em vez de o gate ser enfraquecido.

## 8. B1 · antes e depois

**8 → 5.** As três operações de configuração saíram de `SEM_CLIENTE_NO_FRONT` com o cliente
entregue no mesmo commit, que é o que a lista prescreve. Restam as quatro de Subscription (**M44**)
e a órfã `POST /v1/instances`. `SEM_CLIENTE_E_SEM_MISSAO_DONA` continua em **1** — o B1 propriamente
dito não mudou, e a órfã continua órfã porque nada mudou para ela.

## 9. Os três gates que estavam vermelhos

`contract-operations`, `timeline-client` e `fixtures-presas-ao-schema` já estavam vermelhos no
`develop` antes desta missão — medido com `git stash`, não deduzido. Corrigidos na materialização de
scenarios (registro de divergência e selo M17), e **verdes desde então**. O contrato não mudou na
implementação; o selo não foi tocado.

## 10. Preservado, não tocado

12 capturas EN-only da M40 · `slow`/`modelo_real` · 9 testes Postgres `:5432` · as **3 falhas
antigas** em `POST /v1/analyses/{id}/data` (`PRE-EXISTING · UNRELATED · STILL OPEN`) · M44 Front.

Dívidas de release intactas: `ACCOUNT RELEASE MATERIALIZATION PENDING` · `WORKSPACE RELEASE TOPOLOGY
AUTHORITY REQUIRED` · `DISPATCHER RELEASE TOPOLOGY REASSESSMENT REQUIRED`.

## 11. Release

Front implementado **localmente**. Workspace backend **local only**. Topologia de release do
Workspace **pendente**. **Não promovido** a produção.

## 12. Estado

| item | estado |
|---|---|
| BD12 | CLOSED LOCALLY |
| BD13 | CLOSED |
| BD14 | CLOSED LOCALLY |
| **CFG-03** | **DELIVERED LOCALLY** |
| **CFG-04** | **DELIVERED LOCALLY** |
| **M42** | **CLOSED** |
| M43 | CLOSED AS PROOF |
| M44 | BACKEND READY · FRONT NOT STARTED |
| M45 | FRONT / QUALITY |

### **M42 · CFG-03/CFG-04 — CLOSED**

**Quality closeout: skills executadas e gate satisfeito** — `/ux-copy`, `/design-critique` e
`/ux-heuristics` rodadas, 15 achados, 13 corrigidos, score final **9,2** contra gate `>= 9.0`.
Registro completo em [`DOC-CLOSE-QUALIDADE.md`](./DOC-CLOSE-QUALIDADE.md).

**Microcorreção posterior ao closeout:** o rótulo do espaço no shell exibia `claim.name` e ficava
velho após um rename — o mesmo espaço com dois nomes na mesma tela. Corrigido pela query canônica
que a M42 já materializava. O score **9,2 permanece**: composição e copy não mudaram.

**Próximo checkpoint:** M44 · COMMUNICATION + REENTRY — SCENARIO MATERIALIZATION.
