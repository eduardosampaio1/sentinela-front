// M41 — a superfície CANÔNICA da conta: CFG-01 (identidade) e CFG-02 (idioma).
//
// ## O que saiu, e por quê
//
// **O formulário de senha.** Ele renderizava campos e um botão que não trocavam senha nenhuma: a
// chamada ao provedor antigo tinha sido removida, e o que sobrou foi uma tela oferecendo uma ação
// que não acontece. D19 delega credencial ao provedor de identidade — então o lugar certo é um
// link para o console dele, não um formulário aqui.
//
// **Excluir conta.** D21 está `FUTURE / DO NOT BUILD`. O botão existia e abria um diálogo que
// terminava num `alert()` pedindo e-mail para o suporte. Uma ação destrutiva que não executa é
// pior que ausente: ela promete um controle que o produto não tem.
//
// ## O que NÃO entrou
//
// Tema (D23), configuração de Workspace e de Instância (CFG-03/CFG-04, M42). A identidade vem de
// `GET /v1/me` — o Account **não** é fonte de nome nem de e-mail, e esta tela não mostra claim
// bruta, token nem papel inventado.

import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { getAuthClient } from "@/lib/auth/index";
import { SecaoDeIdioma } from "@/features/account/SecaoDeIdioma";
import { useContaDoUsuario } from "@/features/account/data/language";
import { SecaoDeWorkspace } from "@/features/workspace/SecaoDeWorkspace";
import { useNomeDoWorkspace } from "@/features/workspace/data/workspace";
import { SecaoDeNotificacoes } from "@/features/communication/SecaoDeNotificacoes";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";
import { SecaoDoObjeto } from "@/design/patterns";
import { useRevelacao } from "@/design/motion";

// O `Section` LOCAL foi removido, e com ele a duplicação que a missão anterior tinha registrado
// sem resolver: ele fazia o mesmo que o `SecaoDoObjeto` do sistema, com outra aparência — aqui
// cartão, lá cabeçalho com régua —, e nenhuma decisão escrita separava os casos.
//
// A decisão de owner de 2026-08-16 escolheu a regra: **cartão onde há AÇÃO, régua onde há
// LEITURA**. Ela vive no `SecaoDoObjeto`, que deriva a forma da natureza declarada em vez de
// aceitar uma prop de estilo — assim ela não pode divergir por tela.
//
// Nesta página: espaços é leitura; idioma, acesso, configuração do espaço e notificações são
// ação. É por isso que a primeira seção agora respira e as outras quatro se fecham.
//
// `Campo` saiu junto: ele existia só para o par nome/e-mail, que mudou de tela.

export function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  // M42 · CFG-03 — o escopo canônico já existe; a seção do espaço usa o MESMO, e não um
  // `workspace_id` lido de outro lugar.
  const escopo = useCanonicalScope();
  const workspaceId = escopo?.workspaceId ?? null;
  const { t } = useLanguage();
  const conta = useContaDoUsuario();
  // Mesma query da seção de Workspace abaixo (mesma chave), então esta reconciliação não custa
  // requisição nenhuma — ela só deixa de imprimir o nome de bootstrap para o espaço que já tem
  // resposta do produtor nesta mesma tela. O fallback fica na LINHA, e não aqui: cada item tem o
  // seu próprio nome de claim, e um fallback único apagaria a linha enquanto o produtor não
  // respondesse.
  const nomeDoEscopo = useNomeDoWorkspace(workspaceId, null);

  // A identidade tem carregamento PRÓPRIO. Um spinner global esconderia que ela já chegou e que
  // só a preferência está pendente — e são duas dependências diferentes, com falhas diferentes.
  const urlDoProvedor = getAuthClient().accountManagementUrl();

  // A identidade e o nome do espaço chegam por caminhos diferentes: a chave junta os dois para
  // que a seção que resolver depois também entre com movimento, em vez de aparecer pronta no
  // meio de uma tela que já se moveu.
  const raiz = useRevelacao<HTMLDivElement>(
    `${conta.isPending}|${nomeDoEscopo}`,
  );

  async function sair() {
    await signOut();
    navigate("/login");
  }

  return (
    <AppShell topBarTitle={t("account.title")}>
      <PageFrame maxWidth="lg">
        <PageHeader
          title={t("account.title")}
          description={t("account.subtitle")}
        />

        {/* A distinção de papel fica ESCRITA, não subentendida. Sem esta frase, alguém que
            procura o próprio e-mail nesta tela e não acha conclui que sumiu — em vez de saber
            que ele mora na tela ao lado, que é a de leitura. */}
        <p className="mt-2 text-sm text-muted-foreground">
          {t("account.settingsIsAction")}{" "}
          <Link
            to="/profile"
            className="text-[hsl(var(--ds-accent-ink))] underline underline-offset-4"
          >
            {t("account.goToProfile")}
          </Link>
        </p>

        <div ref={raiz} className="mt-6 space-y-6">
          {/* NOME E E-MAIL VOLTARAM — decisão de owner de 2026-08-16, revendo a de horas antes.
              Eu os tirei daqui para des-duplicar contra o perfil, e a suíte de browser mostrou o
              preço: seis provas de M41, M42 e M44 caíram, e uma delas explica por quê melhor do
              que eu explicaria. A prova M44 C/D compara o DESTINO da notificação com o e-mail da
              CONTA para mostrar que o primeiro não vem do segundo — e essa comparação só existe
              se os dois fatos estiverem na MESMA tela. Sem esta seção, a pessoa deixa de ter
              como ver que as notificações não vão para o e-mail com que ela entra.
              O perfil segue dono da identidade como ASSUNTO; aqui ela é CONTEXTO do que se
              configura. É o mesmo fato lido da mesma fonte, não dois fatos. */}
          <SecaoDoObjeto
            natureza="leitura"
            titulo={t("account.identityTitle")}
            detalhe={t("account.identityBody")}
          >
            {conta.isPending ? (
              <p className="text-sm text-muted-foreground" role="status">
                {t("common.loading")}
              </p>
            ) : conta.data ? (
              // `GET /v1/me` é a fonte, e é a ÚNICA autorizada: o docblock desta tela diz que o
              // Account não é fonte de nome nem de e-mail e que aqui não entra claim bruta.
              <dl className="grid gap-0">
                {[
                  {
                    chave: "nome",
                    rotulo: t("account.name"),
                    valor: conta.data.user.name,
                  },
                  {
                    chave: "email",
                    rotulo: t("account.email"),
                    valor: conta.data.user.email,
                  },
                ].map((c) => (
                  <div
                    key={c.chave}
                    className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className="text-sm text-muted-foreground">
                      {c.rotulo}
                    </dt>
                    {/* `min-w-0` porque o e-mail é a string longa desta tela e a coluna de grade
                        nasce com `min-width: auto` — foi assim que a linha da Home estourou
                        438px num viewport de 375. */}
                    <dd className="min-w-0 break-words text-sm text-foreground">
                      {c.valor ?? t("account.fieldAbsent")}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-destructive" role="alert">
                {t("account.identityFailed")}
              </p>
            )}
          </SecaoDoObjeto>

          {/* A lista de espaços NÃO saiu na tranche anterior, porque ela é o único lugar do
              produto onde este fato aparece — remover para "des-duplicar" apagaria informação,
              não repetição. */}
          <SecaoDoObjeto
            natureza="leitura"
            titulo={t("account.membershipTitle")}
            detalhe={t("account.membershipBody")}
          >
            {conta.isPending ? (
              <p className="text-sm text-muted-foreground" role="status">
                {t("common.loading")}
              </p>
            ) : conta.data ? (
              conta.data.workspaces.length ? (
                // Lista, e não texto unido por separador: um nome de workspace pode CONTER o
                // separador — a massa tem "Acme · Laboratório" —, e aí "Acme · Acme · Laboratório"
                // não deixa ver onde um termina e o outro começa. Achado da revisão da captura.
                <ul className="space-y-1 text-sm text-foreground">
                  {/* O espaço ATIVO usa o nome reconciliado pelo produtor. Sem isto, esta lista
                      exibia o nome de bootstrap logo acima da seção que mostra o nome novo — o
                      mesmo espaço, dois nomes, uma tela. Os demais seguem com a projeção da
                      claim: para eles nenhum produtor foi consultado. */}
                  {conta.data.workspaces.map((w) => (
                    <li key={w.id}>
                      {w.id === workspaceId ? (nomeDoEscopo ?? w.name) : w.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("account.noWorkspaces")}
                </p>
              )
            ) : (
              <p className="text-sm text-destructive" role="alert">
                {t("account.identityFailed")}
              </p>
            )}
          </SecaoDoObjeto>

          <SecaoDoObjeto
            natureza="acao"
            titulo={t("account.languageTitle")}
            detalhe={t("account.languageBody")}
          >
            <SecaoDeIdioma />
          </SecaoDoObjeto>

          {/* M42 · CFG-03, POR ÚLTIMO e de propósito.
              Ela estava entre `Language` e `Password`, cercada por duas seções de CONTA — e numa
              página intitulada "Account" a vizinhança ensinava que o espaço é mais uma
              configuração de conta. Ele não é: tem outro dono, outra identidade e outro ciclo de
              vida. No fim, as três primeiras são da conta e a última é do espaço.

              Seção PRÓPRIA, com carregamento e falha próprios: um `503` do espaço não pode apagar
              a identidade nem o idioma. A configuração da Instância não está aqui — ela mora onde
              o contexto de Instância existe, e inventar um seletor seria superfície sem
              authority. */}
          <SecaoDoObjeto
            natureza="acao"
            titulo={t("account.signInTitle")}
            detalhe={t("account.signInBody")}
          >
            <div className="flex flex-wrap items-center gap-3">
              {urlDoProvedor && (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="min-h-11 rounded-xl border border-border text-foreground"
                >
                  <a
                    href={urlDoProvedor}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("account.signInAction")}
                  </a>
                </Button>
              )}
              <Button
                onClick={sair}
                variant="ghost"
                size="sm"
                className="min-h-11 rounded-xl text-muted-foreground hover:bg-muted"
              >
                {t("account.signOut")}
              </Button>
            </div>
          </SecaoDoObjeto>

          <SecaoDoObjeto
            natureza="acao"
            titulo={t("workspaceConfig.title")}
            detalhe={t("workspaceConfig.body")}
          >
            <SecaoDeWorkspace workspaceId={workspaceId} />
          </SecaoDoObjeto>

          {/* M44 · COM-01 — DEPOIS do Workspace, e na MESMA página.
              Depois porque a ordem conta uma história: primeiro quem você é e como o produto
              fala com você (conta), depois qual é este espaço, e por fim para onde ele avisa.
              Notificação é configuração DO ESPAÇO — o produtor exige `workspace_id` nas quatro
              operações —, então ela pertence a esta vizinhança e não à da conta.

              Na mesma página porque criar uma segunda Settings faria a pessoa procurar em dois
              lugares o que é a mesma pergunta: "como este espaço está configurado". Seção
              própria, com carregamento e falha próprios: um `503` do dono da comunicação não
              pode derrubar o nome do espaço nem o idioma da conta. */}
          <SecaoDoObjeto
            natureza="acao"
            titulo={t("notifications.title")}
            detalhe={t("notifications.body")}
          >
            <SecaoDeNotificacoes workspaceId={workspaceId} />
          </SecaoDoObjeto>
        </div>
      </PageFrame>
    </AppShell>
  );
}
