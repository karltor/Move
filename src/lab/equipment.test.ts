import { describe, it, expect } from "vitest";
import { random, rarityAt, rollGear, validateGear } from "./equipment";
import {
  fresh,
  start,
  step,
  supply,
  restore,
  equipGear,
  salvageGear,
  stats,
} from "./game";
describe("equipment drops and progressive features", () => {
  it("starts with no supplies, equipment, or automation", () => {
    const s = start(fresh(), 10);
    expect(s.trial!.rations).toBe(0);
    expect(s.inventory).toEqual([]);
    expect(s.auto).toBe(false);
    expect(supply(s)).toBe(s);
  });
  it("field logistics unlocks exactly three supplies on the next run", () => {
    const s = start({ ...fresh(), researched: ["global-1-1"] }, 10);
    expect(s.trial!.rations).toBe(3);
  });
  it("starts with one modest bonus but can roll rare multi-stat gear early", () => {
    let common = false,
      epic = false;
    for (let seed = 1; seed <= 5000; seed++) {
      const { gear } = rollGear("runner", 50, seed, seed);
      if (gear.rarity === "Common") {
        common = true;
        expect(gear.affixes).toHaveLength(1);
        expect(gear.affixes[0].value).toBe(0.05);
      }
      if (gear.rarity === "Epic") {
        epic = true;
        expect(gear.affixes).toHaveLength(4);
      }
      expect(new Set(gear.affixes.map((a) => a.stat)).size).toBe(
        gear.affixes.length,
      );
    }
    expect(common && epic).toBe(true);
  });
  it("improves rarity odds with distance without preventing lucky early finds", () => {
    expect(rarityAt(0, 0.001)).toBe("Epic");
    expect(rarityAt(0, 0.1)).toBe("Uncommon");
    expect(rarityAt(10000, 0.1)).toBe("Rare");
    expect(rarityAt(100, 0.4)).toBe("Common");
    expect(rarityAt(100000, 0.4)).toBe("Uncommon");
  });
  it("drops equipment during a run and does not reroll after save/load", () => {
    let s = start(fresh(), 12);
    for (let i = 0; i < 110; i++) s = step(s, 0.5);
    expect(s.inventory.length).toBeGreaterThan(0);
    const loaded = restore(JSON.stringify(s));
    expect(loaded.inventory).toEqual(s.inventory);
    expect(loaded.trial!.rng).toBe(s.trial!.rng);
    expect(loaded.trial!.nextDrop).toBe(s.trial!.nextDrop);
    expect(random(loaded.trial!.rng)).toEqual(random(s.trial!.rng));
  });
  it("validates imports, keeps loadouts across refresh, and separates programs", () => {
    let s = fresh();
    const g = rollGear("runner", 50, 8000, 1).gear;
    s.inventory = [g];
    s = equipGear(s, g.id);
    expect(stats(s, "projectile").speed).toBe(1);
    expect(restore(JSON.stringify(s)).equipped).toEqual([g.id]);
    expect(
      validateGear([
        g,
        g,
        { ...g, id: "bad", affixes: [{ stat: "speed", value: Infinity }] },
      ]),
    ).toEqual([g]);
  });
  it("recycling removes only spare gear and cannot remove equipped gear", () => {
    let s = fresh();
    s.inventory = [rollGear("runner", 50, 500, 1).gear];
    const id = s.inventory[0].id;
    const equipped = equipGear(s, id);
    expect(salvageGear(equipped, id)).toBe(equipped);
    const before = s.science;
    s = salvageGear(s, id);
    expect(s.inventory).toEqual([]);
    expect(s.science).toBeGreaterThan(before);
  });
});
