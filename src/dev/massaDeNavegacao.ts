// A MASSA da navegação manual — três análises para o modo de validação de design.
//
// ## Por que ela existe
//
// O modo de navegação sobe o MSW com a jornada stateful, e a listagem começa **vazia**: a massa
// da jornada nasce quando alguém cria uma análise. Isso está certo para um teste, que semeia o
// que vai medir, e é inútil para quem abriu o navegador para olhar a lista — a pessoa vê o estado
// vazio e nunca a linha.
//
// ## Por que não dá para semear pelo console
//
// A listagem vive em `sessionStorage`, que é **por aba**. Semear no devtools funciona naquela aba
// e some na próxima — exatamente o defeito que a porta de navegação já tinha corrigido no
// `localStorage` do bypass. Semear no boot vale para toda aba que abrir o modo.
//
// ## O que a massa mostra, e por que é justamente ISTO
//
// Três linhas, escolhidas para exercer o léxico inteiro numa tela só:
//
//   1. **medida** — 12.480 conversas observadas. O número que decide.
//   2. **ausente** — `observed_conversations: null`. O contrato diz que `null` aqui é *ausente,
//      nunca zero*, e que renderizar `0` ou `—` transformaria não-medição em fato. Esta linha é a
//      única forma de ver a hachura no produto.
//   3. **em curso** — `running`, sem resultado ainda. O estado que não é nem sucesso nem falha.
//
// A primeira e a segunda pertencem à Instância semeada pelo bypass, então elas exercem também a
// resolução `instance_id → nome` que substituiu o UUID no título. A terceira não tem Instância —
// é o caso legado, que mantém o identificador.
//
// ## Cadeado
//
// As mesmas duas condições da porta de navegação: `DEV` e `VITE_E2E === "true"`. Em build de
// produção o corpo inteiro é eliminado pelo Rollup. E ela só semeia quando a marca do modo está
// gravada — sem isso o dev server continua servindo a lista vazia de sempre.

const CHAVE_DA_PORTA = "sentinela:navegacao-manual";
const CHAVE_DA_LISTA = "__sentinela_list__";

/** O workspace e a Instância que `src/e2e/bypass.ts` injeta. Divergir aqui deixaria a massa órfã. */
const WORKSPACE = "e2e-workspace-0000";
const INSTANCIA = "inst-e2e-0000-4000-8000-000000000001";

const MASSA = {
  items: [
    {
      analysis_id: "an-1a2b3c4d-0001-4000-8000-000000000001",
      status: "completed",
      record_count: 12480,
      result_available: true,
      created_at: "2026-08-15T14:20:00.000Z",
      observed_conversations: 12480,
      instance_id: INSTANCIA,
    },
    {
      // Suprimida por privacidade: a análise terminou BEM e a medida não pode ser publicada.
      // Por isso `completed` com `observed_conversations: null` — ausência não é falha.
      analysis_id: "an-1a2b3c4d-0002-4000-8000-000000000002",
      status: "completed",
      record_count: null,
      result_available: true,
      created_at: "2026-08-13T09:05:00.000Z",
      observed_conversations: null,
      instance_id: INSTANCIA,
    },
    {
      analysis_id: "an-1a2b3c4d-0003-4000-8000-000000000003",
      status: "running",
      record_count: 2910,
      result_available: false,
      created_at: "2026-08-16T11:40:00.000Z",
      observed_conversations: 2910,
      instance_id: null,
    },
  ],
  next_cursor: null,
};

if (import.meta.env.DEV && import.meta.env.VITE_E2E === "true") {
  try {
    if (localStorage.getItem(CHAVE_DA_PORTA) === "1") {
      const atual = JSON.parse(sessionStorage.getItem(CHAVE_DA_LISTA) ?? "{}") as Record<
        string,
        unknown
      >;
      // A chave é `${workspaceId}|${cursor ?? ""}` — a primeira página não tem cursor.
      const chave = `${WORKSPACE}|`;
      // Só semeia o que não existe: se você navegou, paginou ou criou uma análise nesta aba, a
      // massa da jornada é a verdade e sobrescrevê-la apagaria o que você acabou de fazer.
      if (!(chave in atual)) {
        atual[chave] = MASSA;
        sessionStorage.setItem(CHAVE_DA_LISTA, JSON.stringify(atual));
      }
    }
  } catch {
    // Storage indisponível (modo privado). Sem massa, a lista fica vazia — que é o estado
    // anterior, não um estado quebrado.
  }
}

export {};
