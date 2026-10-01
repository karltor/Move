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
  | "luck"
  | "launchSpeed"
  | "drag"
  | "lift"
  | "stability"
  | "reload"
  | "payload";
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
  launchSpeed: "Launch velocity",
  drag: "Aerodynamic efficiency",
  lift: "Wing lift",
  stability: "Launch consistency",
  reload: "Preparation rate",
  payload: "Impulse yield",
};
export const effectLabel = (stat: Stat, value: number) =>
  stat === "wind"
    ? (value >= 0 ? "+" : "−") +
      Math.abs(value * 2).toFixed(1) +
      " m/s tailwind"
    : (value >= 0 ? "+" : "−") +
      Math.round(Math.abs(value * 100)) +
      "% " +
      STAT_LABELS[stat].toLowerCase();
export const STAT_PURPOSE: Record<Stat, string> = {
  speed: "A faster pace covers more ground while you have energy.",
  stamina: "A bigger energy reserve lets you keep moving for longer.",
  yield: "Bring home more RP from the same expedition.",
  xp: "Gain experience faster and level up sooner.",
  acceleration:
    "Get moving faster and regain speed after terrain slows you down.",
  economy: "Spend less energy while moving at the same pace.",
  recovery: "Recover more energy when you ease your pace.",
  resilience: "Slow the buildup of fatigue during a long expedition.",
  wind: "A following wind adds forward speed.",
  luck: "Improve the odds of finding useful equipment in the field.",
  launchSpeed:
    "Increase the speed at release. The projectile still slows under air resistance.",
  drag: "Greater aerodynamic efficiency reduces air resistance during flight.",
  lift: "Paper-plane wings reduce downward acceleration and keep the plane aloft longer.",
  stability: "Keep the actual release angle closer to the chosen angle.",
  reload:
    "Prepare the next projectile sooner. A lower rate means a longer wait.",
  payload:
    "Earn more Impulse from each completed shot. Impulse buys projectile research.",
};
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
  /** Only one specialization in this group may be purchased. */
  choiceGroup?: string;
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
    description: "Improve a scientist's running distance, pace and endurance.",
    unlock: 0,
    distance: 0,
    base: 1.8,
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
    description: "Test throws, gliders and launchers through measured flights.",
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
    description: "Develop faster vehicles and reduce their energy losses.",
    unlock: 600,
    distance: 6000,
    base: 6.4,
    unit: "battery",
  },
};

export const LANES: Record<Program | "global", string[]> = {
  runner: ["Endurance", "Running technique", "Footwear & kit", "Atmospherics"],
  projectile: [
    "Launch mechanics",
    "Flight",
    "Heavy launchers",
    "Measurement & particles",
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
        else if (tier === 3) anyOf = [id(l, 1), id(l, 2)];
        else if (tier === 4) requires = [id(l, 1)];
        else if (tier === 5) requires = [id(l, 2)];
        else if (tier === 6) anyOf = [id(l, 3), id(l, 4), id(l, 5)];
        else {
          requires = [id(l, 6)];
          anyOf = [id(l, 4), id(l, 5)];
        }
        if (p === "runner" && tier === 0) {
          if (l === 1) requires = [id(0, 0), id(2, 0)];
          if (l === 3) requires = [id(2, 3)];
        }
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
              ? 180 * Math.pow(4, tier)
              : Math.round(
                  [15, 24, 28, 70, 120, 165, 380, 950][tier] *
                    (p === "runner" && l === 1 && tier === 0 ? 1.6 : 1) *
                    (l === 3 ? 1.15 : 1),
                ),
          localCost: p === "global" ? 0 : [0, 4, 6, 18, 30, 45, 90, 220][tier],
          requires,
          anyOf,
          choiceGroup:
            p !== "global" && l < 3 && (tier === 1 || tier === 2)
              ? p + "-specialization-" + l
              : undefined,
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
export const choiceAlternatives = (n: ResearchNode) =>
  n.choiceGroup
    ? NODES.filter(
        (other) => other.id !== n.id && other.choiceGroup === n.choiceGroup,
      )
    : [];
export const chosenAlternative = (n: ResearchNode, researched: string[]) =>
  choiceAlternatives(n).find((other) => researched.includes(other.id));
export const runnerDiscoveryCount = (researched: string[]) =>
  researched.filter((id) => NODE_MAP.get(id)?.program === "runner").length;
export const beginnerResearch = (program: Program, researched: string[]) =>
  program === "runner" && runnerDiscoveryCount(researched) < 4;
/** Never offer a permanent specialization without showing its alternative. */
export const firstDiscoveries = (researched: string[]) => {
  const candidates = NODES.filter(
    (n) =>
      n.program === "runner" &&
      !researched.includes(n.id) &&
      !chosenAlternative(n, researched) &&
      n.requires.every((id) => researched.includes(id)) &&
      (!n.anyOf?.length || n.anyOf.some((id) => researched.includes(id))),
  ).sort((a, b) => a.cost - b.cost || a.lane - b.lane);
  const choices: ResearchNode[] = [];
  for (const n of candidates) {
    if (choices.includes(n)) continue;
    const group = [
      n,
      ...choiceAlternatives(n).filter((other) => candidates.includes(other)),
    ];
    if (choices.length + group.length > 3) continue;
    choices.push(...group);
    if (choices.length === 3) break;
  }
  return choices;
};
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
