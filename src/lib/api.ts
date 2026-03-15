import { supabase } from "@/lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_SENTINELA_API_URL || "https://sentinela-idmf.onrender.com";
const ANALYZE_URL = `${API_BASE_URL}/analyze-jsonl`;
const INTERPRET_URL = `${API_BASE_URL}/interpret-analysis`;

export interface AnalysisAlert {
  severity: string;
  intent?: string;
  title: string;
  hint?: string;
  recommendation?: string;
}

export interface IntentMetric {
  intent: string;
  consistency_score?: number;
  token_waste?: number;
  n_conversations?: number;
  response_variance?: number;
  response_stability_score?: number;
  mean_assistant_chars?: number;
  std_assistant_chars?: number;
  severity?: string;
  [key: string]: unknown;
}

export interface AnalysisResult {
  engine_version?: string;
  consistency_score: number;
  global_confidence?: number;
  risk_level?: string;
  n_conversations?: number;
  n_intents?: number;
  token_waste_estimate: number;
  cross_intent_similarity: number;
  response_variance?: number;
  response_stability_score?: number;
  intent_coverage_score?: number;
  covered_intents?: number;
  total_intents?: number;
  min_samples_per_intent?: number;
  underrepresented_intents?: string[];
  critical_alerts_count: number;
  alerts: AnalysisAlert[];
  intents?: IntentMetric[];
  analyzed_at: string;
  analysis_id?: string;

  /**
   * IMPORTANTE:
   * esse campo precisa vir do analysis_runs.id para o cache do LLM ficar definitivo.
   * Se ele não existir, o front cai no fallback enviando analysis_result.
   */
  analysis_run_id?: string;

  _warnings: string[];
  _cache_key?: string;
  _meta?: {
    engine_version?: string;
    cross_threshold_effective?: number | null;
    cross_threshold_source?: string | null;
    mode?: string | null;
  };
}

export interface InterpretationRisk {
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string;
  impact: string;
}

export interface InterpretationPriorityAction {
  priority: number;
  action: string;
  reason: string;
  expected_effect: string;
}

export interface AnalysisInterpretation {
  executive_diagnosis: string;
  risk_level: "low" | "medium" | "high" | "critical";
  main_risks: InterpretationRisk[];
  systemic_pattern: string;
  priority_actions: InterpretationPriorityAction[];
  strategic_recommendation: string;
}

export interface InterpretAnalysisResponse {
  cached: boolean;
  analysis_run_id?: string;
  model: string;
  prompt_version: string;
  report: AnalysisInterpretation;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function normalizePercent(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value >= 0 && value <= 1) return Number((value * 100).toFixed(2));
  return Number(value.toFixed(2));
}

function extractIntentFromText(text?: string): string | undefined {
  if (!text) return undefined;
  const match = text.match(
    /(?:INTENT\s+(?:CRITICAL|WARN|WARNING|HIGH|LOW):\s*|INTENT:\s*)([A-Z0-9_]+)/i,
  );
  return match?.[1];
}

function humanizeAlertTitle(alert: Record<string, unknown>, score?: number): string {
  const raw = String(alert.title ?? "").trim();
  const upper = raw.toUpperCase();

  if (upper.includes("CROSS_INTENT") || upper.includes("CROSS-INTENT")) {
    return "Cross-intent reuse detected";
  }
  if (upper.includes("SCORE_BELOW_CRIT")) {
    return `Very low consistency score${score != null ? ` (${score.toFixed(2)}%)` : ""}`;
  }
  if (upper.startsWith("INTENT ")) return raw;
  return raw || "Behavioral issue detected";
}

function humanizeRecommendation(alert: Record<string, unknown>): string {
  const recommendation = String(alert.recommendation ?? "").trim();
  if (recommendation) return recommendation;

  const hint = String(alert.hint ?? "").trim();
  if (!hint) return "Review prompt structure and response behavior for this intent.";
  if (/Very similar answers across intents/i.test(hint)) return hint;
  if (/Reduce variance and align to template/i.test(hint)) return hint;
  if (/SCORE_BELOW_CRIT/i.test(hint)) {
    return "Normalize prompt templates and reduce variation between responses for this intent.";
  }
  return hint;
}

function normalizeSeverity(value: unknown): string {
  const severity = String(value ?? "warning").toLowerCase();
  if (severity === "warn") return "high";
  return severity;
}

async function getAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Erro ao obter sessão: ${error.message}`);
  }

  const token = session?.access_token;
  if (!token) {
    throw new Error("Usuário não autenticado.");
  }

  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

export function mapApiToDashboard(raw: Record<string, unknown>): AnalysisResult {
  const warnings: string[] = [];
  const field = (key: string, fallback: unknown = undefined) => {
    if (!(key in raw)) {
      warnings.push(`Missing field: ${key}`);
      return fallback;
    }
    return raw[key];
  };

  const responseVarianceByIntent = Array.isArray(field("response_variance_by_intent", []))
    ? (field("response_variance_by_intent", []) as unknown[])
    : [];

  const mappedIntents: IntentMetric[] = responseVarianceByIntent.map((item) => {
    const record = asRecord(item);
    const stability = normalizePercent(record.response_stability_score);
    const variance = normalizePercent(record.response_variance);

    return {
      intent: String(record.intent ?? "UNKNOWN_INTENT"),
      consistency_score: stability,
      response_stability_score: stability,
      response_variance: variance,
      n_conversations:
        typeof record.n_conversations === "number" ? record.n_conversations : undefined,
      mean_assistant_chars:
        typeof record.mean_assistant_chars === "number" ? record.mean_assistant_chars : undefined,
      std_assistant_chars:
        typeof record.std_assistant_chars === "number" ? record.std_assistant_chars : undefined,
      severity: typeof record.severity === "string" ? record.severity : undefined,
    };
  });

  const intentScoreMap = new Map(mappedIntents.map((item) => [item.intent, item.consistency_score]));
  const rawAlerts = Array.isArray(field("alerts", [])) ? (field("alerts", []) as unknown[]) : [];
  const dedupe = new Set<string>();

  const alerts: AnalysisAlert[] = rawAlerts.flatMap((item) => {
    const alert = asRecord(item);
    const title = humanizeAlertTitle(
      alert,
      intentScoreMap.get(String(alert.intent ?? extractIntentFromText(String(alert.title ?? "")))),
    );
    const recommendation = humanizeRecommendation(alert);
    const intent = String(
      alert.intent ??
        extractIntentFromText(String(alert.title ?? "")) ??
        extractIntentFromText(String(alert.hint ?? "")) ??
        "",
    ).trim();
    const severity = normalizeSeverity(alert.severity);
    const dedupeKey = `${severity}|${intent}|${title}|${recommendation}`;

    if (dedupe.has(dedupeKey)) return [];
    dedupe.add(dedupeKey);

    return [
      {
        severity,
        intent: intent || undefined,
        title,
        hint: typeof alert.hint === "string" ? alert.hint : undefined,
        recommendation,
      },
    ];
  });

  const criticalCountRaw = field("critical_alerts_count", undefined);
  const criticalAlertsCount =
    typeof criticalCountRaw === "number"
      ? criticalCountRaw
      : alerts.filter((alert) => alert.severity === "critical").length;

  const result: AnalysisResult = {
    engine_version:
      typeof field("engine_version", undefined) === "string"
        ? String(field("engine_version"))
        : undefined,
    consistency_score: normalizePercent(field("consistency_score", 0)) ?? 0,
    global_confidence: normalizePercent(field("global_confidence", undefined)),
    risk_level:
      typeof field("risk_level", undefined) === "string"
        ? String(field("risk_level"))
        : undefined,
    n_conversations:
      typeof field("n_conversations", undefined) === "number"
        ? (field("n_conversations") as number)
        : undefined,
    n_intents:
      typeof field("n_intents", undefined) === "number"
        ? (field("n_intents") as number)
        : undefined,
    token_waste_estimate:
      typeof field("token_waste_estimate", 0) === "number"
        ? Number(field("token_waste_estimate", 0))
        : 0,
    cross_intent_similarity: normalizePercent(field("cross_intent_similarity", 0)) ?? 0,
    response_variance: normalizePercent(field("response_variance", undefined)),
    response_stability_score: normalizePercent(field("response_stability_score", undefined)),
    intent_coverage_score: normalizePercent(field("intent_coverage_score", undefined)),
    covered_intents:
      typeof field("covered_intents", undefined) === "number"
        ? (field("covered_intents") as number)
        : undefined,
    total_intents:
      typeof field("total_intents", undefined) === "number"
        ? (field("total_intents") as number)
        : undefined,
    min_samples_per_intent:
      typeof field("min_samples_per_intent", undefined) === "number"
        ? (field("min_samples_per_intent") as number)
        : undefined,
    underrepresented_intents: Array.isArray(field("underrepresented_intents", []))
      ? (field("underrepresented_intents", []) as unknown[]).map((value) => String(value))
      : [],
    critical_alerts_count: criticalAlertsCount,
    alerts,
    intents: mappedIntents,
    analyzed_at: new Date().toISOString(),
    analysis_id:
      typeof field("analysis_id", undefined) === "string"
        ? String(field("analysis_id"))
        : undefined,
    analysis_run_id:
      typeof field("analysis_run_id", undefined) === "string"
        ? String(field("analysis_run_id"))
        : undefined,
    _warnings: warnings,
    _cache_key:
      typeof field("dataset_hash", undefined) === "string"
        ? String(field("dataset_hash"))
        : typeof field("analysis_id", undefined) === "string"
          ? String(field("analysis_id"))
          : undefined,
    _meta: asRecord(field("_meta", {})) as AnalysisResult["_meta"],
  };

  if (
    result._meta?.engine_version &&
    result.engine_version &&
    result._meta.engine_version !== result.engine_version
  ) {
    warnings.push(
      `Engine version mismatch: payload=${result.engine_version}, meta=${result._meta.engine_version}`,
    );
  }

  if ((result.risk_level ?? "").toLowerCase() === "high" && alerts.length === 0) {
    warnings.push("Risk level is HIGH but no alerts were returned.");
  }

  return result;
}

export async function analyzeConversations(conversations: unknown[]): Promise<AnalysisResult> {
  const jsonlContent = conversations.map((conversation) => JSON.stringify(conversation)).join("\n");
  const blob = new Blob([jsonlContent], { type: "application/x-ndjson" });
  const formData = new FormData();
  formData.append("file", blob, "batch.jsonl");

  const response = await fetch(ANALYZE_URL, {
    method: "POST",
    headers: await getAuthHeaders({ Accept: "application/json" }),
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return mapApiToDashboard(data);
}

export async function interpretAnalysis(
  result: AnalysisResult,
): Promise<InterpretAnalysisResponse> {
  const payload: Record<string, unknown> = {};

  if (result.analysis_run_id) {
    payload.analysis_run_id = result.analysis_run_id;
  } else {
    payload.analysis_result = result;
  }

  const response = await fetch(INTERPRET_URL, {
    method: "POST",
    headers: await getAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  return (await response.json()) as InterpretAnalysisResponse;
}

const CACHE_PREFIX = "sentinela:analysis:";
const LAST_KEY_STORAGE = "sentinela:last_cache_key";

function cacheKeyFor(result: AnalysisResult): string {
  return CACHE_PREFIX + (result._cache_key || result.analysis_id || "latest");
}

export function hashDataset(jsonlContent: string): string {
  let hash = 0;
  for (let i = 0; i < jsonlContent.length; i += 1) {
    hash = ((hash << 5) - hash + jsonlContent.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export function saveResult(result: AnalysisResult, inputHash?: string) {
  const next = { ...result };
  if (inputHash) next._cache_key = inputHash;

  const key = cacheKeyFor(next);
  sessionStorage.setItem(key, JSON.stringify(next));
  sessionStorage.setItem(LAST_KEY_STORAGE, key);
}

export function loadResult(): AnalysisResult | null {
  const lastKey = sessionStorage.getItem(LAST_KEY_STORAGE);
  if (!lastKey) return null;

  const raw = sessionStorage.getItem(lastKey);
  if (!raw) return null;

  try {
    return sanitizeResult(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const loadLastResult = loadResult;

export function isSessionCached(): boolean {
  const lastKey = sessionStorage.getItem(LAST_KEY_STORAGE);
  return !!lastKey && !!sessionStorage.getItem(lastKey);
}

function sanitizeResult(parsed: unknown): AnalysisResult {
  const record = asRecord(parsed);
  return {
    engine_version: typeof record.engine_version === "string" ? record.engine_version : undefined,
    consistency_score: normalizePercent(record.consistency_score) ?? 0,
    global_confidence: normalizePercent(record.global_confidence),
    risk_level: typeof record.risk_level === "string" ? record.risk_level : undefined,
    n_conversations: typeof record.n_conversations === "number" ? record.n_conversations : undefined,
    n_intents: typeof record.n_intents === "number" ? record.n_intents : undefined,
    token_waste_estimate:
      typeof record.token_waste_estimate === "number" ? record.token_waste_estimate : 0,
    cross_intent_similarity: normalizePercent(record.cross_intent_similarity) ?? 0,
    response_variance: normalizePercent(record.response_variance),
    response_stability_score: normalizePercent(record.response_stability_score),
    intent_coverage_score: normalizePercent(record.intent_coverage_score),
    covered_intents: typeof record.covered_intents === "number" ? record.covered_intents : undefined,
    total_intents: typeof record.total_intents === "number" ? record.total_intents : undefined,
    min_samples_per_intent:
      typeof record.min_samples_per_intent === "number" ? record.min_samples_per_intent : undefined,
    underrepresented_intents: Array.isArray(record.underrepresented_intents)
      ? record.underrepresented_intents.map(String)
      : [],
    critical_alerts_count:
      typeof record.critical_alerts_count === "number" ? record.critical_alerts_count : 0,
    alerts: Array.isArray(record.alerts) ? (record.alerts as AnalysisAlert[]) : [],
    intents: Array.isArray(record.intents) ? (record.intents as IntentMetric[]) : [],
    analyzed_at:
      typeof record.analyzed_at === "string" ? record.analyzed_at : new Date().toISOString(),
    analysis_id: typeof record.analysis_id === "string" ? record.analysis_id : undefined,
    analysis_run_id:
      typeof record.analysis_run_id === "string" ? record.analysis_run_id : undefined,
    _warnings: Array.isArray(record._warnings) ? record._warnings.map(String) : [],
    _cache_key: typeof record._cache_key === "string" ? record._cache_key : undefined,
    _meta: asRecord(record._meta) as AnalysisResult["_meta"],
  };
}

export function parseConversationsInput(raw: string): unknown[] {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const parsedRecord = asRecord(parsed);

    if (Array.isArray(parsed)) return parsed;
    if (parsedRecord && Array.isArray(parsedRecord.conversations)) {
      return parsedRecord.conversations as unknown[];
    }
  } catch {
    const lines = trimmed.split("\n").filter((line) => line.trim());

    if (lines.length >= 2) {
      return lines.map((line, index) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          throw new Error(`Invalid JSON on line ${index + 1}`);
        }
      });
    }

    throw new Error(
      'JSON must be an array, an object with a "conversations" key, or JSONL format.',
    );
  }

  throw new Error('JSON must be an array or an object with a "conversations" key.');
}

export function parseAnalysisImport(raw: string): AnalysisResult {
  try {
    return mapApiToDashboard(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Invalid analysis result JSON.");
  }
}
