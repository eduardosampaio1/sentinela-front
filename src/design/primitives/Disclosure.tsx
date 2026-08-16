// Revelar/ocultar um trecho, com o contrato de acessibilidade fechado no primitive.
//
// A3 da Constituição: a marginália de procedência colapsa aqui no mobile. As restrições que ela
// impõe são de acessibilidade, e por isso moram no primitive em vez de dependerem de cada
// consumidor lembrar:
//
//   • gatilho é `<button>` de verdade — `<div onClick>` não recebe foco nem tecla;
//   • `aria-expanded` sempre presente, e `aria-controls` apontando para a região;
//   • NUNCA depende de hover: não existe hover no toque, e a informação sumiria no mobile;
//   • alvo com altura mínima confortável para o polegar.
//
// O conteúdo é montado só quando aberto — mas o `id` da região existe sempre, senão `aria-controls`
// apontaria para o vazio enquanto fechado.

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function Disclosure({
  gatilho,
  aberturaInicial = false,
  className,
  children,
}: {
  /** Rótulo do botão. Texto, não ícone sozinho — ícone sozinho precisa de nome acessível. */
  gatilho: React.ReactNode;
  aberturaInicial?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(aberturaInicial);
  const idRegiao = useId();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idRegiao}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          "inline-flex min-h-[44px] items-center gap-1.5 rounded-md px-2 text-xs",
          "text-muted-foreground hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {/* M45.3 — a SETA, e por que ela faltava.
            O gatilho renderizava só o texto. No mobile de RES-01 ele é a palavra "Procedência"
            sozinha, entre o número e a descrição do indicador: lê-se como título de seção, e nada
            diz que abre. A procedência é o argumento de confiança daquela tela, e ficava invisível
            para quem não adivinhasse tocar.
            O docstring do `gatilho` diz "texto, não ícone sozinho" — a regra é contra o ícone SEM
            nome acessível, e não contra texto acompanhado. O nome continua sendo o texto; a seta é
            `aria-hidden` e só desenha o estado que o `aria-expanded` já publica. */}
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", aberto && "rotate-180")}
          aria-hidden="true"
        />
        {gatilho}
      </button>
      <div id={idRegiao} hidden={!aberto}>
        {aberto ? children : null}
      </div>
    </div>
  );
}
