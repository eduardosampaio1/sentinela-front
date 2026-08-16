// DOCUMENTO · a moldura dos três textos legais.
//
// Um arquivo, três rotas: `/privacy`, `/terms` e `/security`. Foi assim que a M46 descobriu que
// os 27 nós de contraste não eram três defeitos — eram UM template contado três vezes. A mesma
// aritmética vale ao contrário, e é por isso que esta é a maior alavanca do sistema: corrigir
// aqui corrige nos três.
//
// ## O que saiu
//
// **O objeto `L` de sete cores literais.** Ele existia porque em M46 não havia vocabulário para
// vestir estes papéis; agora há. Cada uma foi para o token equivalente, e as razões de contraste
// que aquele comentário defendia continuam valendo por construção — os tokens de texto foram
// calibrados com folga, não com o mínimo.
//
// **O `<style>` injetado em runtime.** As regras de `.legal-body` viviam num bloco interpolado
// dentro do componente. Era uma terceira folha de estilo nascendo, com as cores vindo de dentro
// do JS — o defeito que o vocabulário único matou no nível do token, reaparecendo um nível
// acima. Foram para `globals.css`, onde folha de estilo mora.
//
// **`100vh`.** No celular, `vh` conta a barra do navegador que some ao rolar, e a página ganha
// um pedaço morto embaixo. `dvh` acompanha.
//
// ## O que entrou: o índice
//
// Um texto legal é lido procurando uma frase, não do começo ao fim. Sem índice a pessoa rola
// caçando, e ao voltar de uma seção recomeça a busca visual do zero.
//
// Ele é DERIVADO dos `h2` que os três documentos já escrevem, não declarado. A alternativa seria
// reestruturar ~630 linhas de conteúdo jurídico em objetos de seção — reescrever texto legal
// numa missão de design, que é exatamente o que não se faz sem quem o escreveu. Derivar mantém
// os três arquivos de conteúdo intocados e o índice sempre igual ao que está na tela.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { IndiceDeDocumento } from "@/design/patterns/Documento";
import { useSecaoAtiva } from "@/design/patterns/secaoAtiva";
import { useRevelacao } from "@/design/motion";

/**
 * Transforma um título em identificador de âncora estável e legível.
 *
 * `vistos` desempata: a PRIMEIRA ocorrência de um título fica com o apelido limpo, e só uma
 * repetição posterior ganha sufixo. É o que mantém um link já compartilhado válido quando um
 * segundo "Escopo" nasce meses depois — prefixar todo mundo com a posição resolveria a colisão
 * pelo mesmo preço, mas produziria `secao-1-1-who-we-are` em documentos cujos títulos já são
 * numerados, e âncora que a pessoa não consegue ler é âncora que ela não confere antes de colar.
 */
function comoAncora(texto: string, vistos: Set<string>): string {
  const base = texto
    .toLowerCase()
    .normalize("NFD")
    // `\p{Diacritic}` em vez do intervalo de marcas combinantes escrito à mão: aquele intervalo
    // é composto de caracteres invisíveis no editor, e some sem aviso numa conversão de
    // codificação distraída — deixando a função de aparência correta e sem efeito.
    //
    // Na prática a linha seguinte já apagaria os acentos, porque só letras e dígitos ASCII
    // sobrevivem a ela. A decomposição existe para "ação" virar `acao` em vez de `a-o`.
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const limpo = base || "secao";
  if (!vistos.has(limpo)) {
    vistos.add(limpo);
    return limpo;
  }
  let n = 2;
  while (vistos.has(`${limpo}-${n}`)) n += 1;
  vistos.add(`${limpo}-${n}`);
  return `${limpo}-${n}`;
}

function LegalNav() {
  const { language, setLanguage } = useLanguage();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur sm:px-8">
      <Link to="/" className="flex items-center gap-2.5">
        <img src="/sentinela-icon.svg" alt="" width="26" height="26" className="rounded-md" />
        <span className="text-sm font-semibold tracking-tight text-foreground">Sentinela</span>
      </Link>
      <button
        type="button"
        onClick={() => setLanguage(language === "pt" ? "en" : "pt")}
        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
      >
        {language === "pt" ? "EN" : "PT"}
      </button>
    </header>
  );
}

export function LegalPage({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle: string;
  updated: string;
  children: ReactNode;
}) {
  const { language } = useLanguage();
  const corpo = useRef<HTMLDivElement>(null);
  const raiz = useRevelacao<HTMLDivElement>(title);
  const [secoes, setSecoes] = useState<readonly { id: string; titulo: string }[]>([]);

  // O índice é montado depois da renderização porque só então os `h2` existem. `children` na
  // dependência: trocar de documento sem desmontar a moldura precisa reconstruir a lista.
  useEffect(() => {
    const titulos = Array.from(corpo.current?.querySelectorAll("h2") ?? []);
    const vistos = new Set<string>();
    setSecoes(
      titulos.map((no) => {
        const texto = no.textContent?.trim() ?? "";
        // O id é escrito no nó: o observador de posição procura por `getElementById`, e um
        // documento cujos títulos não têm id devolveria índice sem destino nenhum.
        if (!no.id) no.id = comoAncora(texto, vistos);
        else vistos.add(no.id);
        return { id: no.id, titulo: texto };
      }),
    );
  }, [children]);

  const ativa = useSecaoAtiva(secoes.map((s) => s.id));

  return (
    <div ref={raiz} className="min-h-dvh bg-background text-foreground">
      <LegalNav />

      <main className="mx-auto grid max-w-5xl gap-9 px-6 pb-24 pt-10 md:grid-cols-[12rem_minmax(0,1fr)]">
        <IndiceDeDocumento
          rotulo={language === "pt" ? "Nesta página" : "On this page"}
          secoes={secoes}
          ativa={ativa}
        />

        <article className="min-w-0 max-w-[66ch]">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            {language === "pt" ? "Voltar ao início" : "Back to home"}
          </Link>

          <div data-revelar className="mb-10 border-b border-border pb-8">
            <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            <p className="mb-4 text-base leading-relaxed text-muted-foreground">{subtitle}</p>
            <span className="text-xs text-muted-foreground">
              {language === "pt" ? "Última atualização" : "Last updated"}: {updated}
            </span>
          </div>

          <div ref={corpo} className="legal-body">
            {children}
          </div>
        </article>
      </main>

      <footer className="border-t border-border px-6 py-6 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} Baluarte Tecnologia.{" "}
            {language === "pt" ? "Todos os direitos reservados." : "All rights reserved."}
          </span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              {language === "pt" ? "Privacidade" : "Privacy"}
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              {language === "pt" ? "Termos" : "Terms"}
            </Link>
            <Link to="/security" className="transition-colors hover:text-foreground">
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
