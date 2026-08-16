# M45.3 · RESULTADO (RES-01) — DOC-CLOSE

Fechamento local. **Sem push, sem deploy, sem Railway.** A M45.3 é uma tranche da umbrella M45; o
Experience Freeze é da **M46**.

---

## 1. A autoridade que mudou a forma da tranche

O plano da M45.1 descreve esta tranche como *"RES-01 inteiro: composição, atenção, trust, timeline,
export"*. O Blueprint §4.6, escrito depois pela Two-View Recovery, diz outra coisa sobre a mesma
superfície:

> **Congelada.** Continua funcional e servindo deep link antigo; **não recebe feature nova** e não
> vira ARGOS-only em silêncio. Nenhuma navegação canônica nova aponta para ela quando a visão
> correta existe. Aposentadoria é decisão posterior.

As duas convivem: **congelamento proíbe feature, não correção**, e endurecer uma superfície viva por
deep link é exatamente o trabalho desta umbrella. Mas a régua mudou — nesta tranche, qualquer coisa
que acrescentasse capacidade foi levada ao owner em vez de feita.

**Congelada não é aposentada.** Quem tem o link cai nela hoje, e a matriz transversal nunca a
visitara. Era esse o único motivo de **E5 aparecer como NO CREDIT** na discovery histórica.

## 2. Um defeito de produto — e ele não estava na superfície congelada

**O gatilho da procedência não parecia um gatilho.**

No desktop, a procedência de cada indicador fica na margem, permanente: denominador, cobertura
amostral, *"não informado"* onde o produtor não publicou. Abaixo de tablet ela colapsa num
`Disclosure`, e o gatilho renderizava **só o texto**.

Na captura mobile isso é a palavra *"Procedência"* sozinha, entre o número do indicador e a
descrição. Lê-se como título de seção. Nada diz que abre — e a procedência, que é o argumento de
confiança inteiro daquela tela, ficava invisível para quem não adivinhasse tocar.

A seta entrou, `aria-hidden`, e o texto continua sendo o nome acessível. O docstring do `gatilho` já
dizia *"texto, não ícone sozinho"* — a regra é contra ícone **sem** nome, não contra texto
acompanhado.

O gate mede as **duas** direções, e a segunda é o que impede a correção de virar outro defeito: a
seta não pode roubar o nome do botão. `Disclosure` é usado em **um** lugar no produto inteiro —
não houve mudança no DS por atacado.

## 3. Quatro hipóteses testadas e REFUTADAS

Registrar isto vale mais que inventar achado. Nenhuma virou defeito:

| hipótese | por que caiu |
|---|---|
| *"Comparado com a anterior" contradiz a EVO-02, que recusa afirmar cronologia* | O próprio código explica: em RES-01 o lado esquerdo **é** o anterior, e o componente recebe o rótulo como prop exatamente por isso. Distinção deliberada, não divergência |
| *O índice "ON THIS PAGE" lista região que não existe* | Ele acompanha o contrato: v1 lista Recomendações e não Analytics; v2 o inverso |
| *"Procedência" aparece sem conteúdo no mobile* | Não está vazia — está **colapsada**. O que sobrou dela foi a falta de afordância, que virou o defeito da §2 |
| *RES-01 perdeu a capacidade de ler v2* | Era a minha massa. O despachante recusava por **validação**, e estava certo |

**Nenhum defeito de produto em RES-01.** E isso é medição, não ausência de medição: a superfície
renderiza corretamente com documento v1, com v2, com analytics retido, com o documento purgado
(retenção) e com o serviço fora do ar, em PT e EN.

## 4. Quatro armadilhas de instrumento — todas minhas

1. **As massas de `fixtures/canonical-result` são o DOCUMENTO, não o envelope público.** Servi-las
   cruas fez a página dizer "formato não suportado" — e a página estava certa.
2. **`**/v1/analyses**` é glob de prefixo e casa `/result`, `/timeline`, `/progress`, `/analytics`.**
   A linha do tempo recebeu `{items: [], next_cursor: null}` — corpo verdadeiro, sem `events` — e a
   página inteira caiu no ErrorBoundary. O guarda do produto (`timeline.data &&`) está certo.
3. **`event_id` É contratado**; minha massa é que não o tinha, e o React reclamava de `key`.
4. **O laço de responsive acumulava estado.** Ele reusa uma página, e `page.route` acumula: o
   `emEstado` de J12 (falha terminal) seguia valendo em J13–J16, e J15 media RES-01 de uma análise
   que falhou. A montagem base passou a ser reinstalada a cada journey.

> A quarta responde, de passagem, a **pergunta que ficou em aberto no DOC-CLOSE da M45.2**: por que
> J10 acusou e J12 não, na mutação de largura. Mesma causa. A dívida está paga.

## 5. Um julgamento meu, errado, desfeito

Vi `status: completed` com `result_available: true` e `/result` em 404, chamei de massa impossível e
"corrigi" para `result_available: false`.

Errado nas duas pontas. A combinação é **legítima** — é o caso de **retenção**: o documento existiu,
o status ainda o anuncia, e a purga o levou. E com `false` a tela diz outra coisa (o resultado ainda
está sendo preparado), então eu não corrigira incoerência nenhuma: trocara o estado medido sem
perceber. Revertido, com o motivo escrito nos dois lugares.

Fica registrado como estado **não medido**: `completed` + `result_available: false`.

## 6. Mutação — 4/4

`docs/m45/mutacoes_m45_3.py`.

| # | Mutação | Gate |
|---|---|---|
| 1 | o gatilho perde a marca visual | `o gatilho tem marca visual` |
| 2 | a marca rouba o nome acessível do botão | `continua se chamando pelo texto` |
| 3 | a montagem base deixa de servir o documento de RES-01 | `J15` |
| 4 | o laço de responsive para de reinstalar a montagem base | `estoura a largura` |

A terceira nasceu de uma **mutação minha que sobreviveu**: ela trocava o predicado de caminho de
volta pelo glob de prefixo, e sobreviveu corretamente — com `/result` e `/timeline` mockados, o glob
é inofensivo. O predicado é higiene contra um subrecurso futuro, não comportamento com gate.
Mutação sem gate capaz de reprovar é mutação morta, e trocá-la por uma real vale mais que manter a
fachada.

## 7. Stack de qualidade — gate ≥ 9,0, sem waiver

| Passada | Nota | Achados |
|---|---|---|
| `/ux-copy` | **9,4** | nenhum. Quatro ausências distintas com palavras distintas — *"não informado"*, *"Não medido"*, *"Vazio"*, *"Campo ausente"* — e cada uma significa outra coisa |
| `/design-critique` | **9,2** | o gatilho da procedência (§2) |
| `/ux-heuristics` | **9,1** | a orientação de quem chega por deep link (§9) |

## 8. Provas

| Prova | Resultado |
|---|---|
| `npm run typecheck` | 6 projetos · **369 arquivos** · cobertura completa · raiz inerte |
| `eslint .` | 9 erros **pré-existentes**, nenhum desta tranche — ver a errata da [M45.2](./DOC-CLOSE-M45-2.md) §9.1 |
| Vitest | **117/117** arquivos · **1661/1661** testes |
| Playwright | **334/334** |
| Mutação M45.3 | **4/4** mortas pelo gate nomeado |
| Matriz transversal | 44 → **48** testes · 14 → **16** journeys |
| axe | 0 violações aplicáveis em J15 e J16 |
| Capturas | **7** em `docs/m45-3`, todas por provador |

## 9. Dívidas — enumeradas, nenhuma mascarada

| Dívida | Por que não foi feita aqui |
|---|---|
| **Quem chega por deep link antigo não descobre ARGOS nem Analytics da mesma análise.** A única saída de RES-01 é "Voltar ao histórico" | Acrescentar navegação numa superfície congelada é **feature**, não correção. Decisão de owner — e ela expõe o risco de congelar sem aposentar: a superfície fica servindo para sempre quem nunca conhece a substituta |
| O aviso *"No result is available"* sai com **spinner** e `aria-busy` | `result_not_available` é espera neutra, e para uma análise em curso isso está certo. Na retenção nada vem. Distinguir exigiria que um componente compartilhado soubesse de finalidade. Decisão de owner |
| Três nomes divergentes entre RES-01 e ANL-01 — *"Time series"/"Séries"* vs *"Over time"*; *"Demais"* vs *"Outros rótulos"*; *"Export"* vs *"Export package"* | Herdada da M45.4. **Recomendo NÃO alinhar**: são motores diferentes com produtos diferentes, e alinhar copy numa superfície congelada com aposentadoria prevista é churn numa tela que vai morrer. Decisão de owner |
| Estado `completed` + `result_available: false` não medido | Descoberto ao desfazer o julgamento da §5. É real e distinto; não entrou nesta rodada |
| A lista não tem busca | Product-wide, já registrado na M45.4 e na M45.2 |

## 10. Commits

`3bd8971` · `d79bea5` · `1811abe`

Todos locais. **Zero push.**

## 11. Estado

### **M45.3 · RESULTADO (RES-01) — CLOSED · 1 defeito de produto · 4 de instrumento · 4 hipóteses refutadas · mutação 4/4**

A umbrella **M45 segue OPEN**. Abertas: M45.5 (Instância e baseline, P1), M45.6 (fundação, P2),
M45.7 (público, auth e shell, P1), M45.8 (consolidação, fecha a umbrella).

**As três P0 estão fechadas** — M45.2, M45.3 e M45.4.
