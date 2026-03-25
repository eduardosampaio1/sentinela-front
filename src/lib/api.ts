import { supabase } from "@/lib/supabase";

const DEFAULT_GATEWAY_API_URL = "https://sentinela-gateway.onrender.com";

function normalizeApiBaseUrl(value: unknown): string {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

const configuredApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_SENTINELA_API_URL);
const API_BASE_CANDIDATES = Array.from(
  new Set(
    [configuredApiBaseUrl, DEFAULT_GATEWAY_API_URL]
      .map(normalizeApiBaseUrl)
      .filter(Boolean),
  ),
);

function shouldFallbackToNextBase(status: number): boolean {
  return status === 404 || status === 405 || status === 502 || status === 503 || status === 504;
}

const REQUIRED_TOP_LEVEL_FIELDS = [
  "analysis_id",
  "workspace_id",
  "project_id",
  "environment_id",
  "engine_version",
  "consistency_score",
  "global_confidence",
  "risk_level",
  "n_conversations",
  "n_intents",
  "token_waste_estimate",
  "cross_intent_similarity",
  "response_stability_score",
  "alerts",
  "argos_v2",
] as const;

const REQUIRED_ARGOS_V2_FIELDS = [
  "contract_version",
  "analysis_version",
  "signal_version",
  "scoring_version",
  "scores",
  "signals",
  "issues",
  "evidence",
  "recommendations",
  "business_impact",
  "executive_summary",
  "metadata",
] as const;

export interface AnalysisAlert {
  severity: string;
  intent?: string;
  title: string;
  hint?: string;
  recommendation?: string;
}

export interface ArgosIssue {
  issue_id?: string;
  issue_type?: string;
  severity?: string;
  confidence?: number;
  title?: string;
  summary?: string;
  category?: string;
  recommendation?: string;
  [key: string]: unknown;
}

export interface ArgosV2Payload {
  contract_version?: string;
  analysis_version?: string;
  signal_version?: string;
  scoring_version?: string;
  scores?: Record<string, number>;
  signals?: Record<string, Record<string, number>>;
  issues?: ArgosIssue[];
  evidence?: Record<string, unknown>;
  recommendations?: Array<Record<string, unknown>>;
  business_impact?: Record<string, unknown>;
  executive_summary?: string;
  metadata?: Record<string, unknown>;
  score_registry?: Array<Record<string, unknown>>;
  signal_registry?: Array<Record<string, unknown>>;
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
  workspace_id?: string;
  project_id?: string;
  environment_id?: string;
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
   * Important:
   * this field should come from analysis_runs.id so interpretation cache can be deterministic.
   * If missing, the frontend falls back to sending the full analysis_result payload.
   */
  analysis_run_id?: string;
  issues?: Array<Record<string, unknown>>;
  insights?: Record<string, unknown>;
  argos_v2?: ArgosV2Payload;
  business_impact?: Record<string, unknown>;
  executive_summary?: string;
  baseline_comparison?: Record<string, unknown>;

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
  executive_diagnosis?: string;
  risk_level?: "low" | "medium" | "high" | "critical";
  main_risks?: InterpretationRisk[];
  systemic_pattern?: string;
  priority_actions?: InterpretationPriorityAction[];
  strategic_recommendation?: string;
  summary?: string;
  key_findings?: string[];
  operational_risks?: string[];
  business_implications?: string[];
  recommended_priorities?: string[];
  confidence_notes?: string;
}

export interface InterpretAnalysisResponse {
  cached: boolean;
  analysis_run_id?: string;
  model: string;
  prompt_version: string;
  report: AnalysisInterpretation;
}

export interface GetInterpretationResponse {
  found: boolean;
  status: "not_requested" | "queued" | "running" | "completed" | "failed";
  analysis_run_id?: string;
  model?: string;
  provider?: string;
  prompt_version?: string;
  created_at?: string;
  updated_at?: string;
  error?: string;
  report?: AnalysisInterpretation;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function mergeBusinessImpactPayloads(
  top: Record<string, unknown>,
  argos: Record<string, unknown>,
): Record<string, unknown> {
  const merged = {
    ...argos,
    ...top,
  };
  const mergedDetails = {
    ...asRecord(argos.details),
    ...asRecord(top.details),
  };

  if (Object.keys(mergedDetails).length > 0) {
    merged.details = mergedDetails;
  }

  return merged;
}

function normalizePercent(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value >= 0 && value <= 1) return Number((value * 100).toFixed(2));
  return Number(value.toFixed(2));
}

function pushUniqueWarning(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) warnings.push(warning);
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
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

function normalizeRiskLevel(value: unknown): "low" | "medium" | "high" | "critical" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  return "low";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizeInterpretation(payload: unknown): AnalysisInterpretation {
  const raw = asRecord(payload);
  
  // BUG FIX: Garante que 'hasContent' seja true se houver qualquer dado no payload
  const summary = String(
    raw.summary ??
    raw.executive_summary ?? 
    raw.executive_diagnosis ??
    raw.systemic_pattern ??
    (Object.keys(raw).length > 0 ? "Análise concluída. Veja os detalhes abaixo." : "")
  ).trim();

  // 1. Processa arrays de strings simples
  const keyFindings = toStringArray(raw.key_findings);
  const operationalRisks = toStringArray(raw.operational_risks);
  const businessImplications = toStringArray(raw.business_implications);
  const recommendedPriorities = toStringArray(raw.recommended_priorities);

  // 2. Processa o array de objetos de riscos
  const normalizedMainRisks: InterpretationRisk[] = Array.isArray(raw.main_risks)
    ? raw.main_risks
        .map((item) => asRecord(item))
        .map((item) => ({
          title: String(item.title ?? item.evidence ?? "Risk").trim() || "Risk",
          severity: normalizeRiskLevel(item.severity),
          evidence: String(item.evidence ?? item.title ?? "").trim(),
          impact: String(item.impact ?? "").trim(),
        }))
    : [];

  // 3. Processa o array de objetos de ações prioritárias
  const normalizedPriorityActions: InterpretationPriorityAction[] = Array.isArray(raw.priority_actions)
    ? raw.priority_actions
        .map((item) => asRecord(item))
        .map((item, index) => ({
          priority:
            typeof item.priority === "number" && Number.isFinite(item.priority)
              ? item.priority
              : index + 1,
          action: String(item.action ?? "").trim(),
          reason: String(item.reason ?? "").trim(),
          expected_effect: String(item.expected_effect ?? "").trim(),
        }))
        .filter((item) => Boolean(item.action))
    : [];

  // 4. Retorna o objeto final organizado
  return {
    executive_diagnosis: String(raw.executive_diagnosis ?? summary).trim(),
    risk_level: normalizeRiskLevel(raw.risk_level),
    main_risks: normalizedMainRisks,
    systemic_pattern: String(raw.systemic_pattern ?? raw.confidence_notes ?? "").trim(),
    priority_actions: normalizedPriorityActions,
    strategic_recommendation: String(
      raw.strategic_recommendation ??
        recommendedPriorities[0] ??
        keyFindings[0] ??
        ""
    ).trim(),
    summary,
    key_findings: keyFindings,
    operational_risks: operationalRisks,
    business_implications: businessImplications,
    recommended_priorities: recommendedPriorities,
    confidence_notes: String(raw.confidence_notes ?? "").trim(),
  };
}

async function getAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to load session: ${error.message}`);
  }

  const token = session?.access_token;
  if (!token) {
    throw new Error("User session expired. Please sign in again.");
  }

  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function extractErrorMessageFromBody(bodyText: string): string | undefined {
  const normalized = bodyText.trim();
  if (!normalized) return undefined;

  try {
    const payload = JSON.parse(normalized) as Record<string, unknown>;
    const detail =
      payload.detail && typeof payload.detail === "object"
        ? (payload.detail as Record<string, unknown>)
        : payload;
    const code = firstNonEmptyString(detail.code, payload.code);
    const message = firstNonEmptyString(
      detail.message,
      payload.message,
      detail.error_description,
      payload.error_description,
      detail.error,
      payload.error,
      typeof payload.detail === "string" ? payload.detail : undefined,
    );

    if (code === "supabase_auth_not_configured") {
      return "Analysis backend authentication is not configured.";
    }
    if (code === "supabase_rest_not_configured") {
      return "Analysis backend storage is not configured.";
    }

    return message;
  } catch {
    return undefined;
  }
}

function summarizeHttpError(status: number, bodyText: string, fallbackMessage: string): string {
  const extracted = extractErrorMessageFromBody(bodyText);
  if (extracted) return `HTTP ${status}: ${extracted}`;

  const normalized = bodyText.trim();
  if (normalized.length === 0) return `HTTP ${status}: ${fallbackMessage}`;
  return `HTTP ${status}: ${normalized}`;
}

function isInvalidSessionResponse(status: number, bodyText: string): boolean {
  if (status !== 401) return false;
  const normalized = bodyText.trim();
  if (!normalized) return false;
  try {
    const payload = JSON.parse(normalized) as Record<string, unknown>;
    const detail =
      payload.detail && typeof payload.detail === "object"
        ? (payload.detail as Record<string, unknown>)
        : payload;
    const code =
      typeof detail.code === "string"
        ? detail.code
        : typeof payload.code === "string"
          ? payload.code
          : "";
    return code === "auth_session_invalid" || code === "auth_required";
  } catch {
    return normalized.includes("auth_session_invalid") || normalized.includes("auth_required");
  }
}

async function invalidateSessionIfNeeded(status: number, bodyText: string): Promise<void> {
  if (!isInvalidSessionResponse(status, bodyText)) return;
  await supabase.auth.signOut().catch(() => undefined);
}

async function createAnalysisWithFallback(
  formData: FormData,
): Promise<{ analysisId: string; baseUrl: string }> {
  const headers = await getAuthHeaders({ Accept: "application/json" });
  const attemptErrors: string[] = [];

  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${baseUrl}/analyses/`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        await invalidateSessionIfNeeded(response.status, text);
        const summary = summarizeHttpError(response.status, text, response.statusText);
        attemptErrors.push(`[${baseUrl}] ${summary}`);
        if (shouldFallbackToNextBase(response.status)) {
          continue;
        }
        throw new Error(summary);
      }

      const created = (await response.json()) as Record<string, unknown>;
      const analysisId = String(created.analysis_id ?? "").trim();
      if (!analysisId) {
        throw new Error("Analysis API did not return analysis_id.");
      }

      return { analysisId, baseUrl };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("HTTP")) {
        throw error;
      }
      attemptErrors.push(`[${baseUrl}] ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Analysis endpoint unavailable on configured API base(s): ${attemptErrors.join(" | ")}`,
  );
}

async function startInterpretationWithFallback(
  analysisId: string,
  workspaceId?: string | null,
  projectId?: string | null,
  environmentId?: string | null,
): Promise<{ baseUrl: string; payload: Record<string, unknown> }> {
  const headers = await getAuthHeaders({ Accept: "application/json" });
  const attemptErrors: string[] = [];
  const scopedParams = new URLSearchParams();
  if (workspaceId && workspaceId.trim()) scopedParams.set("workspace_id", workspaceId.trim());
  if (projectId && projectId.trim()) scopedParams.set("project_id", projectId.trim());
  if (environmentId && environmentId.trim()) scopedParams.set("environment_id", environmentId.trim());
  const scopedSuffix = scopedParams.toString() ? `?${scopedParams.toString()}` : "";

  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${baseUrl}/interpret/${analysisId}${scopedSuffix}`, {
        method: "POST",
        headers,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        await invalidateSessionIfNeeded(response.status, text);
        const summary = summarizeHttpError(response.status, text, response.statusText);
        attemptErrors.push(`[${baseUrl}] ${summary}`);
        if (shouldFallbackToNextBase(response.status)) {
          continue;
        }
        throw new Error(summary);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      return { baseUrl, payload };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("HTTP")) {
        throw error;
      }
      attemptErrors.push(`[${baseUrl}] ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Interpretation endpoint unavailable on configured API base(s): ${attemptErrors.join(" | ")}`,
  );
}



async function fetchInterpretationWithFallback(
  analysisId: string,
  workspaceId?: string | null,
  projectId?: string | null,
  environmentId?: string | null,
): Promise<{ baseUrl: string; payload: Record<string, unknown> }> {
  const headers = await getAuthHeaders({ Accept: "application/json" });
  const attemptErrors: string[] = [];
  const scopedParams = new URLSearchParams();
  if (workspaceId && workspaceId.trim()) scopedParams.set("workspace_id", workspaceId.trim());
  if (projectId && projectId.trim()) scopedParams.set("project_id", projectId.trim());
  if (environmentId && environmentId.trim()) scopedParams.set("environment_id", environmentId.trim());
  const scopedSuffix = scopedParams.toString() ? `?${scopedParams.toString()}` : "";

  for (const baseUrl of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${baseUrl}/interpret/${analysisId}${scopedSuffix}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        await invalidateSessionIfNeeded(response.status, text);
        const summary = summarizeHttpError(response.status, text, response.statusText);
        attemptErrors.push(`[${baseUrl}] ${summary}`);
        if (shouldFallbackToNextBase(response.status)) {
          continue;
        }
        throw new Error(summary);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      return { baseUrl, payload };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("HTTP")) {
        throw error;
      }
      attemptErrors.push(`[${baseUrl}] ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(
    `Interpretation status endpoint unavailable on configured API base(s): ${attemptErrors.join(" | ")}`,
  );
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

  const argosV2 = asRecord(raw.argos_v2) as ArgosV2Payload;
  const argosMetadata = asRecord(argosV2.metadata);
  const baselineFromMetadata = asRecord(argosMetadata.baseline_comparison);
  const baselineTop = asRecord(raw.baseline_comparison);
  const baselineComparison =
    Object.keys(baselineTop).length > 0
      ? baselineTop
      : Object.keys(baselineFromMetadata).length > 0
        ? baselineFromMetadata
        : undefined;
  const topLevelBusinessImpact = asRecord(raw.business_impact);
  const argosBusinessImpact = asRecord(argosV2.business_impact);
  const mergedBusinessImpact = mergeBusinessImpactPayloads(topLevelBusinessImpact, argosBusinessImpact);
  const businessImpact =
    Object.keys(mergedBusinessImpact).length > 0
      ? mergedBusinessImpact
        : undefined;
  const topLevelExecutiveSummary = String(raw.executive_summary ?? "").trim();
  const argosExecutiveSummary = String(argosV2.executive_summary ?? "").trim();
  const executiveSummary = topLevelExecutiveSummary || argosExecutiveSummary || undefined;
  const topLevelAnalysisRunId = firstNonEmptyString(raw.analysis_run_id, raw.job_id);
  const resolvedAnalysisRunId = firstNonEmptyString(
    topLevelAnalysisRunId,
    argosMetadata.analysis_run_id,
    argosMetadata.job_id,
    argosMetadata.run_id,
  );
  const rawIssues = Array.isArray(raw.issues) ? (raw.issues as Array<Record<string, unknown>>) : [];
  const rawInsights = asRecord(raw.insights);

  for (const requiredField of REQUIRED_TOP_LEVEL_FIELDS) {
    if (!(requiredField in raw)) {
      pushUniqueWarning(warnings, `Missing required top-level field: ${requiredField}`);
    }
  }

  if (Object.keys(argosV2).length === 0) {
    pushUniqueWarning(warnings, "Missing argos_v2 payload.");
  } else {
    for (const requiredField of REQUIRED_ARGOS_V2_FIELDS) {
      if (!(requiredField in argosV2)) {
        pushUniqueWarning(warnings, `Missing required argos_v2 field: ${requiredField}`);
      }
    }
  }

  if (!resolvedAnalysisRunId) {
    pushUniqueWarning(
      warnings,
      "Missing analysis_run_id. Interpretation cache and run-level history may be degraded.",
    );
  } else if (!topLevelAnalysisRunId) {
    pushUniqueWarning(
      warnings,
      "Missing top-level analysis_run_id. Falling back to argos_v2 metadata for run-level history.",
    );
  }

  if (!executiveSummary) {
    pushUniqueWarning(warnings, "Missing executive_summary on both top-level payload and argos_v2.");
  }

  if (!businessImpact) {
    pushUniqueWarning(warnings, "Missing business_impact on both top-level payload and argos_v2.");
  }

  const result: AnalysisResult = {
    workspace_id:
      typeof field("workspace_id", undefined) === "string"
        ? String(field("workspace_id"))
        : undefined,
    project_id:
      typeof field("project_id", undefined) === "string"
        ? String(field("project_id"))
        : undefined,
    environment_id:
      typeof field("environment_id", undefined) === "string"
        ? String(field("environment_id"))
        : undefined,
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
    analysis_run_id: resolvedAnalysisRunId,
    issues: rawIssues,
    insights: Object.keys(rawInsights).length > 0 ? rawInsights : undefined,
    argos_v2: Object.keys(argosV2).length > 0 ? argosV2 : undefined,
    business_impact: businessImpact,
    executive_summary: executiveSummary,
    baseline_comparison: baselineComparison,
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

export async function analyzeConversations(
  conversations: unknown[],
  options?: { workspaceId?: string | null; projectId?: string | null; environmentId?: string | null },
): Promise<AnalysisResult> {
  const workspaceId = String(options?.workspaceId ?? "").trim();
  const projectId = String(options?.projectId ?? "").trim();
  const environmentId = String(options?.environmentId ?? "").trim();
  const jsonlContent = conversations.map((conversation) => JSON.stringify(conversation)).join("\n");
  const blob = new Blob([jsonlContent], { type: "application/x-ndjson" });
  const formData = new FormData();
  formData.append("file", blob, "batch.jsonl");
  if (workspaceId) {
    formData.append("workspace_id", workspaceId);
  }
  if (projectId) {
    formData.append("project_id", projectId);
  }
  if (environmentId) {
    formData.append("environment_id", environmentId);
  }
  const { analysisId, baseUrl } = await createAnalysisWithFallback(formData);

  const scopeParams = new URLSearchParams();
  if (workspaceId) scopeParams.set("workspace_id", workspaceId);
  if (projectId) scopeParams.set("project_id", projectId);
  if (environmentId) scopeParams.set("environment_id", environmentId);
  const scopedQuery = scopeParams.toString() ? `?${scopeParams.toString()}` : "";

  const maxAttempts = 90;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const statusResponse = await fetch(`${baseUrl}/analyses/${analysisId}${scopedQuery}`, {
      method: "GET",
      headers: await getAuthHeaders({ Accept: "application/json" }),
    });

      if (!statusResponse.ok) {
        const text = await statusResponse.text().catch(() => "");
        await invalidateSessionIfNeeded(statusResponse.status, text);
        throw new Error(`HTTP ${statusResponse.status}: ${text || statusResponse.statusText}`);
      }

    const statusPayload = (await statusResponse.json()) as Record<string, unknown>;
    const status = String(statusPayload.status ?? "").toLowerCase();

    if (status === "completed") {
      const resultResponse = await fetch(`${baseUrl}/analyses/${analysisId}/result${scopedQuery}`, {
        method: "GET",
        headers: await getAuthHeaders({ Accept: "application/json" }),
      });
      if (!resultResponse.ok) {
        const text = await resultResponse.text().catch(() => "");
        await invalidateSessionIfNeeded(resultResponse.status, text);
        throw new Error(`HTTP ${resultResponse.status}: ${text || resultResponse.statusText}`);
      }

      const data = (await resultResponse.json()) as Record<string, unknown>;
      if (!data.analysis_id) data.analysis_id = analysisId;
      return mapApiToDashboard(data);
    }

    if (status === "failed" || status === "not_found") {
      const errorRecord = asRecord(statusPayload.error);
      const errorMessage =
        firstNonEmptyString(
          errorRecord.message,
          statusPayload.detail,
          typeof statusPayload.error === "string" ? statusPayload.error : undefined,
        ) ?? `Analysis job failed with status: ${status}`;
      throw new Error(errorMessage);
    }

    await wait(1000);
  }

  throw new Error("Analysis timed out while waiting for completion.");
}

export async function getInterpretation(
  result: AnalysisResult,
  workspaceId?: string | null,
  projectId?: string | null,
  environmentId?: string | null,
): Promise<GetInterpretationResponse> {
  const analysisId = String(result.analysis_id ?? "").trim();
  if (!analysisId) {
    throw new Error("Interpretation lookup requires analysis_id from a completed analysis.");
  }

  const { payload } = await fetchInterpretationWithFallback(
    analysisId,
    workspaceId,
    projectId,
    environmentId,
  );

  const interpretationStatus = String(payload.interpretation_status ?? "not_requested").trim().toLowerCase();
  const rawInterpretation = asRecord(payload.interpretation);
  const nestedPayload = asRecord(rawInterpretation.interpretation_payload);
  const topLevelPayload = asRecord(payload.interpretation_payload);
  const resolvedPayload =
    Object.keys(topLevelPayload).length > 0
      ? topLevelPayload
      : Object.keys(nestedPayload).length > 0
        ? nestedPayload
        : {};

  const resolvedStatus = (() => {
    if (interpretationStatus === "completed") return "completed";
    if (interpretationStatus === "queued") return "queued";
    if (interpretationStatus === "running") return "running";
    if (interpretationStatus === "failed") return "failed";
    return "not_requested";
  })();

  const resolvedModel = firstNonEmptyString(
    payload.interpretation_model,
    rawInterpretation.interpretation_model,
    resolvedPayload._model,
    "gemini",
  );
  const resolvedProvider = firstNonEmptyString(
    payload.interpretation_provider,
    rawInterpretation.interpretation_provider,
    resolvedPayload._provider,
    "google",
  );
  const resolvedPromptVersion = firstNonEmptyString(
    payload.interpretation_prompt_version,
    rawInterpretation.interpretation_prompt_version,
    resolvedPayload._prompt_version,
    "unknown",
  );
  const resolvedCreatedAt = firstNonEmptyString(
    payload.interpretation_created_at,
    rawInterpretation.created_at,
    payload.created_at,
  );
  const resolvedUpdatedAt = firstNonEmptyString(
    payload.interpretation_updated_at,
    rawInterpretation.updated_at,
    payload.updated_at,
  );

  return {
    found: resolvedStatus !== "not_requested",
    status: resolvedStatus,
    analysis_run_id: firstNonEmptyString(
      payload.analysis_run_id,
      rawInterpretation.analysis_run_id,
      result.analysis_run_id,
    ),
    model: resolvedModel,
    provider: resolvedProvider,
    prompt_version: resolvedPromptVersion,
    created_at: resolvedCreatedAt,
    updated_at: resolvedUpdatedAt,
    error: firstNonEmptyString(payload.interpretation_error, rawInterpretation.interpretation_error),
    report: resolvedStatus === "completed" ? normalizeInterpretation(resolvedPayload) : undefined,
  };
}

export async function interpretAnalysis(
  result: AnalysisResult,
  workspaceId?: string | null,
  projectId?: string | null,
  environmentId?: string | null,
): Promise<InterpretAnalysisResponse> {
  const existing = await getInterpretation(result, workspaceId, projectId, environmentId);

  if (existing.status === "completed" && existing.report) {
    return {
      cached: true,
      analysis_run_id: existing.analysis_run_id ?? result.analysis_run_id,
      model: existing.model ?? "gemini",
      prompt_version: existing.prompt_version ?? "unknown",
      report: existing.report,
    };
  }

  if (existing.status === "queued" || existing.status === "running") {
    const maxAttempts = 90;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const polled = await getInterpretation(result, workspaceId, projectId, environmentId);
      if (polled.status === "completed" && polled.report) {
        return {
          cached: false,
          analysis_run_id: polled.analysis_run_id ?? result.analysis_run_id,
          model: polled.model ?? "gemini",
          prompt_version: polled.prompt_version ?? "unknown",
          report: polled.report,
        };
      }
      if (polled.status === "failed") {
        throw new Error(polled.error || "Interpretation failed.");
      }
      await wait(1000);
    }
    throw new Error("Interpretation timed out while waiting for completion.");
  }

  const analysisId = String(result.analysis_id ?? "").trim();
  if (!analysisId) {
    throw new Error("Interpretation requires analysis_id from a completed analysis.");
  }

  const { payload: startPayload } = await startInterpretationWithFallback(
    analysisId,
    workspaceId,
    projectId,
    environmentId,
  );

  const startedInterpretation = asRecord(startPayload.interpretation);
  const immediatePayload = asRecord(startPayload.interpretation_payload);
  const nestedImmediatePayload = asRecord(startedInterpretation.interpretation_payload);
  const resolvedImmediatePayload =
    Object.keys(immediatePayload).length > 0
      ? immediatePayload
      : Object.keys(nestedImmediatePayload).length > 0
        ? nestedImmediatePayload
        : {};
  const startedStatus = String(
    startPayload.interpretation_status ?? startedInterpretation.interpretation_status ?? "",
  ).trim().toLowerCase();

  if (startedStatus === "completed" && Object.keys(resolvedImmediatePayload).length > 0) {
    return {
      cached: true,
      analysis_run_id: firstNonEmptyString(
        startPayload.analysis_run_id,
        startedInterpretation.analysis_run_id,
        result.analysis_run_id,
      ),
      model:
        firstNonEmptyString(
          startPayload.interpretation_model,
          startedInterpretation.interpretation_model,
          resolvedImmediatePayload._model,
        ) ?? "gemini",
      prompt_version:
        firstNonEmptyString(
          startPayload.interpretation_prompt_version,
          startedInterpretation.interpretation_prompt_version,
          resolvedImmediatePayload._prompt_version,
        ) ?? "unknown",
      report: normalizeInterpretation(resolvedImmediatePayload),
    };
  }

  const maxAttempts = 90;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const polled = await getInterpretation(result, workspaceId, projectId, environmentId);
    if (polled.status === "completed" && polled.report) {
      return {
        cached: false,
        analysis_run_id: polled.analysis_run_id ?? result.analysis_run_id,
        model: polled.model ?? "gemini",
        prompt_version: polled.prompt_version ?? "unknown",
        report: polled.report,
      };
    }

    if (polled.status === "failed") {
      throw new Error(polled.error || "Interpretation failed.");
    }

    await wait(1000);
  }

  throw new Error("Interpretation timed out while waiting for completion.");
}

const CACHE_PREFIX = "sentinela:analysis:";
const LAST_KEY_STORAGE_PREFIX = "sentinela:last_cache_key";

type AnalysisCacheScope =
  | string
  | {
      workspaceId?: string | null;
      projectId?: string | null;
      environmentId?: string | null;
    }
  | null
  | undefined;

function normalizeCacheScope(scope?: AnalysisCacheScope) {
  if (typeof scope === "string") {
    return {
      workspaceId: scope.trim(),
      projectId: "",
      environmentId: "",
    };
  }
  return {
    workspaceId: String(scope?.workspaceId ?? "").trim(),
    projectId: String(scope?.projectId ?? "").trim(),
    environmentId: String(scope?.environmentId ?? "").trim(),
  };
}

function workspaceScopedLastKey(scope?: AnalysisCacheScope): string {
  const normalized = normalizeCacheScope(scope);
  if (normalized.workspaceId) {
    return `${LAST_KEY_STORAGE_PREFIX}:${normalized.workspaceId}:${normalized.projectId || "none"}:${normalized.environmentId || "none"}`;
  }
  return LAST_KEY_STORAGE_PREFIX;
}

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

export function saveResult(
  result: AnalysisResult,
  inputHash?: string,
  scope?: AnalysisCacheScope,
) {
  const next = { ...result };
  if (inputHash) next._cache_key = inputHash;

  const key = cacheKeyFor(next);
  sessionStorage.setItem(key, JSON.stringify(next));
  sessionStorage.setItem(workspaceScopedLastKey(scope), key);
}

export function loadResult(scope?: AnalysisCacheScope): AnalysisResult | null {
  const scopedKey = workspaceScopedLastKey(scope);
  const lastKey = sessionStorage.getItem(scopedKey);
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

export function isSessionCached(scope?: AnalysisCacheScope): boolean {
  const lastKey = sessionStorage.getItem(workspaceScopedLastKey(scope));
  return !!lastKey && !!sessionStorage.getItem(lastKey);
}

function sanitizeResult(parsed: unknown): AnalysisResult {
  const record = asRecord(parsed);
  const argosV2 = asRecord(record.argos_v2) as ArgosV2Payload;
  const argosMetadata = asRecord(argosV2.metadata);
  const baselineFromMetadata = asRecord(argosMetadata.baseline_comparison);
  const baselineTop = asRecord(record.baseline_comparison);
  const baselineComparison =
    Object.keys(baselineTop).length > 0
      ? baselineTop
      : Object.keys(baselineFromMetadata).length > 0
        ? baselineFromMetadata
        : undefined;
  const topBusinessImpact = asRecord(record.business_impact);
  const argosBusinessImpact = asRecord(argosV2.business_impact);
  const mergedBusinessImpact = mergeBusinessImpactPayloads(topBusinessImpact, argosBusinessImpact);
  const businessImpact =
    Object.keys(mergedBusinessImpact).length > 0
      ? mergedBusinessImpact
        : undefined;
  const executiveSummary =
    String(record.executive_summary ?? "").trim() ||
    String(argosV2.executive_summary ?? "").trim() ||
    undefined;
  const resolvedAnalysisRunId = firstNonEmptyString(
    record.analysis_run_id,
    record.job_id,
    argosMetadata.analysis_run_id,
    argosMetadata.job_id,
    argosMetadata.run_id,
  );

  return {
    workspace_id: typeof record.workspace_id === "string" ? record.workspace_id : undefined,
    project_id: typeof record.project_id === "string" ? record.project_id : undefined,
    environment_id: typeof record.environment_id === "string" ? record.environment_id : undefined,
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
    analysis_run_id: resolvedAnalysisRunId,
    issues: Array.isArray(record.issues) ? (record.issues as Array<Record<string, unknown>>) : [],
    insights: Object.keys(asRecord(record.insights)).length > 0 ? asRecord(record.insights) : undefined,
    argos_v2: Object.keys(argosV2).length > 0 ? argosV2 : undefined,
    business_impact: businessImpact,
    executive_summary: executiveSummary,
    baseline_comparison: baselineComparison,
    _warnings: Array.isArray(record._warnings) ? record._warnings.map(String) : [],
    _cache_key: typeof record._cache_key === "string" ? record._cache_key : undefined,
    _meta: asRecord(record._meta) as AnalysisResult["_meta"],
  };
}

export function parseConversationsInput(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Dataset input is empty.");
  }

  const getLineFromPosition = (text: string, position: number) => {
    return text.slice(0, Math.max(0, position)).split(/\r?\n/).length;
  };

  const friendlyJsonError = (message: string, text: string) => {
    const positionMatch = message.match(/position\s+(\d+)/i);
    const lower = message.toLowerCase();

    if (positionMatch) {
      const position = Number(positionMatch[1]);
      const line = getLineFromPosition(text, Number.isFinite(position) ? position : 0);
      if (lower.includes("expected ','")) {
        return `Invalid JSON: missing comma at line ${line}.`;
      }
      if (lower.includes("unexpected end")) {
        return `Invalid JSON: missing closing bracket or brace near line ${line}.`;
      }
      return `Invalid JSON near line ${line}: ${message}`;
    }

    if (lower.includes("unexpected end")) {
      return "Invalid JSON: missing closing bracket or brace.";
    }
    return `Invalid JSON: ${message}`;
  };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const parsedRecord = asRecord(parsed);

    if (Array.isArray(parsed)) return parsed;
    if (parsedRecord && Array.isArray(parsedRecord.conversations)) {
      return parsedRecord.conversations as unknown[];
    }
  } catch (error) {
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const message = error instanceof Error ? error.message : "Unknown JSON parsing error.";
      throw new Error(friendlyJsonError(message, trimmed));
    }

    const lines = trimmed.split("\n").filter((line) => line.trim());

    if (lines.length >= 2) {
      return lines.map((line, index) => {
        try {
          return JSON.parse(line) as unknown;
        } catch {
          throw new Error(`Invalid JSONL/NDJSON on line ${index + 1}.`);
        }
      });
    }

    throw new Error(
      'Invalid dataset format. Provide JSON array, {"conversations":[...]} object, JSONL, or NDJSON.',
    );
  }

  throw new Error('Invalid dataset format. Provide JSON array or {"conversations":[...]} object.');
}

export function parseAnalysisImport(raw: string): AnalysisResult {
  try {
    return mapApiToDashboard(JSON.parse(raw) as Record<string, unknown>);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Invalid analysis result JSON.");
  }
}
