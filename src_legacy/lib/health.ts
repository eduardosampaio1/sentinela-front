/** Health interpretation utilities for Sentinela metrics */

export type HealthLevel = "excellent" | "healthy" | "warning" | "poor" | "critical";

export interface HealthStatus {
  level: HealthLevel;
  label: string;
  colorClass: string;
  bgClass: string;
}

/* ── Consistency Score ── */
const CONSISTENCY_SCALE: [number, HealthLevel, string][] = [
  [90, "excellent", "Excellent"],
  [75, "healthy", "Healthy"],
  [60, "warning", "Warning"],
  [40, "poor", "Poor"],
  [0, "critical", "Critical"],
];

/* ── Token Waste Rate ── */
const WASTE_SCALE: [number, HealthLevel, string][] = [
  [0, "excellent", "Excellent"],
  [5, "excellent", "Excellent"],
  [12, "good" as HealthLevel, "Good"],
  [20, "warning", "Warning"],
  [35, "poor" as HealthLevel, "High Waste"],
  [Infinity, "critical", "Critical"],
];

/* ── Cross-Intent Similarity ── */
const SIMILARITY_SCALE: [number, HealthLevel, string][] = [
  [20, "excellent", "Excellent separation"],
  [40, "healthy", "Healthy"],
  [60, "warning", "Warning"],
  [80, "poor", "High overlap"],
  [100, "critical", "Critical overlap"],
];

const LEVEL_COLORS: Record<string, { text: string; bg: string }> = {
  excellent: { text: "text-success", bg: "bg-success/10" },
  healthy: { text: "text-success", bg: "bg-success/10" },
  good: { text: "text-success", bg: "bg-success/10" },
  warning: { text: "text-warning", bg: "bg-warning/10" },
  poor: { text: "text-critical", bg: "bg-critical/10" },
  critical: { text: "text-critical", bg: "bg-critical/10" },
};

function makeStatus(level: string, label: string): HealthStatus {
  const c = LEVEL_COLORS[level] || LEVEL_COLORS.warning;
  return { level: level as HealthLevel, label, colorClass: c.text, bgClass: c.bg };
}

/** Interpret consistency score (0-100, higher is better) */
export function interpretConsistency(score: number): HealthStatus {
  for (const [threshold, level, label] of CONSISTENCY_SCALE) {
    if (score >= threshold) return makeStatus(level, label);
  }
  return makeStatus("critical", "Critical");
}

/** Interpret token waste rate percentage (lower is better) */
export function interpretWasteRate(rate: number): HealthStatus {
  for (let i = WASTE_SCALE.length - 1; i >= 0; i--) {
    if (rate >= WASTE_SCALE[i][0]) {
      return makeStatus(WASTE_SCALE[i][1], WASTE_SCALE[i][2]);
    }
  }
  return makeStatus("excellent", "Excellent");
}

/** Interpret cross-intent similarity (0-100, lower is better) */
export function interpretSimilarity(score: number): HealthStatus {
  for (const [threshold, level, label] of SIMILARITY_SCALE) {
    if (score <= threshold) return makeStatus(level, label);
  }
  return makeStatus("critical", "Critical overlap");
}

/** Compute AI Reliability Index (0-100) */
export function computeReliabilityIndex(
  consistency: number | null | undefined,
  similarity: number | null | undefined,
  tokenWaste: number | null | undefined,
): number | null {
  if (consistency == null) return null;
  // Normalize: consistency is already 0-100 (higher=better)
  // similarity: invert (lower=better → 100-sim = score)
  // tokenWaste: use as negative signal if present
  const consistencyNorm = Math.max(0, Math.min(100, consistency));
  const similarityNorm = similarity != null ? Math.max(0, Math.min(100, 100 - similarity)) : null;

  const parts: number[] = [consistencyNorm];
  if (similarityNorm != null) parts.push(similarityNorm);
  // Token waste: crude normalization — assume >100 is very bad
  if (tokenWaste != null) {
    const wasteScore = Math.max(0, 100 - Math.min(tokenWaste, 100));
    parts.push(wasteScore);
  }

  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

/** Interpret reliability index */
export function interpretReliability(score: number): HealthStatus {
  return interpretConsistency(score); // same scale
}

/** Tooltip descriptions */
export const METRIC_TOOLTIPS = {
  consistency: "Measures how stable responses are for the same intent. Target: >75%.",
  tokenWaste: "Estimated cost caused by unnecessarily long responses.",
  similarity: "Detects when different intents produce nearly identical responses. Expected: <40%.",
  reliability: "Overall stability and efficiency score for the assistant, combining consistency, similarity, and token efficiency.",
  criticalAlerts: "Number of intents with critical behavioral issues detected by Sentinela.",
} as const;
