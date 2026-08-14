// Fundação de dados `/v1` para TODA tela autenticada (Onda 8, Macrofrente 1).
//
// Até aqui os providers viviam dentro do `CanonicalAnalysisLayout`, escopados à subárvore
// `/canonical/*`. Isso bastava enquanto só a jornada canônica lia `/v1`. Deixou de bastar no
// instante em que as telas legadas foram migradas: a `HistoryPage` chama `useAnalysesList`, que
// chama `useV1Client`, e `/dashboard/history` não está sob aquele layout — a página quebrava com
// "useV1Client requer <CanonicalClientProvider>".
//
// A suíte de componente não pegava porque cada teste monta o provider por conta própria. Quem
// pegou foi o browser: duas suítes verdes não provam que o app monta.
//
// ## Por que aqui, e não na flag
//
// A flag `VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED` gate a JORNADA canônica — as rotas
// `/canonical/*` que substituiriam a jornada viva. Ela nunca foi um seletor de fonte de dados.
// Depois da migração, a tela de histórico não tem uma segunda fonte para escolher: ou lê `/v1`,
// ou não lê nada. Amarrar a fundação à flag faria a tela migrada depender de uma decisão sobre
// outra tela.
//
// Montar aqui é inerte para quem não usa: os providers criam um QueryClient e um cliente HTTP,
// e nenhum dos dois emite requisição sozinho. Uma tela que não chama os hooks não paga nada.
//
// ## Uma fundação, não duas
//
// O `CanonicalAnalysisLayout` deixou de montar os providers de propósito. Providers aninhados
// seriam legais em React e silenciosamente errados aqui: o QueryClient interno teria cache
// próprio, e ir do histórico para uma página canônica refetcharia tudo que já estava em memória.

import { Outlet, useNavigate } from "react-router-dom";
import { CanonicalQueryProvider } from "@/lib/v1";
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";
import { ReconciliadorDeIdioma } from "@/features/account/ReconciliadorDeIdioma";

export function FundacaoV1() {
  const navigate = useNavigate();
  return (
    <CanonicalQueryProvider onAuthRequired={() => navigate("/session-expired")}>
      <CanonicalClientProvider>
        {/* M41 — daqui para dentro, quem manda no idioma é a CONTA, não o `localStorage`.
            Ele fica AQUI, e não no `LanguageProvider`, porque o provider monta acima do portão de
            autenticação para servir Landing e páginas legais: ali não há sessão nem QueryClient,
            e um provider que tentasse ler `/v1/me/language` quebraria a experiência anônima.
            Não renderiza nada, e nunca escreve. */}
        <ReconciliadorDeIdioma />
        <Outlet />
      </CanonicalClientProvider>
    </CanonicalQueryProvider>
  );
}
