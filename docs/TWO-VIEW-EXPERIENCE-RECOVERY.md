# TWO-VIEW EXPERIENCE RECOVERY — fechamento

> **O que este documento registra:** como o Front deixou de descrever um backend que não existe
> mais, e passou a oferecer **uma Analysis com duas leituras**. A regra mora no Product Freeze
> §10.1; o mapa, no Blueprint §3.4.1 e §4.6. Aqui fica o **como se chegou**, com o que foi
> provado, o que ficou de fora e por quê.

## A pergunta que mudou

Antes: *"como mostramos o resultado de uma Analysis?"* — havia **um** documento com o analytics
embutido, e uma tela para ele.

Agora: *"como uma única Analysis oferece duas leituras complementares — inteligência ARGOS e
exploração Analytics — sem confundir uma com a outra?"* O `analysis-result-v3` desfez a fusão no
backend; esta recuperação a desfez na experiência.

## As superfícies

| rota | papel | fonte ÚNICA |
|---|---|---|
| `/analyses/:id` | lifecycle — identidade, estado, progresso, entradas das duas visões | `/{id}`, `/progress` |
| `/analyses/:id/argos` | **visão ARGOS** | `analysis-result-v3`, pedido por `?result_schema_version=3` |
| `/analyses/:id/analytics` | **visão Analytics** | `GET /{id}/analytics` |
| `/analyses/:id/result` | **LEGACY COMPATIBILITY** | v1/v2 — inalterada |

**Subrotas irmãs, nunca abas.** O produto não possui o pattern `Tabs` — não existe no Design
System, não há uso em lugar nenhum, nenhuma autoridade o menciona. A subrota também entrega o
que a experiência exige de graça: deep link por visão, refresh na visão certa e histórico do
navegador. Uma aba perde as três.

## Backend first, na prática

O Front apresenta, agrupa, ordena quando o contrato autoriza, navega, formata e **explica**
`availability`/`reason`. Não cria métrica, não calcula escore, não deriva faixa de risco, não
calcula Drift nem delta, não normaliza escala, não converte moeda, não transforma ausência em
zero e não fabrica família ausente.

Duas distinções carregam a tela inteira:

- **omitido ≠ vazio** — família ausente significa "esta capacidade não foi produzida"; `[]`
  significa "ela rodou e não achou". A seção só existe quando a família foi produzida.
- **ausência ≠ zero** — `not_measured` mostra estado e motivo, nunca `0`. Custo zero e custo
  desconhecido são a mesma pixel e decisões opostas.

## O que foi provado

| eixo | prova |
|---|---|
| contrato | `contract-sync` 12 · deriva da cópia v3 · `FAMILIAS_ARGOS` amarrada ao documento publicado |
| documento real | 9 provas contra `analysis-result-v3.real.json` (artefato do backend, não massa local) |
| negociação | 6 provas — ausência preserva o histórico; `""` é ausência no cliente |
| shell | 10 provas — identidade, badge da **Analysis**, `aria-current`, nunca aba |
| ARGOS | 12 provas — pede v3 explicitamente, não chama `/analytics`, famílias, severidade e faixa do produtor |
| Analytics | 10 provas — fonte única, D13, supressão e retenção como conclusão do produtor |
| gates negativos | 23 |
| browser real | 10 — deep link, refresh, legado vivo, responsivo ×3, teclado |
| capturas | 18 PNG em `docs/two-view/` |

### As capturas pagaram o próprio custo

Três defeitos só apareceram em pixel:

1. **A copy mentia por omissão.** Análise antiga sem v3 mostrava *"No result is available for
   this analysis"* — falso pelo lado que importa: o resultado histórico existe e continua
   acessível; o que não existe é o documento ARGOS. Hoje a visão tem palavra própria.
2. **`80% ratio`.** A formatação já carregava a unidade, e repeti-la ao lado parecia um segundo
   dado. `ratio`/`currency` descrevem a ESCALA, que é mostrada à parte; `conversations` informa.
3. **`Cobertura: 100%` em toda linha** virava moldura, e o olho parava de ver justamente a linha
   em que ela é 60% — a única em que ela importa.

## O que NÃO entrou, e por quê

| lacuna | motivo |
|---|---|
| `detail` dos alertas | O cadeado da jornada proíbe `.detail` na UI, contra detalhe cru de `problem+json`, e não distingue do campo homônimo que o v3 publica como conteúdo. Afrouxá-lo abriria a porta que ele fecha. O alerta vai com título, código e severidade |
| `flag_crosses` / `numeric_crosses` | Existem no contrato e o leitor da casa **deliberadamente não os apresenta** — decisão anterior a esta recuperação. A contagem de blocos não apresentados aparece na tela |
| `evidence_level` | A Recovery o lista entre os campos a apresentar; **nenhum contrato público o entrega**. Apresentá-lo exigiria inventá-lo |
| rótulo humano dos 39 outputs | O contrato não publica rótulo. Ids com descritor usam o rótulo já publicado; os demais mostram o `id` — nunca um rótulo adivinhado |

## Travas da casa que reprovaram, e o que cada uma ensinou

O cadeado BACKEND FIRST reprovou a visão ARGOS em quatro pontos. **Três eram erro meu:**

- **camada** — `resolverLeituraArgos` estava em `data/`, que TRANSPORTA. Foi para
  `result/adapterV3.ts`. Com validação no hook, a regra de evolução do contrato viveria em dois
  lugares.
- **nome** — `canonicalSchemaV3.ts` carregava o literal `canonicalSchema`, banido para quem não
  pode conhecer o shape do v1. Virou `contratoV3.ts`.
- **fronteira única** — a lista esperava 4 leitores do contrato. A doutrina dela é "um modelo por
  CONTRATO, não um modelo no total", e ela já crescera com o v2. Agora são 6, e `adaptar.ts`
  **não** ganhou ramo v3: a página legada segue fail-closed de propósito.

O quarto foi tensão real: `severity` era palavra banida porque **nenhum contrato a publicava**.
O v3 publica em `alerts`, `issues` e `intents`. O cadeado já resolvera isso para `priority` —
proibir atribuição a LITERAL, não a palavra — e o mesmo critério foi aplicado, com a prova
comportamental que ele exige.

A catraca M14 pegou uma chamada `t(variavel)` no shell — **o mesmo defeito que a M39 custou a
diagnosticar**. Virou template com prefixo estático.

## Defeitos dos meus próprios testes

- **prova por vacuidade** — a massa do Analytics usava `flag_distributions`/`numeric_series` e o
  leitor lê `distributions`/`time_series`. A seção ficava vazia e a prova de "`other_count` não
  vira zero" passava sem olhar nada. Piso de cardinalidade em cada prova de ausência.
- **dois falsos positivos meus** — um gate procurava `/result` e acusava `../../result/adapterV3`
  (diretório de código); um spec procurava `/result` na URL e acusava o módulo servido pelo Vite
  em dev. Os dois agora procuram a ROTA.
- **critério errado** — exigi `role="alert"` para ausência de documento. A casa usa `status` para
  ausência que não é falha, e um alerta por ausência ensinaria a ignorar alertas.

## Infraestrutura de teste que faltava

O endpoint `/analytics` **nunca fora mockado**: a região analítica ao vivo existia desde a M27 e
só era exercitada em teste de unidade. Em browser ela sempre caía no `forbidden_or_not_found` do
handler genérico, e ninguém notava porque nenhuma tela dependia dela para renderizar. A visão
Analytics depende — e foi ela que revelou o buraco.

O handler de `/result` também passou a **negociar versão**, espelhando o produtor: sem o
parâmetro, resposta idêntica; com ele, o v3 ou um problema explícito.

## M39 — FROZEN, e por quê a semântica reabriu

Continua **ARGOS A × ARGOS B**, não executada. O pareamento atual é por `indicator.id` sobre uma
família, e o ARGOS publica onze — com identidades diferentes por família:

| família | pareável? |
|---|---|
| `indicators`, `dimensions` | sim |
| `scores` | `PublicScore` **não tem `id` próprio**; e o contrato avisa que sem casar a janela, dois valores de análises diferentes pareceriam série |
| `projections` | exige `horizon`, senão cruza horizontes |
| `risks` | `band` só do produtor |
| `intents` | `intent_id` é dado do tenant, não registro canônico |
| `recommendations`, `evidence`, `alerts`, `issues` | semântica de **conjunto**, não de par |

Ampliar `comparacao.ts` agora seria decidir isso no escuro.

## Dívida descoberta nesta fase

**28 gates leem texto-fonte sem normalizar quebra de linha.** O repo tem `core.autocrlf=true`:
o mesmo commit chega LF num checkout e CRLF noutro, e toda asserção com literal multi-linha fica
vermelha **por plataforma** — dizendo "o código mudou" quando nenhuma linha mudou.

Não é teórico. Um `git stash`/`pop` que usei para medir baseline converteu a árvore, e
`an03-m34-composicao` passou a acusar uma regressão inexistente. Esse arquivo foi corrigido e é
o modelo; os outros 27 ficam como dívida declarada, com tarefa própria — varrê-los aqui seria
transformar esta recuperação no refactor que ela não é.

É a mesma classe do selo do contrato, do outro lado da fronteira: **um gate que compara bytes
precisa dos mesmos bytes em toda plataforma.**

## Dívida registrada

**FULL INGESTION TOPOLOGY E2E — OPEN.** A jornada completa de upload
(`upload → dataset_ready → promotion-worker`) não tem prova local: exige seis processos e há três
de pé. Não redefine ARGOS/Analytics, não bloqueou o desenho das duas visões, e é gate de release
final. Diagnóstico em `sentinela-orchestrator/docs/argos-v3-release-propagation.md`.
