export type SeverityLevel = "critical" | "high" | "warning" | "info" | "unknown";

export interface AlertLike {
  severity?: string;
  title?: string;
  hint?: string;
}

export interface IntentVarianceLike {
  intent: string;
  n_conversations?: number;
  response_variance?: number;
  response_stability_score?: number;
  mean_assistant_chars?: number;
  std_assistant_chars?: number;
  severity?: string;
}

export interface ConversationDetailLike {
  conversation_id?: string;
  intent?: string;
  user_text?: string;
  assistant_text?: string;
  tokens?: number;
  similarity?: number;
  response_variance?: number;
  response_stability_score?: number;
  severity?: string;
  issue?: string;
}

export interface PairCollision {
  pairLabel: string;
  left: string;
  right: string;
  severity: SeverityLevel;
  title: string;
  hint: string;
}

export function normalizeSeverity(input?: string): SeverityLevel {
  const value = (input ?? "").toLowerCase();
  if (value === "critical") return "critical";
  if (value === "high") return "high";
  if (value === "warn" || value === "warning") return "warning";
  if (value === "info") return "info";
  return "unknown";
}

export function severityTone(level: SeverityLevel): string {
  switch (level) {
    case "critical":
      return "text-red-400 border-red-500/30 bg-red-500/10";
    case "high":
      return "text-orange-400 border-orange-500/30 bg-orange-500/10";
    case "warning":
      return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    case "info":
      return "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
    default:
      return "text-muted-foreground border-border bg-muted/40";
  }
}

export function formatPercentSmart(value?: number | null, digits = 2): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
  const normalized = value <= 1 ? value * 100 : value;
  return `${normalized.toFixed(digits)}%`;
}

export function formatNumber(value?: number | null, digits = 0): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "N/A";
  return value.toFixed(digits);
}

export function pickConversationDetails(result: Record<string, unknown>): ConversationDetailLike[] {
  const candidates = [
    result.conversation_details,
    result.conversations,
    result.details,
    result.samples,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is ConversationDetailLike => typeof item === "object" && item !== null);
    }
  }

  return [];
}

export function extractConfusingPairs(alerts: AlertLike[] = []): PairCollision[] {
  const collisions: PairCollision[] = [];

  for (const alert of alerts) {
    const title = alert.title ?? "Observability signal";
    const hint = alert.hint ?? "No additional hint provided.";
    const match = hint.match(/\(([^,]+),([^\)]+)\)/);
    if (!match) continue;

    const left = match[1].trim();
    const right = match[2].trim();
    collisions.push({
      pairLabel: `${left} ↔ ${right}`,
      left,
      right,
      severity: normalizeSeverity(alert.severity),
      title,
      hint,
    });
  }

  return collisions;
}

export function buildSyntheticConversationRows(
  intents: IntentVarianceLike[] = [],
  alerts: AlertLike[] = [],
  globalSimilarity?: number,
): ConversationDetailLike[] {
  const pairCollisions = extractConfusingPairs(alerts);
  const collisionByIntent = new Map<string, PairCollision[]>();

  for (const collision of pairCollisions) {
    collisionByIntent.set(collision.left, [...(collisionByIntent.get(collision.left) ?? []), collision]);
    collisionByIntent.set(collision.right, [...(collisionByIntent.get(collision.right) ?? []), collision]);
  }

  return [...intents]
    .sort((a, b) => (a.response_stability_score ?? 100) - (b.response_stability_score ?? 100))
    .map((intent, index) => {
      const collisions = collisionByIntent.get(intent.intent) ?? [];
      const issue = collisions.length > 0
        ? `High cross-intent reuse detected with ${collisions.map((item) => item.pairLabel.replace(`${intent.intent} ↔ `, "").replace(` ↔ ${intent.intent}`, "")).join(", ")}.`
        : "No explicit pair collision provided by backend. Review variance and template discipline.";

      return {
        conversation_id: `derived-${index + 1}`,
        intent: intent.intent,
        tokens: intent.mean_assistant_chars ? Math.max(1, Math.round(intent.mean_assistant_chars / 4)) : undefined,
        similarity: globalSimilarity,
        response_variance: intent.response_variance,
        response_stability_score: intent.response_stability_score,
        severity: intent.severity,
        issue,
        user_text: "Derived observability row from cached analysis.",
        assistant_text: collisions[0]?.hint ?? "Backend did not include per-conversation samples for this run.",
      };
    });
}
