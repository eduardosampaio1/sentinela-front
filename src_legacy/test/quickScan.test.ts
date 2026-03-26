import { afterEach, describe, expect, it, vi } from "vitest";
import { runQuickScan } from "@/lib/quickScan";

describe("quick scan contract adapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps full backend quick-scan payload fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        mode: "quick_scan",
        detected_intents: ["billing", "support"],
        language_variance: 18.5,
        response_variation: 74.2,
        confidence_level: "Medium",
        confidence_meter: {
          score: 63.2,
          level: "medium",
          factors: {
            sample_component: 0.6,
            parse_component: 0.5,
            structure_component: 0.4,
            intent_component: 0.25,
            variation_component: 0.742,
          },
        },
        sample_size: 18,
        notes: [
          "This is a surface scan based on a small sample.",
          "Quick Scan does not replace a full ARGOS analysis run.",
        ],
        metadata: {
          total_items: 12,
          parsed_json_items: 9,
          structured_items: 7,
        },
      }),
    } as Response);

    const result = await runQuickScan("intent:billing user asks about invoice");

    expect(result.source).toBe("api");
    expect(result.detectedIntents).toEqual(["billing", "support"]);
    expect(result.languageVariance).toBe(18.5);
    expect(result.responseVariation).toBe(74.2);
    expect(result.confidenceLevel).toBe("Medium");
    expect(result.confidenceMeter.score).toBe(63.2);
    expect(result.confidenceMeter.level).toBe("medium");
    expect(result.confidenceMeter.factors.sampleComponent).toBe(0.6);
    expect(result.sampleSize).toBe(18);
    expect(result.metadata.totalItems).toBe(12);
    expect(result.metadata.parsedJsonItems).toBe(9);
    expect(result.metadata.structuredItems).toBe(7);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("falls back to local quick scan when endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const result = await runQuickScan(
      "intent:billing\nintent:support\nNeed help with delivery and refund",
    );

    expect(result.source).toBe("mock");
    expect(result.detectedIntents.length).toBeGreaterThanOrEqual(1);
    expect(result.confidenceMeter.score).toBeGreaterThanOrEqual(0);
    expect(result.metadata.totalItems).toBeGreaterThanOrEqual(1);
    expect(result.notes[0]).toContain("surface scan");
  });
});

