import { describe, it, expect } from "vitest";
import {
  fresh,
  start,
  step,
  finish,
  pendingRewards,
  biomeBlend,
  BIOMES,
  stats,
  hasAbility,
  programDiscovered,
  selectProgram,
  restore,
} from "./game";
import { nextStory } from "./Story";
import { NODES, STAT_LABELS } from "./research";
import { nodePosition } from "./ResearchPanel";

describe("field report and new discoveries", () => {
  it("banks exactly the displayed extra rewards, without adding paid milestones twice", () => {
    let s = start(fresh());
    for (let i = 0; i < 230; i++) s = step(s, 0.5);
    const reward = pendingRewards(s),
      done = finish(s);
    expect(done.science - s.science).toBe(reward.science);
    expect(done.progress.runner.funds - s.progress.runner.funds).toBe(
      reward.funds,
    );
    expect(done.progress.runner.xp - s.progress.runner.xp).toBe(reward.xp);
    expect(done.history[0].science).toBe(reward.science);
    expect(pendingRewards(done).science).toBe(0);
    expect(finish(done)).toBe(done);
  });
  it("makes shoes improve both speed and energy economy", () => {
    const ordinary = step(start(fresh()), 0.5),
      shoes = step(start({ ...fresh(), researched: ["runner-2-0"] }), 0.5);
    expect(shoes.trial!.speed).toBeGreaterThan(ordinary.trial!.speed);
    expect(shoes.trial!.energy).toBeGreaterThan(ordinary.trial!.energy);
  });
  it("makes wind, recovery, acceleration and fatigue resistance affect the simulation", () => {
    const base = start(fresh());
    base.trial!.energy = 50;
    const normal = step(base, 0.5),
      wind = step({ ...base, researched: ["runner-3-0"] }, 0.5),
      accel = step({ ...base, researched: ["runner-1-0"] }, 0.5),
      resist = step({ ...base, researched: ["runner-2-2"] }, 0.5);
    expect(wind.trial!.speed).toBeGreaterThan(normal.trial!.speed);
    expect(accel.trial!.speed).toBeGreaterThan(normal.trial!.speed);
    expect(resist.trial!.fatigue).toBeLessThan(normal.trial!.fatigue);
    expect(
      step({ ...base, pace: "recover", researched: ["runner-2-2"] }, 0.5).trial!
        .energy,
    ).toBeGreaterThan(step({ ...base, pace: "recover" }, 0.5).trial!.energy);
  });
  it("triggers second wind once per run and preserves its used state on reload", () => {
    let s = start({ ...fresh(), researched: ["runner-0-3"] });
    s.trial!.energy = 20;
    s = step(s, 0.5);
    expect(s.trial!.usedSecondWind).toBe(true);
    expect(s.trial!.energy).toBeGreaterThan(20);
    for (let i = 0; i < 30; i++) s = step(s, 0.5);
    expect(s.trial!.secondWind).toBe(0);
    s.trial!.energy = 10;
    s = step(restore(JSON.stringify(s)), 0.5);
    expect(s.trial!.secondWind).toBe(0);
    expect(s.trial!.usedSecondWind).toBe(true);
  });
  it("keeps program-specific abilities and effects in their program", () => {
    const s = {
      ...fresh(),
      program: "projectile" as const,
      unlocked: ["runner", "projectile"] as const,
      researched: ["runner-1-3"],
    };
    expect(
      hasAbility({ ...s, unlocked: [...s.unlocked] }, "rolling-start"),
    ).toBe(false);
    expect(stats({ ...s, unlocked: [...s.unlocked] }).acceleration).toBe(1);
  });
  it("gates later programs by experience, distance, discoveries and currency", () => {
    const s = fresh();
    s.science = 1e5;
    expect(programDiscovered(s, "projectile")).toBe(false);
    s.progress.runner.trials = 3;
    s.progress.runner.bestDistance = 1000;
    s.progress.runner.distance = 1499;
    s.researched = ["runner-0-0", "runner-0-1", "runner-0-2", "runner-2-0"];
    expect(programDiscovered(s, "projectile")).toBe(false);
    s.progress.runner.distance = 1500;
    expect(programDiscovered(s, "projectile")).toBe(true);
    expect(selectProgram({ ...s, science: 219 }, "projectile").program).toBe(
      "runner",
    );
    const next = selectProgram(s, "projectile");
    expect(next.program).toBe("projectile");
    expect(next.science).toBe(s.science - 220);
    expect(programDiscovered(next, "wheels")).toBe(false);
    next.progress.runner.distance = 6000;
    next.progress.runner.trials = 6;
    expect(programDiscovered(next, "wheels")).toBe(true);
  });
});
describe("continuous biomes and readable research map", () => {
  it("blends continuously across every boundary, with a midpoint rather than an abrupt switch", () => {
    for (let i = 1; i < BIOMES.length; i++) {
      const d = BIOMES[i].start;
      expect(biomeBlend(d)).toEqual({ from: i - 1, to: i, mix: 0.5 });
      expect(
        Math.abs(biomeBlend(d - 0.01).mix - biomeBlend(d + 0.01).mix),
      ).toBeLessThan(0.001);
    }
    expect(biomeBlend(0)).toEqual({ from: 0, to: 0, mix: 0 });
    expect(biomeBlend(500)).toEqual({ from: 1, to: 1, mix: 0 });
  });
  it("keeps every node circle separated with room for labels", () => {
    for (const program of ["runner", "projectile", "wheels", "global"]) {
      const nodes = NODES.filter((n) => n.program === program);
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodePosition(nodes[i]),
            b = nodePosition(nodes[j]);
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(100);
        }
    }
  });
  it("offers ten functional stats and individually named discoveries", () => {
    expect(Object.keys(STAT_LABELS)).toHaveLength(10);
    expect(new Set(NODES.map((n) => n.name)).size).toBe(NODES.length);
    const used = new Set(NODES.flatMap((n) => Object.keys(n.effects)));
    expect(used.size).toBe(10);
    expect(
      NODES.filter((n) => Object.keys(n.effects).length > 1).length,
    ).toBeGreaterThan(70);
  });
});
describe("progressive story", () => {
  it("introduces the premise first and waits for features to be encountered", () => {
    const s = fresh();
    expect(nextStory(s, "field")).toBe("intro");
    s.storySeen = ["intro"];
    expect(nextStory(s, "field")).toBeNull();
    s.progress.runner.trials = 1;
    expect(nextStory(s, "research")).toBe("research");
    s.storySeen.push("research");
    s.progress.runner.bestDistance = 100;
    expect(nextStory(s, "field")).toBe("forest");
  });
  it("remembers seen tips and allows players to skip all of them", () => {
    const s = fresh();
    s.storySeen = ["intro", "research", "forest"];
    s.progress.runner.trials = 1;
    s.progress.runner.bestDistance = 100;
    expect(nextStory(restore(JSON.stringify(s)), "research")).toBeNull();
    expect(
      nextStory({ ...s, storySeen: [], tipsEnabled: false }, "field"),
    ).toBeNull();
  });
});
