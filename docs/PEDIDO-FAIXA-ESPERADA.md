# Pedido — a faixa ESPERADA por indicador

**De:** Front (Diagnóstico) · **Data:** 2026-08-17
**Para:** a CADEIA, não um repositório. Ver "quem carrega o quê" abaixo.

## Correção de endereço, e ela importa

A primeira versão deste pedido dizia "para: ARGOS engine + result-assembler". Está errado, e o
erro é do tipo que esta plataforma já pagou caro: **o Front não fala com o motor.** Ele chama o
Gateway, e entre os dois há três paradas que precisam carregar o campo novo.

Medido no código, não suposto:

| hop | repositório | evidência |
|---|---|---|
| **Engine** produz o escore | `sentinela` | `engine/scoring/registry.py` — onde `expected_range` já existe |
| **Facts** atravessam a ponte | `sentinela` | `engine/facts/from_engine_result.py` — a ponte que a recuperação de agosto consertou |
| **Orquestrador** monta o v3 | `sentinela-orchestrator` | roda o assembler: `app.py:2995`, `contracts.py:470` e `899`, `composicao_integrada.py:169` |
| **Assembler** define o contrato | `sentinela-result-assembler` | `result_v3.py:88` (`Scale`), `assemble_v3.py:91` e `112` |
| **Gateway** serve ao Front | `sentinela` | `api/routes/analyses_v1.py:387` — `GET /{analysis_id}/result` |
| **Front** apresenta | `sentinela-front-e1` | `lib/v1/client.ts:415` — chama o Gateway, e só ele |

O Gateway **não** usa o assembler: ele serve o que o Orquestrador montou. Então um campo que o
Orquestrador não transportar não existe para a tela, mesmo que o motor o calcule perfeitamente.

Este é literalmente o defeito da recuperação de 12–13/08: *"nada comparava o que o motor produz com
o que o produto publica — e foi por isso que 26 métricas puderam sumir sem ninguém recusar
nenhuma"*. O pedido abaixo só vale se os cinco hops o carregarem.

## O que a tela não consegue responder hoje

A visão Diagnóstico mostra `Escore de comportamento 64%` e para aí. Ela não diz se 64 é bom.

Isso não é escolha de design: é o único desfecho honesto disponível. Nenhum campo do
`analysis-result-v3` diz o que se espera de um indicador, então qualquer cor, seta ou palavra de
julgamento que a tela colocasse ali seria opinião do navegador com aparência de dado do produtor.

O owner pediu a resposta na tela. Este documento é o caminho que não cria uma segunda verdade.

## O que JÁ existe — para ninguém reconstruir

Três peças estão prontas e é importante saber disso antes de mexer:

1. **O nome do conceito já existe no motor.** `engine/scoring/registry.py` declara
   `expected_range: str` no tipo (linhas 14 e 26) e o expõe na saída (linha 344).

2. **O contrato público já tem onde receber limite.** `result_v3.py:88` define
   `Scale { kind, minimum, maximum }`, e o docblock diz *"a faixa em que o número vive. Declarada,
   nunca inferida."*

3. **O Front já lê limite.** `barrasDoArgos.ts` desenha a barra proporcional usando
   `scale.minimum`/`scale.maximum`, e cai no limite implícito de `ratio_unit` (0..1) e `score_100`
   (0..100) quando os explícitos não vêm. **Nada no Front precisa mudar** quando a expectativa
   chegar — só a régua e o veredito passam a ter contra o que se medir.

## As duas lacunas

### 1 · `expected_range` está preenchido com o DOMÍNIO, não com a expectativa

As cinco entradas de `engine/scoring/registry.py` valem todas `"0-100"`:

| linha | indicador |
|---|---|
| 69 | `SEMANTIC_HEALTH_SCORE` |
| 88 | `BEHAVIORAL_HEALTH_SCORE` |
| 102 | `STRUCTURAL_HEALTH_SCORE` |
| 117 | `ECONOMIC_HEALTH_SCORE` |
| 131 | `AI_HEALTH_SCORE` |

`0-100` é onde o número **pode** estar. A expectativa é onde ele **deveria** estar. O campo tem o
nome certo e o conteúdo errado — e é por isso que ele não serve para nada hoje.

### 2 · `minimum`/`maximum` nunca são preenchidos

`assemble_v3.py:91` monta `Scale(kind=ScaleKind.RATIO_UNIT)` e a linha 112 monta `Scale(kind=escala)`.
Em nenhum dos dois os limites explícitos entram. Funciona porque `ratio_unit` e `score_100` carregam
limite por definição — mas `currency`, `count`, `duration` e `raw` chegam sem teto, e ali a barra do
Front fica cheia por não ter denominador.

## O pedido, e ele é UM campo

Publicar, por indicador, a faixa esperada **como intervalo** no `PublicMeasurement`:

```python
expected_minimum: float | None = None
expected_maximum: float | None = None
```

### Por que INTERVALO e não limiar

Um limiar sozinho obriga quem lê a saber para que lado o número melhora — e isso muda por
indicador. Em `useful_outcome_rate` alto é bom; em `semantic_drift` e `mean_response_variance_per_intent`
alto é **ruim** (o próprio registro escreve: *"valor maior significa mais dispersão, não mais
qualidade"*). Uma regra única erraria metade dos casos, e errar a direção é pior que não colorir:
pintaria de vermelho justamente a deriva baixa, que é o melhor caso.

Com intervalo, a pergunta que a tela faz é só **"o valor está dentro?"**, e ela funciona nos dois
sentidos sem o Front saber qual lado é melhor:

| indicador | esperado | leitura |
|---|---|---|
| `useful_outcome_rate` | `[0.70, 1.00]` | 0,62 está fora — abaixo |
| `semantic_drift` | `[0.00, 0.10]` | 0,12 está fora — acima |
| `behavior_score` | `[0.82, 1.00]` | 0,64 está fora — abaixo |

O Front deriva "abaixo" ou "acima" comparando com o intervalo. Isso é leitura, não inferência.

### Onde os valores nascem

Não no motor por cálculo, e não no Front por palpite: é **decisão de produto**, indicador por
indicador. O registro é o lugar de guardá-la, do mesmo jeito que ele já guarda unidade, denominador
e precisão — coisas que também são decisão e não medição.

Se um indicador não tiver expectativa decidida, os dois campos ficam `None`. O Front já trata
ausência: sem expectativa, o número aparece sem régua e sem veredito, exatamente como hoje.

## O que a tela ganha no dia em que isso chegar

- **A régua com a marca do esperado.** Sem ela, 52% e 99% são dois retângulos de tamanhos
  diferentes e nada mais.
- **A palavra.** "Dentro do esperado" / "Fora do esperado" no herói do Diagnóstico.
- **Cor nos sinais das portas** — e cor que não mente, porque vem de intervalo publicado.
- **A distância.** "8 pontos abaixo da faixa esperada" é subtração entre dois números publicados.

## O que continua fora, e é outro pedido

A frase do protótipo *"a dimensão Semantic responde por quase toda a diferença"* é **atribuição**:
qual parte do composto explica o desvio. `composite_of` diz quais são as partes, mas não o peso de
cada uma no resultado. Calcular isso no Front seria o navegador emitindo análise.

Se essa frase for desejada, ela é um segundo campo — e vale um pedido próprio, não uma extensão
deste.
