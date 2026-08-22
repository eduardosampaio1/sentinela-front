// M11 — a ÚNICA tradução de estado público para aparência.
//
// ## Por que ela mora no Design System
//
// O critério 17 de UI COMPLETE exige "uma única semântica pública de estados". O jeito de essa
// regra falhar é banal: cada superfície escreve o seu `switch`, e seis meses depois `running` é
// azul na Home, cinza no Resultado e tem um spinner só na Instância. Nenhum teste reclama, porque
// cada `switch` está correto isoladamente.
//
// Uma tradução só, num lugar só, é o que impede isso — e ela precisa ficar no DS porque as
// superfícies que a consomem estão em features diferentes.
//
// ## O que este arquivo NÃO sabe
//
// Não sabe o que é Análise, Instância ou Workspace, e não sabe traduzir texto. Ele conhece o
// **vocabulário de estado do contrato público**, que é publicado e compartilhado — não os objetos
// do domínio. O rótulo chega pronto por prop, como na `Bar` da M10: quem traduz é a camada de
// produto, que já conhece o vocabulário congelado.
//
// ## Por que quatro tons e não quinze
//
// V5: cor semântica é RESERVADA. Se cada um dos quinze estados tivesse a sua cor, nenhuma seria
// sinal. E V6: cor nunca é canal único. Quem distingue `partial` de `withheld` de `unknown` é o
// **ícone e o rótulo** — os três compartilham o tom neutro de propósito, porque nenhum deles é
// erro e nenhum deles é sucesso.
//
// Essa escolha não foi inventada aqui: é a que o produto já materializou. `Retido.tsx` desenha
// retenção com `border-border bg-card text-muted-foreground` — neutro. `notices.tsx` reserva
// `destructive` para `isError` e usa spinner neutro para o indeterminado. M11 consolida o que já
// estava decidido em vez de propor uma paleta nova.

/**
 * Os nove estados de `public_states` do contrato.
 *
 * O nome é o do CONTRATO, não o do objeto que os carrega. A primeira versão deste arquivo os
 * chamava de `EstadoDeAnalise` — e o gate da M04 reprovou, com razão: um tipo do Design System
 * batizado a partir de um objeto de domínio é o DS aprendendo o domínio, que é exatamente o
 * acoplamento que o gate existe para impedir. O badge não precisa saber de quem é o estado.
 */
export type EstadoPublico =
  | "preparing"
  | "receiving"
  | "queued"
  | "running"
  | "recovering"
  | "needs_mapping"
  | "ready_to_submit"
  | "completed"
  | "failed";

/** Os estados dos quatro EIXOS de progresso (`progress_states` do contrato). */
export type EstadoDeEixo =
  | "pending"
  | "running"
  | "ready"
  | "partial"
  | "withheld"
  | "failed"
  | "unknown"
  | "unavailable"
  | "preparing"
  | "expired";

/**
 * Tom visual. Quatro, e cada um aponta para um token que JÁ existe — nenhum valor novo nasce aqui.
 *
 * `neutro` é o default por V5. Um estado só sai dele quando a cor acrescenta informação que o
 * ícone sozinho não dá: sucesso, pedido de ação humana, e falha.
 */
export type TomDoEstado = "neutro" | "positivo" | "atencao" | "negativo";

/** Forma do ícone. É o SEGUNDO CANAL de V6 — o que sobrevive à escala de cinza e ao daltonismo. */
export type FormaDoEstado =
  | "reservado" // lugar guardado, o dado ainda não chegou
  | "recebendo" // o dado está chegando
  | "espera" // na fila, aguardando vez
  | "andamento" // em curso, com movimento
  | "montando" // sendo produzido a partir de algo que já existe
  | "retomada" // em curso após uma tentativa
  | "pessoa" // parou esperando alguém
  | "partida" // tudo no lugar, falta começar
  | "concluido"
  | "parcial" // terminou, parte omitida
  | "retido" // nada pode ser liberado
  | "desconhecido" // não sabemos — não é zero
  | "indisponivel" // não há o que oferecer
  | "expirado" // não entrego mais
  | "falha";

export interface AparenciaDoEstado {
  tom: TomDoEstado;
  forma: FormaDoEstado;
}

const PUBLICO: Readonly<Record<EstadoPublico, AparenciaDoEstado>> = {
  // Três fatos distintos, e o teste de V6 exigiu três formas: a primeira versão deste mapa dava
  // "espera" a `preparing` e `queued` e "andamento" a `receiving` e `running`. Em escala de cinza
  // eles viravam o mesmo estado — e a pessoa não saberia se o upload chegou.
  preparing: { tom: "neutro", forma: "reservado" },
  receiving: { tom: "neutro", forma: "recebendo" },
  queued: { tom: "neutro", forma: "espera" },
  running: { tom: "neutro", forma: "andamento" },
  // Retomada tem forma PRÓPRIA: "voltou a tentar" e "está rodando pela primeira vez" são fatos
  // diferentes, e achatá-los esconde que houve uma falha antes.
  recovering: { tom: "neutro", forma: "retomada" },
  // Os DOIS estados que pedem AÇÃO HUMANA, e é o que justifica gastar `atencao` aqui e em
  // nenhum outro lugar da máquina de análise — `atencao` não é erro: nada quebrou.
  //
  // Este comentário dizia "o único estado", e deixou de ser verdade quando `ready_to_submit`
  // nasceu.
  //
  // A primeira tentativa deu FORMA IGUAL aos dois, com o argumento de que o rótulo distingue.
  // O gate de V6 reprovou, e estava certo: badge em lista se lê por cor e desenho, não por
  // texto — e quem não distingue a cor via um estado só. Compartilhar o tom é correto (os dois
  // pedem ação humana); compartilhar a forma apagava a diferença justamente para quem mais
  // depende dela.
  //
  // `pessoa` = parou esperando alguém DECIDIR algo. `partida` = está tudo no lugar, falta
  // apertar o botão. São pedidos diferentes.
  needs_mapping: { tom: "atencao", forma: "pessoa" },
  ready_to_submit: { tom: "atencao", forma: "partida" },
  completed: { tom: "positivo", forma: "concluido" },
  failed: { tom: "negativo", forma: "falha" },
};

const EIXO: Readonly<Record<EstadoDeEixo, AparenciaDoEstado>> = {
  pending: { tom: "neutro", forma: "espera" },
  // No eixo, `preparing` é o export sendo MONTADO a partir de resultado que já existe — não é a
  // mesma coisa que a Engine ou o Analytics rodando. Forma própria.
  preparing: { tom: "neutro", forma: "montando" },
  running: { tom: "neutro", forma: "andamento" },
  ready: { tom: "positivo", forma: "concluido" },
  // `partial` e `withheld` são NEUTROS de propósito. Nenhum dos dois é erro: em `partial` a
  // análise terminou e parte foi omitida para não reconstruir grupos pequenos; em `withheld`
  // nada pode ser liberado. Pintá-los de `atencao` ou `negativo` transformaria uma decisão
  // correta de privacidade em defeito aparente. Quem os separa é a FORMA e o rótulo.
  partial: { tom: "neutro", forma: "parcial" },
  withheld: { tom: "neutro", forma: "retido" },
  // `unknown` não é zero, não é ausência e não é falha. Forma própria, tom neutro.
  unknown: { tom: "neutro", forma: "desconhecido" },
  unavailable: { tom: "neutro", forma: "indisponivel" },
  // `expired` é "não entrego mais", e NÃO é "não existe mais". Forma própria.
  expired: { tom: "neutro", forma: "expirado" },
  failed: { tom: "negativo", forma: "falha" },
};

export function aparenciaPublica(estado: EstadoPublico): AparenciaDoEstado {
  return PUBLICO[estado];
}

export function aparenciaDeEixo(estado: EstadoDeEixo): AparenciaDoEstado {
  return EIXO[estado];
}

/** Exportadas para os testes provarem cobertura sem redigitar a lista. */
export const ESTADOS_PUBLICOS = Object.keys(PUBLICO) as readonly EstadoPublico[];
export const ESTADOS_DE_EIXO = Object.keys(EIXO) as readonly EstadoDeEixo[];
