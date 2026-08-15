// M42 — o campo de nome das seções de configuração. **Apresentacional, e só.**
//
// ## Por que ele existe, e o que ele deliberadamente NÃO é
//
// Workspace e Instância compartilham o mesmo padrão VISUAL de edição: um rótulo, um campo, um
// botão, um estado. Compartilhar o desenho é economia legítima; compartilhar o *estado* seria
// outra coisa — e é justamente o que a M42 recusa. Cada seção mantém o próprio
// `confirmado`/`rascunho`/`salvando`/`erro`, e este componente não guarda nenhum deles.
//
// Por isso ele não tem `useQuery`, não tem `useMutation`, não conhece cliente e não sabe o que
// está editando. Ele recebe o que mostrar e devolve a intenção de salvar. Um componente que
// soubesse buscar viraria o `configurationEngine` que a missão proíbe — o dono do dado passaria a
// ser a tela, e não os dois produtores.
//
// ## O que ele resolve, e que um `<input>` solto não resolve
//
// * **duplo envio.** Trava síncrona por `ref`: entre dois cliques rápidos o React ainda não
//   re-renderizou, `isPending` continua `false` na closure, e a segunda escrita sai. A segunda
//   chega depois — podendo confirmar um nome que a pessoa já abandonou;
// * **rascunho ≠ salvo.** O campo guarda o que a pessoa digitou; o texto de estado diz o que está
//   PERSISTIDO. Se o `PATCH` falhar, o rascunho fica para tentar de novo e o confirmado não se
//   move — a tela nunca afirma ter salvo o que não salvou;
// * **anúncio acessível.** `aria-busy` no formulário e `role="status"` no estado: quem usa leitor
//   de tela ouve "salvando" e ouve o resultado, sem depender de cor.

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface CampoDeNomeProps {
  /** O nome CONFIRMADO pelo produtor. É a autoridade — nunca um valor local nem uma claim. */
  confirmado: string;
  /** Rótulo do campo. Diz QUAL coisa está sendo editada, e é o que separa as duas seções. */
  rotulo: string;
  /** Texto do botão. */
  acao: string;
  /** Como a seção anuncia sucesso e falha. Vem de fora porque a frase nomeia o que foi salvo. */
  textos: {
    salvando: string;
    salvo: string;
    falhou: string;
    vazio: string;
  };
  salvando: boolean;
  /** `true` depois de uma escrita recusada. A seção decide; aqui só se exibe. */
  falhou: boolean;
  /** `true` depois de uma escrita confirmada. */
  confirmadoAgora: boolean;
  onSalvar: (nome: string) => void | Promise<void>;
  /** Desabilita tudo — usado quando o produtor está indisponível. */
  desabilitado?: boolean;
}

export function CampoDeNome({
  confirmado,
  rotulo,
  acao,
  textos,
  salvando,
  falhou,
  confirmadoAgora,
  onSalvar,
  desabilitado = false,
}: CampoDeNomeProps) {
  const campoId = useId();
  const estadoId = `${campoId}-estado`;
  const [rascunho, setRascunho] = useState(confirmado);
  const emVoo = useRef(false);
  // O que o usuário viu por último como confirmado. Serve para NÃO sobrescrever o que ele está
  // digitando quando o cache reconcilia por outro motivo — só seguimos o servidor quando o valor
  // confirmado realmente mudou.
  const ultimoConfirmado = useRef(confirmado);

  useEffect(() => {
    if (confirmado !== ultimoConfirmado.current) {
      ultimoConfirmado.current = confirmado;
      setRascunho(confirmado);
    }
  }, [confirmado]);

  const limpo = rascunho.trim();
  const vazio = limpo.length === 0;
  // Nome repetido NÃO é conflito: o contrato declara a ausência de unicidade nos dois donos.
  // O que se evita aqui é só a viagem inútil quando nada mudou.
  const mudou = limpo !== confirmado;
  const podeSalvar = !desabilitado && !salvando && mudou && !vazio;

  async function aoSubmeter(evento: React.FormEvent) {
    evento.preventDefault();
    if (!podeSalvar || emVoo.current) return;
    emVoo.current = true;
    try {
      await onSalvar(limpo);
    } finally {
      emVoo.current = false;
    }
  }

  const estado = salvando
    ? textos.salvando
    : falhou
      ? textos.falhou
      : vazio && mudou
        ? textos.vazio
        : confirmadoAgora && !mudou
          ? textos.salvo
          : null;

  return (
    <form className="space-y-3" onSubmit={aoSubmeter} aria-busy={salvando}>
      <div className="space-y-2">
        <label htmlFor={campoId} className="block text-sm text-muted-foreground">
          {rotulo}
        </label>
        <input
          id={campoId}
          type="text"
          value={rascunho}
          disabled={desabilitado || salvando}
          onChange={(e) => setRascunho(e.target.value)}
          aria-describedby={estado ? estadoId : undefined}
          aria-invalid={falhou || (vazio && mudou) ? true : undefined}
          className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ring disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={!podeSalvar}
          className="min-h-11 rounded-xl"
        >
          {acao}
        </Button>

        {estado && (
          <p
            id={estadoId}
            // `alert` quando falhou — o resultado de uma escrita recusada precisa interromper.
            // `status` no resto, para não roubar o foco de quem está digitando.
            role={falhou ? "alert" : "status"}
            className={
              falhou
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {estado}
          </p>
        )}
      </div>
    </form>
  );
}
