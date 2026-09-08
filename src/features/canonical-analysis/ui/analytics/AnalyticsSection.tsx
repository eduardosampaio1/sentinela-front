export function AnalyticsSection({
  id,
  titulo,
  children,
}: {
  readonly id: string;
  readonly titulo: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section data-revelar aria-labelledby={id} className="painel reg">
      <header><h2 id={id}>{titulo}</h2></header>
      <div className="corpo">{children}</div>
    </section>
  );
}

/** Nulos, inválidos e ausentes — contados pelo produtor, nunca somados aqui. */
export function PublishedCounts({
  itens,
}: {
  readonly itens: readonly { rotulo: string; valor: number | null }[];
}) {
  return (
    <dl className="contagens">
      {itens.filter((item) => item.valor !== null).map((item) => (
        <div key={item.rotulo}>
          <dt>{item.rotulo}</dt>
          <dd>{item.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
