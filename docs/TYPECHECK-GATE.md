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
| `tsconfig.prod.json` | `src` inteiro **menos** testes |
| `tsconfig.tests.json` | `src/test/**` + `**/*.test.ts(x)` |
| `tsconfig.e2e.json` | `e2e/**` + `playwright.config.ts` |
| `tsconfig.node.json` | `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts` |

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
