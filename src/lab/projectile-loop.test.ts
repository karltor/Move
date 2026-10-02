import { describe, expect, it } from "vitest";
import {
  fresh,
  start,
  step,
  finish,
  pendingRewards,
  projectilePhysics,
  projectileFlight,
  restore,
  decide,
  eventDetails,
  routeChallenge,
  stats,
  available,
  research,
  talentRank,
  levelStart,
  projectileClockRate,
  type Save,
} from "./game";
import { NODES, NODE_MAP } from "./research";
import { DEVELOPMENT_PROJECTS } from "./development";
import { SLOTS, gearPaths } from "./equipment";
import { craftGear, upgradeGear } from "./workshop";
const lab = (variant = "rock"): Save => {
  const s = fresh();
  s.program = "projectile";
  s.unlocked.push("projectile");
  s.progress.projectile.variant = variant;
  return s;
};
function advance(s: Save, seconds: number) {
  for (let i = 0; i < seconds * 10 && s.trial; i++) s = step(s, 0.1);
  return s;
}
function complete(s: Save) {
  s = start(s, 12);
  for (let i = 0; i < 12000 && s.trial; i++) s = step(s, 0.5);
  return s;
}
function evolvedParticle(): Save {
  let s = { ...lab("particle"), talentPoints: 1e9, vouchers: 1e9 };
  s.development = Object.fromEntries(DEVELOPMENT_PROJECTS.filter(p => p.opensEra).map(p => [p.id, 1]));
  // One lawful specialization per path; mask 8 is the strongest launch build.
  const candidates = NODES.filter(n => n.program === "projectile" &&
    (!n.choiceGroup || n.tier === (((8 >> n.lane) & 1) ? 5 : 4)));
  for (let pass = 0; pass < 12; pass++)
    for (const n of candidates) if (!talentRank(s, n.id) && available(s, n.id)) s = research(s, n.id);
  for (const id of s.researched) s.talentRanks[id] = NODE_MAP.get(id)!.maxRank;
  for (const n of NODES.filter(n => n.program === "global").sort((a, b) => a.tier - b.tier))
    while (available(s, n.id)) s = research(s, n.id);
  s.progress.projectile.xp = levelStart(180);
  s.launchAngle = 65;
  for (const slot of SLOTS) {
    s = craftGear(s, "projectile", slot);
    const item = s.inventory[s.inventory.length - 1]!, path = gearPaths(item)[0].id;
    for (let rank = 1; rank <= 200; rank++) s = upgradeGear(s, item.id, rank === 5 ? path : undefined);
    s.equipped.push(item.id);
  }
  return s;
}
describe("projectile experiments", () => {
  it("shows a gravity arc, banks only landed shots, and consumes no runner energy", () => {
    let s = advance(start(lab(), 20), 3.5);
    expect(s.trial!.ballistic!.phase).toBe("flight");
    expect(s.trial!.ballistic!.y).toBeGreaterThan(projectilePhysics(s).height);
    expect(pendingRewards(s).science).toBe(0);
    expect(s.trial!.energy).toBe(100);
    s = advance(s, 3);
    expect(s.trial!.ballistic!.completed).toBe(1);
    expect(pendingRewards(s).science).toBeGreaterThan(0);
    const bank = pendingRewards(s),
      xp = s.progress.projectile.xp;
    const done = finish(s);
    expect(done.science).toBe(bank.science);
    expect(done.progress.projectile.funds).toBe(bank.funds);
    expect(done.progress.projectile.xp).toBe(xp);
    expect(finish(done)).toBe(done);
  });
  it("ends six-shot batches and keeps pace/stamina irrelevant to projectiles", () => {
    const a = complete(lab());
    const b = complete({
      ...lab(),
      pace: "push",
      researched: ["runner-0-0", "runner-0-1"],
    });
    expect(a.history[0]).toEqual(b.history[0]);
    expect(a.history[0].distance).toBeGreaterThan(10);
    expect(a.history[0].duration).toBeGreaterThan(25);
    expect(a.progress.projectile.xp).toBeGreaterThan(0);
  });
  it("specializations change launch power, preparation or drag rather than stamina", () => {
    const base = lab();
    const power = { ...base, researched: ["projectile-0-1"] };
    const quick = { ...base, researched: ["projectile-0-2"] };
    expect(projectilePhysics(power).speed).toBeGreaterThan(
      projectilePhysics(base).speed,
    );
    expect(projectilePhysics(power).reload).toBeGreaterThan(
      projectilePhysics(base).reload,
    );
    expect(projectilePhysics(quick).reload).toBeLessThan(
      projectilePhysics(base).reload,
    );
    expect(stats(power).stamina).toBe(1);
    expect(complete(power).history[0].distance).toBeGreaterThan(
      complete(quick).history[0].distance,
    );
  });
  it("advanced cannon and particle setups stay finite and land real shots", () => {
    for (const variant of ["plane", "sling", "cannon", "particle"]) {
      const s = lab(variant);
      s.researched = NODES.filter(
        (n) => n.program === "projectile" || n.program === "global",
      ).map((n) => n.id);
      s.launchAngle = variant === "particle" ? 20 : 65;
      const done = complete(s);
      expect(done.trial).toBeNull();
      expect(done.history[0].distance).toBeGreaterThan(10);
      expect(Number.isFinite(done.history[0].distance)).toBe(true);
      expect(done.history[0].duration).toBeLessThan(1500);
      expect(done.history[0].science).toBeGreaterThan(0);
    }
  });
  it("finishes all six fully evolved particle shots with a visible accelerated flight clock", () => {
    const s = evolvedParticle(), config = projectilePhysics(s);
    expect(config.speed).toBeGreaterThan(1_000_000);
    expect(projectileClockRate(config)).toBeGreaterThan(1000);
    expect(projectileClockRate(config)).toBeLessThanOrEqual(25_000);
    let active = start(s, 12), largestCompleted = 0;
    for (let i = 0; i < 1200 && active.trial; i++) {
      active = step(active, .5);
      if (active.trial) {
        expect(active.trial.energy).toBe(100);
        const shot = active.trial.ballistic!;
        largestCompleted = Math.max(largestCompleted, shot.completed);
        expect([shot.x, shot.y, shot.vx, shot.vy].every(Number.isFinite)).toBe(true);
      }
    }
    expect(active.trial).toBeNull();
    expect(largestCompleted).toBe(6);
    expect(active.history[0].duration).toBeLessThan(600);
    expect(active.history[0].distance).toBeGreaterThan(1_000_000);
    expect(Number.isFinite(active.history[0].science)).toBe(true);
    expect(active.history[0].science).toBeGreaterThan(0);
    expect(projectileFlight(active).clockRate).toBe(projectileClockRate(projectilePhysics(active)));
  });
  it("resumes a real flight and safely migrates a pre-ballistics runtime to staging", () => {
    const s = advance(start(lab(), 20), 3.5);
    const restored = restore(JSON.stringify(s));
    expect(restored.trial!.ballistic!.x).toBe(s.trial!.ballistic!.x);
    expect(advance(restored, 4).trial!.ballistic!.completed).toBeGreaterThan(0);
    const old = { ...s, trial: { ...s.trial, ballistic: undefined } };
    expect(restore(JSON.stringify(old)).trial).toBeNull();
    const poisoned = JSON.parse(JSON.stringify(s));
    poisoned.trial.ballistic.config.drag = "broken";
    expect(restore(JSON.stringify(poisoned)).trial).toBeNull();
    expect(restore(JSON.stringify(poisoned)).progress.projectile.xp).toBe(
      s.progress.projectile.xp,
    );
    const active = { ...s, researched: ["projectile-0-3"], launchAngle: 65 };
    expect(projectileFlight(active).angle).toBe(45);
  });
});
describe("visible surface events", () => {
  it("uses varied seeded events, prevents immediate repetition, and names actual currency", () => {
    const seen = new Set<number>();
    for (const seed of [12, 210, 2100, 7777, 99999, 400000]) {
      const base = fresh();
      base.progress.runner.trials = 3;
      let s = advance(start(base, seed), 30);
      seen.add(s.trial!.event!);
      const lastEvent = s.trial!.event;
      s = decide(s, "b");
      s.trial!.energy = 1000;
      s = advance(s, 55);
      if (s.trial?.event != null) expect(s.trial.event).not.toBe(lastEvent);
    }
    expect(seen.size).toBeGreaterThan(2);
    const s = start(fresh(), 12);
    s.trial!.event = 1;
    expect(eventDetails(s).bd).toContain("RP");
    expect(eventDetails(s).bd).not.toContain("program currency");
    s.trial!.distance = 40;
    expect(routeChallenge(s).name).toBe("Roadworks");
    expect(routeChallenge(s).description).not.toMatch(/climb|uphill/);
  });
});
