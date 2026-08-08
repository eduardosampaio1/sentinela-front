# Auditoria do Design System e da arquitetura — antes da MF6.4b

Levantamento **read-only**, feito antes de qualquer alteração. HEAD lido: `845bd1c`.

O objetivo é um só: descobrir o que **já existe** para reusar, e nomear o que precisaria ser
criado — para que nada nasça como linguagem visual paralela.

---

## 1. O veredito, curto

**A arquitetura que a MF6.4b exige já está implementada no repositório.** Ela não precisa ser
introduzida; precisa ser *estendida* para o v2. Isso muda a natureza do trabalho: não é montar uma
camada nova, é acrescentar um segundo adapter à camada que já existe e compor mais áreas com os
componentes que já existem.

| exigência da MF6.4b | estado |
|---|---|
| transporte/API separado | ✅ `features/canonical-analysis/data/` |
| adapters de contrato | ✅ `result/adapter.ts` + `result/validator.ts` |
| view models | ✅ `ResultViewModel`, `IndicatorView` |
| componentes de apresentação | ✅ `ui/` |
| estados loading/error/empty do DS | ✅ `shared/states/` (4 componentes) |
| adapter v1 isolado | ✅ já é version-aware e recusa versão desconhecida |
| adapter v2 | ❌ **não existe** — é o trabalho |
| componentes de Analytics | ❌ **não existem** — é o trabalho |

---

## 2. Design System — o que reusar

### Tokens, tipografia, spacing, cores semânticas

`DESIGN.md` descreve um sistema **dark-mode-native** inspirado em Linear, e ele está
materializado em `tailwind.config.ts` + `src/styles`. As classes usadas no código são semânticas
(`border-border`, `bg-card`, `text-muted-foreground`), **não valores crus** — a Onda 6 E7 levou os
hardcodes de 31 para 0 e mediu contraste AA.

**Consequência para esta fatia:** nenhum `#hex`, nenhum `style={{}}`, nenhuma classe de cor
literal. Se um tom não existir como token semântico, ele não entra — vira extensão declarada do
tema, não exceção local.

### Componentes

`src/components/ui/`: `button`, `dialog`, `dropdown-menu`, `input`, `label`, `sheet`, `toast`,
`toaster`, `tooltip`, `MetricTooltip`. Base Radix + `components.json` (shadcn).

`MetricTooltip` importa para a MF6.4b: a memória de produto registra que **todo score precisa de
"porquê" clicável**, e ele é o veículo existente disso. O bloco analítico não pode nascer sem
explicabilidade, e não precisa inventá-la.

### Estados

`shared/states/`: `LoadingState`, `ErrorState`, `EmptyState`, `SkeletonState`. **Os quatro estados
que a MF6.4b exige já existem** e já são usados pelo `ResultPage`. `withheld` deve ser um estado
**próprio e digno** — e a decisão de projeto é: ele NÃO é `ErrorState`. Ele é uma conclusão
legítima, e apresentá-lo como erro reintroduziria na UI exatamente o que a MF5 congelou como
decisão de privacidade.

**Lacuna nomeada:** não há um estado "retido por privacidade". Ele é a única extensão de DS
justificada nesta fatia, e deve ser criado em `shared/states/` — ao lado dos irmãos, com os
mesmos tokens —, nunca dentro da pasta de Analytics.

---

## 3. A camada de contrato, e por que ela já resolve metade do problema

`result/validator.ts` tem três desfechos honestos:

    supported    → o payload corresponde a `analysis-result-v1`
    unsupported  → schema ausente/desconhecido/forma incompatível → estado seguro
    (parcialidade NÃO é desfecho daqui: ela vem DECLARADA dentro do documento)

E `adapter.ts` abre com a regra que a MF6.4b repete:

> o que este arquivo PODE fazer: ler o campo, formatar número, aplicar unidade, moeda e a precisão
> QUE A ORIGEM DECLAROU […] O que NÃO pode: criar/recalcular/ponderar métrica, inferir veredito,
> severidade ou PARCIALIDADE, priorizar recomendação, substituir ausência por zero, misturar
> versões.

Há inclusive precedente do princípio "formatar mora num lugar só": `coverageDisplay` é calculado
no adapter, com o comentário de que multiplicar por 100 no componente *"vira o primeiro passo para
o cálculo migrar para a UI"*.

**Consequência:** o adapter v2 não inaugura disciplina nenhuma — ele herda uma que já está escrita
e testada (256 linhas de teste só para o v1).

---

## 4. O ponto de atenção real: `ResultPage` tem componentes locais

`ResultPage.tsx` (234 linhas) define `ValorIndicador` e `CartaoIndicador` **dentro do próprio
arquivo**. Não é monólito hoje — o arquivo é pequeno e as funções são coesas —, mas é a semente
de um: acrescentar nove áreas de Analytics ali produziria exatamente a página gigantesca que a
MF6.4b proíbe.

**Decisão para a fatia:** as áreas novas nascem como **arquivos próprios**, e os dois componentes
locais existentes ficam onde estão (movê-los seria refactor sem pedido, e o v1 tem de continuar
funcionando sem mudança de comportamento).

---

## 5. O que NÃO existe, e a única extensão justificada

| necessário | existe? | decisão |
|---|---|---|
| estado "retido por privacidade" | ❌ | **extensão do DS** em `shared/states/` |
| gráficos | ❌ nenhum no repo | ver abaixo |
| Card como componente | ❌ (usa `div` + tokens) | seguir o padrão existente, não criar |

### Gráficos — a condição de parada mais provável

**Não há nenhuma biblioteca de gráficos no repositório.** A árvore que a MF6.4b sugere pede
Pareto, evolução temporal e distribuições.

Isto é explicitamente uma das suas condições de parada (*"introduzir biblioteca visual/gráfica
grande"*). Registro a medição e **não decido sozinho**:

* **barras e Pareto** são representáveis com marcação e tokens existentes — barra é uma `div` com
  largura proporcional, e a proporção **vem pronta do backend**. Não exige biblioteca;
* **evolução temporal** com muitos pontos é onde SVG à mão começa a custar caro;
* qualquer gráfico precisa satisfazer *"sem depender somente de cor"* — o que empurra para rótulo
  e padrão, não para paleta.

**Proposta:** implementar as áreas sem biblioteca, com marcação semântica e tokens, e parar para
reportar se alguma exigir de fato uma dependência gráfica. Assim a decisão sobre a biblioteca
chega com um caso concreto em vez de uma suposição.

---

## 6. Ordem proposta, dentro das suas regras

    1  adapter v2 + validator v2   (puro, testado isoladamente, sem React)
    2  view model do bloco analítico, com os três estados
    3  estado "retido" como extensão do DS
    4  áreas pequenas, uma por arquivo, recebendo view model pronto
    5  composição da página
    6  provas, incluindo a integrada

`if (version === …)` fica **exclusivamente** na fronteira que escolhe o adapter. A árvore de
componentes recebe um view model estável e não sabe qual contrato o produziu.

---

## 7. O que esta auditoria NÃO fez

Não alterou arquivo nenhum. Não decidiu sobre biblioteca de gráficos. Não mediu contraste dos
componentes novos (eles não existem). Não avaliou os `src_legacy`/dashboards mortos — a Onda 6 já
os classificou, e eles não participam do eixo canônico.
