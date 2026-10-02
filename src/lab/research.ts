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
  | "payload"
  | "traction"
  | "cooling"
  | "oxygen"
  | "automation"
  | "overdrive"
  | "aerodynamics";
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
  payload: "Impact data yield",
  traction: "Surface grip",
  cooling: "Heat control",
  oxygen: "Oxygen delivery",
  automation: "Automation",
  overdrive: "Push output",
  aerodynamics: "Airflow efficiency",
};
export const effectLabel = (stat: Stat, value: number) =>
  stat === "wind"
    ? (value >= 0 ? "+" : "−") +
      Math.abs(value * 2).toLocaleString("en", { maximumFractionDigits: 2 }) +
      " m/s tailwind"
    : (value >= 0 ? "+" : "−") +
      Math.abs(value * 100).toLocaleString("en", { maximumFractionDigits: 1 }) +
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
  payload: "Earn more RP from each completed landing measurement.",
  traction: "Retain more speed when the surface becomes rough.",
  cooling: "Reduce the extra heat cost of Push pace above 30 m/s.",
  oxygen: "Reduce frontier resistance and the rate at which fatigue builds.",
  automation: "Shorten the rest between repeated experiments and improve offline laboratory income.",
  overdrive: "Increase the extra speed available at Push pace.",
  aerodynamics: "Reduce the extra energy lost to air resistance above 30 m/s.",
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
  maxRank: number;
  era: number;
  multipliers?: Partial<Record<Stat, number>>;
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
  runner: ["Physiology", "Technique", "Footwear", "Atmospherics", "Augmentation", "Field science"],
  projectile: [
    "Launch mechanics",
    "Flight",
    "Heavy launchers",
    "Measurement & particles",
    "Materials",
    "Control systems",
  ],
  wheels: ["Transmission", "Chassis", "Power", "Road science", "Propulsion", "Vehicle control"],
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
      lane.map(([name, description, effects, icon, ability, ranks, multipliers], tier) => {
        const p = program as Program | "global",
          id = (lane: number, t: number) => p + "-" + lane + "-" + t;
        let requires: string[] = [],
          anyOf: string[] | undefined;
        // Six independent paths. A single, clearly labelled fork joins again
        // inside its own discipline; no other column is ever a prerequisite.
        if (p === "global") {
          if (tier) requires = [id(l, tier - 1)];
        } else if (tier === 4 || tier === 5) requires = [id(l, 3)];
        else if (tier === 6) anyOf = [id(l, 4), id(l, 5)];
        else if (tier) requires = [id(l, tier - 1)];
        const stat = (Object.keys(effects)[0] ?? Object.keys(multipliers ?? {})[0] ?? "yield") as Stat;
        const laneEra = p === "runner" ? [0, 0, 0, 1, 2, 1][l]
          : p === "global" ? 2 : l >= 4 ? 1 : 0;
        const maxRank = ability ? 1 : (ranks ?? (tier === 11 ? 1 : 12));
        const rankMultipliers = { ...multipliers };
        if ((p === "runner" || p === "wheels") && maxRank > 1) {
          if (rankMultipliers.speed) rankMultipliers.speed = Math.pow(rankMultipliers.speed, .3);
          // Twelve ranks per technology should leave space for gear evolution
          // and the next chapter, rather than reaching the simulation ceiling.
          for (const stat of ["stamina", "economy"] as const)
            if (rankMultipliers[stat]) rankMultipliers[stat] = Math.pow(rankMultipliers[stat]!, .65);
        }
        if (p === "runner" && maxRank === 1 && rankMultipliers.speed)
          rankMultipliers.speed = Math.pow(rankMultipliers.speed, .35);
        if (p === "wheels" && maxRank === 1 && rankMultipliers.speed)
          rankMultipliers.speed = Math.pow(rankMultipliers.speed, .12);
        if (p === "projectile" && rankMultipliers.launchSpeed)
          rankMultipliers.launchSpeed = Math.pow(rankMultipliers.launchSpeed, .15);
        return {
          id: id(l, tier),
          name,
          description,
          program: p,
          lane: l,
          tier,
          cost: p === "global" ? [3, 4, 6, 8, 12, 25][tier] : [1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 15, 25][tier],
          localCost: 0,
          maxRank,
          era: p === "global" ? [2, 2, 3, 4, 5, 6][tier]
            : Math.max(laneEra, [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6][tier]),
          multipliers: Object.keys(rankMultipliers).length ? rankMultipliers : undefined,
          requires,
          anyOf,
          choiceGroup:
            p !== "global" && (tier === 4 || tier === 5)
              ? p + "-specialization-" + l
              : undefined,
          kind: "permanent" as const,
          stat,
          power: effects[stat] ?? 0,
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
