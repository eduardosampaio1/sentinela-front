// Aviso discreto dentro de um bloco. `role="note"` — informa, não alarma.
//
// Promovida na M10 (era `Nota`). O papel importa: `note` é lido como observação, e não disputa
// atenção com o conteúdo. Um aviso que grita onde não há urgência gasta o alarme que vai faltar
// quando houver.

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p role="note" className="mt-2 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
