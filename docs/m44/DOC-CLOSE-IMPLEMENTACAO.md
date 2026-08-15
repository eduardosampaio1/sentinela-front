# M44 · COMMUNICATION + REENTRY — DOC-CLOSE da implementação

Fechamento local. **Sem push, sem deploy, sem Railway.**

---

## 1. A frase de produto, entregue

> *"Eu consigo configurar onde e como o Sentinela deve me avisar naquele Workspace, e consigo
> voltar à Analysis correta pelo link recebido."*

E **só** isso. Não há caixa de entrada, histórico de mensagens, contador de não-lidas, editor de
template nem configuração de SMTP. O e-mail de login **não** vira destinatário.

## 2. A superfície pública, e o que ela recusa

Quatro operações, todas com `workspace_id` na **query**:

| operationId | método | path | consumidor |
|---|---|---|---|
| `list_subscriptions` | GET | `/v1/subscriptions` | `useSubscriptions` |
| `create_subscription` | POST | `/v1/subscriptions` | `useCriarSubscription` |
| `disable_subscription` | **DELETE** | `/v1/subscriptions/{id}` | `useDesativarSubscription` |
| `rotate_subscription_secret` | POST | `/v1/subscriptions/{id}/secret` | `useRotacionarSegredo` |

**Não existem, e por isso não foram implementadas:** ler por id, atualizar, verificar, reativar e
apagar. `verified_at` é campo **observado** — aparece como estado, sem botão ao lado.

O `DELETE` chama-se `disable_subscription` e o dono faz `active = false`. A UI segue a **semântica**,
não o verbo: a linha continua na lista, marcada como desativada, e a copy diz *"Continua aqui e para
de receber mensagens"*.

## 3. Composição

Seção **Notifications** em `/dashboard/settings`, **depois** de Workspace — a ordem conta uma
história: quem você é e como o produto fala com você (conta), qual é este espaço, e por fim para
onde ele avisa. Notificação é configuração **do espaço**, e por isso vive nessa vizinhança. Nenhuma
segunda Settings, nenhuma rota `/notifications`.

## 4. Os três estados que não podem colapsar

```
lista vazia   → "No one is being notified yet."        (ausência LEGÍTIMA)
503           → "Notifications are unavailable…" + retry (INDISPONIBILIDADE)
lista cheia   → as assinaturas, com o que o produtor mandou
```

Provado no browser: sob `503` a tela **não** diz "ninguém está sendo avisado", e o resto da Settings
continua vivo — o dono da comunicação caiu, não a página.

## 5. As duas armadilhas, e como elas ficam visíveis

**Destinatário.** A conta responde `200` com `marcos.tavares@cliente.test` na mesma tela, e a
assinatura manda para `alertas@operacoes.exemplo.test`. Quem resolvesse por identidade não receberia
erro — mandaria o alerta para a caixa errada, com `200`. O formulário também nasce **vazio**.

**Idioma.** A interface em inglês e a mensagem em português, lado a lado, com a frase que mata a
inferência: *"It doesn't follow the language of this interface."*

## 6. O segredo

Sai **uma vez**, de `create` e de `rotate`, e é `null` para e-mail — com a chave sempre presente. Ele
volta para o componente, é exibido, e **morre com ele**: não entra em `setQueryData`, não vai para
`localStorage`/`sessionStorage`, não aparece em log nem na URL. Sem botão de copiar — clipboard só
entra com authority, e conveniência não é authority.

Rotação sobe a versão e preserva a identidade. O cache recebe `secret_version` **e** `verified_at:
null`, porque o dono zera a verificação no mesmo `update` — a chave mudou, e a verificação anterior
era sobre a antiga. Isso quase escapou: a primeira versão do hook só atualizava a versão.

## 7. Qualidade — as três skills, executadas

**`/ux-copy`** — decisões que importam: **"Notifications"**, e não "Alerts", que colide com o
conceito ARGOS já existente no produto; **"signing key"**, e não "secret", porque diz para que
serve. A consequência da rotação é a que o contrato sustenta — *"New messages will be signed with
this key"* —, e **não** "a anterior para de valer": o chaveiro guarda as versões aposentadas de
propósito, porque uma entrega criada antes da rotação carrega a versão com que nasceu.

**`/design-critique`** — 3 achados, 3 aplicados:

| # | sev | achado | correção |
|---|---|---|---|
| D1 | 🔴 | "Turn off" era o elemento de maior contraste da linha — ação de baixa frequência com a maior ênfase | rebaixado para `ghost` com borda |
| D2 | 🟡 | "New signing key" mudava de forma entre estados e não lia como clicável | mesma forma e mesmo peso do vizinho |
| D3 | 🟡 | o aviso "aparece uma vez só" tinha peso de nota | peso do que ele descreve, moldura reforçada |

**`/ux-heuristics`** — score inicial **8,4**, final **9,3**. Gate `>= 9.0` **satisfeito**, sem waiver.

O achado que mudou o produto (**H1, sev 2**): depois de desativar, a pessoa vê *"Continua aqui e
para de receber mensagens"* e **não encontra caminho de volta** — porque reativar não existe. A copy
dizia o que aconteceu e não que era definitivo. A saída real é adicionar de novo, e agora a frase
diz isso. Nielsen #3.

Restam 🟢 sev 1: "Add someone to notify" fica ligeiramente descasado quando o canal é webhook (uma
URL não é *someone*), e o formulário fica sempre aberto. Nenhum dos dois justifica inventar
divulgação progressiva num volume de duas assinaturas.

## 8. Um defeito de acessibilidade PRÉ-EXISTENTE, achado aqui

O chip **"Saved"** da seção de Idioma (M41) estava em **4.12:1** sobre `bg-muted` — abaixo do 4.5:1
de AA, a 12px. Ninguém tinha visto porque **nenhuma suíte rodava axe nesta página**: a da M42 roda na
página da Instância, e a de Settings só passou a existir com a M44. Corrigido no mesmo commit.

## 9. Mutação — 28/28, e o que a primeira rodada custou

**16/28** na primeira rodada. Nenhum sobrevivente era defeito de código; eram três classes:

**(a) Mutações inertes — quatro.** Mostrar "Turn off" numa linha desativada não cria um botão
chamado "Enable"; trocar o *texto* de um chip não cria uma ação; mexer em `staleTime` não cria
assinatura; e escrever o segredo no `.then()` de uma promessa que **rejeita** nunca executa.
Repontadas para atacar o que o invariante realmente diz.

**(b) Instrumento — três.** O gravador de rede filtrava por `url.includes("/v1/")`, e o dev server
do Vite serve os próprios módulos em `/src/lib/v1/client.ts` — o gate "nenhum interno" acusava
**quinze requisições ao próprio bundler**. O mesmo com `keycloak`, que casava
`keycloakAuthClient.ts`. E `:808\d`, que é a porta do dev server. Recorte por `pathname`.

**(c) Gates que faltavam — cinco.** Chave de cache por workspace, URL interna no cliente, segredo em
storage, trava de duplo envio e vocabulário de eventos **não são observáveis por browser** com
custo razoável. Viraram gate **estrutural** (`m44-estrutura.test.ts`, E1–E7), e isso está declarado
em vez de disfarçado.

**E uma lição nova:** a mutação 13 sobreviveu a duas correções. Na terceira, a causa era a **massa**:
o gate "não existe reativar" rodava sobre uma lista **só com ativas**, então o botão proibido não
tinha onde aparecer. Negativa sobre massa que não pode violá-la é sempre verde. A massa passou a
incluir uma desativada.

## 10. Um gate-proxy que envelheceu, e o que ele ensina

O caso **K da M41** varria a página inteira afirmando que *nenhuma* requisição carrega
`workspace_id=`. Isso descrevia a Settings de quando o único dono ali era a conta. A M44 pôs a
comunicação na mesma tela, e ela carrega `workspace_id` por **exigência do contrato**.

O invariante da M41 nunca foi "ninguém nesta página usa escopo" — era "a preferência de idioma não é
particionada por workspace". O recorte passou a ser `/v1/me*`, que é o que ele sempre quis dizer.
**Um gate cujo alcance é maior que sua afirmação vira falso positivo no dia em que a vizinhança
muda.**

## 11. Reentrada

Deep link `/analyses/{analysis_id}` — um formato só, para os três eventos, como o compositor monta.
Abrir o link entrega a **Analysis existente**: nenhuma tela intermediária, nenhum `CommunicationLanding`.
Provado que a reentrada emite **só `GET`**, não toca Instance nem baseline, preserva o anti-oracle em
`forbidden_or_not_found`, e que `503` **não** vira "não encontrada" — o defeito que a M42 corrigiu na
página da Instância, medido de novo aqui.

**Reentrada não autenticada: N/A**, e registrado como tal. A M44 não tem requisito para ela e o app
já preserva o destino pelo fluxo OIDC existente (`AUTH-04`). O caso R8 prova o limite: sem sessão, o
link não entrega a Analysis — cai no caminho de autenticação que já existe.

## 12. B1 · antes e depois

**5 → 1.** As quatro operações de Subscription saíram de `SEM_CLIENTE_NO_FRONT` com o cliente
entregue no mesmo commit, que é o que a lista prescreve.

| operationId | consumidor | missão dona |
|---|---|---|
| `list_subscriptions` | `useSubscriptions` | M44 ✅ |
| `create_subscription` | `useCriarSubscription` | M44 ✅ |
| `disable_subscription` | `useDesativarSubscription` | M44 ✅ |
| `rotate_subscription_secret` | `useRotacionarSegredo` | M44 ✅ |
| `POST /v1/instances` | — | **nenhuma** — órfã, e continua |

`SEM_CLIENTE_E_SEM_MISSAO_DONA` continua em **1**. A órfã não some por conveniência.

## 13. Contrato e M17

Rodado com `SENTINELA_CONTRACT_ORIGIN` apontando para a autoridade de **27 operações**. **Contrato
não mudou; selo não tocado.**

**Dívida registrada, e não resolvida aqui:** `CONTRACT AUTHORITY DISCOVERY` — eliminar a dependência
de env explícita exige missão própria. Sem a env, os gates de contrato ficam **SKIPPED/AMBÍguo**, e
pulado **não é** verde.

## 14. Provas

| medida | resultado |
|---|---|
| Typecheck | **APROVADO** — 6 projetos, 363 arquivos |
| Vitest (origem declarada) | **117/117 arquivos · 1641/1641 testes** |
| Playwright | **265/265** |
| axe (`wcag2a`+`wcag2aa`) | **0 violações** |
| Mutação | **28/28 mortas pelo gate nomeado** |
| Lint | 23 problems (9 erros, 14 warnings) — **delta ZERO** |
| Capturas | **10**, 10 hashes distintos, todas pelo provador compartilhado |

**Sem a env de contrato**, a assinatura é 5 suítes vermelhas + 1 skipped — a mesma ambiguidade de
worktree registrada no checkpoint de scenarios, e **não** um defeito desta missão.

Backend **não tocado**: as 3 falhas antigas de `POST /v1/analyses/{id}/data` seguem `PRE-EXISTING ·
UNRELATED · STILL OPEN`.

## 15. Dívidas de release — preservadas

`ACCOUNT RELEASE MATERIALIZATION PENDING` · `WORKSPACE RELEASE TOPOLOGY AUTHORITY REQUIRED` ·
`DISPATCHER RELEASE TOPOLOGY REASSESSMENT REQUIRED` · **`CONTRACT AUTHORITY DISCOVERY`** (nova).

## 16. Estado

| item | estado |
|---|---|
| M42 | **CLOSED** · QUALITY GATE PASS 9,2 |
| M43 | **CLOSED AS PROOF** |
| **M44** | **CLOSED** |
| Subscription | **DELIVERED LOCALLY** |
| Reentry | **DELIVERED LOCALLY** |
| M45 | READY NEXT / FRONT QUALITY |

### **M44 · COMMUNICATION + REENTRY — CLOSED**

**Próximo checkpoint:** M45 — e a Pré literal dela precisa ser relida antes de começar. A authority
já mostrou divergências históricas (contagem fixa de scenarios; heurísticas `>= 8` antigo contra
`>= 9` atual), e essa leitura **não** foi feita nesta missão.
