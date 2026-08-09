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
        {gatilho}
      </button>
      <div id={idRegiao} hidden={!aberto}>
        {aberto ? children : null}
      </div>
    </div>
  );
}
