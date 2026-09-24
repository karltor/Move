import { RUNNER, PROJECTILE, WHEELS, SHARED } from "./discoveries";
export type Program = "runner" | "projectile" | "wheels";
export type Stat =
  | "speed"
  | "stamina"
  | "yield"
  | "xp"
  | "acceleration"
  | "economy"
  | "recovery"
  | "resilience"
  | "wind"
  | "luck";
export const STAT_LABELS: Record<Stat, string> = {
  speed: "Cruising speed",
  stamina: "Stamina capacity",
  yield: "Research yield",
  xp: "Learning",
  acceleration: "Acceleration",
  economy: "Energy efficiency",
  recovery: "Recovery",
  resilience: "Fatigue resistance",
  wind: "Tailwind",
  luck: "Discovery luck",
};
export const effectLabel = (stat: Stat, value: number) =>
  stat === "wind"
    ? "+" + (value * 2).toFixed(1) + " m/s tailwind"
    : "+" + Math.round(value * 100) + "% " + STAT_LABELS[stat].toLowerCase();
export interface ResearchNode {
  id: string;
  name: string;
  description: string;
  program: Program | "global";
  lane: number;
  tier: number;
  cost: number;
  localCost: number;
  requires: string[];
  anyOf?: string[];
  kind: "permanent";
  stat: Stat;
  power: number;
  effects: Partial<Record<Stat, number>>;
  icon: string;
  ability?: string;
}
export const PROGRAMS = {
  runner: {
    name: "Human performance",
    short: "Runner",
    currency: "Endurance",
    symbol: "01",
    color: "#b8ef63",
    person: "Dr. Ellis",
    role: "Enthusiastic volunteer",
    description: "One scientist. Two legs. Questionable limits.",
    unlock: 0,
    distance: 0,
    base: 3.2,
    unit: "stamina",
  },
  projectile: {
    name: "Projectile physics",
    short: "Projectiles",
    currency: "Impulse",
    symbol: "02",
    color: "#ffc379",
    person: "Dr. Noor",
    role: "Ballistics researcher",
    description: "It starts with a rock. It ends near light speed.",
    unlock: 220,
    distance: 1500,
    base: 9,
    unit: "launch energy",
  },
  wheels: {
    name: "Wheeled engineering",
    short: "Wheels",
    currency: "Torque",
    symbol: "03",
    color: "#91cafa",
    person: "Dr. Vega",
    role: "Mechanical engineer",
    description: "Less friction. More wheels. Eventually, rockets.",
    unlock: 600,
    distance: 6000,
    base: 6.4,
    unit: "battery",
  },
};

export const LANES: Record<Program | "global", string[]> = {
  runner: ["Human engine", "Movement", "Field engineering", "Atmospherics"],
  projectile: [
    "Launch mechanics",
    "Flight",
    "Heavy launchers",
    "Particle science",
  ],
  wheels: ["Transmission", "Chassis", "Power", "Road science"],
  global: ["Knowledge", "Support", "Training", "Engineering"],
};
const catalog = {
  runner: RUNNER,
  projectile: PROJECTILE,
  wheels: WHEELS,
  global: SHARED,
};
export const NODES: ResearchNode[] = Object.entries(catalog).flatMap(
  ([program, lanes]) =>
    lanes.flatMap((lane, l) =>
      lane.map(([name, description, effects, icon, ability], tier) => {
        const p = program as Program | "global",
          id = (lane: number, t: number) => p + "-" + lane + "-" + t;
        let requires: string[] = [],
          anyOf: string[] | undefined;
        if (p === "global") {
          if (tier) requires = [id(l, tier - 1)];
          if (tier === 2)
            anyOf = ["runner-2-3", "projectile-2-3", "wheels-2-3"];
        } else if (tier === 0) {
          requires = l === 1 ? [id(0, 0)] : l === 3 ? [id(2, 0)] : [];
        } else if (tier === 1 || tier === 2) requires = [id(l, 0)];
        else if (tier === 3) requires = [id(l, 1), id(l, 2)];
        else if (tier === 4) requires = [id(l, 1)];
        else if (tier === 5) requires = [id(l, 2)];
        else if (tier === 6) anyOf = [id(l, 3), id(l, 4)];
        else requires = [id(l, 5), id(l, 6), id((l + 1) % 4, 3)];
        const stat = Object.keys(effects)[0] as Stat;
        return {
          id: id(l, tier),
          name,
          description,
          program: p,
          lane: l,
          tier,
          cost:
            p === "global"
              ? 40 * Math.pow(4, tier)
              : Math.round(
                  [12, 28, 34, 95, 160, 220, 540, 1400][tier] *
                    (l === 3 ? 1.15 : 1),
                ),
          localCost:
            p === "global" ? 0 : [6, 12, 15, 32, 50, 65, 130, 300][tier],
          requires,
          anyOf,
          kind: "permanent" as const,
          stat,
          power: effects[stat]!,
          effects,
          icon,
          ability,
        };
      }),
    ),
);
export const NODE_MAP = new Map(NODES.map((n) => [n.id, n]));
export const VARIANTS: Record<
  Program,
  {
    id: string;
    name: string;
    node?: string;
    model: string;
    multiplier?: number;
  }[]
> = {
  runner: [{ id: "runner", name: "The volunteer", model: "scientist" }],
  projectile: [
    { id: "rock", name: "Hand-thrown rock", model: "rock" },
    {
      id: "plane",
      name: "Paper airplane",
      node: "projectile-1-0",
      model: "plane",
      multiplier: 1.15,
    },
    {
      id: "sling",
      name: "Slingshot",
      node: "projectile-2-0",
      model: "slingshot",
      multiplier: 2.4,
    },
    {
      id: "cannon",
      name: "Field cannon",
      node: "projectile-2-4",
      model: "cannon",
      multiplier: 15,
    },
    {
      id: "particle",
      name: "Particle accelerator",
      node: "projectile-3-7",
      model: "accelerator",
      multiplier: 10000,
    },
  ],
  wheels: [
    { id: "board", name: "Skateboard", model: "board" },
    {
      id: "cart",
      name: "Soapbox cart",
      node: "wheels-1-1",
      model: "cart",
      multiplier: 1.5,
    },
    {
      id: "bike",
      name: "Bicycle",
      node: "wheels-1-2",
      model: "bike",
      multiplier: 2.4,
    },
    {
      id: "car",
      name: "Land-speed car",
      node: "wheels-1-5",
      model: "car",
      multiplier: 9,
    },
    {
      id: "rocket",
      name: "Rocket sled",
      node: "wheels-1-6",
      model: "rocket",
      multiplier: 30,
    },
  ],
};
