import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Research, { talentGate } from "./ResearchPanel";
import { fresh, available, afford, research, stats, talentRank, talentCost, sharedUnlocked, restore } from "./game";
import { NODE_MAP } from "./research";

const render = (game = fresh()) => renderToStaticMarkup(createElement(Research, { game, setGame: () => {}, onRun: () => {}, onFunding: () => {} }));

describe("talent points and early paths", () => {
  it("spends talent points instead of RP and lets independent starting paths stay available", () => {
    const s = fresh();
    s.science = 1e7;
    expect(afford(s, "runner-0-0")).toBe(false);
    expect(research(s, "runner-0-0")).toBe(s);
    s.talentPoints = 3;
    for (const id of ["runner-0-0", "runner-1-0", "runner-2-0"]) expect(available(s, id)).toBe(true);
    const result = research(s, "runner-2-0");
    expect(result.talentPoints).toBe(2);
    expect(result.science).toBe(s.science);
    expect(stats(result).speed).toBeCloseTo(1.08);
    expect(stats(result).economy).toBe(1);
    expect(available(result, "runner-0-0")).toBe(true);
    expect(available(result, "runner-2-1")).toBe(true);
  });

  it("offers twelve meaningful ranks with a fixed TP price and a hard maximum", () => {
    let s = fresh();
    s.talentPoints = 12;
    for (let rank = 1; rank <= 12; rank++) {
      expect(talentCost(s, "runner-0-0")).toBe(1);
      s = research(s, "runner-0-0");
      expect(talentRank(s, "runner-0-0")).toBe(rank);
      expect(stats(s).stamina).toBeCloseTo(1 + rank * .15);
    }
    expect(s.talentPoints).toBe(0);
    expect(s.researched).toEqual(["runner-0-0"]);
    expect(available(s, "runner-0-0")).toBe(false);
    expect(research(s, "runner-0-0")).toBe(s);
    expect(talentRank(restore(JSON.stringify(s)), "runner-0-0")).toBe(12);
  });

  it("keeps late disciplines and laboratory systems gated even with cheat money", () => {
    const s = fresh();
    s.science = 1e7;
    s.talentPoints = 1e5;
    expect(available(s, "runner-3-0")).toBe(false);
    expect(available(s, "runner-4-0")).toBe(false);
    expect(available(s, "runner-0-2")).toBe(false);
    expect(sharedUnlocked(s)).toBe(false);
    expect(available(s, "global-0-0")).toBe(false);
    expect(talentGate(s, NODE_MAP.get("runner-4-0")!)).toBe("Develop Biomechanics");
  });

  it("names the exact next requirement, cost shortfall and closed specialization", () => {
    let s = fresh();
    expect(talentGate(s, NODE_MAP.get("runner-0-1")!)).toContain("Learn Warm-up ritual first");
    expect(talentGate(s, NODE_MAP.get("runner-0-0")!)).toBe("Need 1 more TP");
    s.development = { athletics: 1, biomechanics: 1 };
    s.researched = ["runner-0-0", "runner-0-1", "runner-0-2", "runner-0-3"];
    s.talentPoints = 20;
    s = research(s, "runner-0-4");
    expect(available(s, "runner-0-5")).toBe(false);
    expect(talentGate(s, NODE_MAP.get("runner-0-5")!)).toBe("Closed by Marathon conditioning");
  });

  it("shows a clear TP budget and the three first paths without exposing concrete late technologies", () => {
    const s = fresh(); s.talentPoints = 4;
    const html = render(s);
    expect(html).toContain('aria-label="Talent tree"');
    expect(html).toContain("Talents");
    expect(html).toContain("Warm-up ritual");
    expect(html).toContain("Cadence metronome");
    expect(html).toContain("Proper running shoes");
    expect(html).toContain("3 talents available");
    expect(html).toContain("Learn · 1 TP");
    expect(html).toContain("Each rank adds");
    expect(html).toContain("Buy talent points");
    expect(html).not.toContain("Bionic legs");
    expect(html).not.toContain("Particle accelerator");
    expect(html).not.toContain("Shared laboratory");
    expect(html).not.toContain("atlas-canvas");
  });
});
