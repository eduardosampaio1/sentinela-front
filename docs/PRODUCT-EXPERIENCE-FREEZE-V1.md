# PRODUCT EXPERIENCE FREEZE — V1

> **Autoridade de PRODUTO e COMPORTAMENTO.** O que a V1 faz, o que exige, o que proíbe e o que
> fica de fora. Não contém regra visual (→ `FRONT-DESIGN-SYSTEM-CONSTITUTION.md`), mapa de
> superfícies (→ `EXPERIENCE-BLUEPRINT-V1.md`) nem regra de engenharia
> (→ `FRONT-ARCHITECTURE-AND-MOCK-CONTRACT.md`).
>
> **Roteador:** `INDICE-DE-AUTORIDADE-V1.md` · **Acima deste documento:** Regras de Ouro globais ·
> DEC anti-monólito · Architecture Freeze Ondas 1–8 · contrato público *authoritative*.
>
> Este documento carrega a **regra**, não o raciocínio. Cada decisão aponta para a evidência.

---

## 1. Identidade, hierarquia e modelo de administração

| # | regra | evidência |
|---|---|---|
| **D1** | **Administrador único na experiência.** A infraestrutura suporta múltiplos usuários; a V1 não expõe colaboração. Todo usuário nasce com autonomia sobre o que criou | `DISCOVERY-FRONT-EXPERIENCE` |
| **D2** | **Nenhuma UI antecipando colaboração** — sem convite, equipe, Viewer/Analyst, papéis, permissões, aprovação ou administração de membros | idem |
| **D3** | **Não mostrar "Admin"** em badge, chip, seletor ou texto. Papel só informa quando existe outro papel possível | idem |
| **D4** | **Workspace** = conta / espaço operacional | idem |
| **D5** | **Instância** = sistema **+** ambiente, **entidade única na tela**. Sem árvores de projeto/sistema/ambiente | idem |
| **D6** | **Análise** = execução sobre uma base enviada **para uma Instância** | idem |
| **D7** | **Hierarquia oficial: `Workspace → Instâncias → Análises`** — orienta navegação, breadcrumb, Home, histórico, deep link, nova análise e contexto do resultado | idem |
| **D8** | **Momentos da jornada, não personas.** O produto reage ao **estado**, nunca a Viewer/Admin/Analista | idem |
| **D10** | A regra *"não tocar no ARGOS"* está **REVOGADA**, substituída por regra atemporal de escopo | idem · `REGRA DE OURO ZERO` §6 |

### Instância — decidida, autorizada e parcialmente entregue

| # | regra | evidência |
|---|---|---|
| **D11** | **A V1 terá Instância.** Entra como **delta explícito de backend**, posterior ao freeze atual. Não descongela nem reescreve as Ondas 1–8: é frente própria, com contrato, testes, provas e freeze próprios | `DISCOVERY-FRONT-EXPERIENCE` (Q1′) |
| **D12** | **Instância é gate de RELEASE / Big Bang — não é gate de desenvolvimento.** As frentes avançam sem ela, mas **não podem cristalizar `Workspace → Análise` como arquitetura definitiva** | idem |

> ✅ **Delta de Instância AUTORIZADO, EXECUTADO e CONGELADO** — `BD02`, com `FREEZE: PASS` e E2E
> por processos reais. O gate **B3 está FECHADO**. O contrato público publica `create_instance`,
> `list_instances` e `get_instance`; `instance_id` é campo publicado do read model de Analysis.
>
> **Isto não quer dizer que Instância está entregue.** O domínio existe e é construível; das sete
> superfícies, **três foram entregues** — INST-01 e INST-03 na M36, **INST-04 na M37** — e
> **quatro não têm caminho hoje**:
>
> | superfície | estado | razão literal |
> |---|---|---|
> | **INST-02** Estado | 🔴 delta declarado | não há estado corrente publicado — o read model é `instance_id`, `name`, `created_at` |
> | **INST-05** Baseline | ✅ **entregue — M40** | *(era: "baseline não existe no contrato público; nenhuma BD o cria" — verdade até 2026-08-13)*. A **BD10** publica `GET`/`POST`/`DELETE` `/v1/instances/{id}/baseline` e o filtro de candidatos `baseline_eligible`. A tela pode mostrar/definir/substituir/remover; **não** pode evolução, delta, melhora, piora, tendência nem ranquear candidatos — isso é comparação longitudinal, que segue sem produtor |
> | **INST-06** Evolução | 🔴 delta declarado | evolução longitudinal sem produtor; **saiu da M39** em 2026-08-12 |
> | **INST-07** Configuração | 🔴 delta declarado | não há operação de configuração — nem `update`, `PATCH` ou `delete`; D22 depende de **BD04** |
>
> E **criar Instância** é o caso inverso: a operação existe no contrato e o Discovery §9.1 tem o nó
> *"Criar primeira Instância"*, mas **nenhuma superfície do Blueprint e nenhuma missão do PLAN** a
> reivindicam. É o que mantém **B1 aberto em 1**. Owner semântico: Produto/Arquitetura de Instância.
>
> *(Reconciliado em 2026-08-12 sobre `064247b`. Até então este bloco dizia "permanece NÃO
> AUTORIZADO", o que deixou de ser verdade com o freeze da BD02.)*

---

## 2. Home operacional

| # | regra | evidência |
|---|---|---|
| **D9** | A Home do Workspace tem **quatro regiões**: 1 Ações necessárias · 2 Em andamento · 3 Instâncias · 4 Resultados recentes. **Não é dashboard de KPIs** | `DISCOVERY-FRONT-EXPERIENCE` |

A Home responde *"o que precisa de mim agora?"*, não *"quantos temos?"*. Empty, loading e error são
estados obrigatórios e **distintos** (`Blueprint` §4.3).

---

## 3. Estados e semântica — o vocabulário congelado

**São DOIS vocabulários e eles não se colapsam.** Misturá-los produz uma máquina de estados que
não existe.

**A) estado da ANÁLISE** (`public_states`, 8):
`preparing · receiving · queued · running · recovering · needs_mapping · completed · failed`

**B) eixos de progresso** (`progress_axes`, 4 independentes):

| eixo | estados |
|---|---|
| `engine` | `pending · running · ready · failed` |
| `analytics` | `pending · running · ready · partial · withheld · failed · unknown` |
| `export` | `unavailable · preparing · ready · expired · failed · unknown` |
| `final_result` | `pending · ready · failed` |

> `pending` e `unknown` **não** são estados de análise. `recovering` e `needs_mapping` **não** são
> estados de eixo.

### Significados que a interface não pode borrar

| termo | significa | **nunca** significa |
|---|---|---|
| `partial` | terminou e parte foi omitida para não reconstruir grupos pequenos | erro · incompleto por falha |
| `withheld` | existe e **não pode** ser mostrado; `snapshot` vem nulo | não existe · zero |
| `needs_mapping` | **parada de negócio** — espera uma pessoa | erro · pendência de sistema |
| `recovering` | re-enfileirada após uma tentativa | falhou |
| `unknown` | não sabemos | zero · nenhum |
| `expired` | não entrego mais | não existe mais (`purged`) |
| **ausência** | não há sinal | zero · "resolveu" · "sumiu" |
| **delta** | diferença medida entre dois pontos comparáveis | **drift** |
| **drift** | mudança de comportamento no tempo | **delta** |

### Disponibilidade progressiva

| # | regra | evidência |
|---|---|---|
| **D13** | **Analytics aparece assim que `analytics = ready \| partial`**, mesmo com `final_result` pendente. Isso é **disponibilidade progressiva** — e **não** se chama "resultado parcial" só porque a Engine ainda roda. `analytics = partial` mantém significado próprio | `DISCOVERY-FRONT-EXPERIENCE` §9.3, §9.5 |
| **D14** | **A V1 exibe as 4 contagens.** Nenhum percentual de cobertura calculado no Front, e **nenhum delta de backend** só para criar o percentual. Se existir um dia, vem do backend como métrica canônica | idem |

---

## 4. O que está FORA da V1

| # | regra | evidência |
|---|---|---|
| **D15** | **Cancelamento fica FORA.** Nenhum CTA ou promessa de cancelar onde o backend não suporta. O sistema representa honestamente que **uma análise iniciada não pode ser cancelada nesta versão**. Dívida/capacidade futura, **não** bloqueio do Big Bang | `DISCOVERY-FRONT-EXPERIENCE` |
| **D16** | **Uma única noção de exportação: o artefato do backend.** O CSV local **sai**. Com `export = ready`, download; nos demais estados, representar o estado vindo de `/progress` | idem |
| **D21** | **Excluir conta fica FORA.** Remover a promessa; **nenhum CTA pode permanecer** enquanto não existir operação real | `DISCOVERY-0B` |
| — | **Registro de usuário** (`/register`) fica FORA sem decisão de onboarding | `Blueprint` §4.1 |
| — | **"Arquivar"** não existe como conceito (D28) | `DISCOVERY-0C` |
| — | **Drift** fica fora enquanto não houver referência + limiar + owner canônico | `DISCOVERY-0C` §5 |

---

## 5. Configurações e ownership

| # | regra | evidência |
|---|---|---|
| **D19** | **Alteração de senha/credencial SAI da SPA** e usa o Account Management do provedor canônico. Não criar backend novo para reproduzir formulário de identidade | `DISCOVERY-0B` |
| **D22** | **Ownership, não "uma tela ou duas":** Conta/Preferências → superfície canônica **Configurações**; Workspace → configuração contextual do **Workspace**; Instância → configuração contextual da **Instância**. `/profile` e `/dashboard/settings` são superfícies **legadas a convergir** | idem |
| **D23** | **Idioma entra na V1. Tema NÃO entra** sem prova de suporte canônico completo | idem |

> 🔶 **D23 continua sendo a AUTORIDADE sobre tema.** `P31` (Light/Dark) permanece **proposta
> técnica** com custo e viabilidade medidos, e **não é requisito da V1**. Só vira decisão com
> autorização explícita do owner. Ver `FRONT-DESIGN-SYSTEM-CONSTITUTION` §P31.

---

## 6. Comunicação e reentrada

| # | regra | evidência |
|---|---|---|
| **D20** | Templates transacionais carregam **identidade visual mínima e consistente**, preservando como critérios de aceite: `lang`, HTML semântico, links descritivos, acessibilidade e **legibilidade sem CSS**. E-mail operacional **não vira peça de marketing** | `DISCOVERY-0B` |
| **D24** | **Destinatário = e-mail canônico/verificado do OWNER do Workspace.** Sem configuração arbitrária, sem endereço vindo do Front, sem e-mail inventado pelo compositor. Resolução **server-side** | `DISCOVERY-0C` §1 |

**Regra arquitetural:** notificação assíncrona **origina-se do estado canônico do backend**, nunca
de estado do browser.

> 🔴 **Q15 permanece prova técnica.** A cadeia `Workspace owner → identidade → e-mail →
> `Mensagem.destino`` **não está comprovada**. **Comunicação externa não pode ser declarada
> operacionalmente fechada** (gate **B5**).

---

## 7. Longitudinalidade

**Regra que atravessa tudo:** *o Front nunca faz matching heurístico entre duas análises para
concluir que um problema "é o mesmo".* Ou existe **identidade canônica**, ou a afirmação não é feita.

| # | regra | evidência |
|---|---|---|
| **D25** | **Baseline é uma análise MARCADA EXPLICITAMENTE.** Não é a primeira automaticamente nem janela móvel. Uma Instância **pode não ter**. É identificável e versionável. **Nunca muda em silêncio.** Pertence à **Instância**. Análise que é baseline ativo **não pode ser excluída** até ser removida/substituída | `DISCOVERY-0C` §3 |
| **D26** | **Quebra de versão quebra a comparabilidade numérica.** Mudou `indicator_registry_version` ou `measure_schema`: **não conectar valores como mesma série**. Descontinuidade **explícita** na mesma linha do tempo. **Nunca** representar como aumento ou queda | idem §2 |
| **D27** | **Recomendações longitudinais entram na V1**, como delta próprio. **Nunca parear por título, texto, similaridade ou heurística.** Sem `recommendation_id` no documento canônico, **nenhuma afirmação** de persistiu/apareceu/sumiu | idem §4 |
| **D29** | **As duas superfícies de comparação existem, com UMA regra canônica.** No Resultado: resumo *"esta análise vs. imediatamente anterior"*. Na Instância: superfície de Evolução/Comparação. **Ausência nunca vira automaticamente "resolveu"** | idem §2, §11 |

### D26 no contrato v3 — dois níveis, não um

O v1 só sabia dizer "o documento inteiro é comparável ou não". O v3 publica `method_version`
**por medição**, além das versões de documento. A comparabilidade passa a ter dois níveis:

- **documento** — D26 inalterada: quebra de `indicator_registry_version` ou de schema torna
  **nenhum** par comparável. Continua sendo de documento, nunca por linha.
- **par** — mesmo com documento compatível, cada família tem pré-condições próprias
  (`scale`, `unit`, `currency`, `state`, `method_version`). O par que falhar sai
  **`NOT_COMPARABLE`**, e isso **não contamina** os outros pares.

Nada é convertido: `ratio_unit` × `score_100` e BRL × USD são **incompatíveis**, não
convertíveis. Não há câmbio no Front.

> **A/B são duas posições, não tempo.** A ordem vem da URL. "Anterior/atual" sugeriria série
> onde pode não haver — e com comparabilidade por família, pode não haver em algumas e haver
> em outras.

**As quatro camadas** (`DISCOVERY-0C` §12): **Continuidade** ✅ disponível hoje ·
**Identidade** ❌ (é a Instância) · **Referência** ❌ · **Comportamento** ❌.

**A série tolera buraco** (Q23): excluir um ponto do meio remove um ponto, não invalida os demais.
**R4 (baseline ativo) é o único bloqueio longitudinal.**

---

## 8. Trust — "por que confiar neste resultado?"

**Nenhum "trust score" inventado.** Só informação canônica existente — e ela existe: **11 de 11**
elementos disponíveis (`WS-A` §A9).

| faixa | elementos |
|---|---|
| **já consumido** | `result_schema_version` · `indicator_registry_version` · `snapshot_contract_version` · `snapshot_digest` · `projection_digest` · `disclosure_rule_version` · `withheld{applied,output_count,reason_code}` · `generated_at` · contagens A/B/C · `min_group_size` **(só em `ResumoDeDistribuicao`)** |
| **contratado, não consumido** | `method_id` · `method_version` · `method_parameters` · `method_definition_digest` · `privacy_policy_version` · `top_k` · `max_tracked_categories` · `max_tracked_values` · `max_time_buckets` · `series_contract_version` · `plan_contract_version` · `plan_digest` · `min_group_size` **em Concentração e Série** |
| **operação sem cliente** | `timeline` (gate B1) |

> **Nenhum delta de backend é aberto por Trust.** O que falta é **ler o que já chega** — delta de
> frontend. `method_definition_digest` é o que torna `method_version` uma **afirmação verificável**.

---

## 9. Lifecycle e exclusão

| objeto | retenção | expiração | purge | exclusão pelo usuário |
|---|---|---|---|---|
| **Análise** | indefinida | — | — | **D28**, só quando o backend suportar |
| **Artefato de entrada** | dono é o **Ingestion** | — | purga com **certidão durável** | ❌ não pelo caminho da análise — **sinaliza** |
| **Export** | por prazo | `expired` | `purged_at` | — |
| **Workspace / Instância** | — | — | — | fora da V1 / delta |
| **`prepared` abandonado** | — | — | — | ❌ não é ação do usuário — 🔴 **nunca expira** (gate B8) |

| # | regra | evidência |
|---|---|---|
| **D28** | **A V1 permite EXCLUIR análises; "arquivar" não existe.** Só com operação real e lifecycle definido. **Nenhum botão fake.** Toda exclusão exige **digitar exatamente o nome da Instância** — não basta *Confirmar*, checkbox ou digitar "EXCLUIR" | `DISCOVERY-0C` §7.1 |
| **D30** | **Auditar a exclusão não significa preservar o conteúdo excluído.** A evidência conserva **somente** `analysis_id · workspace_id/instance_id · actor · timestamp · motivo/ação · resultado da operação`. **Nunca** payload, resultado, evidência, recomendações, projeção ou facts | idem §15 |

**Restrições congeladas:** exclusão **nunca** é cancelamento disfarçado (R1) · `prepared`
abandonado é lifecycle, não ação destrutiva do usuário (R2) · só análises **terminais** são
candidatas (R3) · **baseline ativo bloqueia** (R4) · evidência auditável sem preservação indevida
(R5 = D30).

**Cascade decidido** (`DISCOVERY-0C` §14.7): o job e o que cascateia dele, mais v1/operação/inbox
por decisão explícita. Fora do Orchestrator, **por sinalização** — nenhum cascade atravessa
fronteira de serviço. Timeline **preservada como fato do processo**, conteúdo destruído.

---

## 10. Navegação e rotas públicas

**Hierarquia oficial** (D7): `Workspace → Instâncias → Análises`.

**Rotas públicas aprovadas** (`WS-A` §A10, ampliadas pela Two-View Recovery):

```
/analyses
/analyses/new
/analyses/:id            ← lifecycle da Analysis
/analyses/:id/argos      ← visão ARGOS      (fonte: analysis-result-v3)
/analyses/:id/analytics  ← visão Analytics  (fonte: GET /analytics)
/analyses/:id/result           LEGACY COMPATIBILITY
/analyses/:id/result#comparison LEGACY COMPATIBILITY
```

`/canonical/*` é **interno / compatibilidade**, nunca IA pública.

🔶 **`/home → /` NÃO congelado** — falta provar o *ownership* de `/`, hoje da `LandingPage`.
Pergunta aberta registrada, não decisão adiada em silêncio.

✅ **Rotas de Instância entregues pela M36** — `/instances` e `/instances/:instanceId`. B3 fechou com a BD02; `/instances/{id}/evolution` segue conceitual, por ser outra superfície.

---

## 10.1 ONE ANALYSIS → TWO VIEWS — congelado

Uma Analysis oferece **duas leituras complementares**, de dois motores independentes, e elas
não se fundem na tela.

| # | regra | por quê |
|---|---|---|
| **T1** | **Uma Analysis, duas visões canônicas.** ARGOS e Analytics são leituras da MESMA Analysis — nunca duas Analysis | o lifecycle, a identidade e o histórico são um só |
| **T2** | **Visão ARGOS** = `/analyses/:id/argos`, fonte única `analysis-result-v3` | é o contrato ARGOS-only; o v2 fundido está congelado como legado |
| **T3** | **Visão Analytics** = `/analyses/:id/analytics`, fonte única `GET /analytics` | o bloco analítico embutido no v2 **não** é segunda fonte canônica |
| **T4** | **Subrotas irmãs, não abas.** O produto não tem o pattern `Tabs`, e nenhuma autoridade o menciona | inventá-lo seria um terceiro conceito estrutural sem equivalente; subrota dá deep link, refresh e histórico |
| **T5** | **Não fundir.** Nenhuma superfície nova combina dado ARGOS com dado Analytics num documento lógico | fundir é exatamente o que o v3 desfez, e o custo foi um programa inteiro |
| **T6** | O lifecycle (`/analyses/:id`) mostra identidade, estado, progresso, disponibilidade dos componentes e as **entradas** das duas visões — e **não** vira terceira página de dados | dado em três lugares diverge em dois |
| **T7** | **`/result` é LEGACY COMPATIBILITY.** Continua funcional e não recebe feature nova; nenhuma navegação canônica nova aponta para ele quando a visão correta existe | deep link antigo não pode quebrar, e a aposentadoria é decisão posterior |

### Status ≠ status de motor

`StatusBadge` continua representando o **lifecycle da Analysis** (os 8 `public_states`). Não é
status ARGOS nem status Analytics. Os componentes têm estados próprios, no vocabulário já
congelado dos eixos (§3) — e **D13 continua valendo**: uma Analysis pode ter Analytics
`ready|partial` com ARGOS ainda pendente, sem virar duas Analysis.

### Backend first

O Front **apresenta, agrupa, ordena quando o contrato autoriza, navega, formata e explica**
`availability`/`reason`. O Front **não** cria métrica, não calcula escore, não deriva faixa de
risco, não calcula Drift nem delta, não normaliza escala em silêncio, não converte moeda, não
transforma ausência em zero e não fabrica família ausente.

**Sem produtor e contrato público, não existe superfície.**

---

## 11. Idioma

**PT-BR e EN são requisito da V1** (D23). Nenhum texto hardcoded fora da solução canônica de i18n.
Orçamento de layout: **+30 %** de EN para PT-BR; nenhum componente com largura fixa de rótulo.
Paridade `pt.json` × `en.json` é gate de UI COMPLETE (critério 18).

**Nenhuma tela nova pode introduzir sinônimo** para conceito congelado no §3.

---

## 12. Dívidas de produto registradas

| dívida | classe |
|---|---|
| **D17** — decomposição de `LandingPage` (1.215) e `AionPage` (1.180) é **missão própria**. Nenhuma responsabilidade nova entra nesses arquivos | bloqueio >1.000 linhas ativo |
| **D18** — **Zod não substitui validação canônica.** `validator.ts`, `validatorV2.ts`, `leitores.ts` ficam como estão. Zod só em formulários de entrada. Trocar fronteira validada exigiria missão de **paridade formal** | regra congelada |
| **B4** — `recommendation_id` não chega ao documento canônico | bloqueia D27 |
| **B6** — Supabase Auth vivo e roteado; Supabase está **aposentado** por decisão arquitetural | delta obrigatório de erradicação, frente própria |
| **B7** — preferência de idioma **sem owner, sem persistência e sem contrato** (medido na Discovery da M41). Domínio **Account** congelado em 2026-08-13 (`ARQ - Domínio Account`, vault); falta a Backend Authority. Congelado junto: idioma é **global por usuário**, `stored = null` ≠ `stored = "en"`, `effective = "en"` sem escolha, e a escolha **nunca** é persistida sozinha | bloqueia D22/D23 |
| **M39 · comparação** — ✅ **EXECUTADA**. Escopo reduzido, autoridade realinhada. É **ARGOS A × ARGOS B sobre `analysis-result-v3`** — nunca v1/v2, nunca `/analytics`. A V1 compara **duas** famílias: `indicators` e `dimensions`. As outras nove estão classificadas em `result/familiasDaComparacao.ts`, com catraca executável (`evo02-m39-freeze.test.ts`) provada por 9 mutações | executada em 2026-08-13 |
| **FULL INGESTION TOPOLOGY E2E** — a jornada completa de upload (`upload → dataset_ready → promotion-worker`) não tem prova local: exige seis processos e há três de pé. Não redefine ARGOS/Analytics e não bloqueia as duas visões | gate de release final |

---

## Estado deste documento

**FROZEN.** D1–D30 e as decisões posteriores aceitas. Alterar exige contradição objetiva ou
decisão explícita do owner.

**Permanece como PROPOSTA, não requisito:** `P31` (Light/Dark) — D23 vence.

**Gates abertos que afetam produto:** ver `INDICE-DE-AUTORIDADE-V1.md` §Open Gates.
