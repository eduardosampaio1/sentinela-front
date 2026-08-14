# M42 · CFG-03 / CFG-04 — DOC-CLOSE (scenario materialization)

**ZERO feature code.** Nenhuma UI, nenhum client de produção, nenhum hook. O que esta missão
entrega é **massa, handlers e gates** para produtor que já existe.

---

## 1. Os oito scenarios

`workspace-config-current` · `workspace-config-stale-claim` · `workspace-config-unavailable` ·
`workspace-config-invisible` · `instance-config-current` · `instance-config-duplicate-name` ·
`instance-config-unavailable` · `instance-config-invisible`

Catálogo **44 → 52**, todos `disponivel`. Registrados no Blueprint §11 **antes** do código.

**Transição não é estado.** Rename `A → B` é provado dentro dos `handlers()` mutáveis, como a M41
prescreveu. Não existe `workspace-renamed` nem `instance-renamed` — um `PATCH` não cria um mundo.

## 2. A massa é hostil de propósito

Nenhum id é derivável do nome, nenhum é sequencial: `ws-8f3a1c47…` → *"Atendimento Norte"*,
`inst-4d92…` e `inst-b7e5…` → duas Instances que podem se chamar **"Suporte"** ao mesmo tempo.

**A armadilha central:** em `workspace-config-stale-claim` a claim diz *"Suporte Regional"* e o
produtor diz *"Atendimento Norte"*, com o **mesmo** `workspace_id`. Quem ler o nome da claim não
recebe erro — recebe o nome errado, com `200`. É o que o contrato descreve por escrito:
`me_workspace_fields.name` é projeção de **bootstrap** e envelhece após um rename.

E `workspace-config-unavailable` põe as duas coisas juntas: claim `200` **com** nome, produtor
`503`. A massa preserva a diferença entre *"indisponível"* e *"chama-se assim"*.

## 3. O que a massa se recusa a representar

Sem `create`/`delete`/listagem de Workspace (o contrato diz que o CRUD legado **não foi
promovido**), sem membership, sem `description`/`slug`/`tags`/`settings`, sem unicidade de nome, e
**sem objeto único** carregando os dois estados. Dois donos; uma tela não os funde.

## 4. Gates

**WG1–WG12** · **IG1–IG10** · **C1–C8** — 30 casos em `src/test/v1/m42-config-scenarios.test.ts`,
todos exercitando os handlers reais pelo NOME do scenario.

**Mutação: 24/24 mortas pelo gate nomeado** (`docs/m42/mutacoes_m42.py`).

A primeira rodada deu 18/24, e os seis sobreviventes eram **três classes diferentes**:

* **duas lacunas reais de gate.** `JSON.stringify` sobre o catálogo **descarta funções** — o corpo
  dos `handlers`, que é onde o vazamento mora, nunca era olhado; e o gate de campos proibidos
  inspecionava **uma** Instance de uma massa que existe em par (o `slug` entrou na vizinha e
  passou). Corrigidos: leitura do código-fonte com comentários removidos, asserção comportamental
  nos dois scenarios, e varredura de todas as Instances;
* **duas mutações inertes** — declaravam um `const`/uma função que ninguém lia. Mudaram o texto e
  não mudaram comportamento nenhum;
* **duas que só tocavam comentário.** O gate lê o código **com as docstrings removidas**, de
  propósito: estes arquivos explicam justamente o que é proibido, e um cadeado que lê a prosa mede
  a explicação. As duas foram reescritas para vazar de verdade (ler o store legado; mandar o
  cabeçalho interno).

Um erro de processo, registrado: as reescritas de duas mutações foram feitas com `str.replace`
que **não casou** e virou no-op silencioso. Elas "sobreviveram" a uma correção que nunca foi
aplicada. As seguintes usaram edição que falha alto.

## 5. Gates-proxy corrigidos

* `scenarios-catalogo.test.ts` — 44 → 52 e 41 → 49. Quebrou pelo crescimento legítimo do catálogo;
* `catalogo.ts` redigitava `created_at` no rename, e o cadeado M18.5 acusou. Corrigido para
  spread: além do gate, redigitar faria um campo novo do contrato **sumir** no rename, em silêncio.

## 6. Três vermelhos PRÉ-EXISTENTES, medidos com `git stash` antes de qualquer alteração

`contract-operations`, `timeline-client` e `fixtures-presas-ao-schema` já estavam **vermelhos no
`develop`**: o contrato foi de 23 para 27 operações (BD12/BD13/BD14) e as declarações do Front não
acompanharam.

* **B1 remedido = 8**, exatamente o que a BD14 mediu. Declarados com dono: 4 · **M44**
  (Subscription), 3 · **M42** (2 de CFG-03, 1 de CFG-04), 1 **órfã** (`POST /v1/instances`).
  `SEM_CLIENTE_E_SEM_MISSAO_DONA` continua em **1** — o B1 propriamente dito não mudou.
  Materializar scenario **não** fecha dívida de cliente, e "resolver" criando client aqui seria
  implementar a M42 dentro de um checkpoint que a proíbe;
* **selo M17** trazido para o digest vigente, com a reconferência feita e registrada: todos os
  eixos de read-model comparados campo a campo, **nenhum mudou** — o crescimento é puramente
  aditivo. Nota de instrumento: a mensagem do Vitest imprime `expected <atual> to be <esperado>`,
  e ler ao contrário leva a procurar um terceiro contrato que não existe.

## 7. Suítes

| medida | resultado |
|---|---|
| Vitest | **114/114 arquivos, 0 falhas** |
| Typecheck | **6 projetos, 346 arquivos, 0 erros**, cobertura completa |
| Lint | **23 problems (9 erros, 14 warnings)** — idêntico ao HEAD. **Delta ZERO** |
| Playwright | **N/A** — nenhum seam global de browser/MSW mudou. Não é verde: é não-executado |
| Mutação | **24/24** |

## 8. Blueprint repo × vault

Repo atualizado (autoridade operativa). A cópia do vault **se declara snapshot histórico
congelado**, com aviso no topo — mas a própria lista de divergências dela estava velha em quatro
missões ("hoje 35", "hoje 1"). Remedida para *hoje 52* e *hoje 8*. O snapshot continua congelado
de propósito; o que se atualizou foi a **medida da distância**. Nenhum gate foi acoplado a caminho
de vault.

## 9. Preservado, não tocado

As **3 falhas antigas** em `POST /v1/analyses/{id}/data` — `PRE-EXISTING · UNRELATED · STILL
OPEN`. Nenhum scenario desta missão as toca.

Dívidas de release intactas: `ACCOUNT RELEASE MATERIALIZATION PENDING` · `WORKSPACE RELEASE
TOPOLOGY AUTHORITY REQUIRED` · `DISPATCHER RELEASE TOPOLOGY REASSESSMENT REQUIRED`.

## 10. Estado

| item | estado |
|---|---|
| BD12 | CLOSED LOCALLY |
| BD13 | CLOSED |
| BD14 | CLOSED LOCALLY |
| **CFG-03** | **BACKEND READY · SCENARIO READY** |
| **CFG-04** | **BACKEND READY · SCENARIO READY** |
| **M42** | **AUTHORITY READY · SCENARIOS MATERIALIZED · FRONT NOT STARTED** |
| M43 | CLOSED AS PROOF |
| M44 | BACKEND READY · FRONT NOT STARTED |
| M45 | FRONT / QUALITY |

### **M42 · CFG-03/CFG-04 SCENARIOS — PASS · READY FOR IMPLEMENTATION**
