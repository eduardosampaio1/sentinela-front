# PROPOSTA · NAV-01 — Paleta de comandos

> **Isto é uma PROPOSTA, não uma autoridade.** O `EXPERIENCE-BLUEPRINT-V1.md` é a autoridade de
> mapa — *"quais superfícies existem"* —, e acrescentar uma superfície a ele é ato do owner. Este
> documento está escrito no formato dele e pronto para ser colado em **§4** e **§16** quando (e se)
> for aprovado. Nada foi implementado.
>
> Origem: a V4 do Molde. É a **única** peça dela genuinamente ausente do produto — o resto ou já
> existia (parcialidade, régua, tooltips, portas), ou entrou na troca de paleta, ou foi apagado
> por estar errado (a segunda run).

---

## 1. O que ela é, e a escolha que define o custo

Um campo de busca sobre `⌘K` que salta para uma **região da análise aberta** ou para um dos quatro
destinos do shell.

A pergunta que decide tudo é **o que ela indexa**, e há três respostas possíveis:

| escopo | valor | custo | veredito |
|---|---|---|---|
| **(a)** só a navegação global | ~nenhum: a lateral tem **4** itens, todos visíveis | baixo | ❌ atalho para o que já está na tela |
| **(b)** as saídas da análise ABERTA + a navegação | alto: o Diagnóstico tem **12 regiões** e até **37** saídas publicáveis, e quem lê está auditando **uma** | baixo — não precisa de dado novo | ✅ **é esta** |
| **(c)** buscar entre análises por id/nome | alto | **bloqueado** — `GET /v1/analyses` lista com paginação e **não publica operação de busca**; filtrar no cliente afirmaria completude sobre a página que ele tem | ❌ exige delta de backend |

**A escolha (b) muda a natureza da superfície:** ela não é cromo global, é **acelerador das duas
visões da análise**. Fora de `/analyses/:id/*` ela tem apenas os quatro destinos — e por isso **não
abre** ali. Isso é o que derruba o custo: nenhuma fonte de dados nova, nenhum scenario novo,
nenhuma operação nova.

---

## 2. A entrada de inventário — para colar em §4

Sugestão: **§4.11 Navegação transversal — 1 superfície**. Prefixo `NAV` está livre (usados: AN,
ANL, ARG, AUTH, CFG, COM, EVO, HOME, INST, RES, WS).

| id | nome / objetivo | objeto | rota pretendida | AS-IS | entrada → saída | CTA principal | estados | fonte de verdade | contrato |
|---|---|---|---|---|---|---|---|---|---|
| **NAV-01** | **Paleta de comandos** — alcançar uma região da análise sem rolar | Analysis (a aberta) | **sem rota** — diálogo sobre a visão atual | — | `⌘K`/`Ctrl+K` ou gatilho na barra → âncora da região, ou rota do shell | — (a lista é o comando) | fechada · aberta vazia · aberta com termo · **sem resultado** | o **view model já carregado** da visão atual + `PRIMARY_NAV` | **REAL** — não consome operação nenhuma |

**Campos que o inventário pede e que aqui são vazios de propósito:** deep link (não tem — é
diálogo, e um `?paleta=aberta` afirmaria que o estado é endereçável), refresh (fecha), responsive
(§4 abaixo), scenarios (**nenhum** — ver §5).

---

## 3. O que ela NÃO faz — e cada linha é um gate que já existe

| não faz | por quê | quem cobra |
|---|---|---|
| **não busca no backend** | não há operação de busca publicada. Um campo que parece global e vê uma página seria pior que nenhum | `operationInventory` |
| **não ordena por relevância** | ranking é aritmética e é priorização decidida no navegador | `backend-first-result` (`ARITMETICA_ANALITICA`, `VEREDITO_OU_PRIORIZACAO`) |
| **não inventa destino** | todo item aponta para uma âncora `<h2 id>` que existe ou uma rota registrada. Âncora morta é pior que ausência de índice | mesmo princípio de `IndiceDeRegioes` (M31) e `matriz-cobre-o-router` |
| **não traduz nome de métrica** | decisão congelada. Ela indexa o nome publicado e casa também por **apelido** em PT, sem exibi-lo | §15 |
| **não é o único caminho** | é acelerador (Nielsen 7). Toda região continua alcançável rolando, e no Analytics pelo índice | §16 |
| **não substitui as portas do Diagnóstico** | `?porta=` e `?dominio=` são navegação com deep link e histórico. A paleta salta **dentro** da porta aberta; não troca de porta | `two-view-gates` |

---

## 4. Contrato de acessibilidade — para colar em §16

| componente | requisitos mínimos |
|---|---|
| `PaletaDeComandos` | `role="dialog"` com **foco preso** e devolvido ao gatilho no fechamento · `Esc` fecha · lista com `role="listbox"`/`option` e `aria-activedescendant` (**nunca** `role="tab"`, nem foco item a item) · `aria-live="polite"` na contagem de resultados · alvo ≥ 44×44 em cada item · gatilho **visível na barra**, porque atalho de teclado sozinho não é descoberto · sem resultado, diz o que fazer — nunca uma lista vazia muda |

O `Esc`, o foco preso e o retorno de foco **vêm de graça**: `@radix-ui/react-dialog` já está
instalado e `src/components/ui/dialog.tsx` já existe. **Não há dependência nova** — em particular,
`cmdk` não entra.

---

## 5. Custo, medido

| item | tamanho | nota |
|---|---|---|
| componente | ~180 linhas | diálogo Radix + listbox; nada de behavior à mão |
| índice da paleta | ~60 linhas, puro, em `result/` | deriva do view model já carregado. **Fora de `ui/`**, porque casar termo é `filter` e o cadeado `backend-first-result` proíbe aritmética ali — foi exatamente o que me pegou no `MapaDeProcedencia` |
| i18n | **8 chaves × 2 dicionários** | rótulo, placeholder, contagem, sem-resultado, grupos ("ir para", "nesta análise"), gatilho, atalho |
| testes | ~5 casos | abrir/fechar por teclado · foco devolvido · seta+Enter navega · sem resultado diz o que fazer · **nenhum item aponta para âncora inexistente** |
| scenarios (§11) | **zero** | não consome operação. É a economia que a escolha (b) compra |
| gates a atravessar | 8 | `i18n-canonical` · `i18n-paridade` · `design-tokens-unico` · `design-boundary` · `anti-monolito` · `two-view-gates` · `backend-first-result` · `lint-catraca` |

**Estimativa: uma missão pequena.** O maior risco não é técnico — é de escopo: a tentação de
transformar (b) em (c) no meio do caminho, e aí a superfície passa a precisar de um delta de
backend que ninguém pediu.

---

## 6. Responsive — §14

Abaixo do breakpoint de tablet o atalho de teclado não existe, então o **gatilho na barra é a única
entrada** e não pode ser escondido. A lista ocupa a folha inteira (padrão `sheet.tsx`, que já
existe) em vez de um diálogo centrado, e o campo recebe foco na abertura — sem `autoFocus` no
desktop, onde roubar o foco quebra quem chegou por `Tab`.

---

## 7. Por que ela vale, em uma frase

O público destas duas telas é quem abriu a análise **por causa de um número**. Hoje, achar aquele
número entre 12 regiões custa rolar até topá-lo — e é a 4ª pergunta do trunk test de Krug sem
resposta. A paleta é a resposta curta, e é a única forma de servir o especialista sem encher a tela
para o resto.

---

## 8. Decisão pendente

Só uma, e é sua: **(b) entra, (c) fica registrada como delta, (a) é descartada** — ou nada entra.

Se (b) entrar, o próximo passo não é código: é a linha em §4.11, a linha em §16 e as 8 chaves nos
dois dicionários. O código vem depois, e vem pequeno.
