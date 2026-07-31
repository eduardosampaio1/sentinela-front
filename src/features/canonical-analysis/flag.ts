// Feature flag do frontend p/ a jornada canônica `/v1` (Onda 6 E2/E3). DESLIGADA por padrão.
//
// OFF: as rotas legadas seguem intactas, NENHUMA chamada `/v1/analyses` é feita, NENHUMA rota
// canônica substitui a experiência viva. ON (local): a jornada canônica fica acessível e usa SÓ
// `/v1` — sem fallback para a jornada antiga. Nunca ligar como padrão de produção.

/** `true` só quando `VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED` for exatamente "true". */
export function isCanonicalAnalysisEnabled(): boolean {
  return String(import.meta.env.VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED ?? "")
    .trim()
    .toLowerCase() === "true";
}
