# O gate de typecheck — desenho atual (ANL-FE-08)

**Comando oficial: `npm run typecheck`.** Ele é a única evidência aceita.

## O que ele verifica

| # | verificação | por quê |
|---|---|---|
| 1 | **erros** — zero em todos os projetos | o óbvio |
| 2 | **execução** — cada projeto processou ≥ 3 arquivos | projeto que compila zero arquivos sai limpo |
| 3 | **cobertura** — todo `.ts`/`.tsx` versionado está em ≥ 1 projeto | um gate que enumera não sabe o que ficou de fora |
| 4 | **raiz inerte** — `tsconfig.json` processa 0 arquivos do repo | pina o fato que torna `npx tsc --noEmit` inútil como prova |

Uma passada de compilação por projeto (`--listFiles`), reaproveitada pelas quatro
verificações. ~36 s no total.

## Os seis projetos, e as duas famílias

### Cobertura — definidos por EXCLUSÃO

Juntos precisam conter a árvore inteira. **Arquivo novo nasce coberto**: ninguém registra nada.

| projeto | o que carrega |
|---|---|
| `tsconfig.prod.json` | `src` inteiro **menos** testes · **+ `.storybook/preview.tsx`** |
| `tsconfig.tests.json` | `src/test/**` + `**/*.test.ts(x)` |
| `tsconfig.e2e.json` | `e2e/**` + `playwright.config.ts` |
| `tsconfig.node.json` | `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts` · **+ `.storybook/main.ts`** |

> **Os dois arquivos do Storybook não moram no mesmo projeto, e isso é classificação, não
> conveniência.** `main.ts` é config de **build**: roda em Node, sem JSX e sem DOM — cabe entre as
> configs de ferramenta do `node.json`. `preview.tsx` é **runtime de preview**: usa JSX, DOM e
> importa `src/design/tokens/tokens.css` e `src/styles/globals.css`, então precisa do contexto
> browser/app que o `prod.json` já fornece. Estar ali **não** o torna código de produção.
>
> Medido antes de decidir: incluir `preview.tsx` no `node.json` dá **4× `TS17004`**, porque aquele
> projeto não declara `jsx`. Subir opção de compilador para acomodá-lo seria mudar a régua para o
> arquivo caber, em vez de pôr o arquivo onde ele pertence. Cada um está em **exatamente um**
> projeto: `preview.tsx` é nomeado arquivo a arquivo no `prod.json`, e não `.storybook` inteiro,
> justamente para `main.ts` não cair nos dois.

Rigor: o do `tsconfig.app.json` (não-estrito). O objetivo aqui é **alcance**. Subir a régua no
mesmo passo em que se amplia o alcance mistura duas medições — não daria para saber se um erro
novo é código descoberto ou régua nova.

### Rigor — definidos por ENUMERAÇÃO, estritos

| projeto | o que carrega |
|---|---|
| `tsconfig.v1.json` | camada canônica pura (`lib/v1`, `data`, fixtures) |
| `tsconfig.v1-ui.json` | `features/canonical-analysis`, `launchpad`, `history` |

Enumerar aqui é aceitável porque eles **não são a rede de segurança**: são a régua alta sobre a
jornada canônica. Esquecer de registrar um diretório neles custa rigor, não cobertura — o
arquivo continua checado pela família de cima.

## Por que o desenho mudou

O gate anterior tinha só a família do rigor. Enumeração é frágil pelo motivo óbvio — alguém
esquece de registrar — e pelo não-óbvio: **o gate continua verde enquanto esquece**, e verde é
indistinguível de coberto.

Aconteceu duas vezes:

| quando | o que ficou de fora | o que havia lá |
|---|---|---|
| Onda 8 | `features/launchpad`, `features/history` | 2 defeitos REAIS de runtime (`navigate` fora de escopo; `descriptor.label` inexistente) |
| pós-Onda 8 | `features/dashboard` | 3 erros de tipo (`TS2493`, indexação de tupla vazia) |

No segundo caso o gate passou limpo sobre 97 arquivos e nunca abriu os 7 do diretório novo.

A correção **não** foi acrescentar um quarto diretório à lista — isso repetiria o defeito na
próxima pasta. Foi inverter a definição: projetos por exclusão, mais um inventário independente
(o índice do git) para conferir a união.

## O baseline legado deixou de existir

O gate antigo tolerava N erros fora das superfícies estritas (`EXPECTED_LEGACY`), com a regra
"só desce". Ele chegou a **zero** na aposentadoria do dashboard legado — o último saiu com
`lib/api.ts`, `adapters/*`, `domain/*` e `reportPdf`, que perderam o único consumidor.

Com zero, o mecanismo virou custo sem função: hoje **qualquer** erro em **qualquer** projeto
reprova. Não há allowlist para crescer em silêncio.

## Estado corrente do gate — 2026-08-12

✅ **VERDE.** `npm run typecheck` sai com **exit code 0**.

| medida | valor |
|---|---|
| erros de tipo | **0** nos seis projetos |
| arquivos compilados | **298**, cobertura completa |
| projetos | `v1` 190 · `v1-ui` 141 · `prod` 171 · `tests` 241 · `e2e` 23 · `node` 5 |
| verificações | erros ✅ · execução ✅ · cobertura ✅ · raiz inerte ✅ |

**Verde é o comando inteiro, não só a contagem de erros.** Houve um estado intermediário em que os
erros de tipo estavam em 0 e o comando ainda saía diferente de zero, porque `.storybook/main.ts` e
`.storybook/preview.tsx` estavam fora de todo projeto e a verificação 3 reprovava. "0 erros" não é
sinônimo de "gate verde": só `exit 0` é.

## Histórico — a regressão 19 → 0

Preservado de propósito: sem a trilha, a próxima pessoa reintroduz o mesmo defeito.

O gate esteve **genuinamente em 0** entre a M18 e a M20, e três eventos o quebraram. Datado por
`git checkout --detach`, com resíduo verificado em zero a cada ponto:

| origem | commit | o que entrou | ocorrências |
|---|---|---|---|
| **M21** | `f86218d` | `analyticsProjection.ts` linhas 290, 363, 446, 519 — `TS2322` | +8 |
| **contract-sync da BD02** | `9b81286` | `instance_id` virou obrigatório em `AnalysisListItem`; 4 arquivos de teste constroem itens sem ele | +8 |
| **M36** | `34d65e2` | `LoadingState` recebe `message`/`size` e espera `rotulo`/`linhas` — `InstancePage` ×2, `InstancesListPage` | +3 |

As três fecharam declarando typecheck verde com o comando oficial vermelho — provavelmente rodando
variante mais estreita. As duas famílias de projeto se sobrepõem, então o mesmo defeito era contado
mais de uma vez: **19 eram ocorrências de 11 defeitos distintos** (4 + 4 + 3).

**`TYPECHECK RECOVERY` — encerrada.** Dois commits: `fdddc27` corrigiu os 11 defeitos (19 → 11 → 3
→ 0, medindo depois de cada grupo) e o seguinte fechou a cobertura dos dois arquivos do Storybook.
Nenhum cast, nenhum `@ts-ignore`, nenhum downgrade de strictness, nenhuma opção de compilador
alterada. O defeito da M21 merece registro à parte: o código provava em runtime com
`Object.values(proc).some(v => v === null)` e espalhava `...(proc as Required<typeof proc>)` —
**`Required` remove opcionalidade, não nulabilidade**, então o cast era inerte e o erro sobreviveu
a ele por quinze missões.

> **Como datar regressão de gate.** Use `git checkout --detach <commit>`. **Nunca**
> `git checkout <commit> -- .`: ele *sobrepõe* a árvore atual em vez de substituí-la, mantém
> arquivos que missões posteriores apagaram e produz números inflados. Uma medição feita assim
> nesta mesma frente errou por ordem de grandeza.

## Provas do próprio instrumento

`npm run typecheck:alcance` (`scripts/typecheck-alcance.mjs`) não confere configuração — ele
**injeta** um erro de tipo em cada superfície e exige que o comando oficial REPROVE citando o
arquivo, depois restaura e exige que volte a passar. Conferir o `include` provaria a intenção;
injetar prova o efeito.

Cobre também o caso que o gate de cobertura existe para pegar: um arquivo versionado fora de
todos os projetos precisa reprovar por **cobertura**, não por erro de tipo.

## O que continua proibido como evidência

`npx tsc --noEmit` na raiz. `tsconfig.json` tem `"files": []` com project references: ele
verifica **zero** arquivos e sai com código 0. Uma fatia inteira já foi reportada como "tsc
limpo" com esse comando; quando o comando certo rodou, apareceram 3 erros — um deles de duas
fatias antes.

A verificação 4 do gate pina esse fato. Se alguém mudar a raiz, o gate reprova e obriga a
atualizar a história, em vez de deixá-la desatualizada em silêncio.
