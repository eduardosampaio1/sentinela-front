# DOC-CLOSE · M47 — a D17: os dois monólitos de página

**Missão:** M47 · **Origem:** D17, aberta desde a M07 · **Estado:** FECHADA
**Sem push · sem deploy · sem Railway.**

---

## 1. Discovery

Dois arquivos, 2349 linhas somadas, na baseline do anti-monólito desde a M07 com o mesmo motivo:
*"monólito de página nomeado pelo plano; decompor é missão própria (D17)"*.

| | `LandingPage.tsx` | `AionPage.tsx` |
|---|---|---|
| linhas | 1182 | 1167 |
| componentes de topo | 17 | 20 |
| maior bloco | `ARGOSPanel` (145L) | `ContactSection` (146L) |
| **testes que afirmavam o conteúdo** | **0** | **0** |

A última linha é o achado da discovery. As duas páginas passavam na matriz transversal da M45 —
estado terminal, axe, teclado, responsive, PT/EN —, e **nenhum desses gates olha o que a página
diz**. Uma âncora no herói respondia por 1182 linhas.

Também ficou claro **por que** decompor virou urgente, e não foi por gosto: na M46 a catraca
anti-monólito **recusou as ~44 linhas de comentário** que as próprias correções de a11y exigiam.
Uma dívida que impede a própria correção acabou de anunciar o prazo.

E o `/aion` fechava o argumento: **76 nós de a11y**, todos do mesmo `A.muted`. Não é coincidência —
um token no meio de 1167 linhas é um token que ninguém revisa.

---

## 2. O critério de corte

Não foi "um arquivo por componente" — isso trocaria um monólito por vinte arquivos de 60 linhas e
perderia o que se lê em sequência. O corte segue **quem muda junto**, e **o que quebra pelo mesmo
motivo**.

### Landing — 1182 → 9 arquivos

| arquivo | linhas | por quê |
|---|---|---|
| `LandingPage.tsx` | **52** | só a ordem da página |
| `tokens.ts` | 70 | a paleta (M46) + `TagColor` |
| `primitivos.tsx` | 81 | os quatro blocos que toda seção usa |
| `PainelArgos.tsx` | 156 | a ilustração do herói — o que mais muda quando o produto muda de cara |
| `casca.tsx` | 181 | `<header>` e `<footer>`, que estavam a 800 linhas um do outro |
| `topo.tsx` | 212 | herói + esteira de modelos |
| `secoes-problema.tsx` | 236 | problema + plataforma (um argumento em sequência) |
| `secoes-jornada.tsx` | 168 | como funciona + resultados |
| `secoes-conversao.tsx` | 191 | preço + chamada final |

### AION — 1167 → 10 arquivos

| arquivo | linhas | por quê |
|---|---|---|
| `AionPage.tsx` | **51** | só a ordem da página |
| `tokens.ts` | 37 | a paleta (M46) |
| `primitivos.tsx` | 28 | `Badge` e `SectionLabel` |
| `casca.tsx` | 158 | navegação e rodapé |
| `DemoInterativa.tsx` | 159 | **o único bloco com estado e temporizador** — quebra por lógica |
| `DiagramaDeFluxo.tsx` | 144 | SVG animado — quebra por geometria |
| `ContactSection.tsx` | 160 | **o único que faz rede** — quebra por integração |
| `secoes-topo.tsx` | 172 | herói + problema + métricas |
| `secoes-modulos.tsx` | 197 | módulos + NEMOS |
| `secoes-integracao.tsx` | 187 | integração + agnóstico + observabilidade |

Nenhum arquivo acima de 240 linhas. Quem edita copy de seção não atravessa mais 124 linhas de
`<path d="…">`.

---

## 3. A contrapartida: o gate que a decomposição exigiu

Decompor **criou um risco novo**. Enquanto eram um arquivo, ninguém apaga uma seção sem ver. Agora,
esquecer um `<Section />` na composição é um acidente de **uma linha** — e a página continuaria
alcançando estado terminal, com axe limpo e sem estourar largura. Verde em tudo que a M45 mede, e
faltando um terço do argumento.

[e2e/m47-composicao.spec.ts](e2e/m47-composicao.spec.ts) afirma, por página:

1. **toda seção está renderizada** — por âncora de TEXTO, não por contagem de filhos (contar filhos
   mediria a árvore que eu escrevi; título é o que a pessoa lê);
2. **as seções aparecem na ORDEM** — porque ordem é argumento: problema antes de solução, solução
   antes de preço;
3. **as duas seções SEM título** (`ContextStrip` e `MetricsSection`) têm âncora própria — um gate
   que só olhasse `h1`/`h2` não as veria sumir;
4. **piso de instrumento**: se o seletor parar de casar, a lista vem vazia e o laço seria sempre
   verde — a vacuidade que a M45.8 pegou no gate de cobertura.

---

## 4. Prova de que foi MOVIMENTO, e não reescrita

Três medições independentes, todas conservando o número exato:

| medida | antes | depois | soma |
|---|---|---|---|
| componentes de topo (landing) | 17 | 17 | diferença **vazia** |
| cor literal · landing | 54 | 5+1+10+22+2+5+9 | **54** |
| cor literal · aion | 20 | 1+4+2+11+2 | **20** |
| timing literal · landing | 1 | `PainelArgos` 1 | **1** |
| timing literal · aion | 5 | `DemoInterativa` 1 + `DiagramaDeFluxo` 4 | **5** |

E as 386 provas E2E e 1678 unitárias passaram **sem uma única alteração** — que é o que uma
decomposição correta parece de fora.

---

## 5. Duas armadilhas de comentário, na mesma missão

**A primeira:** o cabeçalho que escrevi para `topo.tsx` citava `data-overflow-ok="marquee"` por
extenso. A catraca do marcador conta ocorrências no **código-fonte**, comentário incluso — e o meu
parágrafo criou uma terceira. É o mesmo defeito da M46, quando a explicação de por que não usar o
docblock de ambiente do vitest **ligou** o docblock.

Agora está escrito no próprio arquivo, e desta vez sem citar o atributo.

**A segunda:** o script de fatiamento leu o arquivo de plano em ANSI e gravou em UTF-8, deixando
mojibake em 42 linhas de cabeçalho nos 15 arquivos novos. Reparado com o round-trip cp1252→UTF-8,
aplicado **só** ao bloco de cabeçalho — o corpo veio de `ReadAllLines` e estava correto; um reparo
de arquivo inteiro teria corrompido o que estava bom.

---

## 6. Campanha de mutação — 4/4 mortas

[docs/m47/mutacoes_m47.py](docs/m47/mutacoes_m47.py)

| # | mutação | assassino real |
|---|---|---|
| 1 | `<PricingSection />` some da composição | composição **+** ordem |
| 2 | `<MetricsSection />` (sem título) some | composição, pela âncora sem-título |
| 3 | problema e plataforma trocam de lugar | ordem |
| 4 | `A.muted` volta a `#64748B` | matriz · J25 axe |

A mutação 4 é a que fecha o argumento: se a decomposição tivesse tirado a página do alcance do gate
de a11y, ela passaria — e o *"76 → 0"* da M46 teria virado ficção por mudança de arquivo.

---

## 7. Stack de qualidade

| gate | resultado |
|---|---|
| `npm run typecheck` | **APROVADO** — 6 projetos, **393** arquivos |
| `npx vitest run` | **121/121** arquivos · **1678/1678** testes |
| `npx playwright test` | **390/390** |
| `npm run lint` | **0 erros** · 14 warnings — **nenhum novo** |
| anti-monólito | LandingPage e AionPage **SAÍRAM da baseline** |
| mutação M47 | **4/4 mortas** |

O lint sem warning novo não foi sorte: `TagColor` mora em `tokens.ts` e os dados de seção ficaram
privados, justamente porque arquivo que exporta componente **e** outra coisa acorda o
`react-refresh/only-export-components` — e ele tem teto desde a M46.

---

## 8. O que fica

A baseline do anti-monólito tem agora **uma** entrada: `massasV2.ts` (1035 linhas, massa de teste).
A régua do plano foi reancorada nela — um arquivo pequeno não prova que a régua sabe medir um
grande.

`NÃO MEDIDO ≠ VERDE` · `NÃO CORRIGIDO ≠ NÃO CONTADO` · `NÃO OLHADO ≠ NÃO EXISTE`

E o que a M47 acrescenta: **decompor é criar um risco novo.** Um monólito não se desmonta sozinho;
um mosaico, sim. O gate de composição não é zelo — é a dívida que esta missão contraiu ao cortar.
