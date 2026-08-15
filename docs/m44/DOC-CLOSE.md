# M44 · COMMUNICATION + REENTRY — DOC-CLOSE da materialização de cenários

Checkpoint de MASSA. **Zero feature implementation.** Sem push, sem deploy, sem Railway.

---

## 1. A superfície pública, medida — e não assumida

O briefing pedia para não assumir nomes de operação. Medido no contrato vivo
(`sentinela-facts/docs/contracts/public-v1.json`, 27 operações, digest `1f1480c5…`):

| operationId | método | path | papel | sucesso |
|---|---|---|---|---|
| `list_subscriptions` | GET | `/v1/subscriptions` | viewer | 200 |
| `create_subscription` | POST | `/v1/subscriptions` | member | 201 |
| `disable_subscription` | **DELETE** | `/v1/subscriptions/{subscription_id}` | member | 200 |
| `rotate_subscription_secret` | POST | `/v1/subscriptions/{subscription_id}/secret` | member | 200 |

**São quatro, e todas exigem `workspace_id` na QUERY.** O `operationId` do `DELETE` é
`disable_subscription`, e o owner marca `active = false` — o método promete remover e a operação
desativa, porque a linha é referenciada pelo histórico de entregas.

**Projeção pública** (`_publica`): `subscription_id · channel · destination · event_types ·
language · active · secret_version · verified_at · created_at`. `create`/`rotate` devolvem
`{subscription_id, secret_version, secret}` — o material sai **uma vez**, e `secret` é `null` para
`email`, com a chave sempre presente. `disable` devolve `{subscription_id, active: false}`.

**O que NÃO existe, e por isso não virou cenário:** verificar (é campo **observado**, produzido por
entrega real — sem OTP, sem expiração, sem tentativas), atualizar, ler uma assinatura por id,
reativar (`reativacao_nao_suportada`) e apagar.

**Problems**: `AssinaturaRecusada → invalid_input` · `AssinaturaAusente → forbidden_or_not_found` ·
`DispatcherIndisponivel → temporarily_unavailable`. **Ausência e indisponibilidade não colapsam no
produtor**, e é isso que a massa preserva.

## 2. O deep link — o Blueprint estava errado, e foi corrigido contra o produtor

O §12 do Blueprint dizia `/analyses/{id}/result` para `analysis.completed` e `result.available`, e
trazia a ressalva de que *"o deep link do e-mail aponta hoje para rota inexistente"*.

O compositor real (`event_dispatcher/adapters/email.py`) monta **um formato só, para os três
eventos**:

```python
link = f"{url_base.rstrip('/')}/analyses/{analysis_id}"
```

Sem ramo por tipo de evento, e com `url_base` **configurada** — nunca lida do payload. A tabela foi
reescrita contra o produtor, a coluna CTA saiu (o texto é do compositor, não do Front), e o
`/analyses/{id}` já estava registrado como canônico em §3.2.

**Isto não é a linha vermelha 9**: o deep link canônico **é** `/analyses/{analysis_id}`. O que havia
era documentação envelhecida, não autoridade contraditória.

## 3. A ambiguidade de contrato — medida, e NÃO resolvida por carona

`contract-authority` está vermelho porque há duas origens no disco. Medidas:

| origem | branch | operações | contém Subscription? |
|---|---|---|---|
| `sentinela-facts/docs/contracts` | `develop` (tip) | **27** | **sim, as 4** |
| `sentinela/docs/contracts` | `fix/argos-analysis-pipeline` (`045e08d`, era BD07) | 12 | **não, zero** |

São **duas worktrees do mesmo repo**. As 12 são um **subconjunto estrito** das 27, e a cópia parada
não define nenhuma operação de Subscription — ela precede a BD11/BD12/BD13/BD14. O digest selado em
`selo.ts` (`1f1480c5…`) é o da origem de `develop`.

**A linha vermelha 12 não dispara:** para a M44 só uma origem define as operações, ela é o tip, e o
selo do Front já a aponta. Não houve escolha silenciosa — houve medição.

**E há um fato acionável:** com `SENTINELA_CONTRACT_ORIGIN=../sentinela-facts/docs/contracts`, a
suíte inteira fica **116/116 arquivos · 1634/1634 testes**. Os cinco vermelhos são **inteiramente**
explicados pela ambiguidade; não há um segundo defeito atrás deles. Resolver isso é missão de
autoridade contratual, não desta — e por isso o repositório **não** carrega a declaração.

## 4. Scenarios — registrados no Blueprint ANTES do código

Dez entradas, §11 linhas 53–62, e §12.1/§12.2 com a superfície e o raciocínio.

| scenario | estado | o que representa |
|---|---|---|
| `subscription-absent` | disponível | `items: []` com `200`; a leitura **não cria** |
| `subscription-current` | disponível | uma verificada e uma **não** (`verified_at: null`) |
| `subscription-destination-diverges` | disponível | conta `ana.ribeiro@cliente.test` × destino `alertas@operacoes.exemplo.test` |
| `subscription-language-diverges` | disponível | conta `pt` × entrega `en` |
| `subscription-disabled` | disponível | `active: false` **continua na lista** |
| `subscription-unavailable` | disponível | `503` nas quatro operações |
| `subscription-invisible` | disponível | anti-oracle nas três causas |
| `subscription-other-workspace` | disponível | dois workspaces, escopo pela query |
| `communication-completed-reentry` | **parcial** | evento é fixture — não há operação pública que o devolva |
| `communication-failed-reentry` | **parcial** | idem |

**Os dois de reentrada nascem PARCIAIS por um motivo que não é falta de massa.** Não existe
`GET /v1/events` no inventário de 27, então um handler de evento inventaria fronteira. O cenário
serve a Analysis de destino; o evento é fixture, e é dela que os gates de deep link leem. Marcá-los
`disponivel` prometeria um seam que não existe.

## 5. A massa é hostil, e o alvo é a inferência plausível

`destination ≠ e-mail da conta` · `language` da assinatura ≠ preferência da conta · dois workspaces
com ids **não deriváveis dos nomes** · `analysis_id` opacos · uma assinatura **fora** de
`result.available`, para "quais eventos ela recebe" ter resposta observável · o par
`result_available: true` / `false` **no mesmo `event_type`**, que é o que mata a derivação.

## 6. Gates

**SG1–SG20** (Subscription) · **RG1–RG10** (reentrada) · **C1–C10** (fronteiras entre donos) —
**36 casos, todos verdes**.

Os que carregam o peso: `SG3` (outage não traz `items`, e é isso que impede a normalização para
`null`), `SG2` (dez leituras seguidas continuam vazias), `SG10` (desativar mantém a cardinalidade),
`SG9` (B não desativa a de A), `C4`/`C5` (o helper não lê `/v1/me` nem preferência de idioma).

## 7. Campanha de mutação — 24/24, e o que ela custou

Primeira rodada: **18/24**. Cinco dos seis sobreviventes eram **defeito do instrumento**, não do
código:

**(a) Gate com acento, filtro sem.** Dois gates foram escritos `criar e acao EXPLICITA` contra um
título acentuado. `vitest -t` selecionou zero casos, o arquivo saiu *"1 passed"* com zero testes,
`returncode` foi `0` — e as duas mutações entraram como **SOBREVIVEU**. O guarda `_selecionou_zero`
não pegou porque a saída **contém** "passed": é o arquivo que passou, não o caso. A checagem
confiável é **anterior** à execução — o nome do gate tem de existir no fonte.

**(b) O stripper de comentários comeu a evidência.** A mutação 18 injeta
`http://localhost:8081/internal/v1/...`, e `semComentarios` removia tudo a partir de `//` — o gate
passou a medir `destination: "http:` e ficou verde sobre a prova que ele mesmo destruiu.

**(c) Âncora acentuada.** Duas mutações ancoravam numa frase com acento e casaram **zero** vezes. O
driver as reportou como `INSTRUMENTO`, que é o comportamento certo.

**(d) Mutação inerte.** Acrescentar um `http.post` ao cenário de reentrada não faz teste nenhum
emitir `POST` — o gate de tráfego é cego a isso. `RG5` ganhou um gate **estrutural**: capacidade de
escrita declarada num cenário de reentrada não pode existir nem sem chamador.

**(e) O alarme de restauração media a fase do trabalho.** Ele comparava com `git status`, e os
arquivos desta missão ainda não estavam commitados — disparava sempre. Passou a comparar com um
**snapshot do conteúdo** dos arquivos que a campanha toca.

## 8. Três catracas acusaram, e as três estavam certas

Ao rodar a suíte completa a assinatura **mudou** — §50 manda investigar, e os novos vermelhos eram
meus:

1. **M07 · anti-monólito** — `catalogo.ts` passou de 1000 linhas (1163). Os cenários da M44 saíram
   para `src/mocks/scenarios/assinaturas.ts`, e o catálogo voltou a 913 como índice.
2. **M18 · o catálogo não redigita read model** — o handler de criar escrevia `created_at` à mão.
   Virou `CRIADA_EM` na massa.
3. **M18 · contagem** — 52 → 62, disponíveis 49 → 57, **parciais 1 → 3**. O Blueprint §11 recebeu as
   dez entradas antes de os números se moverem.

**A extração quebrou um gate meu, e por uma razão que vale registrar:** `C4` recortava de
`assinaturaHandlers` até `function instanceHandlers` — âncora que vivia no `catalogo.ts`. Sem ela,
`indexOf` devolveu `-1` e o recorte engoliu o módulo inteiro, inclusive os cenários que servem
`/v1/me` **de propósito**. O guarda que eu tinha (`length > 200`) protegia contra recorte **vazio**;
o defeito era recorte **largo demais**. Agora o recorte é fechado dos dois lados, e `C5` — que
passava por sorte medindo a região errada — usa o mesmo.

## 9. B1 · antes e depois

**5 → 5.** As quatro operações de Subscription **continuam** em `SEM_CLIENTE_NO_FRONT`, que é o
resultado correto: materializar cenário não fecha dívida de cliente, e criá-lo aqui seria
implementar a missão seguinte. `SEM_CLIENTE_E_SEM_MISSAO_DONA` continua em **1** (`POST
/v1/instances`), órfã porque nenhuma authority mudou para ela.

O gate `contract-operations` fica **SKIPPED** sem a origem declarada — e pulado não é passou. Com
ela declarada: **10/10**, a divergência declarada bate com a real.

## 10. M17

**Contrato não mudou.** O selo não foi tocado, e o digest não foi atualizado por ritual. A
autoridade contratual **continua ambígua**, e está reportada em §3 exatamente como está.

## 11. Provas

| medida | resultado |
|---|---|
| Typecheck | **APROVADO** — 6 projetos, 357 arquivos |
| Vitest (como o repo está) | 110 passed · **5 failed** · 1 skipped (116) — os mesmos 5 de sempre |
| Vitest (origem declarada) | **116/116 arquivos · 1634/1634 testes** |
| Gates M44 | **36/36** |
| Mutação | **24/24 mortas pelo gate nomeado** |
| Playwright | **228/228** — obrigatório porque `catalogo.ts` é infra compartilhada |
| Lint | 23 problems (9 erros, 14 warnings) — **delta ZERO** |
| Backend | **não tocado**; as 3 falhas antigas de `POST /v1/analyses/{id}/data` seguem `PRE-EXISTING · UNRELATED · STILL OPEN` |

## 12. Dívidas de release — preservadas, não executadas

`ACCOUNT RELEASE MATERIALIZATION PENDING` · `WORKSPACE RELEASE TOPOLOGY AUTHORITY REQUIRED` ·
`DISPATCHER RELEASE TOPOLOGY REASSESSMENT REQUIRED`.

## 13. Estado

| item | estado |
|---|---|
| M42 | **CLOSED** · QUALITY GATE PASS 9,2 |
| M43 | **CLOSED AS PROOF** |
| **M44** | **BACKEND READY · SCENARIOS MATERIALIZED · FRONT NOT STARTED** |
| M45 | FRONT / QUALITY |
| Subscription | **BACKEND READY · SCENARIO READY** |
| Reentry | **BACKEND READY · SCENARIO READY** |

### **M44 · COMMUNICATION + REENTRY SCENARIOS — PASS · READY FOR IMPLEMENTATION**

**Próximo checkpoint:** M44 · COMMUNICATION + REENTRY — IMPLEMENTATION (Front real: cliente das
quatro operações, apresentação do estado, distinção absent/outage, `destination` explícito,
`subscription.language` independente, UX de reentrada, deep link, quality stack, Playwright,
capturas).
