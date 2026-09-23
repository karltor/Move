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
  it("runs for minutes rather than seconds, and stamina ends the run", () => {
    let s = advance(start({ ...fresh(), auto: false }), 120);
    expect(s.trial).not.toBeNull();
    expect(s.trial!.distance).toBeGreaterThan(300);
    expect(s.trial!.energy).toBeLessThan(70);
    s = completed(s);
    expect(s.trial).toBeNull();
    expect(s.history[0].duration).toBeGreaterThan(240);
    expect(totalTrials(s)).toBe(1);
    expect(s.history[0].distance).toBeGreaterThan(700);
  });
  it("crosses exact biome thresholds at 100 m, 1 km, 10 km and 100 km", () => {
    expect(biomeAt(99).short).toBe("City");
    expect(biomeAt(100).short).toBe("Forest");
    expect(biomeAt(1000).short).toBe("Country");
    expect(biomeAt(10000).short).toBe("Desert");
    expect(biomeAt(100000).short).toBe("Alpine");
  });
  it("rewards milestones and experience during a run", () => {
    const s = advance(start(fresh()), 50);
    expect(s.science).toBeGreaterThan(35);
    expect(s.progress.runner.funds).toBeGreaterThan(15);
    expect(s.progress.runner.xp).toBeGreaterThan(0);
    expect(s.progress.projectile.xp).toBe(0);
  });
  it("pushing trades endurance for speed; recovery restores energy but cannot prevent fatigue", () => {
    const base = start(fresh());
    base.trial!.energy = 50;
    const rec = advance({ ...base, pace: "recover" }, 60),
      push = advance({ ...base, pace: "push" }, 60);
    expect(rec.trial!.energy).toBeGreaterThan(50);
    expect(rec.trial!.fatigue).toBeGreaterThan(0);
    expect(push.trial!.speed).toBeGreaterThan(rec.trial!.speed);
    expect(push.trial!.energy).toBeLessThan(10);
  });
  it("stamina research increases maximum capacity and expedition reach", () => {
    const s = research(fresh(), "runner-0-0");
    expect(stats(s).stamina).toBeCloseTo(1.16);
    expect(start(s).trial!.energy).toBeCloseTo(116);
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
    s = advance(s, 46);
    s = supply(s);
    expect(s.trial!.rations).toBe(1);
  });
  it("route decisions change the run without reflex clicking", () => {
    const base = fresh();
    base.progress.runner.trials = 1;
    let s = advance(start(base), 66);
    expect(s.trial!.event).toBe(0);
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
    let s = advance(start({ ...fresh(), auto: true }), 80);
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
    s.researched.push("runner-1-2");
    expect(available(s, "runner-0-3")).toBe(true);
    s.researched = ["runner-3-1"];
    expect(available(s, "runner-0-2")).toBe(true);
  });
  it("all nodes are reachable without cycles or missing references", () => {
    let s = fresh();
    s.science = 1e9;
    s.unlocked = ["runner", "projectile", "wheels"];
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
    const s = research(fresh(), "runner-0-0");
    expect(s.science).toBe(23);
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
    expect(restore("{broken").science).toBe(35);
    expect(restore(JSON.stringify({ version: 1, science: 999 })).science).toBe(
      35,
    );
  });
  it("resumes a live expedition with finite validated values", () => {
    const s = advance(start(fresh()), 120);
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
