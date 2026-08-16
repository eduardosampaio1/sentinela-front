// DOCUMENTO — o arquétipo de texto longo.
//
// ## O único lugar do produto onde a pessoa LÊ
//
// Todo o resto é escaneado. Aqui não: quem abre um texto legal está procurando uma frase
// específica e vai ler o parágrafo inteiro quando achar. Isso muda a tipografia — medida de 66
// caracteres, entrelinha aberta — e acrescenta um índice que diz onde a pessoa está.
//
// ## Índice que MARCA POSIÇÃO, não índice que só navega
//
// Num texto de cinco seções, um índice que só pula é um menu. O que o torna útil é responder
// "onde estou" durante a rolagem — sem isso a pessoa perde o lugar ao voltar de uma seção e
// recomeça a busca visual do zero.
//
// ## Duas formas de usar, porque há dois tipos de documento
//
// `Documento` recebe as seções declaradas e monta tudo — é o caso de um texto novo.
//
// `IndiceDeDocumento` fica exposto sozinho para o caso oposto: um documento cujo corpo já
// existe como JSX solto (os três textos legais somam ~630 linhas de conteúdo escrito à mão).
// Reestruturá-los em objetos para caber num componente seria reescrever conteúdo jurídico numa
// missão de design — e conteúdo jurídico é justamente o que não se toca sem quem o escreveu.

import { useState, type ReactNode } from "react";
import { useSecaoAtiva } from "./secaoAtiva";

export interface SecaoDeDocumento {
  id: string;
  titulo: string;
  corpo: ReactNode;
}

/**
 * O índice. Recebe a seção ativa de fora para servir aos dois modos de composição.
 *
 * ## Por que ele DOBRA no celular
 *
 * Na coluna lateral do desktop o índice não custa nada: ele ocupa espaço que sobrava. Empilhado
 * no celular ele vira um muro — treze links a ~34px são 440px de rolagem antes da primeira
 * frase, numa tela de 812. A pessoa abriu um texto legal e a primeira coisa que vê é a lista de
 * coisas que ela ainda não pode ler.
 *
 * ## Quem manda em cada largura
 *
 * O CSS manda no desktop; o estado manda só no celular. A ordem importa, e a primeira tentativa
 * inverteu: era um `<details>` cujo `open` vinha de `matchMedia`, com o gatilho desativado por
 * `pointer-events: none` no `md`. Bastou o estado ficar `false` numa largura grande — o que
 * acontece ao atravessar o ponto de quebra na ordem errada — para o índice sumir E ficar sem
 * como reabrir. Um controle capaz de entrar num estado sem saída.
 *
 * Aqui a lista é `hidden md:grid`: em `md` ela aparece por regra de folha, sem nenhum caminho de
 * código que possa escondê-la. O botão é `md:hidden` e governa apenas a largura em que ele
 * existe. Sem JS o desktop continua correto.
 */
export function IndiceDeDocumento({
  rotulo,
  secoes,
  ativa,
}: {
  rotulo: string;
  secoes: readonly { id: string; titulo: string }[];
  ativa: string;
}) {
  const [aberto, setAberto] = useState(false);
  const idDaLista = `indice-${secoes[0]?.id ?? "vazio"}`;

  if (secoes.length === 0) return null;

  return (
    <nav aria-label={rotulo} className="md:sticky md:top-20 md:self-start">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idDaLista}
        onClick={() => setAberto((v) => !v)}
        // `min-h-11` são 44px: o mínimo de alvo de toque. Com `py-2` o botão fechava em 34px —
        // confortável para o mouse, e errado no aparelho em que ele é o único jeito de abrir.
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-[0.65rem] uppercase tracking-wider text-muted-foreground md:hidden"
      >
        {rotulo}
        <span aria-hidden="true">{aberto ? "−" : "+"}</span>
      </button>

      <p className="mb-2 hidden text-[0.65rem] uppercase tracking-wider text-muted-foreground md:block">
        {rotulo}
      </p>

      <ul
        id={idDaLista}
        className={`gap-0.5 text-sm md:grid ${aberto ? "mt-2 grid md:mt-0" : "hidden"}`}
      >
        {secoes.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={ativa === s.id ? "true" : undefined}
              className={`block rounded border-l-2 px-3 py-1.5 transition-colors ${
                ativa === s.id
                  ? "border-primary bg-accent text-primary"
                  : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              {s.titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Documento({
  titulo,
  atualizado,
  rotuloDoIndice,
  secoes,
}: {
  titulo: string;
  /** Quando mudou, já formatado. Num texto legal isto é parte do conteúdo, não metadado. */
  atualizado: string;
  rotuloDoIndice: string;
  secoes: readonly SecaoDeDocumento[];
}) {
  const ativa = useSecaoAtiva(secoes.map((s) => s.id));

  return (
    <div className="mx-auto grid max-w-5xl gap-9 px-4 py-12 md:grid-cols-[12rem_minmax(0,1fr)]">
      <IndiceDeDocumento rotulo={rotuloDoIndice} secoes={secoes} ativa={ativa} />

      <article className="max-w-[66ch]">
        <h1 data-revelar className="text-3xl font-semibold tracking-tight text-foreground">
          {titulo}
        </h1>
        <p data-revelar className="mt-2 text-xs text-muted-foreground">
          {atualizado}
        </p>

        {secoes.map((s) => (
          <section key={s.id} data-revelar className="mt-8">
            {/* `scroll-mt` impede que o cabeçalho fixo cubra o título ao pular pela âncora — o
                defeito clássico de índice em página com barra grudada no topo. */}
            <h2
              id={s.id}
              className="scroll-mt-24 text-lg font-semibold tracking-tight text-foreground"
            >
              {s.titulo}
            </h2>
            <div className="mt-2 grid gap-3 leading-relaxed text-muted-foreground">{s.corpo}</div>
          </section>
        ))}
      </article>
    </div>
  );
}

/** Destaque dentro de um documento: a frase que a pessoa veio procurar. */
export function DestaqueDeDocumento({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-primary bg-card px-4 py-3 text-sm text-foreground">
      {children}
    </p>
  );
}
