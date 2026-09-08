import type { LongitudinalComparisonView } from "./contract/public-v1.types";

/** Lê o veredito publicado pelo backend; não deriva um veredito no navegador. */
export function isLongitudinalComparable(
  comparison: LongitudinalComparisonView,
): boolean {
  return comparison.verdict !== "not_comparable";
}
