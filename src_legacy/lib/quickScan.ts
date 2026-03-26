const DEFAULT_GATEWAY_API_URL = "https://sentinela-gateway.onrender.com";

function normalizeApiBaseUrl(value: unknown): string {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

const configuredApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_SENTINELA_API_URL);
const API_BASE_CANDIDATES = Array.from(
  new Set(
    [DEFAULT_GATEWAY_API_URL, configuredApiBaseUrl]
      .map(normalizeApiBaseUrl)
      .filter(Boolean),
  ),
);

export interface QuickScanConfidenceFactors {
  sampleComponent: number;
  parseComponent: number;
  structureComponent: number;
  intentComponent: number;
  variationComponent: number;
}

export interface QuickScanConfidenceMeter {
  score: number;
  level: "low" | "medium" | "high";
  factors: QuickScanConfidenceFactors;
}

export interface QuickScanMetadata {
  totalItems: number;
  parsedJsonItems: number;
  structuredItems: number;
}

export interface QuickScanResult {
  detectedIntents: string[];
  languageVariance: number;
  responseVariation: number;
  confidenceLevel: "Low" | "Medium" | "High";
  confidenceMeter: QuickScanConfidenceMeter;
  sampleSize: number;
  notes: string[];
  metadata: QuickScanMetadata;
  source: "api" | "mock";
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueRatio(values: string[]): number {
  if (values.length === 0) return 0;
  return new Set(values).size / values.length;
}

function parseIntent(line: string): string | null {
  const patterns = [
    /intent\s*[:=-]\s*([a-z0-9_\- ]+)/i,
    /topic\s*[:=-]\s*([a-z0-9_\- ]+)/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1].trim().toLowerCase();
  }

  return null;
}

function hasNonAscii(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 127) {
      return true;
    }
  }
  return false;
}

function fallbackQuickScan(text: string): QuickScanResult {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const intents = lines.map(parseIntent).filter((value): value is string => Boolean(value));
  const normalizedLines = lines.map((line) => line.toLowerCase());

  const enSignals = /\b(the|this|that|please|refund|cancel|delivery|support)\b/i;
  let langMixedCount = 0;

  for (const line of normalizedLines) {
    if (enSignals.test(line) && hasNonAscii(line)) {
      langMixedCount += 1;
    }
  }

  const languageVariance = clamp(
    ((langMixedCount / Math.max(normalizedLines.length, 1)) * 100) +
      (uniqueRatio(normalizedLines.map((line) => line.slice(0, 24))) * 35),
  );
  const responseVariation = clamp(uniqueRatio(normalizedLines) * 100);

  let confidenceLevel: QuickScanResult["confidenceLevel"] = "Low";
  if (lines.length >= 4 && lines.length < 12) confidenceLevel = "Medium";
  if (lines.length >= 12) confidenceLevel = "High";

  const confidenceScore =
    confidenceLevel === "High" ? 82 : confidenceLevel === "Medium" ? 58 : 28;

  return {
    detectedIntents: intents.length > 0 ? Array.from(new Set(intents)).slice(0, 8) : [],
    languageVariance: Number(languageVariance.toFixed(1)),
    responseVariation: Number(responseVariation.toFixed(1)),
    confidenceLevel,
    confidenceMeter: {
      score: confidenceScore,
      level: confidenceLevel.toLowerCase() as "low" | "medium" | "high",
      factors: {
        sampleComponent: Number(Math.min(1, lines.length / 30).toFixed(4)),
        parseComponent: 0,
        structureComponent: 0,
        intentComponent: Number(Math.min(1, (intents.length || 0) / 8).toFixed(4)),
        variationComponent: Number((responseVariation / 100).toFixed(4)),
      },
    },
    sampleSize: lines.length,
    notes: [
      "This is a surface scan based on a small sample.",
      "Quick Scan does not replace a full analysis run.",
    ],
    metadata: {
      totalItems: lines.length,
      parsedJsonItems: 0,
      structuredItems: 0,
    },
    source: "mock",
  };
}

function normalizeConfidence(value: unknown): QuickScanResult["confidenceLevel"] {
  const raw = String(value ?? "").toLowerCase();
  if (raw.includes("high")) return "High";
  if (raw.includes("medium")) return "Medium";
  return "Low";
}

function normalizeQuickScanPayload(payload: unknown): QuickScanResult {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};

  const intentsRaw =
    (Array.isArray(record.detected_intents) ? record.detected_intents : null) ||
    (Array.isArray(record.detectedIntents) ? record.detectedIntents : null) ||
    (Array.isArray(record.intents) ? record.intents : null) ||
    [];

  const languageVarianceRaw =
    typeof record.language_variance === "number"
      ? record.language_variance
      : typeof record.languageVariance === "number"
        ? record.languageVariance
        : 0;

  const responseVariationRaw =
    typeof record.response_variation === "number"
      ? record.response_variation
      : typeof record.responseVariation === "number"
        ? record.responseVariation
        : 0;

  const confidenceRaw =
    record.confidence_level ??
    record.confidenceLevel ??
    record.confidence ??
    "low";

  const toPercent = (value: number) => (value >= 0 && value <= 1 ? value * 100 : value);
  const confidenceLevel = normalizeConfidence(confidenceRaw);

  const confidenceMeterRaw =
    typeof record.confidence_meter === "object" && record.confidence_meter !== null
      ? (record.confidence_meter as Record<string, unknown>)
      : typeof record.confidenceMeter === "object" && record.confidenceMeter !== null
        ? (record.confidenceMeter as Record<string, unknown>)
        : {};

  const factorsRaw =
    typeof confidenceMeterRaw.factors === "object" && confidenceMeterRaw.factors !== null
      ? (confidenceMeterRaw.factors as Record<string, unknown>)
      : {};

  const fallbackScore =
    confidenceLevel === "High" ? 80 : confidenceLevel === "Medium" ? 55 : 30;

  const confidenceScore =
    typeof confidenceMeterRaw.score === "number"
      ? Number(clamp(toPercent(confidenceMeterRaw.score)).toFixed(2))
      : fallbackScore;

  const confidenceMeterLevelRaw =
    confidenceMeterRaw.level ??
    confidenceMeterRaw.confidence_level ??
    confidenceLevel.toLowerCase();

  const confidenceMeterLevel =
    String(confidenceMeterLevelRaw).toLowerCase() === "high"
      ? "high"
      : String(confidenceMeterLevelRaw).toLowerCase() === "medium"
        ? "medium"
        : "low";

  const sampleSizeRaw =
    typeof record.sample_size === "number"
      ? record.sample_size
      : typeof record.sampleSize === "number"
        ? record.sampleSize
        : 0;

  const metadataRaw =
    typeof record.metadata === "object" && record.metadata !== null
      ? (record.metadata as Record<string, unknown>)
      : {};

  const notesRaw = Array.isArray(record.notes) ? record.notes : [];
  const normalizedNotes = notesRaw
    .map((item) => String(item))
    .filter(Boolean)
    .map((note) => note.replace(/\bARGOS\b/gi, "analysis"));

  return {
    detectedIntents: intentsRaw.map((item) => String(item)).filter(Boolean).slice(0, 8),
    languageVariance: Number(clamp(toPercent(languageVarianceRaw)).toFixed(1)),
    responseVariation: Number(clamp(toPercent(responseVariationRaw)).toFixed(1)),
    confidenceLevel,
    confidenceMeter: {
      score: confidenceScore,
      level: confidenceMeterLevel,
      factors: {
        sampleComponent:
          typeof factorsRaw.sample_component === "number"
            ? Number(factorsRaw.sample_component.toFixed(4))
            : typeof factorsRaw.sampleComponent === "number"
              ? Number(factorsRaw.sampleComponent.toFixed(4))
              : 0,
        parseComponent:
          typeof factorsRaw.parse_component === "number"
            ? Number(factorsRaw.parse_component.toFixed(4))
            : typeof factorsRaw.parseComponent === "number"
              ? Number(factorsRaw.parseComponent.toFixed(4))
              : 0,
        structureComponent:
          typeof factorsRaw.structure_component === "number"
            ? Number(factorsRaw.structure_component.toFixed(4))
            : typeof factorsRaw.structureComponent === "number"
              ? Number(factorsRaw.structureComponent.toFixed(4))
              : 0,
        intentComponent:
          typeof factorsRaw.intent_component === "number"
            ? Number(factorsRaw.intent_component.toFixed(4))
            : typeof factorsRaw.intentComponent === "number"
              ? Number(factorsRaw.intentComponent.toFixed(4))
              : 0,
        variationComponent:
          typeof factorsRaw.variation_component === "number"
            ? Number(factorsRaw.variation_component.toFixed(4))
            : typeof factorsRaw.variationComponent === "number"
              ? Number(factorsRaw.variationComponent.toFixed(4))
              : 0,
      },
    },
    sampleSize: Math.max(0, Number(sampleSizeRaw) || 0),
    notes: normalizedNotes,
    metadata: {
      totalItems:
        typeof metadataRaw.total_items === "number"
          ? metadataRaw.total_items
          : typeof metadataRaw.totalItems === "number"
            ? metadataRaw.totalItems
            : 0,
      parsedJsonItems:
        typeof metadataRaw.parsed_json_items === "number"
          ? metadataRaw.parsed_json_items
          : typeof metadataRaw.parsedJsonItems === "number"
            ? metadataRaw.parsedJsonItems
            : 0,
      structuredItems:
        typeof metadataRaw.structured_items === "number"
          ? metadataRaw.structured_items
          : typeof metadataRaw.structuredItems === "number"
            ? metadataRaw.structuredItems
            : 0,
    },
    source: "api",
  };
}

export async function runQuickScan(text: string): Promise<QuickScanResult> {
  const trimmed = text.trim();
  if (!trimmed) return fallbackQuickScan(trimmed);

  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${baseUrl}/quick-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      return normalizeQuickScanPayload(payload);
    } catch {
      continue;
    }
  }

  return fallbackQuickScan(trimmed);
}
