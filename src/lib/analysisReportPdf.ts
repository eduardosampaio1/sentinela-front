import { jsPDF } from "jspdf";
import type { AnalysisResult } from "@/lib/api";
import { buildEconomicsPanelModel } from "@/lib/economicsModel";

function asDisplay(value: unknown, suffix = ""): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value.toFixed(2)}${suffix}`;
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return "N/A";
}

function asUsd(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `USD ${value.toFixed(2)}`;
  }
  return "N/A";
}

function safeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function downloadAnalysisReportPdf(
  result: AnalysisResult,
  workspaceName?: string | null,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 42;
  const maxTextWidth = pageWidth - marginX * 2;
  const lineHeight = 16;
  const sectionGap = 12;
  const rowGap = 4;

  let y = 42;

  const ensureSpace = (required = 24) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + required <= pageHeight - 42) return;
    doc.addPage();
    y = 42;
  };

  const writeWrapped = (text: string, fontSize = 11) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxTextWidth);
    ensureSpace(lines.length * lineHeight + 6);
    doc.text(lines, marginX, y);
    y += lines.length * lineHeight;
  };

  const writeSectionTitle = (title: string) => {
    ensureSpace(28);
    y += sectionGap;
    doc.setFont("helvetica", "bold");
    writeWrapped(title, 12);
    doc.setFont("helvetica", "normal");
  };

  const writeMetric = (label: string, value: string) => {
    ensureSpace(18);
    writeWrapped(`${label}: ${value}`, 11);
    y += rowGap;
  };

  const createdAt = new Date().toLocaleString();
  const analysisId = safeText(result.analysis_id) || "N/A";
  const reportFilename =
    safeText(result.analysis_id) || `analysis-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}`;
  const economicsModel = buildEconomicsPanelModel(result);

  doc.setFont("helvetica", "bold");
  writeWrapped("Sentinela Analysis Report", 18);
  doc.setFont("helvetica", "normal");
  writeMetric("Generated at", createdAt);
  writeMetric("Workspace", safeText(workspaceName) || "N/A");
  writeMetric("Analysis ID", analysisId);

  writeSectionTitle("Core Metrics");
  writeMetric("Consistency Score", asDisplay(result.consistency_score, "%"));
  writeMetric("Global Confidence", asDisplay(result.global_confidence, "%"));
  writeMetric("Risk Level", safeText(result.risk_level) || "N/A");
  writeMetric("Conversations", asDisplay(result.n_conversations));
  writeMetric("Intents", asDisplay(result.n_intents));
  writeMetric("Token Waste Estimate", asDisplay(result.token_waste_estimate));
  writeMetric("Cross-Intent Similarity", asDisplay(result.cross_intent_similarity, "%"));
  writeMetric("Response Variance", asDisplay(result.response_variance, "%"));
  writeMetric("Response Stability", asDisplay(result.response_stability_score, "%"));
  writeMetric("Intent Coverage", asDisplay(result.intent_coverage_score, "%"));
  writeMetric("Critical Alerts", asDisplay(result.critical_alerts_count));

  writeSectionTitle("Detected Alerts");
  if (!result.alerts || result.alerts.length === 0) {
    writeMetric("Alerts", "No alerts detected");
  } else {
    result.alerts.slice(0, 50).forEach((alert, index) => {
      const title = safeText(alert.title) || `Alert ${index + 1}`;
      const severity = safeText(alert.severity) || "unknown";
      const intent = safeText(alert.intent);
      const recommendation = safeText(alert.recommendation);
      writeWrapped(
        `${index + 1}. [${severity.toUpperCase()}] ${title}${intent ? ` (intent: ${intent})` : ""}`,
        10,
      );
      if (recommendation) {
        writeWrapped(`   Recommendation: ${recommendation}`, 10);
      }
      y += rowGap;
    });
  }

  const issues = Array.isArray(result.issues) ? result.issues : [];
  writeSectionTitle("Detected Issues");
  if (issues.length === 0) {
    writeMetric("Issues", "No issues detected");
  } else {
    issues.slice(0, 50).forEach((issue, index) => {
      const issueRecord = issue as Record<string, unknown>;
      const issueType = safeText(issueRecord.issue_type) || safeText(issueRecord.title) || "Issue";
      const severity = safeText(issueRecord.severity) || "unknown";
      const confidence = asDisplay(issueRecord.confidence, "");
      writeWrapped(`${index + 1}. [${severity.toUpperCase()}] ${issueType} (confidence: ${confidence})`, 10);
      const recommendation = safeText(issueRecord.recommended_action) || safeText(issueRecord.recommendation);
      if (recommendation) {
        writeWrapped(`   Recommendation: ${recommendation}`, 10);
      }
      y += rowGap;
    });
  }


  writeSectionTitle("Economics Overview");
  const heroMetrics = economicsModel.hero;
  heroMetrics.forEach((metric) => {
    writeMetric(metric.label, metric.displayValue);
  });

  writeSectionTitle("Economics Breakdown");
  economicsModel.details.forEach((metric) => {
    writeMetric(metric.label, metric.displayValue);
  });

  const scoreMap =
    result.argos_v2 && result.argos_v2.scores && typeof result.argos_v2.scores === "object"
      ? result.argos_v2.scores
      : {};
  const scoreEntries = Object.entries(scoreMap);
  writeSectionTitle("ARGOS Scores");
  if (scoreEntries.length === 0) {
    writeMetric("Scores", "No detailed scores available");
  } else {
    scoreEntries.slice(0, 80).forEach(([name, value]) => {
      writeMetric(name, asDisplay(value, ""));
    });
  }

  doc.save(`sentinela-${reportFilename}.pdf`);
}
