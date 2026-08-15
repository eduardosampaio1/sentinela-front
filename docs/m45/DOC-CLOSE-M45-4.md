# M45.4 · TWO-VIEW HARDENING (ARGOS · Analytics · comparação) — DOC-CLOSE

Fechamento local. **Sem push, sem deploy, sem Railway.** A M45.4 é uma tranche da umbrella M45; o
Experience Freeze é da **M46**.

---

## 1. Por que esta tranche existia

A M45.1 mediu o crédito real das 40 missões anteriores e concluiu: **E6 (ARGOS), E7 (Analytics) e
E8 (Comparação) receberam NO CREDIT** — a matriz transversal nunca visitou essas rotas.

Elas não estavam sem cobertura. A F6 entregou as duas visões com suíte própria, e a M39 entregou a
comparação com a sua. Estavam sem **passada transversal** — e a diferença entre as duas coisas é o
assunto inteiro deste documento.

> **REGRESSÃO COBERTA ≠ EXPERIÊNCIA ENDURECIDA.**

## 2. Dez defeitos de produto, todos em superfícies verdes

| # | Defeito | Onde |
|---|---|---|
| 1 | A recusa do ARGOS anunciava em `role="alert"`; a ausência irmã, em `status`. Mesmo recado, polidez diferente | `ArgosView` |
| 2 | `404 result_not_available` caía no erro genérico da comparação | `CompareAnalysesPage` |
| 3 | A copy prometia *"Tente novamente"* e a tela só oferecia um link de volta (`acao="voltar"`) | `compare.error` |
| 4 | A recusa não dizia o que restava acessível; o estado irmão dizia | `ArgosView` |
| 5 | Vocabulário de contrato vazando: *"a resposta não declarou a versão do documento"* | `argos.refused.*` |
| 6 | Em PT, escala virava **"régua"** — que nesta casa é a palavra do baseline | `compare.reason.escala` |
| 7 | As MESMAS duas seções em ordem oposta entre a visão e a comparação | `ComparacaoArgos` |
| 8 | `reason_code` cru impresso justamente quando havia motivo; a palavra ficava para o caso mudo | `AnalyticsView` |
| 9 | A comparação era um beco: mostrava que B estava pior e não dava rota para B — prometendo, no texto, que cada análise seguia disponível | `CompareAnalysesPage` |
| 10 | "Comparar" era oferecido com **uma única** análise: modo que nunca termina | `AnalysesListPage` |

Nenhum deles é redesign. Os dez são o mesmo tipo de coisa: **a tela promete o que não entrega**, ou
**diz a mesma coisa de dois jeitos diferentes em dois lugares**.

## 3. Nove defeitos de INSTRUMENTO — o achado maior

### 3.1. Duas specs de captura sem uma única asserção

`e2e/shots.spec.ts` e `e2e/m39-shots.spec.ts` disparavam `page.screenshot` depois de
`waitForTimeout(600..800)` e mais nada. **Um arquivo de teste sem asserção não pode falhar.** As 29
imagens das duas visões e da comparação eram publicadas como evidência e nada verificava que
mostravam qualquer coisa.

E duas delas mentiam:

- **`m39-sem-v3-*.png`** documentava, sob esse nome, o **erro genérico** — e não o estado "um lado
  não tem documento ARGOS". A tela estava errada de verdade (defeito 2), e a captura publicava o
  erro como se fosse o estado.
- **`m39-selecao-*.png`** fotografava uma lista **vazia**: nenhum item, nenhum modo de seleção,
  nada para selecionar.

### 3.2. `evo02-m39-comparacao.spec.ts` estava verde sobre uma tela que não comparava

O achado mais grave, e ele só apareceu ao escrever a campanha de mutação.

A spec semeava `MASSA_A`/`MASSA_B` — documentos `analysis-result-v1` — no seam
`__sentinela_result__`. Desde a M39 a comparação lê o documento **v3**, e o seam dele é outro:
`__sentinela_result_v3__`. O produtor recusava com razão, e a tela mostrava *"um dos lados não tem
documento ARGOS"* — comportamento CERTO para o que estava sendo servido.

Suas asserções de ausência — *nenhuma seta, nenhum delta, nenhum "previous"* — rodavam sobre um
aviso de indisponibilidade, onde nada disso poderia aparecer de qualquer jeito. **Massa vazia
sempre passa.**

O que impedia alguém de notar era a espera: `getByRole("heading", { level: 2 })` **sem escopo**
casava o "Compare analyses" do shell, **fora do `main`**. O `h2` existia; a comparação, não.

O cabeçalho do próprio arquivo dizia *"provar a apresentação exige o documento completo"*. A
intenção estava escrita; o seam envelheceu embaixo dela.

### 3.3. Um gate da M36 contradizia a M45.0 há três missões — e era flaky

`instances-m36.spec.ts` afirmava *"nenhum item de Instâncias na sidebar"* com `toHaveCount(0)`, que
aprova no instante em que o locator não casa — **inclusive antes de a nav renderizar**. Verde quando
ganhava a corrida, vermelho quando perdia: 1 em 3 nesta máquina. A M45.0 pôs o item de propósito
(`c95a4eb`), porque `/instances` era superfície REAL sem entrada no shell.

O contrato da sidebar já tem dono (`shell-m25.test.tsx`). Dois gates sobre a mesma coisa, um
desatualizado, é como a contradição sobreviveu. Ficou um. A metade que ainda vale — criar Instância
não tem superfície autorizada — ganhou âncora positiva antes da negativa.

### 3.4. Um teste que não media o que o nome promete

`AnalyticsView.test.tsx` tinha o caso *"estatística não publicada mostra o motivo, não um número"*
afirmando **só** o código cru. A inversão do defeito 8 passava por ele intacta.

### 3.5. `tsc -p tsconfig.json` na raiz checa ZERO arquivos

A raiz tem `"files": []`. Rodei esse comando duas vezes nesta sessão e li o silêncio como aprovação
— **não era medição nenhuma**. Um import quebrado (`../notices` em vez de `./notices`) passou por
ele e só caiu no browser. O comando é `npm run typecheck`: 6 projetos, 366 arquivos, cobertura
completa.

### 3.6. Três correções desta missão ficaram sem gate

Ordem das seções, `reason_code` e `stillAvailable` estavam corrigidos e desprotegidos — exatamente o
padrão que esta tranche passou inteira achando. Ganharam gate **antes** da campanha.

### 3.7. Duas mutações minhas foram ruins antes de serem boas

Uma zerava `semA` quando quem faltava era o lado **B**; outra trocava o `id` da seção, que alimenta
`aria-labelledby` e não a **ordem**. Nos dois casos o sobrevivente era a **mutação**, não o defeito.

### 3.8. As specs de captura são gate E produtoras de artefato

Rodar a suíte reescreve as imagens versionadas, e elas entram no commit seguinte sem ninguém
decidir. Aconteceu duas vezes aqui. Uma delas era legítima: capturas de M41/M42/M44 mostravam um
shell **sem** `/instances`, que a M45.0 acrescentou depois — a evidência estava velha.

### 3.9. Prettier não é ferramenta deste repo

Não há `.prettierrc` nem chave `prettier` no `package.json`. `npx prettier --write` reformatou um
arquivo inteiro: 130 inserções, 52 remoções de puro formato. Revertido; a correção foi reaplicada à
mão e o diff ficou 22/1.

## 4. As duas visões ganharam nome no catálogo

`ARG-01` e `ANL-01` eram as **únicas** superfícies REAL sem nome invocável — e não sem cobertura: a
F6 entregou as duas com a massa montada dentro da própria spec, o que prova a experiência e deixa o
catálogo vazio. O gate 2 mede **nome**, não cobertura, e por isso as duas passavam despercebidas.

Três entradas novas, declaradas no Blueprint §11 **antes** de chegarem ao código:
`argos-document-present`, `argos-document-absent`, `analytics-view-present`. Contagens: **62 → 65**
e **57 → 60**, movidas no mesmo commit — a catraca funcionando.

O `analytics-view-present` **não** serve `/result`, e a ausência é a prova: um scenario que servisse
as duas rotas deixaria passar uma tela que lê o documento errado.

O `catalogo.ts` passou de 1000 linhas com elas dentro. Mesmo movimento da M44: os três cenários
foram para `two-view.ts`, e os documentos das duas visões para `documentos.ts` — porque ganharam um
segundo consumidor, e mantê-los no catálogo obrigaria `two-view.ts` a importar **valor** de quem já
o importa de volta. Ciclo real, e não o `import type` inócuo de `assinaturas.ts`.

## 5. Mutação — 9/9

`docs/m45/mutacoes_m45_4.py`. Uma mutação por correção; cada uma morta pelo **gate nomeado**, nunca
por acidente de compilação.

| # | Mutação | Gate |
|---|---|---|
| 1 | a recusa do ARGOS volta a interromper | `indisponibilidade é anunciada como estado` |
| 2 | a recusa para de dizer o que resta acessível | `a recusa aponta o que continua acessível` |
| 3 | o 404 volta a cair no erro genérico | `m39-sem-v3` |
| 4 | a comparação volta a abrir por indicadores | `a ordem de leitura é a mesma da visão ARGOS` |
| 5 | comparar volta a ser oferecido com uma análise | `comparar não é oferecido quando é impossível` |
| 6 | o código cru volta a substituir a palavra | `estatística não publicada mostra o motivo` |
| 7 | os dois lados voltam a ser texto morto | `a ordem A/B é a da URL` |
| 8 | a montagem do evo02 perde a massa v3 | `comparação compatível` |
| 9 | um scenario nomeado deixa de ser reproduzível | `nenhum nome órfão` |

Disciplina herdada da M45.0: gate validado no fonte **antes** de rodar; âncora ausente ou ambígua é
falha do instrumento, nunca morte; `GATE_VAZIO` separado de morte; CRLF normalizado na âncora;
restauração por snapshot e verificação de árvore limpa ao fim.

## 6. Stack de qualidade — gate ≥ 9,0, sem waiver

| Passada | Nota | Achados |
|---|---|---|
| `/ux-copy` | **9,3** | defeitos 3, 4, 5, 6 |
| `/design-critique` | **9,2** | defeitos 7, 8, 9 |
| `/ux-heuristics` | **9,1** | defeito 10 |

## 7. Provas

| Prova | Resultado |
|---|---|
| `npm run typecheck` | 6 projetos · 366 arquivos · cobertura completa · raiz inerte |
| `eslint .` | ~~sem erro~~ — **afirmação FALSA, corrigida na M45.2**: o repo tem 9 erros pré-existentes. Ver a [errata](./DOC-CLOSE-M45-2.md) §9.1 |
| Vitest | **117/117** arquivos · **1652/1652** testes |
| Playwright | **292/292** |
| Mutação M45.4 | **9/9** mortas pelo gate nomeado |
| axe (ARGOS e Analytics) | 0 violações aplicáveis |
| Responsivo | 0 estouro em 1280 / 768 / 375, por **geometria** |
| Idioma | PT e EN provados por conteúdo renderizado |
| Capturas | 29, todas por provador com estado terminal + idioma |

**A origem do contrato precisa ser declarada nesta máquina.** As duas candidatas divergem —
`sentinela-facts` tem 27 operações, o espelho em `sentinela` tem 12, parado em
`fix/argos-analysis-pipeline` —, e o resolvedor se recusa a escolher em silêncio, que é o que ele
existe para fazer. Com `SENTINELA_CONTRACT_ORIGIN=../sentinela-facts/docs/contracts` a suíte sai de
1589 com 11 skips para **1652 sem skip**. Skip não é verde.

## 8. Dívidas — enumeradas, nenhuma mascarada

| Dívida | Por que não foi feita aqui |
|---|---|
| `statistic_id` (`top_10_share`, `gini`) sai cru | Depende de um registro de descritores que não existe para estatísticas. Inventá-lo é feature, não endurecimento — e `rotuloDe` do ARGOS existe justamente para não adivinhar rótulo |
| Três nomes divergentes entre ANL-01 e RES-01: *"Time series"/"Séries"* vs *"Over time"*; *"Demais"* vs *"Outros rótulos"*; *"Export"* vs *"Export package"* | O segundo lado é RES-01, e a tranche dona é a **M45.3** |
| A lista não tem busca nem filtro | Item 6 do teste do porta-malas, e falha no produto inteiro. É feature |
| A comparação é ARGOS-only por decisão da M39 e não diz isso | Acrescentar explicação de ausência numa tela bem-sucedida é ruído; decisão de owner |
| Capturas versionadas mudam ao rodar a suíte | Gate 12 (visual regression) foi congelado como **N/A** pelo owner na M45.0 |

## 9. Commits

`4134e4c` · `8db8967` · `06fcc9c` · `abed01f` · `51ffcd9` · `9eda059` · `b7dbafc` · `1ffbe07`

Todos locais. **Zero push.**

## 10. Estado

### **M45.4 · TWO-VIEW HARDENING — CLOSED · 10 defeitos de produto · 9 de instrumento · mutação 9/9**

A umbrella **M45 segue OPEN**. Abertas: M45.2 (jornada, P0), M45.3 (resultado, P0), M45.5
(Instância e baseline, P1), M45.6 (fundação, P2), M45.7 (público, auth e shell, P1), M45.8
(consolidação, fecha a umbrella).
