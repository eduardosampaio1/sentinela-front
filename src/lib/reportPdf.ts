// ============================================================
// Executive Analysis Report — PDF Generator
// Uses jsPDF. A4 format, executive layout.
// Cover: dark branded header. Body pages: light background (readable).
// ============================================================

import { jsPDF } from "jspdf";
import type { DomainAnalysis } from "@/domain/analysis.types";
import type { EconomicsViewModel } from "@/domain/verdict.types";

// ─── Palette ────────────────────────────────────────────────────────────────
// Cover page  → dark background, light text
// Body pages  → white background, dark text

const COVER = {
  bg:       [7, 12, 24]       as RGB,  // #070C18
  accent:   [34, 211, 238]    as RGB,  // #22D3EE
  heading:  [241, 245, 249]   as RGB,  // #F1F5F9
  sub:      [148, 163, 184]   as RGB,  // #94A3B8
  cardBg:   [15, 23, 42]      as RGB,  // #0F172A
  cardVal:  [34, 211, 238]    as RGB,  // #22D3EE
};

const BODY = {
  text:     [15, 23, 42]      as RGB,  // #0F172A  — primary text
  secondary:[71, 85, 105]     as RGB,  // #475569  — labels / muted
  faint:    [148, 163, 184]   as RGB,  // #94A3B8  — very muted
  accent:   [6, 182, 212]     as RGB,  // #06B6D4  — cyan (readable on white)
  cardBg:   [241, 245, 249]   as RGB,  // #F1F5F9
  cardVal:  [6, 182, 212]     as RGB,  // #06B6D4
  border:   [203, 213, 225]   as RGB,  // #CBD5E1
  line:     [226, 232, 240]   as RGB,  // #E2E8F0
};

const RISK: Record<string, RGB> = {
  LOW:      [22, 163, 74]     as RGB,  // green-600
  MEDIUM:   [161, 98, 7]      as RGB,  // amber-700
  HIGH:     [194, 65, 12]     as RGB,  // orange-700
  CRITICAL: [185, 28, 28]     as RGB,  // red-700
};

const SEV: Record<string, RGB> = {
  critical: [185, 28, 28]     as RGB,
  high:     [194, 65, 12]     as RGB,
  warning:  [161, 98, 7]      as RGB,
  info:     [71, 85, 105]     as RGB,
};

type RGB = [number, number, number];

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, suffix = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}${suffix}`;
}

function safe(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function riskRgb(risk?: string): RGB {
  return RISK[risk ?? ""] ?? RISK.LOW;
}

function sevRgb(sev?: string): RGB {
  return SEV[sev?.toLowerCase() ?? ""] ?? SEV.info;
}

// ─── Layout constants ────────────────────────────────────────────────────────

const PW = 595.28;
const PH = 841.89;
const ML = 44;
const MR = 44;
const MT = 48;
const MB = 40;
const TW = PW - ML - MR;

// ─── Ctx ────────────────────────────────────────────────────────────────────

interface Ctx { doc: jsPDF; y: number; page: number; }

function mkCtx(doc: jsPDF): Ctx { return { doc, y: MT, page: 1 }; }

function ensureSpace(ctx: Ctx, need: number): void {
  if (ctx.y + need > PH - MB) {
    ctx.doc.addPage();
    ctx.page++;
    ctx.y = MT;
    bodyFooter(ctx);
  }
}

// ─── Body page footer ────────────────────────────────────────────────────────

function bodyFooter(ctx: Ctx): void {
  const { doc, page } = ctx;
  const fy = PH - MB + 8;
  doc.setDrawColor(...BODY.border);
  doc.setLineWidth(0.4);
  doc.line(ML, fy - 4, PW - MR, fy - 4);
  doc.setFontSize(7.5);
  doc.setTextColor(...BODY.secondary);
  doc.text("SENTINELA  ·  ARGOS Engine  ·  Confidential", ML, fy + 6);
  doc.text(`Page ${page}`, PW - MR, fy + 6, { align: "right" });
}

// ─── Cover page (dark) ───────────────────────────────────────────────────────

function drawCover(
  ctx: Ctx,
  a: DomainAnalysis,
  workspace?: string | null,
): void {
  const { doc } = ctx;

  // Full dark background
  doc.setFillColor(...COVER.bg);
  doc.rect(0, 0, PW, PH, "F");

  // Left accent bar
  doc.setFillColor(...COVER.accent);
  doc.rect(0, 0, 5, PH, "F");

  // ── Header block ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COVER.accent);
  doc.text("SENTINELA", ML + 6, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COVER.sub);
  doc.text("Powered by ARGOS Engine", ML + 6, 65);

  // Risk badge top-right
  const risk = a.riskLevel ?? "LOW";
  const [rr, rg, rb] = riskRgb(risk);
  const bw = 84, bx = PW - MR - bw;
  doc.setFillColor(rr, rg, rb);
  doc.roundedRect(bx, 44, bw, 22, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`${risk} RISK`, bx + bw / 2, 58.5, { align: "center" });

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...COVER.heading);
  doc.text("Executive Analysis Report", ML + 6, 118);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COVER.sub);
  doc.text("AI Behavior Intelligence  ·  Confidential", ML + 6, 136);

  // ── Divider ──
  doc.setDrawColor(30, 45, 70);
  doc.setLineWidth(0.4);
  doc.line(ML, 150, PW - MR, 150);

  // ── Metadata block ──
  const metaStartY = 172;
  const rows: [string, string][] = [
    ["Generated",   new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })],
    ["Workspace",   workspace || "—"],
    ["Analysis ID", a.analysisId || a.analysisRunId || "—"],
    ["Engine",      a.engineVersion || "—"],
    ["Analyzed at", a.analyzedAt ? new Date(a.analyzedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }) : "—"],
  ];
  rows.forEach(([label, value], i) => {
    const ry = metaStartY + i * 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COVER.sub);
    doc.text(label, ML + 6, ry);
    doc.setTextColor(...COVER.heading);
    doc.text(value, ML + 110, ry);
  });

  // ── Divider ──
  const afterMeta = metaStartY + rows.length * 22 + 10;
  doc.setDrawColor(30, 45, 70);
  doc.line(ML, afterMeta, PW - MR, afterMeta);

  // ── Snapshot metrics grid ──
  const snapLabelY = afterMeta + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COVER.sub);
  doc.text("SNAPSHOT METRICS", ML + 6, snapLabelY);

  const snaps = [
    { label: "Consistency Score",  value: fmt(a.consistencyScore, "%") },
    { label: "Global Confidence",  value: fmt(a.globalConfidence, "%") },
    { label: "Conversations",      value: safe(a.nConversations) || "—" },
    { label: "Intents",            value: safe(a.nIntents) || "—" },
    { label: "Critical Alerts",    value: safe(a.criticalAlertsCount) },
    { label: "AI Health Score",    value: fmt(a.aiHealthScore, "%") },
    { label: "Behavior Score",     value: fmt(a.behaviorScore, "%") },
    { label: "Token Waste",        value: fmt(a.tokenWasteEstimate, "%") },
  ];

  const cols = 2;
  const colW = TW / cols;
  const cardH = 40;
  const cardGap = 6;
  snaps.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = ML + col * colW;
    const cy = snapLabelY + 12 + row * (cardH + cardGap);

    doc.setFillColor(...COVER.cardBg);
    doc.roundedRect(cx, cy, colW - 8, cardH, 4, 4, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COVER.sub);
    doc.text(m.label, cx + 10, cy + 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...COVER.cardVal);
    doc.text(m.value, cx + 10, cy + 30);
  });

  // ── Cover footer ──
  const fy = PH - 36;
  doc.setDrawColor(30, 45, 70);
  doc.setLineWidth(0.4);
  doc.line(ML, fy, PW - MR, fy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COVER.sub);
  doc.text("SENTINELA  ·  ARGOS Engine  ·  Confidential", ML + 6, fy + 12);
  doc.text("Page 1", PW - MR, fy + 12, { align: "right" });
}

// ─── Body helpers ────────────────────────────────────────────────────────────

function sectionHeader(ctx: Ctx, title: string): void {
  ensureSpace(ctx, 36);
  const { doc } = ctx;

  doc.setFillColor(...BODY.accent);
  doc.rect(ML, ctx.y, 3, 15, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BODY.text);
  doc.text(title.toUpperCase(), ML + 10, ctx.y + 11);

  doc.setDrawColor(...BODY.line);
  doc.setLineWidth(0.4);
  doc.line(ML + 10, ctx.y + 15, PW - MR, ctx.y + 15);

  ctx.y += 26;
}

interface ME { label: string; value: string; }

function metricGrid(ctx: Ctx, metrics: ME[], cols = 2): void {
  const { doc: d } = ctx;
  const colW = TW / cols;
  const cardH = 38;
  const gap = 5;

  for (let i = 0; i < metrics.length; i += cols) {
    ensureSpace(ctx, cardH + gap);
    for (let c = 0; c < cols; c++) {
      const m = metrics[i + c];
      if (!m) continue;
      const cx = ML + c * colW;

      d.setFillColor(...BODY.cardBg);
      d.roundedRect(cx, ctx.y, colW - 6, cardH - 2, 3, 3, "F");

      d.setFont("helvetica", "normal");
      d.setFontSize(8);
      d.setTextColor(...BODY.secondary);
      d.text(m.label, cx + 9, ctx.y + 12);

      d.setFont("helvetica", "bold");
      d.setFontSize(14);
      d.setTextColor(...BODY.cardVal);
      d.text(m.value, cx + 9, ctx.y + 28);
    }
    ctx.y += cardH + gap;
  }
  ctx.y += 4;
}

function paragraph(ctx: Ctx, text: string, size = 10): void {
  const { doc: d } = ctx;
  d.setFont("helvetica", "normal");
  d.setFontSize(size);
  d.setTextColor(...BODY.secondary);
  const lines = d.splitTextToSize(text, TW) as string[];
  const blockH = lines.length * (size * 1.4);
  ensureSpace(ctx, blockH + 4);
  d.text(lines, ML, ctx.y);
  ctx.y += blockH + 6;
}

function alertRow(
  ctx: Ctx,
  index: number,
  title: string,
  severity: string,
  detail?: string,
): void {
  const { doc: d } = ctx;
  const hasDetail = !!detail;
  const rowH = hasDetail ? 44 : 28;
  ensureSpace(ctx, rowH + 6);

  const rgb = sevRgb(severity);

  // Dot
  d.setFillColor(...rgb);
  d.circle(ML + 6, ctx.y + 11, 4, "F");

  // Title
  d.setFont("helvetica", "bold");
  d.setFontSize(9.5);
  d.setTextColor(...BODY.text);
  const label = `${index + 1}. ${title}`;
  d.text(label.length > 85 ? label.slice(0, 82) + "…" : label, ML + 16, ctx.y + 13);

  // Severity label
  d.setFont("helvetica", "bold");
  d.setFontSize(8);
  d.setTextColor(...rgb);
  d.text(severity.toUpperCase(), PW - MR, ctx.y + 13, { align: "right" });

  if (hasDetail) {
    d.setFont("helvetica", "normal");
    d.setFontSize(8.5);
    d.setTextColor(...BODY.secondary);
    const lines = (d.splitTextToSize(detail!, TW - 22) as string[]).slice(0, 2);
    d.text(lines, ML + 16, ctx.y + 26);
  }

  ctx.y += rowH;

  // Divider
  d.setDrawColor(...BODY.line);
  d.setLineWidth(0.2);
  d.line(ML, ctx.y, PW - MR, ctx.y);
  ctx.y += 5;
}

function miniLabel(ctx: Ctx, text: string): void {
  ensureSpace(ctx, 18);
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(8.5);
  ctx.doc.setTextColor(...BODY.secondary);
  ctx.doc.text(text, ML, ctx.y);
  ctx.y += 14;
}

// ─── Public export ───────────────────────────────────────────────────────────

export function downloadExecutiveReportPdf(
  a: DomainAnalysis,
  economics: EconomicsViewModel | null,
  workspaceName?: string | null,
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const ctx = mkCtx(doc);

  // ════════════════════════════════════════════
  // PAGE 1 — Cover (dark)
  // ════════════════════════════════════════════
  drawCover(ctx, a, workspaceName);

  // ════════════════════════════════════════════
  // PAGE 2 — Executive Summary + Core Metrics
  // ════════════════════════════════════════════
  doc.addPage();
  ctx.page++;
  ctx.y = MT;
  bodyFooter(ctx);

  sectionHeader(ctx, "Executive Summary");

  if (a.executiveSummary) {
    paragraph(ctx, a.executiveSummary, 10);
    ctx.y += 4;
  } else {
    paragraph(ctx, "No executive summary available for this run.", 10);
    ctx.y += 4;
  }

  sectionHeader(ctx, "Core Metrics");
  metricGrid(ctx, [
    { label: "Consistency Score",  value: fmt(a.consistencyScore, "%") },
    { label: "Global Confidence",  value: fmt(a.globalConfidence, "%") },
    { label: "AI Health Score",    value: fmt(a.aiHealthScore, "%") },
    { label: "Behavior Score",     value: fmt(a.behaviorScore, "%") },
    { label: "Risk Level",         value: a.riskLevel ?? "—" },
    { label: "Conversations",      value: safe(a.nConversations) || "—" },
    { label: "Intents Detected",   value: safe(a.nIntents) || "—" },
    { label: "Critical Alerts",    value: safe(a.criticalAlertsCount) },
  ]);

  ctx.y += 6;
  sectionHeader(ctx, "Behavior Signals");
  metricGrid(ctx, [
    { label: "Token Waste",         value: fmt(a.tokenWasteEstimate, "%") },
    { label: "Cross-Intent Sim.",   value: fmt(a.crossIntentSimilarity, "%") },
    { label: "Response Variance",   value: fmt(a.responseVariance, "%") },
    { label: "Response Stability",  value: fmt(a.responseStabilityScore, "%") },
    { label: "Intent Coverage",     value: fmt(a.intentCoverageScore, "%") },
    { label: "Covered Intents",     value: safe(a.coveredIntents) || "—" },
    { label: "Semantic Drift",      value: fmt(a.semanticDrift, "%") },
    { label: "Min Samples/Intent",  value: safe(a.minSamplesPerIntent) || "—" },
  ]);

  if (a.underrepresentedIntents && a.underrepresentedIntents.length > 0) {
    ctx.y += 4;
    miniLabel(ctx, "UNDERREPRESENTED INTENTS");
    paragraph(ctx, a.underrepresentedIntents.slice(0, 12).join("  ·  "), 9);
  }

  // ════════════════════════════════════════════
  // PAGE 3 — Alerts & Issues
  // ════════════════════════════════════════════
  doc.addPage();
  ctx.page++;
  ctx.y = MT;
  bodyFooter(ctx);

  sectionHeader(ctx, "Detected Alerts");
  if (!a.alerts || a.alerts.length === 0) {
    paragraph(ctx, "No alerts detected in this analysis run.", 10);
  } else {
    a.alerts.slice(0, 40).forEach((al, i) =>
      alertRow(ctx, i, al.title, al.severity, al.recommendation || al.problem)
    );
  }

  ctx.y += 8;
  sectionHeader(ctx, "Detected Issues");
  const issues = a.issues ?? [];
  if (issues.length === 0) {
    paragraph(ctx, "No issues detected in this analysis run.", 10);
  } else {
    issues.slice(0, 30).forEach((iss, i) => {
      const title = iss.title || iss.issueType || iss.category || `Issue ${i + 1}`;
      const sev   = iss.severity || "info";
      // Build a rich detail line: summary + action
      const action = (iss.recommendedActions && iss.recommendedActions.length > 0)
        ? `Action: ${iss.recommendedActions[0]}`
        : iss.recommendation ? `Action: ${iss.recommendation}` : undefined;
      const detail = [iss.summary, action].filter(Boolean).join("  ·  ");
      alertRow(ctx, i, title, sev, detail || undefined);
    });
  }

  // ════════════════════════════════════════════
  // PAGE 4 — Economics
  // ════════════════════════════════════════════
  if (economics) {
    doc.addPage();
    ctx.page++;
    ctx.y = MT;
    bodyFooter(ctx);

    sectionHeader(ctx, "Economics Overview");
    metricGrid(ctx, economics.hero.map(m => ({ label: m.label, value: m.displayValue })));

    ctx.y += 6;
    sectionHeader(ctx, "Economics Breakdown");
    metricGrid(ctx, economics.details.map(m => ({ label: m.label, value: m.displayValue })));
  }

  // ════════════════════════════════════════════
  // PAGE 5 — ARGOS Scores + Recommendations
  // ════════════════════════════════════════════
  const scoreEntries = Object.entries(a.scores ?? {})
    .filter(([, v]) => v !== null && v !== undefined) as [string, number][];

  if (scoreEntries.length > 0 || (a.recommendations?.length ?? 0) > 0) {
    doc.addPage();
    ctx.page++;
    ctx.y = MT;
    bodyFooter(ctx);

    if (scoreEntries.length > 0) {
      sectionHeader(ctx, "ARGOS Diagnostic Scores");
      metricGrid(ctx, scoreEntries.map(([k, v]) => ({
        label: k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        value: fmt(v),
      })));
    }

    if (a.recommendations && a.recommendations.length > 0) {
      ctx.y += 8;
      sectionHeader(ctx, "Recommendations");
      a.recommendations.slice(0, 10).forEach((rec, i) => {
        const title  = rec.title || rec.action || `Recommendation ${i + 1}`;
        const detail = [rec.reason, rec.expectedImpact].filter(Boolean).join(" · ");
        alertRow(ctx, i, title, "info", detail || undefined);
      });
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const id = a.analysisId || a.analysisRunId;
  const filename = id
    ? `sentinela-report-${id.slice(0, 8)}.pdf`
    : `sentinela-report-${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(filename);
}
