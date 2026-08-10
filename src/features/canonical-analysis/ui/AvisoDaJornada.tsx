// M33 — o aviso neutro da jornada de AN-01.
//
// Nasceu de um débito medido: a falha de transporte e o `idempotency_conflict` desenhavam o MESMO
// cartão à mão, em dois arquivos. Duas cópias da mesma forma divergem no primeiro ajuste, e a
// pessoa vê duas linguagens para a mesma classe de aviso.
//
// Por que NEUTRO e não `destructive`: os dois casos que ele serve não são o backend recusando o
// que foi enviado. Um é a conversa que caiu — o dado pode ter chegado. O outro é um pedido
// recusado por já ter sido registrado. Pintar de erro mandaria a pessoa procurar defeito onde não
// há. O tom destrutivo continua reservado ao `ProblemFeedback`, que trata resposta do servidor.
//
// Ele NÃO é um pattern do DS: serve dois estados de uma superfície. Se uma terceira superfície
// precisar da mesma forma, é aí que ele sobe para `design/patterns`, com o teste que o justifique.

export function AvisoDaJornada({
  titulo,
  significado,
  acao,
}: {
  /** O que aconteceu. */
  titulo: string;
  /** O que isto significa para a análise — nunca uma promessa que o contrato não sustente. */
  significado: string;
  /** A única ação possível, e ela precisa ser real. */
  acao: React.ReactNode;
}) {
  return (
    <div role="alert" className="space-y-2 rounded-md border border-border bg-card p-4 text-sm">
      <p className="font-medium text-foreground">{titulo}</p>
      <p className="text-muted-foreground">{significado}</p>
      <div className="pt-1">{acao}</div>
    </div>
  );
}
