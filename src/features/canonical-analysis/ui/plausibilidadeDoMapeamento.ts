/**
 * A coluna escolhida é PLAUSÍVEL para o campo? — aviso, nunca bloqueio.
 *
 * ## O defeito que isto reduz
 *
 * Em homologação (2026-08-24), a coluna `canal` foi mapeada no campo **"Date and time"**. A
 * ingestão recusou **os 360 registros** com `invalid_field_type`, e a tela disse apenas
 * "Couldn't complete". Um erro de mapeamento custou um ciclo inteiro, e a mensagem não ajudava
 * a corrigi-lo.
 *
 * ## Por que AVISO e não bloqueio
 *
 * O perfil da Ingestão é, por decisão registrada, **descrição e nunca julgamento**:
 * *"Não há 'campo válido' aqui: profiling descreve, o contrato decide"*
 * (`adapters/base.py::PerfilDeCampo`). Uma tela que BLOQUEASSE com base nele estaria julgando
 * com dado que se declara insuficiente para julgar — e barraria um dataset legítimo cuja forma
 * simplesmente não é a comum.
 *
 * O aviso põe a dúvida na frente de quem sabe a resposta, no instante em que ela é barata.
 *
 * ## Por que CARDINALIDADE e não tipo
 *
 * O tipo não discrimina: a própria regra do servidor aceita `string` para `timestamp`
 * (`mapping/sugestao.py::_compativel_com_o_tipo`), porque data quase sempre chega como texto
 * ISO. `canal` é string; um timestamp também é. Uma validação por tipo teria passado batido.
 *
 * O que separa os dois é quantos valores DIFERENTES a coluna tem — e a própria docstring do
 * perfil nomeia esse uso: *"um campo com 3 valores distintos é candidato a `channel`, não a
 * `assistant_text`"*. No caso medido: `canal` tinha **3** distintos em 360 registros; a coluna
 * de data teria 360.
 */

/** O necessário do perfil de uma coluna. Um subconjunto de `ColunaDoArquivo`, de propósito. */
export interface PerfilDaColuna {
  types: string[];
  distinct_values: number | null;
}

export type MotivoImplausivel = "repete_demais" | "poucos_valores" | "tipo_incompativel";

/**
 * Fração de valores distintos abaixo da qual uma coluna é implausível como DATA E HORA.
 *
 * O corte é folgado de propósito. No caso medido a razão era 0,8% (3 em 360) e uma coluna de
 * data legítima fica perto de 100%. Um limiar apertado transformaria o aviso em ruído sobre
 * datasets de janela curta — onde repetir a mesma data é normal.
 */
const PISO_DE_VARIEDADE_TEMPORAL = 0.2;

/**
 * Abaixo disto, a coluna não é texto livre.
 *
 * Duas categorias (`N`/`Y`) é uma flag, e foi exatamente o que uma massa real trouxe: a coluna
 * `nome_modelo` — nome enganoso — continha só `N` e `Y`. Mapeada como resposta do assistente,
 * a ingestão recusou 106.608 registros.
 */
const MINIMO_DE_VARIEDADE_TEXTUAL = 3;

/** Campos cujo conteúdo é texto livre de conversa. */
const CAMPOS_DE_TEXTO = new Set(["assistant_text", "user_text"]);

/** Campos que carregam um instante. */
const CAMPOS_TEMPORAIS = new Set(["timestamp"]);

/** Campos que carregam um número. */
const CAMPOS_NUMERICOS = new Set(["turns"]);

/**
 * `null` quando a escolha é plausível — ou não há evidência para duvidar dela.
 *
 * Ausência de perfil devolve `null`: sem medida não há dúvida fundamentada, e avisar sobre o
 * desconhecido seria inventar julgamento. É a mesma regra que o resto do produto segue para
 * ausência.
 */
export function motivoDeImplausibilidade(
  campo: string,
  coluna: PerfilDaColuna | undefined,
  registrosObservados: number | null,
): MotivoImplausivel | null {
  if (!coluna) return null;

  const tipos = coluna.types ?? [];
  const distintos = coluna.distinct_values;

  if (CAMPOS_NUMERICOS.has(campo) && tipos.length > 0) {
    // Aqui o TIPO decide, e é o único caso em que ele basta: `turns` é contagem, e uma coluna
    // sem nenhum tipo numérico observado não a carrega. Espelha `_compativel_com_o_tipo`.
    if (!tipos.some((t) => t === "integer" || t === "number")) return "tipo_incompativel";
  }

  if (CAMPOS_DE_TEXTO.has(campo)) {
    if (tipos.length > 0 && !tipos.includes("string")) return "tipo_incompativel";
    if (typeof distintos === "number" && distintos < MINIMO_DE_VARIEDADE_TEXTUAL) {
      return "poucos_valores";
    }
  }

  if (CAMPOS_TEMPORAIS.has(campo)) {
    // A razão precisa dos DOIS números. Sem `records_observed`, `distinct_values` sozinho não
    // diz nada: 3 distintos em 4 registros é normal; em 360 não é.
    if (
      typeof distintos === "number" &&
      typeof registrosObservados === "number" &&
      registrosObservados > 0 &&
      distintos / registrosObservados < PISO_DE_VARIEDADE_TEMPORAL
    ) {
      return "repete_demais";
    }
  }

  return null;
}
