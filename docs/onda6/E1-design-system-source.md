# Onda 6 — E1 · Fonte-da-verdade do Design System (runtime ATIVO)

> Registro versionado (item 8). A **autoridade** do Design System é o **runtime ativo** — o que o
> app carrega e usa de fato — **não** documentos ou arquivos que existem no repo mas não são
> carregados. Verificado por inspeção em `4255932`.

## Autoridade (o que o runtime carrega de fato)

| Camada | Arquivo/loc real | Evidência |
|--------|------------------|-----------|
| Entrada de CSS | `src/styles/tokens.css` **e** `src/styles/globals.css` | importados em [`src/main.tsx:5-6`](../../src/main.tsx) |
| Tokens semânticos shadcn/Tailwind (HSL) | `:root` em `src/styles/globals.css` (`--background: 220 50% 5%`, `--primary`, …) | consumidos por `tailwind.config.ts` via `hsl(var(--*))` |
| Tokens Sentinela (paleta enterprise, hex/rgba) | `:root` em `src/styles/tokens.css` (`--color-bg`, `--color-primary`, …) | consumidos por CSS direto `var(--color-*)` |
| Utilitários de cor | `tailwind.config.ts` → `colors: { background: "hsl(var(--background))", … }` | mapeamento shadcn |
| Tema | **dark-first**: `darkMode: ["class"]` e o próprio `:root` já é o tema escuro | `tailwind.config.ts:4` + tokens |
| Tipografia | **Plus Jakarta Sans** (base) · **JetBrains Mono** (mono) | `tailwind.config.ts` `fontFamily.sans` **e** `tokens.css --font-family-base` concordam |
| Componentes | shadcn/ui (Radix) em `src/components/ui/**` + componentes das rotas vivas | `components.json` (`"aliases.ui": "@/components/ui"`) |

**Regra:** ao construir UI nas etapas seguintes, use **tokens semânticos** (utilitários Tailwind
mapeados a `hsl(var(--*))` ou `var(--color-*)`), componentes shadcn/Radix já existentes, e preserve
responsividade + acessibilidade. Nada de hex local, nada de duplicar botão/input/modal/toast/estado.

## Divergências a RECONCILIAR (existem no repo, mas NÃO são autoridade)

Registradas para não serem confundidas com a fonte-da-verdade — a reconciliação é de etapas
futuras, não da E1:

1. **`src/index.css`** — o `components.json` do shadcn declara `"css": "src/index.css"`, mas
   `main.tsx` **não** importa esse arquivo (importa `styles/globals.css`). O `src/index.css` tem
   seu próprio `:root`/`.dark` e **não é carregado**. Divergência: o shadcn CLI escreveria num
   arquivo morto. (SENT-FE-E1-DS1)
2. **Fonte órfã Inter** — `styles/globals.css` importa `Inter` do Google Fonts, mas **nada** a
   consome (tanto `tailwind.config` `sans` quanto `--font-family-base` usam **Plus Jakarta Sans**).
   A fonte do produto é Plus Jakarta Sans; a importação de Inter deve ser removida ou adotada
   conscientemente. (SENT-FE-E1-DS2)
3. **Dois sistemas de token coexistindo** — HSL semântico (globals.css, via Tailwind) e `--color-*`
   hex (tokens.css, via CSS direto). Ambos carregados; convivem hoje. Reconciliação futura decide o
   canônico. (SENT-FE-E1-DS3)
4. **Não carregados** — `DESIGN.md`, `vercel/DESIGN.md`, `src/App.css`: referências/divergências,
   **não** autoridade.

## Dívida de cor hardcoded (medida, NÃO resolvida na E1)

- **959** literais hex em `src/**/*.{ts,tsx}` (+ ~44 em CSS; 1003 no total). Sanear isso é de
  etapas futuras (SENT-FE-E1-DS4) — a E1 **não** toca.

## Conformidade da E1 (fundação NÃO-visual)

A camada canônica desta etapa (`src/lib/v1/**`) é **pura lógica** (cliente `/v1`, problem+json,
query keys/cliente, redaction) + um provider **sem estilo**. Ela **não** adiciona CSS, cor nem
componente visual:

- **0** literais hex em `src/lib/v1` (medido) — e o cadeado
  [`canonical-boundary.test.ts`](../../src/test/v1/canonical-boundary.test.ts) **reprova** qualquer
  hex/`import` proibido em arquivos novos (`.ts` e `.tsx`).
- Nenhum botão/input/modal/toast/estado foi duplicado (nada visual foi criado).

Logo, "arquivos novos = zero cor hardcoded / zero componente duplicado" está **satisfeito e
travado**. A adoção de tokens/componentes na prática acontece quando a E2 construir telas.
