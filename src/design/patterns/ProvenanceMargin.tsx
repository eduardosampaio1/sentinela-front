// M12 — a MARGINÁLIA DE PROCEDÊNCIA: a assinatura da linguagem visual.
//
// ## O que ela existe para impedir
//
// Um número sozinho na tela é um pedido de confiança sem recibo. "63,0%" não diz sobre quantos
// registros, por qual método, nem de quando — e quem lê preenche essas lacunas com suposições que
// o produto nunca fez. A V9 fecha isso: *todo indicador publicado carrega procedência visível*.
//
// A marginália é ONDE isso vive. Ela fica ao lado do número, não num rodapé, não num tooltip, não
// numa página de metodologia — porque procedência longe do dado é procedência que ninguém lê.
//
// ## A3 🔒 — o comportamento responsivo é parte do aceite, não retrofit
//
//   • **desktop** — persistente ao lado. Não precisa de clique, não precisa de hover.
//   • **abaixo de tablet** — `disclosure` PRESA AO DADO. Colapsa, mas continua ali e continua
//     ligada ao número que qualifica.
//   • **nunca some**, **nunca só hover** (não existe hover no toque), alvo ≥ 44×44.
//
// As duas versões carregam a MESMA informação e ambas existem no DOM: quem escolhe é o CSS. Isso
// é deliberado — media query em JS decidiria antes da primeira pintura e erraria no SSR, e um
// `display:none` sai da árvore de acessibilidade sozinho, então o leitor de tela lê uma só vez.
//
// ## O que este pattern NÃO faz
//
//   • **não conhece domínio.** Recebe `rotulo`/`valor` já formatados. Não sabe o que é uma análise,
//     não recebe payload, não chama backend. O gate da M04 reprova se souber.
//   • **não decide QUAIS campos aparecem.** Isso é M22/M28, e o plano põe fora daqui.
//   • **não inventa dado, e não julga a ausência dele.** Ver `textoQuandoAusente` abaixo.

import { DefinitionGrid, Disclosure, Stack, Text } from "@/design/primitives";
import { cn } from "@/lib/utils";

export interface ItemDeProcedencia {
  /** O que este dado é — vem do produto, com o idioma já resolvido. O DS não nomeia campo. */
  rotulo: string;
  /**
   * Já formatado pela camada de produto.
   *
   * `null` significa **não informado**, e é tratado como tal: vira `textoQuandoAusente`, nunca
   * `0`, nunca `—` inventado, nunca string vazia. Um zero no lugar de um desconhecido é a forma
   * mais rápida de a tela afirmar algo que ninguém mediu.
   */
  valor: string | null;
}

export function ProvenanceMargin({
  rotuloDoIndicador,
  procedencia,
  rotuloDaMargem,
  textoQuandoAusente,
  className,
  children,
}: {
  /**
   * O que o número É — "Taxa de conformidade", "Registros processados".
   *
   * Nomeia o grupo inteiro, e é o que **prende** a marginália ao dado: o leitor de tela anuncia
   * "Taxa de conformidade, grupo" e encontra, dentro, tanto o valor quanto a sua procedência.
   */
  rotuloDoIndicador: string;
  /** As linhas da margem. Vazio é estado legítimo — ver o bloco de ausência abaixo. */
  procedencia: readonly ItemDeProcedencia[];
  /** Nome da margem e rótulo do gatilho no mobile — "Procedência". Texto, nunca ícone sozinho. */
  rotuloDaMargem: string;
  /**
   * A palavra do produto para "não informado".
   *
   * Obrigatória de propósito. Se o DS escolhesse essa palavra, escolheria o idioma e o tom de uma
   * afirmação sobre o que o cliente não tem — e essa decisão não é do Design System.
   */
  textoQuandoAusente: string;
  className?: string;
  /** O indicador. Vem pronto: o pattern não formata número. */
  children: React.ReactNode;
}) {
  // Ausência é declarada, nunca convertida em valor. `null` vira a palavra do produto, e o array
  // vazio vira uma linha única dizendo o mesmo — porque **não saber a procedência não é uma
  // procedência ruim**, e a margem que sumisse deixaria o número sozinho, que é o defeito de
  // origem que a V9 fecha.
  const linhas =
    procedencia.length > 0
      ? procedencia.map((p) => ({ label: p.rotulo, display: p.valor ?? textoQuandoAusente }))
      : [{ label: rotuloDaMargem, display: textoQuandoAusente }];

  const margem = <DefinitionGrid itens={linhas} className="grid grid-cols-1 gap-y-1 text-xs" />;

  return (
    <div
      role="group"
      aria-label={rotuloDoIndicador}
      className={cn("flex flex-col gap-2 md:flex-row md:items-start md:justify-between", className)}
    >
      <Stack espaco="xs">
        <Text papel="rotulo" tom="discreto">
          {rotuloDoIndicador}
        </Text>
        {children}
      </Stack>

      {/* DESKTOP — persistente ao lado. Nenhuma interação necessária para ler. */}
      <div className="hidden md:block md:max-w-[16rem] md:border-l md:border-border md:pl-4">
        <Text papel="rotulo" tom="discreto">
          {rotuloDaMargem}
        </Text>
        {margem}
      </div>

      {/* ABAIXO DE TABLET — colapsa, presa ao dado. O `Disclosure` já fecha o contrato de
          acessibilidade: `<button>` real, `aria-expanded`, `aria-controls`, alvo de 44px, e
          nenhuma dependência de hover. */}
      <div className="md:hidden">
        <Disclosure gatilho={rotuloDaMargem}>{margem}</Disclosure>
      </div>
    </div>
  );
}
