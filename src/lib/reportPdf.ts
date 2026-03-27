// ============================================================
// Executive Analysis Report — PDF Generator
// Uses jsPDF. A4 format, branded executive layout.
// ============================================================

import { jsPDF } from "jspdf";
import type { DomainAnalysis } from "@/domain/analysis.types";
import type { EconomicsViewModel } from "@/domain/verdict.types";

// ─── Brand colours (RGB) ────────────────────────────────────────────────────

const C = {
  bg: [7, 12, 24] as [number, number, number],           // #070C18
  accent: [34, 211, 238] as [number, number, number],    // #22D3EE cyan
  accentDim: [6, 182, 212] as [number, number, number],  // #06B6D4
  white: [241, 245, 249] as [number, number, number],    // #F1F5F9
  slate: [148, 163, 184] as [number, number, number],    // #94A3B8
  muted: [71, 85, 105] as [number, number, number],      // #475569
  risk: {
    LOW: [52, 211, 153] as [number, number, number],     // #34D399
    MEDIUM: [251, 191, 36] as [number, number, number],  // #FBBF24
    HIGH: [251, 146, 60] as [number, number, number],    // #FB923C
    CRITICAL: [248, 113, 113] as [number, number, number], // #F87171
  },
  ok: [52, 211, 153] as [number, number, number],
  warn: [248, 113, 113] as [number, number, number],
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}${suffix}`;
}

function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.01) return "US$ <0.01";
  return `US$ ${value.toFixed(2)}`;
}

function safe(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function riskColour(risk?: string): [number, number, number] {
  if (risk === "CRITICAL") return C.risk.CRITICAL;
  if (risk === "HIGH") return C.risk.HIGH;
  if (risk === "MEDIUM") return C.risk.MEDIUM;
  return C.risk.LOW;
}

function severityColour(sev?: string): [number, number, number] {
  if (sev === "critical") return C.risk.CRITICAL;
  if (sev === "high") return C.risk.HIGH;
  if (sev === "warning") return C.risk.MEDIUM;
  return C.slate;
}

// ─── Page layout constants ───────────────────────────────────────────────────

const PW = 595.28;   // A4 width in pt
const PH = 841.89;   // A4 height in pt
const ML = 44;       // margin left
const MR = 44;       // margin right
const MT = 40;       // margin top (for body pages)
const MB = 36;       // margin bottom
const TW = PW - ML - MR;  // text width

// ─── Document builder ───────────────────────────────────────────────────────

interface Ctx {
  doc: jsPDF;
  y: number;
  page: number;
}

function newCtx(doc: jsPDF): Ctx {
  return { doc, y: MT, page: 1 };
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y + needed > PH - MB) {
    ctx.doc.addPage();
    ctx.page++;
    ctx.y = MT;
    drawPageFooter(ctx);
  }
}

function drawPageFooter(ctx: Ctx): void {
  const { doc, page } = ctx;
  // Thin accent line at bottom
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.4);
  doc.line(ML, PH - MB + 6, PW - MR, PH - MB + 6);
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("SENTINELA · ARGOS Engine · Confidential", ML, PH - MB + 16);
  doc.text(`Page ${page}`, PW - MR, PH - MB + 16, { align: "right" });
}

// ─── Cover page ─────────────────────────────────────────────────────────────

function drawCoverPage(
  ctx: Ctx,
  analysis: DomainAnalysis,
  workspaceName?: string | null,
): void {
  const { doc } = ctx;

  // Dark header band
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, PW, 220, "F");

  // Accent left bar
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 5, 220, "F");

  // Brand wordmark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...C.accent);
  doc.text("SENTINELA", ML + 4, 70);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate);
  doc.text("Powered by ARGOS Engine", ML + 4, 88);

  // Title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.text("Executive Analysis Report", ML + 4, 130);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.slate);
  doc.text("AI Behavior Intelligence · Confidential", ML + 4, 148);

  // Risk badge (top-right of header)
  const risk = analysis.riskLevel ?? "LOW";
  const [rr, rg, rb] = riskColour(risk);
  doc.setFillColor(rr, rg, rb);
  const badgeW = 80;
  const badgeX = PW - MR - badgeW;
  doc.roundedRect(badgeX, 56, badgeW, 22, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 12, 24);
  doc.text(`${risk} RISK`, badgeX + badgeW / 2, 71, { align: "center" });

  // Meta block below header band
  const metaY = 240;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);

  const metaRows: [string, string][] = [
    ["Generated", new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })],
    ["Workspace", workspaceName || "—"],
    ["Analysis ID", analysis.analysisId || analysis.analysisRunId || "—"],
    ["Engine", analysis.engineVersion || "—"],
    ["Analyzed at", analysis.analyzedAt ? new Date(analysis.analyzedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }) : "—"],
  ];

  metaRows.forEach(([label, value], i) => {
    const ry = metaY + i * 22;
    doc.setTextColor(...C.muted);
    doc.text(label, ML + 4, ry);
    doc.setTextColor(...C.white);
    doc.text(value, ML + 120, ry);
  });

  // Horizontal divider
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.3);
  doc.line(ML, metaY + metaRows.length * 22 + 8, PW - MR, metaY + metaRows.length * 22 + 8);

  // Snapshot metrics grid on cover
  const snapY = metaY + metaRows.length * 22 + 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.slate);
  doc.text("SNAPSHOT METRICS", ML + 4, snapY);

  const snapMetrics = [
    { label: "Consistency Score", value: fmt(analysis.consistencyScore, "%") },
    { label: "Global Confidence", value: fmt(analysis.globalConfidence, "%") },
    { label: "Conversations", value: safe(analysis.nConversations) || "—" },
    { label: "Intents", value: safe(analysis.nIntents) || "—" },
    { label: "Critical Alerts", value: safe(analysis.criticalAlertsCount) },
    { label: "AI Health Score", value: fmt(analysis.aiHealthScore, "%") },
    { label: "Behavior Score", value: fmt(analysis.behaviorScore, "%") },
    { label: "Token Waste", value: fmt(analysis.tokenWasteEstimate, "%") },
  ];

  const cols = 2;
  const colW = TW / cols;
  snapMetrics.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const mx = ML + 4 + col * colW;
    const my = snapY + 18 + row * 38;

    // Card background
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(mx, my - 14, colW - 8, 32, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.slate);
    doc.text(m.label, mx + 8, my);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...C.accent);
    doc.text(m.value, mx + 8, my + 14);
  });

  // Footer on cover
  const footerY = PH - 48;
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.4);
  doc.line(ML, footerY, PW - MR, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text("SENTINELA · ARGOS Engine · Confidential", ML + 4, footerY + 14);
  doc.text("Page 1", PW - MR, footerY + 14, { align: "right" });
}

// ─── Section header ──────────────────────────────────────────────────────────

function sectionHeader(ctx: Ctx, title: string): void {
  ensureSpace(ctx, 36);
  const { doc } = ctx;

  // Accent left stripe
  doc.setFillColor(...C.accent);
  doc.rect(ML, ctx.y, 3, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text(title.toUpperCase(), ML + 10, ctx.y + 11);

  // Thin underline
  doc.setDrawColor(...C.muted);
  doc.setLineWidth(0.3);
  doc.line(ML + 10, ctx.y + 16, PW - MR, ctx.y + 16);

  ctx.y += 26;
}

// ─── Two-column metric grid ──────────────────────────────────────────────────

interface MetricEntry { label: string; value: string; }

function metricGrid(ctx: Ctx, metrics: MetricEntry[], cols = 2): void {
  const { doc: d } = ctx;
  const colW = TW / cols;
  const rowH = 38;

  for (let i = 0; i < metrics.length; i += cols) {
    ensureSpace(ctx, rowH + 4);
    for (let c = 0; c < cols; c++) {
      const m = metrics[i + c];
      if (!m) continue;
      const mx = ML + c * colW;

      // Card background
      d.setFillColor(15, 23, 42);
      d.roundedRect(mx, ctx.y, colW - 6, rowH - 4, 3, 3, "F");

      d.setFont("helvetica", "normal");
      d.setFontSize(8);
      d.setTextColor(...C.slate);
      d.text(m.label, mx + 8, ctx.y + 13);

      d.setFont("helvetica", "bold");
      d.setFontSize(13);
      d.setTextColor(...C.accent);
      d.text(m.value, mx + 8, ctx.y + 27);
    }
    ctx.y += rowH;
  }
  ctx.y += 6;
}

// workaround for jsPDF closure
let doc: jsPDF;

function writeParagraph(ctx: Ctx, text: string, fontSize = 10): void {
  ensureSpace(ctx, 20);
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(fontSize);
  ctx.doc.setTextColor(...C.slate);
  const lines = ctx.doc.splitTextToSize(text, TW);
  const blockH = lines.length * (fontSize * 1.35);
  ensureSpace(ctx, blockH + 4);
  ctx.doc.text(lines, ML, ctx.y);
  ctx.y += blockH + 6;
}

function writeAlertRow(ctx: Ctx, index: number, title: string, severity: string, detail?: string): void {
  const rowH = detail ? 42 : 26;
  ensureSpace(ctx, rowH + 4);

  const [sr, sg, sb] = severityColour(severity);

  // Severity dot
  ctx.doc.setFillColor(sr, sg, sb);
  ctx.doc.circle(ML + 6, ctx.y + 10, 4, "F");

  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...C.white);
  const label = `${index + 1}. ${title}`;
  const truncated = label.length > 80 ? label.slice(0, 77) + "…" : label;
  ctx.doc.text(truncated, ML + 16, ctx.y + 12);

  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(sr, sg, sb);
  ctx.doc.text(severity.toUpperCase(), PW - MR, ctx.y + 12, { align: "right" });

  if (detail) {
    ctx.doc.setTextColor(...C.slate);
    const lines = ctx.doc.splitTextToSize(detail, TW - 20);
    const clamped = lines.slice(0, 2);
    ctx.doc.text(clamped, ML + 16, ctx.y + 24);
    ctx.y += detail ? 42 : 26;
  } else {
    ctx.y += 26;
  }

  // Divider
  ctx.doc.setDrawColor(22, 33, 62);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(ML, ctx.y, PW - MR, ctx.y);
  ctx.y += 4;
}

// ─── Main export ────────────────────────────────────────────────────────────

export function downloadExecutiveReportPdf(
  analysis: DomainAnalysis,
  economics: EconomicsViewModel | null,
  workspaceName?: string | null,
): void {
  doc = new jsPDF({ unit: "pt", format: "a4" });
  const ctx = newCtx(doc);

  // ── Page 1: Cover ──────────────────────────────────────────────────────────
  drawCoverPage(ctx, analysis, workspaceName);

  // ── Page 2: Executive Summary + Behavior ──────────────────────────────────
  doc.addPage();
  ctx.page++;
  ctx.y = MT;
  drawPageFooter(ctx);

  sectionHeader(ctx, "Executive Summary");

  if (analysis.executiveSummary) {
    writeParagraph(ctx, analysis.executiveSummary, 10);
    ctx.y += 6;
  }

  const coreMetrics: MetricEntry[] = [
    { label: "Consistency Score", value: fmt(analysis.consistencyScore, "%") },
    { label: "Global Confidence", value: fmt(analysis.globalConfidence, "%") },
    { label: "AI Health Score", value: fmt(analysis.aiHealthScore, "%") },
    { label: "Behavior Score", value: fmt(analysis.behaviorScore, "%") },
    { label: "Risk Level", value: analysis.riskLevel ?? "—" },
    { label: "Conversations", value: safe(analysis.nConversations) || "—" },
    { label: "Intents Detected", value: safe(analysis.nIntents) || "—" },
    { label: "Critical Alerts", value: safe(analysis.criticalAlertsCount) },
  ];
  metricGrid(ctx, coreMetrics);

  ctx.y += 10;
  sectionHeader(ctx, "Behavior Signals");

  const behaviorMetrics: MetricEntry[] = [
    { label: "Token Waste Estimate", value: fmt(analysis.tokenWasteEstimate, "%") },
    { label: "Cross-Intent Similarity", value: fmt(analysis.crossIntentSimilarity, "%") },
    { label: "Response Variance", value: fmt(analysis.responseVariance, "%") },
    { label: "Response Stability", value: fmt(analysis.responseStabilityScore, "%") },
    { label: "Intent Coverage", value: fmt(analysis.intentCoverageScore, "%") },
    { label: "Covered Intents", value: safe(analysis.coveredIntents) || "—" },
    { label: "Semantic Drift", value: fmt(analysis.semanticDrift, "%") },
    { label: "Min Samples / Intent", value: safe(analysis.minSamplesPerIntent) || "—" },
  ];
  metricGrid(ctx, behaviorMetrics);

  // Underrepresented intents
  if (analysis.underrepresentedIntents && analysis.underrepresentedIntents.length > 0) {
    ctx.y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.slate);
    doc.text("UNDERREPRESENTED INTENTS", ML, ctx.y);
    ctx.y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.slate);
    const list = analysis.underrepresentedIntents.slice(0, 12).join("  ·  ");
    const lines = doc.splitTextToSize(list, TW);
    doc.text(lines, ML, ctx.y);
    ctx.y += lines.length * 13 + 8;
  }

  // ── Page 3: Alerts ─────────────────────────────────────────────────────────
  doc.addPage();
  ctx.page++;
  ctx.y = MT;
  drawPageFooter(ctx);

  sectionHeader(ctx, "Detected Alerts");

  if (!analysis.alerts || analysis.alerts.length === 0) {
    writeParagraph(ctx, "No alerts detected in this analysis run.", 10);
  } else {
    analysis.alerts.slice(0, 40).forEach((alert, i) => {
      writeAlertRow(
        ctx,
        i,
        alert.title,
        alert.severity,
        alert.recommendation || alert.problem,
      );
    });
  }

  // ── Detected Issues (same page or new) ────────────────────────────────────
  ctx.y += 8;
  sectionHeader(ctx, "Detected Issues");

  const issues = analysis.issues ?? [];
  if (issues.length === 0) {
    writeParagraph(ctx, "No issues detected in this analysis run.", 10);
  } else {
    issues.slice(0, 30).forEach((issue, i) => {
      const title = issue.title || issue.issueType || `Issue ${i + 1}`;
      const sev = issue.severity || "info";
      const detail = issue.recommendation || issue.summary;
      writeAlertRow(ctx, i, title, sev, detail);
    });
  }

  // ── Page 4: Economics ──────────────────────────────────────────────────────
  if (economics) {
    doc.addPage();
    ctx.page++;
    ctx.y = MT;
    drawPageFooter(ctx);

    sectionHeader(ctx, "Economics Overview");

    const heroMetrics: MetricEntry[] = economics.hero.map((m) => ({
      label: m.label,
      value: m.displayValue,
    }));
    metricGrid(ctx, heroMetrics);

    ctx.y += 10;
    sectionHeader(ctx, "Economics Breakdown");

    const detailMetrics: MetricEntry[] = economics.details.map((m) => ({
      label: m.label,
      value: m.displayValue,
    }));
    metricGrid(ctx, detailMetrics);
  }

  // ── Page 5: ARGOS Scores ───────────────────────────────────────────────────
  if (analysis.scores && Object.keys(analysis.scores).length > 0) {
    doc.addPage();
    ctx.page++;
    ctx.y = MT;
    drawPageFooter(ctx);

    sectionHeader(ctx, "ARGOS Diagnostic Scores");

    const scoreEntries = Object.entries(analysis.scores)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => ({
        label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: fmt(v as number, ""),
      }));

    metricGrid(ctx, scoreEntries);
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    ensureSpace(ctx, 60);
    ctx.y += 10;
    sectionHeader(ctx, "Recommendations");

    analysis.recommendations.slice(0, 10).forEach((rec, i) => {
      const title = rec.title || rec.action || `Recommendation ${i + 1}`;
      const detail = [rec.reason, rec.expectedImpact].filter(Boolean).join(" · ");
      writeAlertRow(ctx, i, title, "info", detail || undefined);
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const id = analysis.analysisId || analysis.analysisRunId;
  const filename = id
    ? `sentinela-report-${id.slice(0, 8)}.pdf`
    : `sentinela-report-${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
}
