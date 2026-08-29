# Teste UX — resultado Menos Juros

**Data:** 2026-08-29  
**Superfície:** `/analyses/09c8666a-854b-4b92-aea5-daa317dcd2d1/result`  
**Método:** primeira leitura sem abrir as visões, seguida de Diagnóstico e Medidas; desktop e
viewport móvel de 375 × 812; revisão de texto, fluxo, acessibilidade e Motion.

## Evidência anterior à mudança

- A primeira dobra mostrava `1.017.122` conversas e “nada assinalado”, mas não apresentava a
  conclusão crítica já publicada no Diagnóstico (`47,49/100`).
- O resultado era parcial por `indicator_not_measured`; portanto, “nada assinalado” podia ser
  interpretado incorretamente como “tudo saudável”.
- A ponte dizia apenas que existiam “leituras mais novas” e oferecia dois botões com o mesmo peso,
  sem explicar a ordem de leitura nem a responsabilidade de cada visão.
- O Diagnóstico já respondia “o que requer ação”; Medidas já explicava contagens, concentração e
  procedência. Duplicar esses fatos na rota histórica criaria uma terceira fonte de apresentação.
- Em 375 px não houve overflow horizontal (`scrollWidth = innerWidth = 375`).

## Decisão

1. Manter o resumo histórico e não adicionar cálculo ou indicador novo nessa rota.
2. Recomendar explicitamente Diagnóstico como primeiro passo e explicar o papel de Medidas.
3. Quando o documento for parcial e não houver alerta no resumo histórico, informar que ausência
   de alerta não equivale a saúde integral.
4. Usar Motion somente para orientar entrada e feedback: 300 ms na ponte, 200 ms nas interações,
   apenas `transform`/`opacity`, sem bloquear entrada e com `prefers-reduced-motion`.

## Gates

- 62 testes de componente aprovados, incluindo PT-BR, inglês, ordem das rotas, parcialidade e
  Motion reduzido.
- Typecheck aprovado em 6 projetos e 489 arquivos.
- Build de produção aprovado.
- ESLint sem erros; 14 avisos preexistentes de Fast Refresh.
- A mudança não altera Analytics, Engine, contratos, valores, severidade ou ordenação de atenção.

## Teste da amostra de 100 MB

Arquivo preparado: `menos_juros_amostra_100mb.jsonl`, com 104.855.088 bytes. O teste deve medir:

- tempo do upload até mapping;
- clareza da ativação de medidas e dimensões;
- tempo até Diagnóstico e Medidas ficarem disponíveis;
- primeira decisão compreensível sem exploração;
- navegação por teclado, breakpoint móvel e Motion reduzido;
- consistência entre Diagnóstico, Medidas e a rota histórica.

O arquivo contém dados reais de conversas. O envio para homologação exige confirmação explícita no
momento do upload; nenhuma linha ou identificador pessoal deve entrar neste relatório.
