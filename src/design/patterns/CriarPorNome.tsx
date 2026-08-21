// Criação por NOME — o diálogo que Workspace e Instance compartilham.
//
// As duas criações pedem a mesma coisa: um nome, e nada mais. Dois formulários parecidos
// divergiriam no primeiro ajuste — um ganharia contador de caracteres, o outro não; um trataria
// espaço em branco, o outro não —, e a diferença apareceria como inconsistência sem ninguém
// decidir. Um padrão só, dois usos.
//
// ## As decisões de interação, e o porquê de cada uma
//
// **Rótulo visível, nunca placeholder sozinho.** Placeholder some quando se digita, e some
// justamente quando a pessoa volta para conferir o que estava sendo pedido.
//
// **Validação no envio, não a cada tecla.** Acusar "obrigatório" enquanto alguém ainda digita a
// primeira letra é o erro chegando antes do erro existir.
//
// **O CTA não desabilita por campo vazio.** Botão desabilitado não diz por quê — quem clica
// recebe silêncio. Habilitado, ele responde com a frase que explica o que falta. A exceção é
// enquanto o envio corre: aí ele está ocupado, e isso o `aria-busy` também diz.
//
// **O erro mora ao lado do campo**, com `role="alert"`, e diz causa + saída. "Falha ao criar" não
// é mensagem: é a ausência de uma.

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Teto do nome. Espelha o `max_length` do Gateway — divergir faria o cliente aceitar o que a
 *  fronteira recusa, e o erro chegaria como falha de servidor sobre um dado que a tela já podia
 *  ter barrado. */
export const MAXIMO_DO_NOME = 120;

export type TextosDeCriacao = {
  titulo: string;
  descricao: string;
  rotulo: string;
  ajuda: string;
  exemplo: string;
  enviar: string;
  enviando: string;
  cancelar: string;
  /** "Dê um nome para continuar." — o que falta, não "campo inválido". */
  erroVazio: string;
  /** Causa + saída. Recebe o que se sabe da falha; nunca o corpo cru do servidor. */
  erroAoCriar: string;
};

export function CriarPorNome({
  aberto,
  aoFechar,
  textos,
  aoCriar,
  className,
}: {
  aberto: boolean;
  aoFechar: () => void;
  textos: TextosDeCriacao;
  /** Devolve quando a criação terminou. Lançar é o sinal de falha. */
  aoCriar: (nome: string) => Promise<void>;
  className?: string;
}) {
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const idCampo = useId();
  const idAjuda = useId();
  const idErro = useId();
  const campo = useRef<HTMLInputElement>(null);

  // Reabrir com o texto da tentativa anterior faria a pessoa apagar antes de começar. E o foco
  // vai para o campo: quem abriu já sabe o que quer escrever.
  useEffect(() => {
    if (!aberto) return;
    setNome("");
    setErro(null);
    setEnviando(false);
    const t = window.setTimeout(() => campo.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [aberto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    // `trim` aqui é decisão, não gentileza: "  " não é nome, e deixar passar criaria um espaço
    // cujo rótulo é invisível na lista.
    const limpo = nome.trim();
    if (!limpo) {
      setErro(textos.erroVazio);
      campo.current?.focus();
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await aoCriar(limpo);
    } catch {
      // A mensagem é NOSSA. O corpo do servidor pode carregar detalhe interno, e traduzi-lo aqui
      // faria a tela repetir vocabulário que ninguém escreveu para ser lido.
      setErro(textos.erroAoCriar);
      setEnviando(false);
      campo.current?.focus();
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && !enviando && aoFechar()}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <form onSubmit={enviar} noValidate>
          <DialogHeader>
            <DialogTitle>{textos.titulo}</DialogTitle>
            <DialogDescription>{textos.descricao}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-2">
            <label htmlFor={idCampo} className="text-sm font-medium text-foreground">
              {textos.rotulo}
            </label>
            <input
              id={idCampo}
              ref={campo}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={MAXIMO_DO_NOME}
              placeholder={textos.exemplo}
              autoComplete="off"
              disabled={enviando}
              aria-describedby={erro ? `${idErro} ${idAjuda}` : idAjuda}
              aria-invalid={erro ? true : undefined}
              className={cn(
                // `h-11` = 44px: o piso de alvo de toque. Um campo de 36px é confortável no
                // mouse e escorregadio no polegar.
                "h-11 rounded-md border bg-background px-3 text-sm text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-60",
                erro ? "border-destructive" : "border-border",
              )}
            />
            <p id={idAjuda} className="text-xs text-muted-foreground">
              {textos.ajuda}
            </p>
            {erro ? (
              // `role="alert"` para o leitor de tela anunciar sem que o foco precise ir até lá.
              <p id={idErro} role="alert" className="text-xs text-destructive">
                {erro}
              </p>
            ) : null}
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar} disabled={enviando}>
              {textos.cancelar}
            </Button>
            <Button type="submit" disabled={enviando} aria-busy={enviando}>
              {enviando ? textos.enviando : textos.enviar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
