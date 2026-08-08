# Como as massas do `analysis-result-v2` são produzidas

As fixtures de `src/test/fixtures/canonical-result/massasV2.ts` **não são escritas à mão**. Este
documento é a receita para regenerá-las, e a explicação do que nelas é real.

A regra herdada do v1 vale igual aqui: massa escrita à mão prova apenas que o adapter concorda
com a suposição de quem a escreveu. Neste contrato há nove blocos, três estados e quatro formas
de ausência — supor errado é fácil, e o teste passaria mesmo assim.

---

## O que é sintético, e o que não é

**Sintética é a ENTRADA**: um dataset canônico de 100 registros, gerado no primeiro script. Ela
pode ser sintética sem a massa deixar de provar nada — é o insumo, não o resultado.

**Real é tudo que sai dela**: as distribuições, a concentração, as séries, as supressões, a
decisão de publicar e a montagem final. Cada um desses passos roda o código de produção do
repositório dono daquele passo.

Os 100 registros não são um número livre: `observed_conversations` vale 100 nos facts reais do
assembler, e a invariante **B == C** do `assemble_v2` recusa a montagem com qualquer outro
tamanho.

---

## Os três passos

Os scripts vivem em `scripts/massas-v2/`. Eles rodam em **ambientes Python diferentes**, porque
os dois repositórios que produzem os insumos são independentes.

### 1. Snapshot e projeção pública (Analytics)

```bash
cd D:/projetos/sentinela-analytics-service && PYTHONPATH="$PWD/src" ./.venv/Scripts/python.exe D:/projetos/sentinela-front-e1/scripts/massas-v2/gerar_snapshot.py /tmp/massas
```

Roda `reducer.agregacao.calcular` (o reducer real) e `reducer.publicacao.construir` (o publicador
real). Escreve `ready.json`, `parcial.json` e `retido.json`.

### 2. Montagem do documento integrado (Assembler)

```bash
cd D:/projetos/sentinela-result-assembler && PYTHONPATH="$PWD/src" python D:/projetos/sentinela-front-e1/scripts/massas-v2/gerar_v2.py /tmp/massas "$PWD/fixtures/massa_a_principal.facts.json"
```

Roda `assemble_v2` — a função de produção — sobre os facts reais do assembler e a projeção do
passo 1. Escreve `v2_ready.json`, `v2_parcial.json` e `v2_retido.json`.

### 3. Transcrição para TypeScript

```bash
python D:/projetos/sentinela-front-e1/scripts/massas-v2/montar_fixture.py /tmp/massas D:/projetos/sentinela-front-e1/src/test/fixtures/canonical-result/massasV2.ts
```

Transcrição literal, com o cabeçalho de procedência.

---

## Como cada estado foi alcançado

Os três **não foram escolhidos**: eles caíram das condições preparadas na entrada.

### `ready`

Quatro canais, todos acima do piso de 10 (45/30/15/10). Nada é retido. A massa traz um
`flag_cross` publicável — é ele que faz a tela exercitar a nota honesta *"o documento trouxe
blocos que esta versão não apresenta"*.

### `partial`

Dois canais (70/30) e o cruzamento canal × resolvido, com apenas 3 conversas resolvidas no
`phone`. A célula fica abaixo do piso, a linha inteira é suprimida, e sobra **uma** linha
publicada de um universo de duas — a marginal da flag entrega a outra por subtração.

É exatamente a condição que o avaliador conjunto procura (`universo - publicadas == 1`). Quem
decide remover o bloco é ele; o script só prepara a condição.

### `withheld` — e a exceção declarada

**`withheld` não é alcançável a partir de um dataset bem-formado.** Ele é o ramo de "a declaração
é contraditória ou a avaliação não convergiu", e o reducer não produz declaração contraditória.

O próprio teste do serviço (`test_documento_CONTRADITORIO_e_recusado_inteiro`) o alcança
quebrando `distinct_observed`, e foi o que se fez aqui: o snapshot real tem o `distinct_observed`
da dimensão rebaixado antes de ir ao publicador.

O que continua real é o que interessa à tela: **o envelope sai do publicador de verdade**, com a
decisão dele. E, por definição, ele não carrega número analítico nenhum — `snapshot` é nulo.

---

## O que muda quando o contrato subir

`analytics-snapshot-v9` é a versão congelada nestas massas. Quando o Analytics subir para a v10,
regenerar não basta: é preciso decidir, no `analyticsProjection.ts`, se o campo novo é lido,
contado ou ignorado — e a decisão precisa de teste próprio. Regenerar sem essa decisão produziria
massas novas passando nos testes antigos, que é o jeito mais silencioso de perder cobertura.
