# Auditoria de UX operacional — 2026-09-01

## Escopo

Revisão da jornada operacional autenticada de criação, upload multipart, submissão,
acompanhamento, recuperação e conclusão de uma análise. O objetivo deste gate não é
redesenhar a linguagem visual: é garantir que a operação seja compreensível, alcançável,
responsiva e honesta em estados normais e degradados.

## Método

- avaliação heurística dos estados e ações críticas;
- travessia em browser real nos viewports 1280×800, 768×1024 e 375×812;
- verificação de contraste automatizada;
- cenários E2E de refresh, recuperação, falha recuperável, falha terminal e expiração de sessão;
- verificação do contrato multipart e ausência de upload duplicado;
- typecheck, testes de componente e gate de bundle sem mocks.

## Achados e decisões

| Severidade | Achado | Impacto | Decisão |
|---|---|---|---|
| Crítica | A reserva automática podia ficar permanentemente em `Starting…` sob React StrictMode. | Impedia toda nova análise em desenvolvimento e em qualquer montagem dupla equivalente. | A execução automática foi deferida para depois do primeiro ciclo do efeito; o cleanup cancela a montagem descartada e a montagem efetiva conserva a mutation e a navegação. |
| Alta | A jornada E2E simulava o antigo `POST /data`, enquanto o produto usa upload multipart. | O teste não provava rename, abertura, envio de parte, conclusão ou selagem do contexto. | A massa stateful passou a espelhar todo o contrato multipart e mantém o endpoint antigo apenas como compatibilidade explícita. |
| Média | “Recommended reading” e “Start here” tinham contraste de 4,29:1. | Falhava o mínimo AA para texto normal. | Tokens textuais mudaram para `foreground`; 3/3 provas de contraste passaram. |
| Média | A prova mobile exigia que “Send dataset” estivesse na primeira dobra, embora Analysis Context seja conteúdo legítimo anterior. | Incentivava compressão artificial e confundia visibilidade com alcançabilidade. | A prova agora rola até a ação, exige que ela entre na viewport e continua medindo overflow horizontal. |
| Média | Testes ainda procuravam rótulos antigos (“Try again” e confirmação “Start analysis”). | Criavam falso alarme e não protegiam a experiência publicada. | As expectativas foram alinhadas aos contratos atuais “Run again” e reserva automática. |
| Baixa | React Router 6 mantém dois advisories moderados, corrigíveis apenas por migração major para v7.18+. | Risco residual limitado; não há SSR hydration no front atual e destinos são controlados pela aplicação, mas o open redirect precisa continuar vedado nas fronteiras. | Não realizar migração major dentro de uma correção de UX. Registrar como item governado, com suíte de rotas e threat model antes da atualização. Alto/crítico em dependências de produção: zero. |

## Resultado por fator de experiência

- **Utilidade:** o fluxo conduz a uma análise real e preserva contexto opcional.
- **Usabilidade:** cada estado possui uma próxima ação coerente; o refresh reconstrói pelo `analysis_id`.
- **Encontrabilidade:** upload, submissão e resultados permanecem alcançáveis em desktop, tablet e mobile.
- **Credibilidade:** indisponibilidade de progresso é explicada; nenhum percentual é inventado.
- **Desejabilidade:** hierarquia da leitura recomendada preservada com contraste AA.
- **Acessibilidade:** ações nomeadas, `aria-live` no estado, ausência de overflow e contraste aprovado.
- **Valor:** nenhuma confirmação redundante foi reintroduzida e submit não repete upload.

## Evidência automatizada

- 17/17 testes focados de jornada, estado e ponte de leitura;
- 10/10 cenários Playwright de jornada, resiliência e responsividade;
- 3/3 cenários de contraste;
- typecheck dos seis projetos;
- gate de bundle sem mocks.

## Critério de encerramento

A dívida de UX operacional deste fluxo pode ser encerrada quando o mesmo commit estiver
publicado em homologação e a travessia autenticada confirmar criação, upload e avanço para
o estado submetível. Mudanças futuras de produto permanecem separadas desta correção.
