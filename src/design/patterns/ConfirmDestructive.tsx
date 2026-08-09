// M13 — confirmação destrutiva por DIGITAÇÃO EXATA.
//
// D28: não basta *Confirmar*, checkbox, nem digitar "EXCLUIR". A pessoa digita o **nome do objeto**
// a que a coisa pertence — porque isso a obriga a saber de qual sistema está apagando, e um id
// copiado sem ler não protege ninguém.
//
// O CTA nasce desabilitado e só habilita com correspondência **exata**: sem `trim` silencioso, sem
// ignorar acento, sem casar por prefixo. Cada uma dessas "gentilezas" transforma a barreira em
// obstáculo decorativo.

import { useId, useState } from "react";
import { Stack, Text } from "@/design/primitives";
import { cn } from "@/lib/utils";

export function ConfirmDestructive({
  titulo,
  consequencias,
  rotuloDoCampo,
  nomeExigido,
  acao,
  className,
}: {
  titulo: string;
  /** O que exatamente será destruído. Sem isto, a confirmação é ritual. */
  consequencias: React.ReactNode;
  rotuloDoCampo: string;
  /** O texto que precisa ser digitado, caractere a caractere. */
  nomeExigido: string;
  /** Recebe `habilitado`. O componente NÃO decide o que a ação faz — só quando ela pode ocorrer. */
  acao: (habilitado: boolean) => React.ReactNode;
  className?: string;
}) {
  const [digitado, setDigitado] = useState("");
  const idCampo = useId();
  const idConsequencias = useId();

  // Comparação estrita. Qualquer normalização aqui afrouxaria a barreira sem ninguém decidir.
  const habilitado = digitado === nomeExigido;

  return (
    <div
      role="alertdialog"
      aria-labelledby={`${idCampo}-titulo`}
      aria-describedby={idConsequencias}
      className={cn("rounded-lg border border-destructive/40 bg-card p-4", className)}
    >
      <Stack espaco="md">
        <Text as="p" papel="destaque" id={`${idCampo}-titulo`}>
          {titulo}
        </Text>
        <div id={idConsequencias}>{consequencias}</div>
        <Stack espaco="xs">
          <label htmlFor={idCampo} className="text-xs text-muted-foreground">
            {rotuloDoCampo}
          </label>
          <input
            id={idCampo}
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            // Sem autocomplete e sem sugestão: o navegador não pode preencher a barreira.
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "rounded-md border border-border bg-background px-3 py-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </Stack>
        {acao(habilitado)}
      </Stack>
    </div>
  );
}
