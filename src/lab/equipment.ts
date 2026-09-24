import { STAT_LABELS, type Program, type Stat } from "./research";
export type Slot = "footwear" | "outfit" | "instrument";
export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic";
export interface Gear {
  id: string;
  program: Program;
  name: string;
  slot: Slot;
  rarity: Rarity;
  foundAt: number;
  affixes: { stat: Stat; value: number }[];
}
export const SLOTS: Slot[] = ["footwear", "outfit", "instrument"];
export const SLOT_NAMES = {
  footwear: "Footwear",
  outfit: "Outfit",
  instrument: "Instrument",
};
export const STAT_NAMES = STAT_LABELS;
export const RARITIES: Rarity[] = ["Common", "Uncommon", "Rare", "Epic"];
// Saved per-expedition state keeps refreshes from rerolling a pending drop.
export function random(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}
export function rarityAt(distance: number, roll: number): Rarity {
  const depth = Math.min(5, Math.log10(1 + distance / 100));
  if (roll < 0.002 + depth * 0.008) return "Epic";
  if (roll < 0.02 + depth * 0.045) return "Rare";
  if (roll < 0.16 + depth * 0.08) return "Uncommon";
  return "Common";
}
export function rollGear(
  program: Program,
  distance: number,
  seed: number,
  serial: number,
  luck = 1,
): { gear: Gear; seed: number } {
  let state = seed;
  const next = () => {
    const [v, s] = random(state);
    state = s;
    return v;
  };
  const rarity = rarityAt(distance, next() / Math.max(1, luck));
  const tier = RARITIES.indexOf(rarity);
  const slot = SLOTS[Math.floor(next() * SLOTS.length)];
  const baseNames = {
    footwear: [
      "Running shoes",
      "Track shoes",
      "Carbon trainers",
      "Inertial boots",
    ],
    outfit: ["Cotton vest", "Trail jacket", "Aerodynamic suit", "Phase suit"],
    instrument: [
      "Stopwatch",
      "Motion sensor",
      "Telemetry array",
      "Quantum compass",
    ],
  };
  const pool: Stat[] =
    tier === 0
      ? ["speed", "stamina", "yield", "xp"]
      : [
          "speed",
          "stamina",
          "yield",
          "xp",
          "acceleration",
          "economy",
          "recovery",
          "resilience",
          "luck",
        ];
  const affixes = [];
  for (let i = 0; i <= tier; i++) {
    const [stat] = pool.splice(Math.floor(next() * pool.length), 1);
    affixes.push({
      stat,
      value:
        [0.05, 0.08, 0.12, 0.18][tier] +
        (tier ? Math.floor(next() * 4) / 100 : 0),
    });
  }
  return {
    gear: {
      id: "gear-" + serial,
      program,
      name: baseNames[slot][tier],
      slot,
      rarity,
      foundAt: distance,
      affixes,
    },
    seed: state,
  };
}
export function validateGear(raw: unknown): Gear[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .filter((g): g is Gear => {
      if (
        !g ||
        typeof g.id !== "string" ||
        seen.has(g.id) ||
        typeof g.name !== "string" ||
        !["runner", "projectile", "wheels"].includes(g.program) ||
        !SLOTS.includes(g.slot) ||
        !RARITIES.includes(g.rarity) ||
        !Number.isFinite(g.foundAt) ||
        g.foundAt < 0 ||
        !Array.isArray(g.affixes) ||
        g.affixes.length < 1 ||
        g.affixes.length > 4 ||
        !g.affixes.every(
          (a: { stat: Stat; value: number }) =>
            a &&
            Object.prototype.hasOwnProperty.call(STAT_NAMES, a.stat) &&
            Number.isFinite(a.value) &&
            a.value > 0 &&
            a.value <= 1,
        ) ||
        new Set(g.affixes.map((a: { stat: Stat }) => a.stat)).size !==
          g.affixes.length
      )
        return false;
      seen.add(g.id);
      return true;
    })
    .slice(0, 90);
}
