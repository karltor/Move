import { describe, expect, it } from "vitest";
import { fresh, restore, start, stats, type Save } from "./game";
import { CRAFT_CATALOG, craftGear, craftRequirement, craftAlternate, beginnerVoucherNeed, effectiveBonus, nextMilestone, quoteAlternate, quoteUpgrade, stageLevelCap, upgradeCost, upgradeGear, upgradeGearTo, upgradeRequirement, workshopSlots, visibleGearPaths } from "./workshop";
import { GEAR_LEVEL_CAP, SLOTS, gearEffects, gearMultipliers, gearPaths, gearStage, validateGear } from "./equipment";
import { DEVELOPMENT_PROJECTS } from "./development";
import type { Program } from "./research";

function workshop(program: Program = "runner", era = 0): Save {
  return { ...fresh(), vouchers: 10000000, unlocked: ["runner", "projectile", "wheels"], program, development: Object.fromEntries(DEVELOPMENT_PROJECTS.filter((p) => p.opensEra && p.opensEra <= era).map((p) => [p.id, 1])) };
}
function built(program: Program = "runner", era = 0) {
  return craftGear(workshop(program, era), program, "footwear");
}

describe("equipment workshop", () => {
  it("builds deterministic, relevant starters for exactly two vouchers", () => {
    for (const program of ["runner", "projectile", "wheels"] as Program[]) {
      let s = workshop(program, 2);
      for (const slot of SLOTS) {
        const balance = s.vouchers, serial = s.nextGear;
        s = craftGear(s, program, slot);
        const item = s.inventory[s.inventory.length - 1];
        expect(s.vouchers).toBe(balance - 2);
        expect(item.id).toBe("gear-" + serial);
        expect(item.affixes).toEqual([{ stat: CRAFT_CATALOG[program][slot].stat, value: .05 }]);
        expect(s.nextGear).toBe(serial + 1);
        expect(s.equipped).toContain(item.id);
      }
    }
    const s = { ...fresh(), vouchers: 1 };
    expect(craftGear(s, "runner", "footwear")).toBe(s);
    expect(craftGear({ ...s, vouchers: 100 }, "projectile", "footwear").inventory).toHaveLength(0);
    const full = { ...workshop(), inventory: Array.from({ length: 90 }, (_, i) => ({ ...built().inventory[0], id: "gear-" + i })) };
    expect(craftGear(full, "runner", "outfit")).toBe(full);
  });
  it("ties component transformations to facility eras instead of unrestricted income", () => {
    expect(Array.from({ length: 7 }, (_, era) => stageLevelCap(workshop("runner", era)))).toEqual([9, 24, 49, 74, 99, 100, 200]);
    let s = built();
    const id = s.inventory[0].id;
    s = upgradeGearTo(s, id, 100, "kinetic");
    expect(s.inventory[0].upgradeLevel).toBe(9);
    expect(upgradeGear(s, id)).toBe(s);
    expect(upgradeRequirement(s, id)).toMatch(/Athletic science.*10/);
    s = { ...s, development: workshop("runner", 1).development };
    s = upgradeGear(s, id);
    expect(s.inventory[0].name).toBe("Carbon stride boots");
    expect(gearStage(s.inventory[0])).toBe(1);
    expect(Object.keys(gearEffects(s.inventory[0]))).toContain("acceleration");
    expect(nextMilestone(s.inventory[0])?.level).toBe(25);
  });
  it("requires a permanent specialization and keeps its real stat tradeoff", () => {
    const s = upgradeGearTo(built(), "gear-1", 4);
    const id = s.inventory[0].id;
    expect(upgradeGear(s, id)).toBe(s);
    expect(upgradeGear(s, id, "unknown")).toBe(s);
    const power = upgradeGear(s, id, "kinetic"), distance = upgradeGear(s, id, "distance");
    expect(power.inventory[0].upgradeLevel).toBe(5);
    expect(effectiveBonus(power.inventory[0], "speed")).toBeGreaterThan(effectiveBonus(distance.inventory[0], "speed"));
    expect(effectiveBonus(power.inventory[0], "economy")).toBeLessThan(0);
    expect(effectiveBonus(distance.inventory[0], "economy")).toBeGreaterThan(0);
    expect(upgradeGear(power, id, "distance")).toBe(power);
    expect(upgradeGearTo(power, id, 9, "distance")).toBe(power);
    for (const program of ["runner", "projectile", "wheels"] as Program[]) for (const slot of SLOTS) {
      const item = craftGear(workshop(program, 2), program, slot).inventory[0];
      expect(gearPaths(item)).toHaveLength(2);
      for (const path of gearPaths(item)) {
        expect(Object.values(path.effects).some((v) => v! < 0)).toBe(true);
        expect(Object.values(path.effects).some((v) => v! > 0)).toBe(true);
      }
    }
  });
  it("quotes exact total prices and batch purchases spend resources atomically", () => {
    let individual = built("runner", 6);
    const id = individual.inventory[0].id, initial = individual.vouchers;
    const batch = upgradeGearTo(individual, id, 100, "kinetic"), quote = quoteUpgrade(individual, id, 100, "kinetic");
    for (let i = 1; i <= 100; i++) individual = upgradeGear(individual, id, i === 5 ? "kinetic" : undefined);
    expect(batch.inventory).toEqual(individual.inventory);
    expect(batch.vouchers).toBe(individual.vouchers);
    expect(quote.cost).toBe(initial - batch.vouchers);
    expect(quote.levels).toBe(100);
    const poor = { ...built("runner", 6), vouchers: quote.cost - 1 };
    expect(upgradeGearTo(poor, id, 100, "kinetic")).toBe(poor);
    const one = upgradeGear(built(), id);
    expect(one.vouchers).toBe(initial - 1);
  });
  it("supports centuries of ranks with increasingly costly, high-magnitude hardware", () => {
    const s = built("runner", 6), id = s.inventory[0].id;
    const rank100 = upgradeGearTo(s, id, 100, "kinetic"), rank200 = upgradeGearTo(rank100, id, 200);
    expect(GEAR_LEVEL_CAP).toBe(200);
    expect(gearMultipliers(rank100.inventory[0]).speed).toBe(700);
    expect(gearMultipliers(rank200.inventory[0]).speed).toBeCloseTo(700 * Math.pow(1.015, 100));
    const overclockGain = gearMultipliers(rank200.inventory[0]).speed! / gearMultipliers(rank100.inventory[0]).speed!;
    expect(overclockGain).toBeGreaterThan(4);
    expect(overclockGain).toBeLessThan(4.5);
    for (const program of ["projectile", "wheels"] as Program[]) {
      const stat = program === "projectile" ? "launchSpeed" : "speed";
      const item = { ...rank100.inventory[0], program };
      expect(gearMultipliers(item)[stat]).toBe(8);
      expect(gearMultipliers({ ...item, upgradeLevel: 200 })[stat]! / gearMultipliers(item)[stat]!).toBeCloseTo(overclockGain);
      expect([10, 25, 50, 75, 100].map((upgradeLevel) => gearMultipliers({ ...item, upgradeLevel })[stat])).toEqual([1.15, 1.8, 3, 5, 8]);
    }
    expect(rank200.inventory[0].era).toBe(6);
    expect(rank200.inventory[0].name).toContain("overclock 100");
    expect(upgradeGear(rank200, id)).toBe(rank200);
    expect(stats(rank100).speed).toBeGreaterThan(stats(fresh()).speed * 1000);
    const at = (level: number) => upgradeCost({ ...s, inventory: [{ ...s.inventory[0], upgradeLevel: level, upgradePath: "kinetic" }] }, id);
    expect(at(0)).toBe(1);
    expect(at(99)).toBeGreaterThan(900);
    expect(at(100)).toBeGreaterThan(at(99));
    expect(at(199)).toBeGreaterThan(at(100));
  });
  it("keeps projectiles on launch and flight stats throughout every upgrade stage", () => {
    const flight = new Set(["launchSpeed", "drag", "lift", "stability", "reload", "payload", "yield", "xp"]);
    for (const slot of SLOTS) {
      const s = craftGear(workshop("projectile", 6), "projectile", slot), item = s.inventory[0];
      const up = upgradeGearTo(s, item.id, 200, gearPaths(item)[0].id).inventory[0];
      expect(Object.keys(gearEffects(up)).every((key) => flight.has(key))).toBe(true);
      expect(Object.keys(gearMultipliers(up)).every((key) => flight.has(key))).toBe(true);
      expect(up.name).not.toMatch(/shoes|legs|organs|stamina|vest/i);
    }
  });
  it("does workshop work during an experiment without mutating its active components", () => {
    let s = built(), id = s.inventory[0].id;
    s = start({ ...s, development: workshop("runner", 2).development }, 10);
    expect(upgradeGear(s, id)).toBe(s);
    expect(upgradeGearTo(s, id, 4)).toBe(s);
    const spare = craftGear(s, "runner", "outfit"), spareId = spare.inventory[1].id;
    expect(spare.trial).toBe(s.trial);
    expect(upgradeGear(spare, spareId).inventory[1].upgradeLevel).toBe(1);
    expect(stats(upgradeGear(spare, spareId))).toEqual(stats(spare));
    expect(spare.equipped).not.toContain(spareId);
  });
  it("round-trips transformed equipment and rejects malformed enhancement metadata", () => {
    const s = built("runner", 6), id = s.inventory[0].id;
    const upgraded = upgradeGearTo(s, id, 200, "kinetic"), item = upgraded.inventory[0];
    expect(restore(JSON.stringify(upgraded)).inventory).toEqual(upgraded.inventory);
    expect(validateGear([item, { ...item, id: "bad-path", upgradePath: "distance-or-whatever" }, { ...item, id: "early-path", upgradeLevel: 4 }, { ...item, id: "no-path", upgradePath: undefined }, { ...item, id: "too-high", upgradeLevel: 201 }])).toEqual([item]);
  });
  it("reveals new workbenches through progress while keeping found gear usable", () => {
    expect(workshopSlots(workshop(), "runner")).toEqual(["footwear"]);
    expect(workshopSlots(workshop("runner", 1), "runner")).toEqual(["footwear", "outfit"]);
    const measured = workshop("runner", 1);
    measured.progress.runner.best = 2;
    measured.progress.runner.bestDistance = 400;
    expect(workshopSlots(measured, "runner")).toEqual(SLOTS);
    const fast = workshop("runner", 1);
    fast.progress.runner.best = 400;
    fast.progress.runner.bestDistance = 100;
    expect(workshopSlots(fast, "runner")).toEqual(["footwear", "outfit"]);
    const later = workshop("runner", 2);
    expect(workshopSlots(later, "runner")).toEqual(SLOTS);
    const watch = craftGear(later, "runner", "instrument").inventory[0];
    expect(workshopSlots({ ...workshop(), inventory: [watch] }, "runner")).toEqual(["footwear", "instrument"]);
  });
  it("prevents redundant basics and fits a new component without an extra click", () => {
    const s = built(), serial = s.nextGear;
    expect(s.equipped).toEqual([s.inventory[0].id]);
    expect(craftGear(s, "runner", "footwear")).toBe(s);
    expect(craftRequirement(s, "runner", "footwear")).toContain("already own");
    expect(craftGear(s, "runner", "outfit")).toBe(s);
    expect(s.nextGear).toBe(serial);
    const queued = craftGear(start(workshop("runner", 2), 10), "runner", "footwear");
    expect(queued.inventory).toHaveLength(1);
    expect(queued.equipped).toHaveLength(0);
    expect(queued.notice).toContain("next experiment");
  });
  it("offers an alternate build only when it adds a different useful specialization", () => {
    const base = built("runner", 2), primary = upgradeGearTo(base, "gear-1", 5, "kinetic");
    const quote = quoteAlternate(primary, "runner", "footwear", "distance");
    expect(quote.blocked).toBe("");
    expect(quote.cost).toBe(CRAFT_CATALOG.runner.footwear.cost + quoteUpgrade(base, "gear-1", 5, "distance").cost);
    const alternate = craftAlternate(primary, "runner", "footwear", "distance");
    expect(alternate.inventory).toHaveLength(2);
    expect(alternate.inventory[1].upgradePath).toBe("distance");
    expect(alternate.inventory[1].upgradeLevel).toBe(5);
    expect(alternate.equipped).toEqual(primary.equipped);
    expect(alternate.vouchers).toBe(primary.vouchers - quote.cost);
    expect(craftAlternate(alternate, "runner", "footwear", "distance")).toBe(alternate);
    expect(craftAlternate(primary, "runner", "footwear", "kinetic")).toBe(primary);
    const poor = { ...primary, vouchers: quote.cost - 1 };
    expect(craftAlternate(poor, "runner", "footwear", "distance")).toBe(poor);
    const early = upgradeGearTo(built(), "gear-1", 5, "kinetic");
    expect(craftAlternate(early, "runner", "footwear", "distance")).toBe(early);
    expect(restore(JSON.stringify(alternate)).inventory).toEqual(alternate.inventory);
  });
  it("budgets only useful starter work and quotes future improvements during an active run", () => {
    const starter = { ...fresh(), vouchers: 100 };
    expect(beginnerVoucherNeed(starter)).toBe(19);
    const basic = craftGear(starter, "runner", "footwear");
    expect(beginnerVoucherNeed(basic)).toBe(17);
    const fitted = upgradeGearTo(basic, "gear-1", 5, "distance");
    expect(beginnerVoucherNeed(fitted)).toBe(8);
    expect(beginnerVoucherNeed(start(fitted, 10))).toBe(8);
    const duplicate = { ...basic.inventory[0], id: "gear-2" };
    expect(beginnerVoucherNeed({ ...fitted, inventory: [...fitted.inventory, duplicate] })).toBe(8);
    const complete = upgradeGearTo(fitted, "gear-1", 9);
    expect(beginnerVoucherNeed(complete)).toBe(0);
    expect(beginnerVoucherNeed({ ...complete, unlocked: ["runner", "projectile"] })).toBe(19);
  });
  it("describes plain gear in everyday language while keeping its specialization identity", () => {
    const basic = built().inventory[0];
    expect(visibleGearPaths(basic).map((p) => p.name)).toEqual(["Sprint fit", "Trail fit"]);
    expect(visibleGearPaths(basic).map((p) => p.id)).toEqual(gearPaths(basic).map((p) => p.id));
    expect(visibleGearPaths({ ...basic, upgradeLevel: 10 }).map((p) => p.name)).toEqual(["Kinetic drive", "Distance drive"]);
  });
});
