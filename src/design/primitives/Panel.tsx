// Moldura de um bloco: mesma borda, mesmo fundo, mesmo espaçamento.
//
// Promovida na M10 (era `Cartao`). O nome mudou porque T1 é explícito: **painel, não cartão**. A
// hierarquia vem de régua e alinhamento (V1), e a separação é borda — não sombra.

export function Panel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {children}
    </li>
  );
}
