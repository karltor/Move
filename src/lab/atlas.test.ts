import { describe, expect, it } from "vitest";
import { fresh, research, available, stats, biomeBlend, BIOMES, talentRank, levelStart, start, step, finish, projectilePhysics, type Save } from "./game";
import { DEVELOPMENT_PROJECTS } from "./development";
import { NODES, NODE_MAP, LANES, VARIANTS, STAT_LABELS, type Program } from "./research";
import { nodePosition } from "./ResearchPanel";
import { craftGear, upgradeGear } from "./workshop";
import { SLOTS, gearPaths } from "./equipment";
import { initialBallistic, launchFlight, advanceFlight } from "./ballistics";

function completePath(program: Program, mask: number, finalEra = 6) {
  let s: Save = { ...fresh(), program, talentPoints: 1e9, unlocked: ["runner", "projectile", "wheels"] };
  s.development = Object.fromEntries(DEVELOPMENT_PROJECTS.filter(p => p.opensEra && p.opensEra <= finalEra).map(p => [p.id, 1]));
  const candidates = NODES.filter(n => n.program === program && (!n.choiceGroup || n.tier === (((mask >> n.lane) & 1) ? 5 : 4)));
  for (let pass = 0; pass < 12; pass++) {
    for (const n of candidates) if (!talentRank(s, n.id) && available(s, n.id)) s = research(s, n.id);
  }
  return s;
}

function evolvedBuild(program: Program, mask = 63) {
  let s = completePath(program, mask);
  for (const id of s.researched) s.talentRanks[id] = NODE_MAP.get(id)!.maxRank;
  for (const n of NODES.filter(n => n.program === "global").sort((a, b) => a.tier - b.tier))
    while (available(s, n.id)) s = research(s, n.id);
  s.vouchers = 1e9;
  s.progress[program].xp = levelStart(180);
  s.progress[program].variant = program === "wheels" ? "rocket" : program === "projectile" ? "particle" : "runner";
  for (const slot of SLOTS) {
    s = craftGear(s, program, slot);
    const item = s.inventory[s.inventory.length - 1]!;
    const paths = gearPaths(item);
    const path = paths[program === "wheels" && slot === "footwear" ? 1 : 0].id;
    for (let rank = 1; rank <= 200; rank++) s = upgradeGear(s, item.id, rank === 5 ? path : undefined);
    expect(s.inventory.find(g => g.id === item.id)!.upgradeLevel).toBe(200);
    s.equipped.push(item.id);
  }
  return s;
}
function measuredRun(s: Save, pace: "steady" | "push") {
  let run = start({ ...structuredClone(s), pace }, 123456);
  for (let i = 0; run.trial && i < 600; i++) run = step(run, .5);
  return finish(run).history[0];
}

describe("long-form talent progression", () => {
  it("has six independent, twelve-tier paths in each program and 24 laboratory talents", () => {
    expect(NODES).toHaveLength(240);
    expect(new Set(NODES.map(n => n.id)).size).toBe(240);
    expect(new Set(NODES.map(n => n.name)).size).toBe(240);
    for (const program of ["runner", "projectile", "wheels"] as Program[]) {
      expect(LANES[program]).toHaveLength(6);
      for (let lane = 0; lane < 6; lane++) expect(NODES.filter(n => n.program === program && n.lane === lane)).toHaveLength(12);
    }
    expect(NODES.filter(n => n.program === "global")).toHaveLength(24);
    expect(Object.keys(STAT_LABELS)).toHaveLength(22);
  });

  it("never makes one path depend on a different column, including joins after a specialization", () => {
    for (const n of NODES) for (const id of [...n.requires, ...(n.anyOf ?? [])]) {
      const parent = NODE_MAP.get(id)!;
      expect(parent).toBeDefined();
      expect(parent.program).toBe(n.program);
      expect(parent.lane).toBe(n.lane);
      expect(parent.tier).toBeLessThan(n.tier);
      expect(nodePosition(parent).x).toBe(nodePosition(n).x);
    }
  });

  it("reaches the capstones through every combination of the six permanent choices", () => {
    for (const program of ["runner", "projectile", "wheels"] as Program[]) {
      const union = new Set<string>();
      for (let mask = 0; mask < 64; mask++) {
        const s = completePath(program, mask);
        expect(s.researched).toHaveLength(66);
        expect(s.researched.filter(id => NODE_MAP.get(id)?.tier === 11)).toHaveLength(6);
        const ranks = s.researched.reduce((sum, id) => sum + NODE_MAP.get(id)!.maxRank, 0);
        expect(ranks).toBeGreaterThanOrEqual(600);
        expect(ranks).toBeLessThanOrEqual(800);
        for (const id of s.researched) union.add(id);
      }
      expect(union.size).toBe(72);
    }
  });

  it("keeps at least 600 possible ranks before the metric chapter for every runner build", () => {
    for (let mask = 0; mask < 64; mask++) {
      const s = completePath("runner", mask, 5);
      expect(s.researched.filter(id => NODE_MAP.get(id)?.tier === 11)).toHaveLength(0);
      expect(s.researched.reduce((sum, id) => sum + NODE_MAP.get(id)!.maxRank, 0)).toBeGreaterThanOrEqual(600);
    }
  });

  it("makes the final physiology talent a new mechanism rather than another capacity upgrade", () => {
    const first = NODE_MAP.get("runner-0-0")!, last = NODE_MAP.get("runner-0-11")!;
    expect(first.effects).toEqual({ stamina: .15 });
    expect(last.effects).toEqual({ oxygen: 2, cooling: 2 });
    expect(last.multipliers).toEqual({ stamina: 10, economy: 4 });
    expect(last.maxRank).toBe(1);
    expect(last.era).toBe(6);
  });

  it("makes bionics and the final movement technologies change the speed scale by orders of magnitude", () => {
    const s = completePath("runner", 63);
    for (const id of s.researched) s.talentRanks[id] = NODE_MAP.get(id)!.maxRank;
    expect(stats(s).speed * 1.8).toBeGreaterThan(1000);
    expect(stats(s).speed).toBeGreaterThan(stats(fresh()).speed * 1000);
    expect(NODE_MAP.get("runner-4-6")!.multipliers?.speed).toBeCloseTo(Math.pow(1.16, .3));
    expect(NODE_MAP.get("runner-4-11")!.multipliers?.speed).toBeCloseTo(Math.pow(18, .35));
  });

  it("leaves headroom for gear and distinct Push output in a fully evolved metric build", () => {
    const s = evolvedBuild("runner"), steady = measuredRun(s, "steady"), push = measuredRun(s, "push");
    expect(steady.speed).toBeGreaterThan(1000000);
    expect(steady.speed).toBeLessThan(30000000);
    expect(push.speed).toBeLessThan(70000000);
    expect(push.speed).toBeGreaterThan(steady.speed * 1.3);
    expect(Number.isFinite(steady.science)).toBe(true);
    expect(Number.isFinite(push.science)).toBe(true);
    expect(stats(s).speed).toBeLessThan(1e12);
  });

  it("keeps a fully evolved rocket vehicle below the ceiling with distinct Push output", () => {
    // Audit every lawful specialization combination, then simulate the build
    // with the strongest speed/Push potential rather than an arbitrary path.
    let s = evolvedBuild("wheels", 0), best = 0;
    for (let mask = 0; mask < 64; mask++) {
      const candidate = evolvedBuild("wheels", mask), st = stats(candidate);
      const potential = st.speed * Math.pow(st.overdrive, .35);
      if (potential > best) { best = potential; s = candidate; }
    }
    const steady = measuredRun(s, "steady"), push = measuredRun(s, "push");
    expect(steady.speed).toBeGreaterThan(1000000);
    expect(steady.speed).toBeLessThan(30000000);
    expect(push.speed).toBeLessThan(70000000);
    expect(push.speed).toBeGreaterThan(steady.speed * 1.5);
    expect(steady.duration).toBe(300);
    expect(push.duration).toBe(300);
    expect(Number.isFinite(push.science)).toBe(true);
  });

  it("keeps late projectile talents below the safety ceiling so their final ranks still increase launch velocity", () => {
    let s = evolvedBuild("projectile", 0), final = projectilePhysics(s);
    for (let mask = 0; mask < 64; mask++) {
      const candidate = evolvedBuild("projectile", mask), config = projectilePhysics(candidate);
      expect(config.speed).toBeLessThan(1e7 / 1.18);
      if (config.speed > final.speed) { s = candidate; final = config; }
    }
    expect(final.speed).toBeGreaterThan(100000);
    expect(final.speed).toBeLessThan(1e7 / 1.18);
    const less = structuredClone(s);
    less.talentRanks["projectile-2-10"]--;
    const previous = projectilePhysics(less);
    expect(final.speed).toBeGreaterThan(previous.speed * 1.01);
    const withoutBreakthrough = structuredClone(s);
    withoutBreakthrough.researched = withoutBreakthrough.researched.filter(id => id !== "projectile-2-11");
    delete withoutBreakthrough.talentRanks["projectile-2-11"];
    expect(final.speed).toBeGreaterThan(projectilePhysics(withoutBreakthrough).speed * 1.2);
    const active = advanceFlight(launchFlight(initialBallistic(), final), 1, final);
    expect(active.phase).toBe("flight");
    expect([active.x, active.y, active.vx, active.vy].every(Number.isFinite)).toBe(true);
  });

  it("preserves all launcher and vehicle unlock identifiers while projectile talents avoid runner energy stats", () => {
    for (const variants of Object.values(VARIANTS)) for (const variant of variants) if (variant.node) expect(NODE_MAP.has(variant.node)).toBe(true);
    for (const n of NODES.filter(n => n.program === "projectile"))
      expect([...Object.keys(n.effects), ...Object.keys(n.multipliers ?? {})].some(stat => ["stamina", "economy", "recovery", "resilience", "speed"].includes(stat))).toBe(false);
    expect(NODES.filter(n => n.ability).every(n => n.maxRank === 1)).toBe(true);
  });
});

describe("continuous biome transition", () => {
  it("blends every boundary continuously rather than swapping the world abruptly", () => {
    for (let i = 1; i < BIOMES.length; i++) {
      const d = BIOMES[i].start;
      expect(biomeBlend(d)).toEqual({ from: i - 1, to: i, mix: .5 });
      expect(Math.abs(biomeBlend(d - .01).mix - biomeBlend(d + .01).mix)).toBeLessThan(.001);
    }
  });
});
