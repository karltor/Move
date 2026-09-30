import { describe, it, expect } from "vitest";
import {
  fresh,
  start,
  step,
  finish,
  supply,
  decide,
  research,
  equipGear,
  selectProgram,
  stats,
  restore,
  level,
  available,
  afford,
  totalTrials,
  biomeAt,
  frontierPressure,
  routeChallenge,
  equipmentUnlocked,
  sharedUnlocked,
  trainingProgress,
} from "./game";
import { NODES, VARIANTS, NODE_MAP } from "./research";
import type { Save } from "./game";
function advance(s: Save, seconds: number) {
  for (let i = 0; i < seconds * 2; i++) s = step(s, 0.5);
  return s;
}
function completed(s = fresh()) {
  s = start({ ...s, auto: false });
  for (let i = 0; i < 10000 && s.trial; i++) s = step(s, 0.5);
  return s;
}
describe("distance-based expeditions", () => {
  it("ramps stamina pressure towards each frontier and releases it after crossing", () => {
    for (const boundary of [100, 1000, 10000]) {
      const region = biomeAt(boundary - 1);
      expect(frontierPressure(boundary - 1)).toBeGreaterThan(
        frontierPressure(region.start) * 5,
      );
      expect(frontierPressure(boundary + 0.1)).toBeLessThan(
        frontierPressure(boundary - 0.1),
      );
    }
  });
  it("keeps acceleration useful after recurring slow sections", () => {
    const slow = start(fresh());
    slow.trial!.distance = 71;
    slow.trial!.speed = 0.8;
    const fast = { ...slow, researched: ["runner-1-0"] };
    expect(routeChallenge(slow).difficulty).toBe("effort");
    const a = advance(slow, 8),
      b = advance(fast, 8);
    expect(b.trial!.distance).toBeGreaterThan(a.trial!.distance + 0.4);
    expect(b.trial!.speed).toBeGreaterThan(a.trial!.speed);
    const early = advance(start(fresh()), 4);
    expect(early.trial!.speed).toBeLessThan(1);
  });
  it("credits visible XP during the run exactly once and keeps late systems gated", () => {
    const live = advance(start(fresh()), 30),
      bar = trainingProgress(live);
    expect(bar.current).toBeGreaterThan(0);
    expect(bar.progress).toBeGreaterThan(0);
    const done = finish(live);
    expect(done.progress.runner.xp).toBe(live.progress.runner.xp);
    expect(done.history[0].xp).toBe(bar.earned);
    expect(equipmentUnlocked(done)).toBe(false);
    expect(sharedUnlocked({ ...done, science: 1e6 })).toBe(false);
    expect(available({ ...done, science: 1e6 }, "global-0-0")).toBe(false);
  });
  it("teaches the first frontier in about a minute and funds exactly one opening discovery", () => {
    const s = completed();
    expect(s.trial).toBeNull();
    expect(s.history[0].duration).toBeGreaterThan(50);
    expect(s.history[0].duration).toBeLessThan(90);
    expect(totalTrials(s)).toBe(1);
    expect(s.history[0].distance).toBeGreaterThan(65);
    expect(s.history[0].distance).toBeLessThan(100);
    expect(s.science).toBeGreaterThanOrEqual(15);
    expect(s.science).toBeLessThan(30);
    const purchased = research(s, "runner-0-0");
    expect(NODES.filter((n) => afford(purchased, n.id))).toHaveLength(0);
    expect(s.inventory).toHaveLength(0);
  });
  it("allows one first debrief experiment even if careful pacing banks extra research", () => {
    let s = start(fresh(), 123);
    for (let i = 0; i < 10000 && s.trial; i++) {
      s = step({ ...s, pace: s.trial.energy < 35 ? "recover" : "steady" }, 0.5);
    }
    expect(s.history[0].distance).toBeGreaterThan(200);
    expect(s.science).toBeGreaterThanOrEqual(30);
    s = research(s, "runner-0-0");
    expect(s.science).toBeGreaterThanOrEqual(15);
    expect(afford(s, "runner-2-0")).toBe(false);
    expect(research(s, "runner-2-0")).toBe(s);
    s = completed(s);
    expect(available(s, "runner-2-0")).toBe(true);
  });
  it("rewards completed observation rather than repeated tiny aborts", () => {
    const complete = completed();
    const rpRate = complete.science / complete.history[0].duration;
    const xpRate = complete.progress.runner.xp / complete.history[0].duration;
    for (const seconds of [3, 10, 30, 45, 55]) {
      const partial = finish(advance(start(fresh()), seconds));
      expect(partial.science / seconds).toBeLessThan(rpRate);
      expect(partial.progress.runner.xp / seconds).toBeLessThan(xpRate);
    }
    const tiny = finish(advance(start(fresh()), 3));
    expect(tiny.science).toBe(0);
    expect(tiny.progress.runner.xp).toBe(0);
  });
  it("crosses exact biome thresholds at 100 m, 1 km, 10 km and 100 km", () => {
    expect(biomeAt(99).short).toBe("City");
    expect(biomeAt(100).short).toBe("Forest");
    expect(biomeAt(1000).short).toBe("Country");
    expect(biomeAt(10000).short).toBe("Desert");
    expect(biomeAt(100000).short).toBe("Alpine");
  });
  it("rewards milestones and experience during a run", () => {
    const s = advance(start(fresh()), 30);
    expect(s.science).toBe(0);
    expect(s.progress.runner.xp).toBeGreaterThan(0);
    expect(s.progress.projectile.xp).toBe(0);
  });
  it("pushing trades endurance for speed; recovery restores energy but cannot prevent fatigue", () => {
    const base = start(fresh());
    base.trial!.energy = 50;
    const rec = advance({ ...base, pace: "recover" }, 10),
      push = advance({ ...base, pace: "push" }, 10);
    expect(rec.trial!.energy).toBeGreaterThan(50);
    expect(rec.trial!.fatigue).toBeGreaterThan(0);
    expect(push.trial!.speed).toBeGreaterThan(rec.trial!.speed);
    expect(push.trial!.energy).toBeLessThan(35);
    const steadyRun = completed(fresh()),
      pushRun = completed({ ...fresh(), pace: "push" });
    expect(pushRun.history[0].distance).toBeLessThan(
      steadyRun.history[0].distance * 0.8,
    );
    expect(pushRun.history[0].speed).toBeGreaterThan(
      steadyRun.history[0].speed,
    );
  });
  it("stamina research increases maximum capacity and expedition reach", () => {
    const s = research({ ...fresh(), science: 15 }, "runner-0-0");
    expect(stats(s).stamina).toBeCloseTo(1.25);
    expect(start(s).trial!.energy).toBeCloseTo(125);
    const a = completed(fresh()),
      b = completed(s);
    expect(b.history[0].distance).toBeGreaterThan(a.history[0].distance);
  });
  it("supplies are limited and respect their cooldown", () => {
    let s = start({ ...fresh(), researched: ["global-1-1"] });
    s.trial!.energy = 30;
    s = supply(s);
    expect(s.trial!.rations).toBe(2);
    expect(s.trial!.energy).toBe(57);
    expect(supply(s)).toBe(s);
    s.trial!.supplyCooldown = 0;
    s = supply(s);
    expect(s.trial!.rations).toBe(1);
  });
  it("route decisions change the run without reflex clicking", () => {
    const base = fresh();
    base.progress.runner.trials = 3;
    const s = advance(start(base), 30);
    expect(s.trial!.event).not.toBeNull();
    s.trial!.event = 0;
    const shade = decide(s, "a"),
      fast = decide(s, "b");
    expect(shade.trial!.route).toBe("shade");
    expect(fast.trial!.route).toBe("fast");
    const a = advance(shade, 20),
      b = advance(fast, 20);
    expect(a.trial!.energy).toBeGreaterThan(b.trial!.energy);
    expect(a.trial!.distance).toBeLessThan(b.trial!.distance);
  });
  it("finishing banks results once, and auto-repeat starts only after rest", () => {
    let s = advance(start({ ...fresh(), auto: true }), 20);
    s = finish(s);
    const money = s.science;
    expect(finish(s).science).toBe(money);
    expect(s.trial).toBeNull();
    s = advance(s, 8);
    expect(s.trial).not.toBeNull();
    expect(totalTrials(s)).toBe(1);
  });
  it("keeps program progression independent and blocks swaps during expeditions", () => {
    let s = start(fresh());
    s.science = 1000;
    expect(selectProgram(s, "projectile")).toBe(s);
    s = completed(s);
    s.progress.runner.trials = 3;
    s.progress.runner.bestDistance = 1100;
    s.progress.runner.distance = 1600;
    s.researched = ["runner-0-0", "runner-0-1", "runner-0-2", "runner-2-0"];
    const xp = s.progress.runner.xp;
    s = selectProgram(s, "projectile");
    expect(s.program).toBe("projectile");
    s = advance(start(s), 50);
    expect(s.progress.projectile.xp).toBeGreaterThan(0);
    expect(s.progress.runner.xp).toBe(xp);
  });
});
describe("nonlinear research web", () => {
  it("contains 108 unique discoveries and real branching, OR gates and hybrid AND gates", () => {
    expect(NODES).toHaveLength(108);
    expect(new Set(NODES.map((n) => n.id)).size).toBe(108);
    expect(NODES.filter((n) => n.anyOf?.length).length).toBeGreaterThan(15);
    expect(NODES.filter((n) => n.requires.length > 1).length).toBeGreaterThan(
      20,
    );
  });
  it("requires both parents for hybrids but either parent for alternate routes", () => {
    let s = fresh();
    s.science = 1e8;
    s.progress.runner.funds = 1e8;
    s.researched = ["runner-0-2"];
    expect(available(s, "runner-0-3")).toBe(false);
    s.researched.push("runner-0-1");
    expect(available(s, "runner-0-3")).toBe(true);
    s.researched = ["runner-0-4"];
    expect(available(s, "runner-0-6")).toBe(true);
    s.researched = ["runner-0-3"];
    expect(available(s, "runner-0-6")).toBe(true);
  });
  it("all nodes are reachable without cycles or missing references", () => {
    let s = fresh();
    s.science = 1e9;
    s.unlocked = ["runner", "projectile", "wheels"];
    s.progress.runner.trials = 10;
    s.progress.runner.bestDistance = 1000;
    Object.values(s.progress).forEach((p) => (p.funds = 1e9));
    for (let pass = 0; pass < 20; pass++)
      for (const n of NODES) s = research(s, n.id);
    expect(s.researched).toHaveLength(108);
    for (const n of NODES)
      for (const id of [...n.requires, ...(n.anyOf ?? [])])
        expect(NODE_MAP.has(id)).toBe(true);
    for (const list of Object.values(VARIANTS))
      for (const v of list) if (v.node) expect(NODE_MAP.has(v.node)).toBe(true);
  });
  it("cannot double-purchase or spend another program currency", () => {
    const s = research({ ...fresh(), science: 15 }, "runner-0-0");
    expect(s.science).toBe(0);
    expect(research(s, "runner-0-0")).toBe(s);
    expect(afford({ ...s, science: 1e8 }, "runner-0-1")).toBe(false);
  });
  it("equipment has one piece per slot and cannot be swapped during a run", () => {
    let s = fresh();
    s.inventory = [
      {
        id: "a",
        program: "runner",
        name: "Shoes",
        slot: "footwear",
        rarity: "Common",
        foundAt: 100,
        affixes: [{ stat: "speed", value: 0.05 }],
      },
      {
        id: "b",
        program: "runner",
        name: "Better shoes",
        slot: "footwear",
        rarity: "Rare",
        foundAt: 1000,
        affixes: [{ stat: "speed", value: 0.12 }],
      },
    ];
    s = equipGear(s, "a");
    expect(stats(s).speed).toBeCloseTo(1.05);
    s = equipGear(s, "b");
    expect(s.equipped).toEqual(["b"]);
    expect(stats(s).speed).toBeCloseTo(1.12);
    const live = start(s);
    expect(equipGear(live, "a")).toBe(live);
  });
  it("levels improve stamina without needing the tree", () => {
    const s = fresh();
    s.progress.runner.xp = 140;
    expect(level(140)).toBe(3);
    expect(stats(s).stamina).toBeCloseTo(1.16);
  });
});
describe("fresh saves and reset", () => {
  it("loads invalid or old-format data into a fresh lab", () => {
    expect(restore("{broken").science).toBe(0);
    expect(restore(JSON.stringify({ version: 1, science: 999 })).science).toBe(
      0,
    );
  });
  it("resumes a live expedition with finite validated values", () => {
    const s = advance(start(fresh()), 20);
    const loaded = restore(JSON.stringify(s));
    expect(loaded.trial!.distance).toBe(s.trial!.distance);
    expect(loaded.trial!.energy).toBe(s.trial!.energy);
    expect(loaded.trial!.speed).toBe(0);
  });
  it("caps offline research without inventing distance", () => {
    const s = { ...completed(), auto: true };
    s.lastActive = 1000;
    const a = restore(JSON.stringify(s), 1000 + 12 * 3600000);
    const b = restore(JSON.stringify(s), 1000 + 2 * 3600000);
    expect(a.science).toBe(b.science);
    expect(a.progress.runner.distance).toBe(s.progress.runner.distance);
  });
  it("fresh state fully clears research, inventory, history and expedition", () => {
    const s = fresh();
    expect(s.researched).toEqual([]);
    expect(s.modules).toEqual([]);
    expect(s.history).toEqual([]);
    expect(s.trial).toBeNull();
    expect(s.progress.runner.distance).toBe(0);
    expect(s.unlocked).toEqual(["runner"]);
  });
});
