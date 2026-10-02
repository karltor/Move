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
  levelStart,
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
import { NODES } from "./research";
import { exchange } from "./economy";
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
    const fast = { ...slow, researched: ["runner-1-0"],talentRanks:{'runner-1-0':4} };
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
    const funded=exchange(s,"talent");
    expect(funded.talentPoints).toBe(1);
    const purchased = research(funded, "runner-0-0");
    expect(NODES.filter((n) => afford(purchased, n.id))).toHaveLength(0);
    expect(s.inventory).toHaveLength(0);
  });
  it("only spends funded talent points, with no arbitrary debrief purchase lock",()=>{
    let s=completed();
    expect(research(s,'runner-0-0')).toBe(s);
    s=exchange({...s,science:100},'talent');
    const points=s.talentPoints;
    s=research(s,'runner-0-0');
    expect(s.talentPoints).toBeLessThan(points);
    expect(available(s,'runner-2-0')).toBe(true);
    expect(research(s,'runner-2-0').researched).toContain('runner-2-0');
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
    const s = research({ ...fresh(), talentPoints: 1 }, "runner-0-0");
    expect(stats(s).stamina).toBeGreaterThan(1);
    expect(start(s).trial!.energy).toBeGreaterThan(100);
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
describe("talents and equipment", () => {
  it("preserves early training levels and raises advanced XP thresholds gradually", () => {
    for (const l of [1, 2, 3, 99, 100, 101, 180, 300]) {
      expect(level(levelStart(l))).toBe(l);
      expect(level(levelStart(l + 1) - 1)).toBe(l);
    }
    expect(levelStart(101) - levelStart(100)).toBeCloseTo(7000);
    expect(level(1e12)).toBeLessThan(260);
  });
  it("banks timed experiments once and captures the selected limit at launch", () => {
    const s = fresh();
    s.sampleDuration = 120;
    s.progress.runner.xp = levelStart(80);
    let run = start(s);
    expect(run.trial!.maxTime).toBe(120);
    run.sampleDuration = 900;
    run = advance(run, 120);
    expect(run.trial).toBeNull();
    expect(run.history[0].duration).toBe(120);
    expect(run.history[0].science).toBeGreaterThan(0);
    expect(finish(run).science).toBe(run.science);
  });
  it("ignores running timers in a six-shot projectile experiment", () => {
    const s = fresh(); s.program = "projectile"; s.unlocked.push("projectile"); s.sampleDuration = 120;
    expect(start(s).trial!.maxTime).toBe(0);
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
  it("caps a week of support income without inventing distance", () => {
    const s = { ...completed(), auto: true };
    s.lastActive = 1000;
    const a = restore(JSON.stringify(s), 1000 + 14 * 86400000);
    const b = restore(JSON.stringify(s), 1000 + 7 * 86400000);
    expect(a.science).toBe(b.science);
    expect(a.progress.runner.distance).toBe(s.progress.runner.distance);
  });
  it("keeps imported extreme history and offline RP finite within the wallet limit", () => {
    const s = completed(); s.auto = true; s.lastActive = 0;
    s.science = 1e15 - 10; s.history[0].science = 1e308;
    const loaded = restore(JSON.stringify(s), 7 * 86400000);
    expect(loaded.history[0].science).toBe(1e15);
    expect(loaded.science).toBe(1e15);
    expect(loaded.offline).toBe(10);
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
