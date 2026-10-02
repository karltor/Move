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
  upgradeLevel?: number;
  upgradePath?: string;
  crafted?: boolean;
  era?: number;
}
export const SLOTS: Slot[] = ["footwear", "outfit", "instrument"];
export const SLOT_NAMES = {
  footwear: "Footwear",
  outfit: "Outfit",
  instrument: "Instrument",
};
export function slotName(program: Program, slot: Slot) {
  const names = {
    runner: SLOT_NAMES,
    projectile: {
      footwear: "Launch rig",
      outfit: "Projectile body",
      instrument: "Measuring instrument",
    },
    wheels: {
      footwear: "Wheels",
      outfit: "Chassis",
      instrument: "Control unit",
    },
  };
  return names[program][slot];
}
export const STAT_NAMES = STAT_LABELS;
export const RARITIES: Rarity[] = ["Common", "Uncommon", "Rare", "Epic"];
export const GEAR_LEVEL_CAP = 200;
export const GEAR_MILESTONES = [10, 25, 50, 75, 100] as const;
export const GEAR_STAGE_NAMES = ["Standard", "Composite", "Bionic", "Augmented", "Plasma", "Phase"];
export const gearStage = (g: Gear) => GEAR_MILESTONES.filter((n) => (g.upgradeLevel ?? 0) >= n).length;
const TRANSFORMATIONS: Record<Program, Record<Slot, string[]>> = {
  runner: {
    footwear: ["Running shoes", "Carbon stride boots", "Bionic leg drives", "Inertial leg actuators", "Plasma stride engines", "Phase displacement legs"],
    outfit: ["Training vest", "Heat-exchange suit", "Augmented oxygen system", "Synthetic organ harness", "Fusion metabolism core", "Closed-cycle phase body"],
    instrument: ["Stopwatch", "Gait computer", "Neural movement interface", "Predictive motion processor", "Quantum route solver", "Temporal navigation array"],
  },
  projectile: {
    footwear: ["Throwing grip", "Carbon launch frame", "Electromagnetic launcher", "Superconducting launch rail", "Plasma impulse chamber", "Phase accelerator"],
    outfit: ["Balanced stone", "Composite projectile", "Guided flight body", "Adaptive lifting body", "Plasma-contained payload", "Phase flight capsule"],
    instrument: ["Range tape", "Optical rangefinder", "Flight guidance computer", "Atmospheric targeting array", "Quantum trajectory solver", "Temporal flight controller"],
  },
  wheels: {
    footwear: ["Road tyres", "Carbon wheelset", "Magnetic drive hubs", "Active suspension wheels", "Plasma traction rings", "Phase contact wheels"],
    outfit: ["Steel frame", "Composite chassis", "Powered exoskeleton frame", "Inertial damping chassis", "Fusion drive body", "Phase displacement chassis"],
    instrument: ["Speedometer", "Traction computer", "Predictive drive controller", "Distributed vehicle intelligence", "Quantum navigation unit", "Temporal route controller"],
  },
};
export function gearName(g: Gear, level = g.upgradeLevel ?? 0) {
  if (!g.crafted && level < 10) return g.name;
  const name = TRANSFORMATIONS[g.program][g.slot][GEAR_MILESTONES.filter((n) => level >= n).length];
  return level > 100 ? `${name} · overclock ${level - 100}` : name;
}
export interface GearPath {
  id: string;
  name: string;
  description: string;
  effects: Partial<Record<Stat, number>>;
}
export function gearPaths(g: Gear): GearPath[] {
  const paths: Record<Program, Record<Slot, GearPath[]>> = {
    runner: {
      footwear: [
        { id: "kinetic", name: "Kinetic drive", description: "Faster strides and starts; higher energy use.", effects: { speed: .15, acceleration: .25, economy: -.08 } },
        { id: "distance", name: "Distance drive", description: "Efficient grip for long expeditions; lower peak speed.", effects: { economy: .2, traction: .2, speed: -.05 } },
      ],
      outfit: [
        { id: "power", name: "Power metabolism", description: "Feed bursts of speed; cooling has to work harder.", effects: { overdrive: .25, oxygen: .2, cooling: -.08 } },
        { id: "thermal", name: "Thermal regulation", description: "Keep heat and fatigue under control; smaller energy reserve.", effects: { cooling: .3, resilience: .2, stamina: -.05 } },
      ],
      instrument: [
        { id: "survey", name: "Survey processor", description: "Collect more RP and useful finds; slower learning.", effects: { yield: .2, luck: .2, xp: -.06 } },
        { id: "training", name: "Training processor", description: "Learn and recover faster; fewer samples per metre.", effects: { xp: .25, recovery: .15, yield: -.06 } },
      ],
    },
    projectile: {
      footwear: [
        { id: "pressure", name: "High impulse", description: "More launch velocity; longer preparation between shots.", effects: { launchSpeed: .2, reload: -.1 } },
        { id: "cycling", name: "Rapid cycling", description: "Prepare shots rapidly; give up some release speed.", effects: { reload: .35, launchSpeed: -.06 } },
      ],
      outfit: [
        { id: "penetrator", name: "Low-drag body", description: "Cut air resistance with a stable body; little wing lift.", effects: { drag: .3, stability: .2, lift: -.06 } },
        { id: "glider", name: "Lifting body", description: "Stay aloft with adaptive wings; less consistent releases.", effects: { lift: .3, drag: .15, stability: -.08 } },
      ],
      instrument: [
        { id: "range", name: "Range specialist", description: "Improve consistency and landing RP; spend longer preparing shots.", effects: { stability: .25, payload: .2, reload: -.05 } },
        { id: "samples", name: "Sample specialist", description: "Collect more experiment RP and experience; less RP from landing measurements.", effects: { yield: .25, xp: .2, payload: -.07 } },
      ],
    },
    wheels: {
      footwear: [
        { id: "grip", name: "Grip compound", description: "Strong traction and acceleration; more rolling resistance.", effects: { traction: .3, acceleration: .2, speed: -.05 } },
        { id: "road", name: "Road compound", description: "Fast rolling with reduced drag; less grip on broken roads.", effects: { speed: .2, aerodynamics: .2, traction: -.1 } },
      ],
      outfit: [
        { id: "motor", name: "Power chassis", description: "More overdrive and torque; more heat to dissipate.", effects: { overdrive: .3, acceleration: .2, cooling: -.1 } },
        { id: "touring", name: "Touring chassis", description: "Conserve energy and control heat; lower peak speed.", effects: { economy: .3, cooling: .2, speed: -.06 } },
      ],
      instrument: [
        { id: "autonomy", name: "Autonomous controller", description: "React to terrain and regain speed; less research per kilometre.", effects: { automation: .3, traction: .2, yield: -.07 } },
        { id: "telemetry", name: "Telemetry controller", description: "More research and learning; slower automatic responses.", effects: { yield: .25, xp: .2, automation: -.06 } },
      ],
    },
  };
  return paths[g.program][g.slot];
}
const ADDED_STATS: Record<Program, Record<Slot, Stat[]>> = {
  runner: { footwear: ["acceleration", "traction", "overdrive", "resilience", "automation"], outfit: ["economy", "oxygen", "cooling", "aerodynamics", "recovery"], instrument: ["yield", "luck", "automation", "wind", "overdrive"] },
  projectile: { footwear: ["reload", "stability", "payload", "drag", "yield"], outfit: ["stability", "lift", "launchSpeed", "payload", "reload"], instrument: ["payload", "xp", "reload", "drag", "stability"] },
  wheels: { footwear: ["traction", "acceleration", "aerodynamics", "overdrive", "automation"], outfit: ["stamina", "cooling", "resilience", "aerodynamics", "overdrive"], instrument: ["yield", "automation", "traction", "xp", "cooling"] },
};
/** Additive equipment bonuses, before transformative component multipliers. */
export function gearEffects(g: Gear): Partial<Record<Stat, number>> {
  const level = g.upgradeLevel ?? 0;
  const effects: Partial<Record<Stat, number>> = {};
  for (const a of g.affixes) effects[a.stat] = (effects[a.stat] ?? 0) + a.value * (1 + .08 * level + .0018 * level * level);
  GEAR_MILESTONES.forEach((at, i) => {
    if (level >= at) {
      const stat = ADDED_STATS[g.program][g.slot][i];
      effects[stat] = (effects[stat] ?? 0) + .08 + .009 * (level - at);
    }
  });
  const path = gearPaths(g).find((p) => p.id === g.upgradePath);
  if (path) for (const [stat, value] of Object.entries(path.effects)) effects[stat as Stat] = (effects[stat as Stat] ?? 0) + value! * (1 + level / 50);
  return effects;
}
/** New power sources change scale; ordinary component ranks add precision. */
export function gearMultipliers(g: Gear): Partial<Record<Stat, number>> {
  const stage = gearStage(g);
  if (!stage) return {};
  const overclock = Math.max(0, (g.upgradeLevel ?? 0) - 100);
  const fastStages = g.program === "runner" ? [1, 1.35, 5, 22, 100, 700] : [1, 1.15, 1.8, 3, 5, 8];
  const fast = fastStages[stage] * Math.pow(1.015, overclock);
  const support = [1, 1.15, 1.6, 2.5, 4, 7][stage] * Math.pow(1.01, overclock);
  if (g.program === "projectile") return g.slot === "footwear" ? { launchSpeed: fast, reload: support } : g.slot === "outfit" ? { drag: support, stability: support } : { payload: support, yield: support };
  return g.slot === "footwear" ? { speed: fast, acceleration: support } : g.slot === "outfit" ? { stamina: [1, 1.25, 2.5, 5, 12, 25][stage] * Math.pow(1.015, overclock), economy: support } : { yield: support, xp: support };
}
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
  const runningNames = {
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
  const baseNames =
    program === "projectile"
      ? {
          footwear: [
            "Throwing grip",
            "Elastic launch cup",
            "Calibrated launch rail",
            "Magnetic launch cradle",
          ],
          outfit: [
            "Balanced stone",
            "Polished shell",
            "Carbon flight body",
            "Composite flight shell",
          ],
          instrument: [
            "Range tape",
            "Angle gauge",
            "Optical tracker",
            "Flight telemetry unit",
          ],
        }
      : program === "wheels"
        ? {
            footwear: [
              "Road tyres",
              "Sealed bearings",
              "Lightweight wheelset",
              "Magnetic hubs",
            ],
            outfit: [
              "Steel frame",
              "Alloy frame",
              "Carbon chassis",
              "Streamlined monocoque",
            ],
            instrument: [
              "Speedometer",
              "Motor controller",
              "Traction sensor",
              "Adaptive control unit",
            ],
          }
        : runningNames;
  const pool: Stat[] =
    program === "projectile"
      ? tier === 0
        ? ["launchSpeed", "drag", "stability", "payload"]
        : [
            "launchSpeed",
            "drag",
            "lift",
            "stability",
            "reload",
            "payload",
            "yield",
            "xp",
          ]
      : tier === 0
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
        (g.upgradeLevel !== undefined && (!Number.isInteger(g.upgradeLevel) || g.upgradeLevel < 0 || g.upgradeLevel > GEAR_LEVEL_CAP)) ||
        (g.crafted !== undefined && typeof g.crafted !== "boolean") ||
        (g.era !== undefined && (!Number.isInteger(g.era) || g.era < 0 || g.era > 6)) ||
        ((g.upgradeLevel ?? 0) >= 5 && !g.upgradePath) ||
        (g.upgradePath !== undefined && (typeof g.upgradePath !== "string" || (g.upgradeLevel ?? 0) < 5 || !gearPaths(g).some((p) => p.id === g.upgradePath))) ||
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
