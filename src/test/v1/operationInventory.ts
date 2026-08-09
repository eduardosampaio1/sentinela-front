// WS-A2 — inventário NORMALIZADO de operações públicas, dos dois lados.
//
// O gate de contrato comparava campos de interface. Isso responde "o read-model mudou?" e não
// responde "existe operação pública que o frontend nem sabe que existe?". Foi por essa fresta que
// `/progress`, `/analytics`, `/analytics/export/download` e `/timeline` ficaram contratadas e sem
// cliente com a suíte verde.
//
// Aqui as duas listas viram a MESMA forma normalizada, ordenada deterministicamente, e a
// comparação devolve categorias — não uma contagem. "11 × 6" não é diagnóstico.

export interface OperacaoNormalizada {
  /** `GET /v1/analyses/{analysis_id}/result` — a chave de comparação. */
  chave: string;
  metodo: string;
  /** Path com parâmetros normalizados para `{analysis_id}`. */
  caminho: string;
  operationId: string | null;
  /** Query obrigatória declarada no contrato (vazio do lado do cliente). */
  queryObrigatoria: string[];
  /** Nome do tipo TS da resposta, quando extraível do cliente. */
  projecao: string | null;
}

const PARAM = /\{[^}]+\}/g;

/** Normaliza um path para a forma comparável entre contrato e cliente. */
export function normalizarCaminho(bruto: string): string {
  return bruto
    // `${encodeAnalysisId(analysisId)}` e qualquer interpolação viram o parâmetro nomeado.
    .replace(/\$\{[^}]*\}/g, "{analysis_id}")
    // `{analysis_id}`, `{id}`, `{analysisId}` — o contrato e o cliente não precisam concordar
    // no nome do parâmetro para concordarem na operação.
    .replace(PARAM, "{analysis_id}")
    .replace(/\/+$/, "");
}

export function chaveDe(metodo: string, caminho: string): string {
  return `${metodo.toUpperCase()} ${normalizarCaminho(caminho)}`;
}

interface OperacaoDoContrato {
  method?: string;
  path?: string;
  operationId?: string;
  required_query?: string[];
}

/** Lê `operations[]` do contrato canônico. */
export function operacoesDoContrato(doc: { operations?: OperacaoDoContrato[] }): OperacaoNormalizada[] {
  const brutas = Array.isArray(doc.operations) ? doc.operations : [];
  return brutas
    .filter((o) => typeof o.method === "string" && typeof o.path === "string")
    .map((o) => ({
      chave: chaveDe(o.method!, o.path!),
      metodo: o.method!.toUpperCase(),
      caminho: normalizarCaminho(o.path!),
      operationId: o.operationId ?? null,
      queryObrigatoria: [...(o.required_query ?? [])].sort(),
      projecao: null,
    }))
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

// `enviar<MeView>("GET", "/v1/me", …)` e `pedir<AnalysisHandle>("POST", `/v1/analyses/…`, …)`.
// O tipo genérico é a projeção da resposta; método e path são os dois primeiros argumentos.
const CHAMADA =
  /\b(?:enviar|pedir)\s*<\s*([A-Za-z0-9_]+)\s*>\s*\(\s*"([A-Z]+)"\s*,\s*[`"]([^`"]+)[`"]/g;

/** Lê as operações que o CLIENTE do frontend realmente chama, do código-fonte dele. */
export function operacoesDoCliente(fonte: string): OperacaoNormalizada[] {
  // Comentários fora: um exemplo em docstring não é uma chamada, e contá-lo faria o gate
  // aprovar um cliente que só *documenta* a operação.
  const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const vistas = new Map<string, OperacaoNormalizada>();
  for (const m of semComentarios.matchAll(CHAMADA)) {
    const [, projecao, metodo, caminho] = m;
    const op: OperacaoNormalizada = {
      chave: chaveDe(metodo, caminho),
      metodo: metodo.toUpperCase(),
      caminho: normalizarCaminho(caminho),
      operationId: null,
      queryObrigatoria: [],
      projecao,
    };
    // A MESMA operação pode ter dois chamadores (`list` e um futuro `listAll`). Uma entrada só.
    if (!vistas.has(op.chave)) vistas.set(op.chave, op);
  }
  return [...vistas.values()].sort((a, b) => a.chave.localeCompare(b.chave));
}

export interface DiffDeOperacoes {
  /** No contrato, sem cliente no front. É o B1. */
  missing_in_front: string[];
  /** No cliente, sem entrada no contrato. É o C2 (`/v1/me`). */
  extra_in_front: string[];
  /** Mesmo caminho, método diferente. */
  method_mismatch: string[];
  /** Mesmo operationId, caminho diferente. */
  path_mismatch: string[];
  /** Operação com cliente cuja projeção de resposta não tem tipo declarado. */
  projection_mismatch: string[];
}

export function compararOperacoes(
  contrato: OperacaoNormalizada[],
  cliente: OperacaoNormalizada[],
  tiposDeclarados: Set<string>,
): DiffDeOperacoes {
  const porChaveContrato = new Map(contrato.map((o) => [o.chave, o]));
  const porChaveCliente = new Map(cliente.map((o) => [o.chave, o]));

  const missing_in_front = contrato
    .filter((o) => !porChaveCliente.has(o.chave))
    .map((o) => o.chave);
  const extra_in_front = cliente
    .filter((o) => !porChaveContrato.has(o.chave))
    .map((o) => o.chave);

  // Caminho igual e método diferente: as duas chaves aparecem como missing+extra acima, mas
  // isso esconde a natureza do defeito. Aqui ele fica nomeado.
  const caminhosContrato = new Map(contrato.map((o) => [o.caminho, o.metodo]));
  const method_mismatch = cliente
    .filter((o) => caminhosContrato.has(o.caminho) && !porChaveContrato.has(o.chave))
    .map((o) => `${o.caminho}: contrato=${caminhosContrato.get(o.caminho)} cliente=${o.metodo}`);

  const idsContrato = new Map(
    contrato.filter((o) => o.operationId).map((o) => [o.operationId!, o.caminho]),
  );
  const path_mismatch = cliente
    .filter((o) => o.operationId && idsContrato.has(o.operationId) && idsContrato.get(o.operationId) !== o.caminho)
    .map((o) => `${o.operationId}: contrato=${idsContrato.get(o.operationId!)} cliente=${o.caminho}`);

  const projection_mismatch = cliente
    .filter((o) => o.projecao !== null && !tiposDeclarados.has(o.projecao))
    .map((o) => `${o.chave}: resposta tipada como \`${o.projecao}\`, que a cópia do contrato não declara`);

  return {
    missing_in_front: missing_in_front.sort(),
    extra_in_front: extra_in_front.sort(),
    method_mismatch: method_mismatch.sort(),
    path_mismatch: path_mismatch.sort(),
    projection_mismatch: projection_mismatch.sort(),
  };
}

/** Nomes de interface/type declarados na cópia local do contrato. */
export function tiposDeclarados(fonte: string): Set<string> {
  const nomes = new Set<string>();
  for (const m of fonte.matchAll(/export\s+(?:interface|type)\s+([A-Za-z0-9_]+)/g)) nomes.add(m[1]);
  return nomes;
}
