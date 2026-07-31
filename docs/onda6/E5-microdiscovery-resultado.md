# Onda 6 — E5: microdiscovery do resultado canônico (matriz Backend First)

Entregável obrigatório do item 1 da E5, produzido **antes** de qualquer renderização.
Conclusão: **BLOQUEIO CRÍTICO #15** — o resultado público canônico não contém dados suficientes
para uma experiência minimamente útil. Nenhuma UI de resultado foi fabricada.

## 1. O que o contrato público define

`docs/contracts/public-v1.json` (congelado, repo sentinela) — `result_read_model_fields`:

```json
["analysis_id", "result_schema_version", "result"]
```

`public-v1.types.ts` (idêntico nos dois repos):

```ts
export interface AnalysisResultView {
  analysis_id: string;
  result_schema_version: string;
  result: unknown;   // ← OPACO: nenhum campo contratado
}
```

O contrato **não define nenhum campo dentro de `result`**: sem métrica, sem unidade, sem
denominador, sem recomendação estruturada, sem evidência, sem seção. `result` é um deliverable
opaco cuja forma seria indicada por `result_schema_version` — mas **não existe documento de schema**
para `analysis-result-v1`/`result-v1` em nenhum dos três repositórios (busca por
`analysis-result-v1|result-v1` só acha o próprio literal em fixture de teste e num comentário).

## 2. O que o backend realmente produz

- **Result Store** (`sentinela-orchestrator/migrations/0009_result_store_canonico.sql`):
  `result_json jsonb not null` — blob íntegro numa coluna só, com `result_checksum` e
  `serialized_size_bytes`. Nenhum schema de campos. `measurement_contract_version` existe mas tem
  `default ''`.
- **Produtor** (`sentinela/workers/authoritative_engine.py:61,160,207`):
  `ConstruirResultado = Callable[[Any, Any], dict[str, Any]]` é um **parâmetro injetado**.
  Todos os call-sites são **testes** (`tests/test_5_5_gate_e2e_publico.py:414`,
  `tests/test_c3_gate_e2e_produtor_a_completed.py:342`, `tests/_worker_autoritativo_subprocesso.py:72`,
  `tests/test_o54_authoritative_engine.py:170`), com stubs
  `{"summary": {...}}` / `{"payload": saida}`. **Não há implementação de produção.**
- **Rota pública** (`sentinela/api/routes/analyses_v1.py:405-437`): repassa
  `resultado.get("result")` sem interpretar (`.get` defensivo), com o comentário
  "`result` é o DELIVERABLE canônico (schema de domínio result-v1)".

Ou seja: o que hoje chegaria à UI canônica é `{"summary": {...}}` — **forma de teste**, não contrato.

## 3. Onde vivem os indicadores atuais (dashboards legados)

`behavior_score`, `intent_coverage`, `token_waste`, `aiHealth`, `CPUO`, verdict, recomendações e
economics são produzidos e lidos pelo **caminho legado**:
- front: `src/adapters/{analysisAdapter,decisionAdapter,economicsAdapter}.ts` → `@/lib/api` (API/Supabase legados);
- backend: `workers/job_runner.py` (`executive_diagnosis`/`summary`/`strategic_recommendation`) e
  `infra/_supabase_interpretations.py` / `infra/legacy_analysis_view.py` → **Supabase**, não o Result Store.

Nada disso passa por `/v1`. Consumir esses campos na jornada canônica seria **fallback legado**
(bloqueio #9) e **acesso a Supabase** (bloqueio #8).

## 4. Matriz congelada (Indicador → campo canônico → decisão)

| Indicador (tela atual) | Rótulo atual | Tela | Campo canônico público | Schema | Unidade | Denominador | Transformação | Disponibilidade | Classe | Decisão |
|---|---|---|---|---|---|---|---|---|---|---|
| Behavior Score | "Behavior" | dashboard-decision | **nenhum** | — | — | — | — | ausente no `/v1` | **D/F** | não calcular; fora da jornada canônica |
| AI Health | "AI Health" | dashboard-decision | **nenhum** | — | — | — | — | ausente | **D/E/F** | remover (usado como `confidence` — equivalência falsa) |
| Intent Coverage | "Coverage" | dashboard-v2 | **nenhum** | — | — | — | — | ausente | **D/E/F** | remover (multiplicada 2×) |
| Token Waste | "Waste" | economics | **nenhum** | — | — | — | — | ausente | **D/E/F** | remover (contagem exibida como %) |
| CPUO | "Custo por unidade" | economics | **nenhum** | — | — | — | — | ausente | **D/F** | remover (3 formatos; sem contrato de moeda) |
| Drift (RunCompare) | "Drift" | compare | **nenhum** | — | — | — | — | ausente | **E/F** | remover (usava cross-intent) |
| Verdict | "Veredito" | dashboard | **nenhum** (calculado no browser) | — | — | — | — | ausente | **E** | proibido (cadeado) |
| Recomendação priorizada | headline | dashboard | **nenhum** (priorizado localmente) | — | — | — | — | ausente | **E** | proibido (cadeado) |
| Guardrail/Compliance | badges | dashboard | **nenhum** | — | — | — | — | ausente | **D** | não transportar |
| loadingProgress | barra % | dashboard | **nenhum** (inventado) | — | — | — | — | ausente | **E** | já proibido desde a E3 |
| analyzed_at | data | dashboard | **nenhum** (`new Date()` no cliente) | — | — | — | — | ausente | **E** | usar `created_at`/`updated_at` do STATUS, nunca fabricar |
| record_count | "Registros" | — | `record_count` (**status**, não result) | public-v1 | contagem | — | formatar número | disponível | **A** | já renderizado (E4) |
| created_at / updated_at | data | — | `created_at`/`updated_at` (**status**) | public-v1 | timestamp | — | localizar data | disponível | **A** | já renderizado (E4) |
| result_available | "Resultado pronto" | — | `result_available` (**status**) | public-v1 | booleano | — | mapear enum→texto | disponível | **A** | já renderizado (E4/E6) |
| **conteúdo do resultado** | dashboard inteiro | — | `result` (**opaco**, `unknown`) | sem schema | — | — | — | **sem contrato** | **D** | **não renderizar** |

**Contagem por classe:** A = 3 (todos já entregues nas E4/E6, e todos vêm do *status*, não do resultado)
· B = 0 · C = 0 · D = 6 · E = 6 · F = 6 (sobrepostos) · **indicadores canônicos do RESULTADO = 0**.

## 5. Por que isto é o bloqueio crítico #15 (e não um fechamento "sem alguns indicadores")

O critério 32 permite fechar a E5 sem indicadores desde que "não sejam essenciais para tornar o
resultado minimamente compreensível". Aqui **não faltam alguns indicadores: faltam todos**. O
resultado público não expõe um único campo analítico contratado. Uma página de resultado só poderia
ser construída:

1. **inventando métricas** → bloqueio #4 (calcular métrica inexistente no backend);
2. **lendo o payload legado/Supabase** → bloqueios #8 e #9;
3. **despejando o blob opaco na tela** → bloqueio #10 (expor estado/metadado interno) — e sem
   significado para o usuário.

As três saídas são proibidas. Por isso a E5 **para aqui**, exatamente como o item 32 manda
("parar como bloqueio crítico antes de fabricar UI").

## 6. O que destravaria a E5 (decisão de backend, fora do meu escopo)

Um contrato público do deliverable — por exemplo `result-v1` com, no mínimo:
`schema_version`, lista de indicadores com `{id, value, unit, denominator, availability}`,
seções suportadas e (se houver) recomendações estruturadas com prioridade **já definida pelo
backend**. Com isso a E5 vira trabalho direto: adapter único version-aware + descriptors + UI.

Enquanto isso não existe, o `result_available=true` da E6 continua correto e a jornada canônica
mostra "resultado em preparação" sem prometer dashboard.
