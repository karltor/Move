import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  fresh,
  research,
  stats,
  start,
  step,
  available,
  sharedUnlocked,
} from "./game";
import {
  NODES,
  NODE_MAP,
  beginnerResearch,
  firstDiscoveries,
} from "./research";
import { FirstExperiments } from "./ResearchPanel";

describe("first research decisions", () => {
  it("starts with exactly two understandable, single-effect choices and no lab budget", () => {
    const s = fresh(),
      choices = firstDiscoveries(s.researched);
    expect(s.science).toBe(0);
    expect(choices.map((n) => n.id)).toEqual(["runner-0-0", "runner-2-0"]);
    expect(choices.map((n) => n.effects)).toEqual([
      { stamina: 0.25 },
      { speed: 0.15 },
    ]);
    expect(choices.every((n) => n.cost === 15 && n.localCost === 0)).toBe(true);
    expect(available(s, "runner-1-0")).toBe(false);
    expect(available(s, "runner-3-0")).toBe(false);
  });

  it("lets the first completed run buy one improvement, with a noticeable permanent result", () => {
    let s = start(fresh());
    for (let i = 0; s.trial && i < 3000; i++) s = step(s, 0.5);
    expect(s.trial).toBeNull();
    expect(s.history[0].duration).toBeGreaterThanOrEqual(45);
    expect(s.history[0].duration).toBeLessThanOrEqual(85);
    expect(s.science).toBeGreaterThanOrEqual(15);
    expect(s.science).toBeLessThan(30);
    const warmedUp = research(s, "runner-0-0"),
      shod = research(s, "runner-2-0");
    expect(stats(warmedUp).stamina - stats(s).stamina).toBeCloseTo(0.25);
    expect(stats(shod).speed - stats(s).speed).toBeCloseTo(0.15);
    expect(research(warmedUp, "runner-2-0")).toBe(warmedUp);
    expect(research(shod, "runner-0-0")).toBe(shod);
  });

  it("opens a small frontier with genuine alternative branches before showing the full atlas", () => {
    const owned = ["runner-0-0"];
    expect(firstDiscoveries(owned).map((n) => n.id)).toEqual([
      "runner-2-0",
      "runner-0-1",
      "runner-0-2",
    ]);
    expect(beginnerResearch("runner", owned)).toBe(true);
    const both = [...owned, "runner-2-0"];
    expect(firstDiscoveries(both).map((n) => n.id)).toEqual([
      "runner-0-1",
      "runner-1-0",
      "runner-2-1",
    ]);
    expect(
      beginnerResearch("runner", [...both, "runner-0-1", "runner-0-2"]),
    ).toBe(false);
    expect(beginnerResearch("projectile", [])).toBe(false);
    const s = { ...fresh(), researched: owned };
    expect(available(s, "runner-0-1")).toBe(true);
    expect(available(s, "runner-0-2")).toBe(true);
    expect(available(s, "runner-0-3")).toBe(false);
  });

  it("keeps shared research gated even if a new player has enough money", () => {
    const s = fresh();
    s.science = 10000;
    expect(sharedUnlocked(s)).toBe(false);
    expect(available(s, "global-3-0")).toBe(false);
    expect(research(s, "global-3-0")).toBe(s);
    s.progress.runner.trials = 10;
    s.progress.runner.bestDistance = 1000;
    s.researched = NODES.filter((n) => n.program === "runner")
      .slice(0, 8)
      .map((n) => n.id);
    expect(sharedUnlocked(s)).toBe(true);
    expect(available(s, "global-3-0")).toBe(true);
    expect(NODE_MAP.get("global-3-0")!.effects).toEqual({ yield: 0.15 });
  });

  it("explains price, permanence, and the choice without showing late systems", () => {
    const s = fresh();
    s.science = 19;
    const markup = renderToStaticMarkup(
      createElement(FirstExperiments, {
        game: s,
        setGame: () => {},
        onRun: () => {},
      }),
    );
    expect(markup).toContain("Warm-up ritual");
    expect(markup).toContain("Proper running shoes");
    expect(markup).toContain("Neither choice closes the other path.");
    expect(markup).toContain("One purchase · permanent");
    expect(markup).toContain("19 research points available");
    expect(markup).not.toContain("Shared laboratory");
    expect(markup).not.toContain("Endurance is training data");
    expect(markup).not.toContain("Pocket tailwind");
  });

  it("tells a first-time researcher to test the first finding on another run", () => {
    const s = fresh();
    s.progress.runner.trials = 1;
    s.researched = ["runner-0-0"];
    s.science = 100;
    const markup = renderToStaticMarkup(
      createElement(FirstExperiments, {
        game: s,
        setGame: () => {},
        onRun: () => {},
      }),
    );
    expect(markup).toContain("Run again to test this finding.");
    expect(markup).toContain("Run again to test it");
    expect(markup).toContain("One discovery at a time.");
    expect(markup).not.toContain("Shared laboratory");
  });

  it("explains the shortfall after an early finish instead of promising a purchase", () => {
    const s = fresh();
    s.progress.runner.trials = 1;
    s.science = 13;
    const markup = renderToStaticMarkup(
      createElement(FirstExperiments, {
        game: s,
        setGame: () => {},
        onRun: () => {},
      }),
    );
    expect(markup).toContain("Run again to collect enough research.");
    expect(markup).toContain("You need 2 more; your research carries over.");
    expect(markup).toContain("Run for more data");
    expect(markup).not.toContain(
      "Choose one improvement. Run again and feel the difference.",
    );
  });
});
