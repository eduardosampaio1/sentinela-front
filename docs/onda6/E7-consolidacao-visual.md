# Onda 6 — E7: consolidação visual, Design System, acessibilidade e responsividade

Escopo (item 19): **somente** as superfícies canônicas E2–E6, a página canônica de resultado (E5)
e o **shell realmente tocado** por elas. Landing, marketing e módulos mortos ficam para a Onda 8 —
os 958 hardcodes do frontend inteiro **não** foram atacados.

## 1. Fonte de verdade (item 20)

Preservada a decisão da E1: o **runtime ativo** manda.

| Camada | Papel |
|---|---|
| `src/styles/globals.css` | variáveis HSL do tema (shadcn) — `--background`, `--foreground`, `--card`, `--muted-foreground`, `--border`, `--primary`, `--destructive`, e agora `--success`/`--warning`/`--critical` |
| `tailwind.config.ts` | mapeia as variáveis para utilitários (`bg-background`, `text-muted-foreground`, …) |
| shadcn/Radix | primitivas (Button, DropdownMenu, …) |
| `src/styles/tokens.css` | conjunto `--color-*` legado, **não** é o que os utilitários consomem |

Nada de `DESIGN.md` ou tokens órfãos aplicados por decreto.

## 2. Migração de hardcodes (item 22)

31 ocorrências de hex/rgba nas superfícies tocadas → **0**:

| Arquivo | Antes | Depois |
|---|---|---|
| `src/shell/AppShell.tsx` | 1 | 0 |
| `src/shell/TopBar.tsx` | 14 | 0 |
| `src/shell/Sidebar.tsx` | 29 | 0 |
| `src/shared/states/LoadingState.tsx` | 16 | 0 |
| `src/features/canonical-analysis/**` | 0 | 0 (já limpo pelo cadeado da E4) |

**Não foi substituição textual cega**: antes de trocar, converti as HSL do runtime para hex e
comparei canal a canal com cada hardcode — `background`, `foreground`, `card` e `primary` diferem
em ≤5/255 (imperceptível). O único desvio grande era `muted-foreground`, tratado abaixo.

## 3. Contraste WCAG AA (itens 25 e 30) — medido, não presumido

`e2e/canonical-contrast.spec.ts` lê a **cor computada** de cada texto visível e o **fundo efetivo**
(subindo a árvore até um fundo opaco) nas rotas canônicas e calcula a razão real.

**Reprovavam AA antes da E7** (todos no chrome do shell):

| Elemento | Antes | Depois |
|---|---|---|
| "Active context" (Sidebar) | 2.58:1 ❌ | ≥4.9:1 ✅ |
| Nav desabilitada ("Dashboard") | 2.58:1 ❌ | ≥4.9:1 ✅ |
| Badge "needs run" | **1.29:1** ❌ | ≥4.9:1 ✅ |
| Iniciais do avatar ("ER") | 3.69:1 ❌ | `text-foreground` ✅ |
| Metadados dos cards da lista/resultado | 4.26:1 ❌ | 4.96:1 ✅ |

**Ajuste de token justificado por medição**: `--muted-foreground` `215 20% 50%` → `215 20% 54%`.
Motivo: 50% dá **4.29:1 sobre `card`** (abaixo do AA 4.5) — reprovava nos cards da própria jornada
canônica; 54% dá **4.96:1 sobre card** e **5.29:1 sobre background**. Mesmo matiz e saturação, só
luminosidade.

`--primary` (#4F59E8) tem 3.69:1 sobre o fundo: serve para **UI/large** (botões, bordas, ícones),
nunca para corpo de texto — por isso as iniciais do avatar saíram de `text-primary`.

## 4. Tokens fantasma (achado do Codex E5 R1)

`tailwind.config.ts` referenciava `hsl(var(--success))`, `--warning` e `--critical`, mas essas
variáveis **não existiam** em `globals.css`: as utilidades `text-success`/`bg-success`/`*-critical`
resolviam para **nada**. Definidos com as cores que o próprio shell já usava (#34D399, #FBBF24) e
um vermelho crítico. `critical` é usado pela landing (fora do escopo) — defini-lo **restaura a
intenção do config**, não reforma a landing.

**Gate permanente** (`src/test/v1/design-tokens.test.ts`): todo token referenciado pelo
tailwind.config precisa existir em globals.css + zero hardcode nas superfícies consolidadas + a
lista de superfícies não pode encolher silenciosamente.

## 5. Estados comuns (item 24)

Unificados pela máquina de apresentação da E3 (`stateView`) e pela matriz da E6 (`errorView`):
- `queued`/`recovering` = espera **neutra** com spinner indeterminado — nunca aparência de falha;
- `failed` = `role="alert"` + título + mensagem + ação, **não depende só de cor** (texto explícito);
- indisponível/parcial/schema incompatível = texto próprio, distinto de zero real.

## 6. Responsividade (item 26)

Provada em browser real (Playwright): desktop 1280, tablet 768, mobile 375 nas rotas de entrada,
lista e resultado — **zero overflow horizontal** (`scrollWidth − clientWidth ≤ 1`), dropzone
utilizável, ação alcançável na viewport, região de estado visível. Listas usam cartões empilháveis
(sem tabela larga no mobile).

## 7. i18n (item 28)

Todas as mensagens novas existem em **EN e PT** (`canonicalAnalysis.result.*`, `.list.*`,
`.action.*`, `.problem.*`), incluindo rótulo **e descrição** de cada indicador. Números, moeda e
data usam `Intl` com o locale ativo. Nenhum código de schema aparece para o usuário.

## 8. Performance (item 27)

- `ResultPage` em **chunk lazy próprio** (só carrega quando há resultado a ver).
- Sem N+1: a lista não consulta resultado por linha (cadeado da E4).
- Sem parsing analítico pesado no browser: o adapter só formata.
- Polling encerra em terminal; `completed` sem resultado segue em cadência moderada.
- Sem memoização especulativa.
