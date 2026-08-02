/**
 * Tela de primeira decisão: Quick Scan ou Deep Analysis.
 *
 * ## Por que aqui não há consulta nenhuma
 *
 * Havia uma: `hasUserAnalysisRuns(user.id)`, contra `analysis_runs` no Supabase. O resultado ia
 * para um estado que o próprio componente descartava — `const [, setHasRuns]` — e portanto nunca
 * era lido, nunca decidia nada, nunca chegava à tela. Custava uma requisição e não produzia
 * informação.
 *
 * Não foi substituída por uma chamada `/v1` equivalente porque não havia pergunta a responder:
 * a tela renderiza duas ações fixas, iguais para quem já analisou e para quem nunca analisou.
 * Trocar um acesso inútil por outro seria migrar a forma e preservar o desperdício.
 *
 * ## Estado desta tela
 *
 * `/home/welcome` é servida pela `LaunchpadPage` no `router.tsx`, e o único import deste arquivo
 * fora dele mesmo é o teste, que declara a rota por conta própria — ela **não é alcançável pelo
 * app**. Continua aqui de propósito: remoção tem lote próprio, e a regra do programa é não
 * apagar antes de a prova de desuso estar registrada.
 */
export default function HomeWelcomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-semibold text-foreground">
        Your first analysis: Quick Scan or Deep Analysis?
      </h1>
      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          className="rounded-xl border border-border bg-card px-8 py-4 text-sm font-medium text-foreground transition-colors hover:bg-card/80"
        >
          Quick Scan
        </button>
        <button
          type="button"
          className="rounded-xl border border-primary bg-primary/10 px-8 py-4 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Deep Analysis
        </button>
      </div>
    </main>
  );
}
