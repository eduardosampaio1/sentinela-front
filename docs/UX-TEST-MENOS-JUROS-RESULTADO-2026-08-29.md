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

## Execução ponta a ponta confirmada

**Análise:** `1c76aac7-f7f3-41ef-bfa9-d6f74c2af99a`  
**Ingestão:** `3e81a1e3-3481-475a-9f15-aa6b9061520c`

- Multipart concluído em 13 partes, sem repetir upload após a recuperação operacional.
- 61.423 conversas recebidas; 61.323 aceitas e publicadas; 100 preservadas como contagem.
- Das 100 não analisadas, 71 não tinham resposta da IA e 29 ficaram sem texto após a proteção de
  privacidade. Nenhum conteúdo de conversa foi copiado para este documento.
- A Engine iniciou o cálculo às `15:45:52Z` e terminou às `15:50:24Z`: cerca de 272 segundos,
  225,463 conversas/s e aproximadamente 814 MB de RSS máximo observado.
- O perfil atribuiu 90,315% do tempo medido a embeddings; vizinhança e índice somaram menos de 2%.
- Diagnóstico, facts, resultado integrado e Medidas concluíram e permaneceram acessíveis após
  refresh.

## Falhas encontradas e fechadas durante o teste

1. O Promotor rejeitava `dataset-dimensions-v3`, embora a Ingestão o publicasse. O Orchestrator
   passou a aceitar v2 e v3 no commit `ec35323`; a mensagem original foi reprocessada de modo
   auditável, sem editar banco e sem novo upload.
2. A página principal encerrava o polling de status antes de reler `/progress`, deixando eixos
   antigos na tela. O Front agora invalida o progresso uma única vez na transição terminal
   (`ce65fc2`).
3. O status terminal descartava as contagens do intake. O Gateway agora enriquece apenas a leitura
   terminal pronta (ou falha), sem adicionar um hop a cada polling (`6d30450`).
4. Medidas exibiam decimais extensos e datas ISO. Resumos, concentração, cruzamentos e séries agora
   respeitam locale, arredondamento de apresentação e UTC (`56aaf3c`). O dado publicado não mudou.
5. O deep link `/dashboard/settings` quebrava enquanto o workspace ainda era reidratado. A página
   agora aceita escopo temporariamente ausente e cada seção conserva seu próprio estado
   (`1191fcc`).

## Validação final no Chrome autenticado

- EN: quatro eixos em `Done/Ready`; denominadores completos no React Flow; `786,791`, média
  `12.83`, concentração `60.43% / 43.02%` e datas legíveis.
- PT-BR: `61.423 → 61.323 → 100`, média `12,83`, concentração `60,43% / 43,02%`, textos de
  qualidade da base e procedência traduzidos. A preferência original em inglês foi restaurada.
- O React Flow foi preservado e continua respondendo “Por que este número?” com uma cadeia e uma
  lista textual equivalente para acessibilidade.
- A rota histórica indicada continua breve e agora orienta a sequência: Diagnóstico primeiro,
  Medidas depois. Ela não replica cálculos nem cria uma terceira fonte de verdade.

## Evidência de engenharia

- Gateway: 49 testes relevantes aprovados e Ruff aprovado.
- Front: 27 testes do fluxo/projeção, 28 testes de Analytics e 51 testes de conta aprovados;
  ESLint dos arquivos alterados e typecheck dos 489 arquivos aprovados.
- O gate global de i18n foi fechado sem aumentar limites: o rótulo dinâmico da comparação passou
  a usar o helper canônico e três textos foram simplificados honestamente em PT-BR. Paridade,
  chamadas opacas e orçamento individual/agregado PT/EN estão aprovados.

## Por que alguns indicadores da análise Boss aparecem como zero

Na análise `09c8666a-854b-4b92-aea5-daa317dcd2d1`, a própria publicação informa
`outcome_field_coverage_rate = 0`. Nenhuma das 1.017.122 conversas carregou um campo de desfecho.
Por isso `useful_outcome_rate`, `useful_outcome_count`, `conversion_rate` e `conversion_count`
aparecem como zero: o denominador da execução existe, mas o fato de resultado não veio na origem.

Esse zero não prova desempenho ruim nem bom. Ele significa “não havia dado de resultado para
medir”. A interface agora explica isso junto aos indicadores, sem reclassificar o estado publicado
e sem fabricar valor histórico. Uma nova execução só poderá medir esses indicadores quando o
mapping ativar um campo real de resultado ou conversão. Da mesma forma, `100%` de cobertura de
intenção nesta base representa um catálogo observado de `1/1`, cuja única intenção é `UNKNOWN`; não
é evidência de boa qualidade taxonômica. Custos continuam indisponíveis quando a origem não traz
tokens ou custo.

## Behavior Score e notificações

- O Behavior Score passou a ser um `meter` acessível, com valor, mínimo e máximo publicados.
- A régua ganhou preenchimento proporcional com cor de estado, marcador de maior contraste e
  superfície menos escura. O movimento revela a magnitude por `scaleX`, usa o token deliberado do
  design system e fica estático sob `prefers-reduced-motion`.
- A indisponibilidade de notificações tinha duas causas operacionais: faltava a credencial dedicada
  Gateway → Dispatcher e a API de assinaturas existia no código, mas não tinha processo publicado
  em homologação. A correção mantém worker e API em serviços separados, compartilhando o mesmo
  domínio e a mesma tabela canônica de assinaturas.
