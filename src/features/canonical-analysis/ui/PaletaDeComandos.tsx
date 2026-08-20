// NAV-01 — a paleta de comandos. Blueprint §4.11, decisão de owner 2026-08-19.
//
// ## Escopo (b), e o que ele exclui
//
// Ela indexa as regiões da análise ABERTA mais os quatro destinos do shell. Não busca entre
// análises: `GET /v1/analyses` pagina e não publica operação de busca, e filtrar no cliente faria
// um campo com cara de global afirmar completude sobre a única página que ele tem. Aquele escopo
// virou **BD15** — registrado a partir de uma recusa, para que a próxima pessoa que queira encontre
// a razão escrita em vez de implementar o filtro no cliente.
//
// Por isso ela é ACELERADOR das duas visões da análise, e não cromo global.
//
// ## As regiões vêm do DOM, e isso é a decisão certa aqui
//
// Não há lista de regiões declarada em lugar nenhum: elas são `<h2 id>`/`<h3 id>` que cada visão
// renderiza sob as suas próprias condições. Manter uma lista paralela criaria a divergência
// clássica — região nova sem entrada no índice, ou entrada apontando para âncora que não renderizou
// naquele estado. Ler a árvore no momento da abertura é **zero divergência por construção**, e é a
// mesma regra que o `IndiceDeRegioes` enuncia: *"só entra o que está na tela"*.
//
// ## O que ela NÃO faz
//
// Não ordena por relevância (é `casar`, e a ordem é a do documento). Não pontua. Não corta em
// `top N`. Não troca de porta no Diagnóstico — `?porta=` e `?dominio=` são navegação com deep link
// e histórico, e a paleta salta DENTRO da porta aberta. E não é o único caminho para nada: é
// acelerador, no sentido da 7ª heurística de Nielsen.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { casar, type EntradaDaPaleta } from "../result/indiceDaPaleta";
import { PRIMARY_NAV } from "@/shell/navegacao";

/** Prefixos de `id` que identificam uma região indexável. Um por visão. */
const PREFIXOS = ["argos-", "anl-"] as const;

/**
 * Lê as regiões que ESTÃO na árvore, no momento da abertura.
 *
 * `raiz` é o container da visão. Sem ele a varredura pegaria o shell inteiro — e o shell não tem
 * região de análise nenhuma.
 */
function regioesNaTela(raiz: HTMLElement | null): readonly EntradaDaPaleta[] {
  if (!raiz) return [];
  const seletor = PREFIXOS.map((p) => `h2[id^="${p}"], h3[id^="${p}"]`).join(", ");
  return [...raiz.querySelectorAll<HTMLElement>(seletor)]
    .map((h) => ({
      rotulo: (h.textContent ?? "").trim(),
      destino: h.id,
      grupo: "aqui" as const,
    }))
    // Título vazio não vira entrada: um item sem nome é o "mystery meat" que a régua proíbe.
    .filter((e) => e.rotulo !== "");
}

export function PaletaDeComandos({ raiz }: {
  /** O container da visão atual. É dele que saem as regiões. */
  readonly raiz: React.RefObject<HTMLElement | null>;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [entradas, setEntradas] = useState<readonly EntradaDaPaleta[]>([]);
  const gatilho = useRef<HTMLButtonElement>(null);

  const abrir = useCallback(() => {
    // As entradas são lidas AO ABRIR, não a cada render: a árvore só muda quando a visão muda,
    // e varrer em cada tecla digitada seria trabalho por nada em cima do caminho crítico.
    setEntradas([
      ...regioesNaTela(raiz.current),
      // A MESMA lista que a barra lateral desenha. Ela virou dado em `shell/navegacao.ts`
      // justamente porque passou a ter dois consumidores: copiá-la aqui seria item novo na
      // barra que a paleta não acha.
      ...PRIMARY_NAV.map((d) => ({
        rotulo: t(`shell.nav.${d.labelSuffix}`),
        destino: d.to,
        grupo: "ir" as const,
      })),
    ]);
    setTermo("");
    setAtivo(0);
    setAberta(true);
  }, [raiz, t]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        abrir();
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [abrir]);

  const achados = useMemo(() => casar(entradas, termo), [entradas, termo]);

  function ir(e: EntradaDaPaleta) {
    setAberta(false);
    if (e.destino.startsWith("/")) {
      navigate(e.destino);
      return;
    }
    // Âncora de verdade: o histórico continua funcionando e o endereço fica copiável. E o foco vai
    // para o TÍTULO, não só a rolagem — quem navega por teclado precisa continuar de onde saltou.
    const alvo = document.getElementById(e.destino);
    if (!alvo) return;
    window.location.hash = e.destino;
    alvo.scrollIntoView({ block: "start", behavior: "auto" });
    alvo.setAttribute("tabindex", "-1");
    alvo.focus({ preventScroll: true });
  }

  function teclado(ev: React.KeyboardEvent) {
    if (achados.length === 0) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setAtivo((i) => (i + 1) % achados.length);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setAtivo((i) => (i - 1 + achados.length) % achados.length);
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      // `achados[ativo] ?? último` em vez de `Math.min`: o cadeado backend-first proíbe `Math.*`
      // em componente, e a defesa contra índice fora da lista fica igual — e mais legível.
      ir(achados[ativo] ?? achados[achados.length - 1]);
    }
  }

  const idDoItem = (i: number) => `paleta-item-${i}`;

  return (
    <>
      {/* O GATILHO É VISÍVEL, e não é enfeite: atalho de teclado sozinho não é descoberto, e no
          mobile ele não existe. `min-h-11` é a régua de alvo desta casa. */}
      <button
        ref={gatilho}
        type="button"
        onClick={abrir}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Search aria-hidden="true" className="h-4 w-4" />
        {t("canonicalAnalysis.palette.trigger")}
        <kbd className="rounded border border-border px-1 text-xs">
          {t("canonicalAnalysis.palette.shortcut")}
        </kbd>
      </button>

      <Dialog
        open={aberta}
        onOpenChange={(v) => {
          setAberta(v);
          // Foco DEVOLVIDO ao gatilho. O Radix já o devolve ao elemento que abriu, e no caminho
          // do `⌘K` não houve elemento — então ele volta explicitamente para cá.
          if (!v) gatilho.current?.focus();
        }}
      >
        <DialogContent className="top-[12%] translate-y-0 gap-3 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">
            {t("canonicalAnalysis.palette.label")}
          </DialogTitle>

          <div className="border-b border-border p-3">
            <Input
              autoFocus
              // O PADRÃO É `combobox` + `listbox`, e não um `textbox` com atributos soltos.
              // `aria-controls` e `aria-activedescendant` só significam algo para o leitor de tela
              // quando o campo se declara combobox: sem o papel, ele anuncia "campo de texto" e a
              // lista abaixo passa a ser conteúdo sem relação com o que se digita.
              role="combobox"
              aria-expanded={achados.length > 0}
              value={termo}
              onChange={(e) => {
                setTermo(e.target.value);
                setAtivo(0);
              }}
              onKeyDown={teclado}
              placeholder={t("canonicalAnalysis.palette.placeholder")}
              aria-label={t("canonicalAnalysis.palette.placeholder")}
              aria-controls="paleta-lista"
              aria-activedescendant={achados.length > 0 ? idDoItem(ativo) : undefined}
            />
          </div>

          {/* A CONTAGEM é anunciada, e é `polite`: não é emergência. */}
          <p role="status" aria-live="polite" className="sr-only">
            {achados.length === 1
              ? t("canonicalAnalysis.palette.countOne")
              : t("canonicalAnalysis.palette.count", { n: String(achados.length) })}
          </p>

          {achados.length === 0 ? (
            /* Sem resultado, DIZ O QUE FAZER. Lista vazia muda deixa a pessoa sem saber se
               procurou errado ou se a tela quebrou. */
            <p className="p-4 pt-0 text-sm text-muted-foreground">
              {t("canonicalAnalysis.palette.empty")}
            </p>
          ) : (
            <ul
              id="paleta-lista"
              role="listbox"
              aria-label={t("canonicalAnalysis.palette.label")}
              className="max-h-80 overflow-y-auto p-2 pt-0"
            >
              {achados.map((e, i) => (
                <li
                  key={`${e.grupo}-${e.destino}`}
                  id={idDoItem(i)}
                  role="option"
                  aria-selected={i === ativo}
                  onMouseEnter={() => setAtivo(i)}
                  onClick={() => ir(e)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 text-sm ${
                    i === ativo ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span className="truncate">{e.rotulo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {e.grupo === "aqui"
                      ? t("canonicalAnalysis.palette.groupHere")
                      : t("canonicalAnalysis.palette.groupGoTo")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
