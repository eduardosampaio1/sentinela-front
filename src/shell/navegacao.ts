// A NAVEGAÇÃO PRIMÁRIA do shell canônico. **Dado**, não componente.
//
// Mora fora do `Sidebar` pelas duas razões que `canonical-analysis/ui/visoes.ts` já enunciou, e a
// segunda importa mais:
//
//   1. Fast refresh só funciona quando um arquivo exporta apenas componentes.
//   2. A lista passou a ter DOIS consumidores — a barra lateral e a paleta de comandos (NAV-01).
//      Enquanto ela vivia dentro do componente, o segundo consumidor teria que copiá-la, e uma
//      cópia é a divergência marcada para acontecer: item novo na barra que a paleta não acha.
//
// Nenhuma rota foi inventada aqui. A lista é a mesma da M25, com Instâncias entrando na M45·T1, e
// o histórico dessas decisões continua escrito no `Sidebar.tsx`, junto de quem as desenha.

export interface NavItem {
  to: string;
  /**
   * SUFIXO da chave de i18n, nunca o rótulo: D37 pede a matriz `{pt-BR, en} × {mobile, desktop}`.
   *
   * É sufixo, e não a chave inteira, porque `t(variavel)` é uma chamada OPACA — o gate da M14 não
   * consegue decidir orfandade a partir dela e congela a contagem. `t(`shell.nav.${x}`)` declara a
   * família, então a busca por chave órfã continua possível.
   */
  labelSuffix: "home" | "analyses" | "instances";
  icon: string;
  exact?: boolean;
}

// A IA do shell CANÔNICO — decisão de owner, M25.
//
// `/dashboard`, `/dashboard/history` e `/dashboard/settings` SAÍRAM daqui. As rotas continuam
// registradas e resolvendo: a M24 as manteve por compatibilidade, e um 404 numa URL que já
// circulou é defeito que só aparece para quem não está por perto para reclamar. Mas
// **compatibilidade não é navegação canônica** — o shell novo não promove endereço legado a IA
// pública.
//
// Nenhuma rota nova foi inventada. "Settings" não tem destino congelado, então o item saiu em vez
// de ganhar um endereço improvisado; conta mora no provedor (D19), e está no menu do usuário.
//
// Os rótulos passam pelo i18n porque D37 exige as combinações `{pt-BR, en} × {mobile, desktop}`,
// e um rótulo em inglês fixo tornaria metade da matriz não-verificável.
export const PRIMARY_NAV: readonly NavItem[] = [
  {
    to: "/home",
    labelSuffix: "home",
    icon: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
    exact: true,
  },
  {
    to: "/analyses",
    labelSuffix: "analyses",
    icon: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
  },
  // M45 · T1 — Instâncias ENTRA na navegação.
  //
  // `/instances` é superfície REAL do Blueprint, com três sub-superfícies (lista, histórico,
  // régua de baseline) e três missões entregues — M36, M37 e M40 —, e não tinha entrada nenhuma
  // no shell. Só se chegava a uma Instância por dentro de uma análise ou colando a URL.
  //
  // A consequência já tinha aparecido como remendo local: a página de erro da Instância precisou
  // ganhar um link "View all instances" próprio na M42, porque a lateral não oferecia volta. O
  // remendo existia porque faltava a entrada global — e nenhuma missão de superfície ia enxergar
  // isso, porque cada uma media a si mesma.
  //
  // Fica ENTRE análises e workspaces: a Instância agrupa análises e vive dentro de um espaço, e a
  // ordem da navegação conta essa contenção.
  {
    to: "/instances",
    labelSuffix: "instances",
    icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75",
  },
];

// ─── `Workspaces` SAIU da navegação primária ────────────────────────────────────
//
// Ele afirmava, ao lado de Análises e Instâncias, que os três são coisas do mesmo tipo.
// Não são: análise e instância **vivem dentro** de um workspace, e nenhuma das duas
// significa coisa alguma sem um selecionado — `useCanonicalScope()` devolve `null` e as
// três telas dependem dele. Um menu que achata contêiner e conteúdo em irmãos ensina uma
// estrutura que o domínio não tem.
//
// A decisão já existia neste repositório, aplicada meio. O `Sidebar.tsx` registra que a
// M25 removeu o `ContextBlock` porque o que ele oferecia como troca de escopo era um
// `navigate("/workspaces")` — e a frase que ficou foi *mudar de página, não trocar de
// tenant*. Trocaram o componente e mantiveram o item. Esta é a outra metade.
//
// **A rota continua registrada e resolvendo**, pela mesma razão de `/dashboard/*`: ela já
// circulou, e 404 em endereço que existiu é defeito que só aparece para quem não está
// por perto para reclamar. Ela é também o destino de quem entra sem workspace nenhum.
//
// Quem passa a ser a porta é o `WorkspaceSwitcher`, no topo da barra — e ele teve de
// ganhar duas coisas para poder sê-la: abrir SEMPRE (antes só abria com mais de um
// workspace) e oferecer criação. Sem a segunda, tirar este item apagaria a capacidade de
// criar workspace de quem tem exatamente um.
