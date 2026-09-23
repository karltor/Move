export type Program = "runner" | "projectile" | "wheels";
export type Stat = "speed" | "stamina" | "yield" | "xp";
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
  kind: "permanent" | "module";
  stat: Stat;
  power: number;
  penalty?: Stat;
  penaltyPower?: number;
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
    unlock: 120,
    distance: 400,
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
    unlock: 350,
    distance: 1200,
    base: 6.4,
    unit: "battery",
  },
};
export const LANES: Record<Program | "global", string[]> = {
  runner: ["Physiology", "Technique", "Equipment", "Experimental"],
  projectile: [
    "Throwing arm",
    "Aerodynamics",
    "Launch systems",
    "High-energy physics",
  ],
  wheels: ["Drivetrain", "Chassis", "Power systems", "Experimental"],
  global: ["Field science", "Laboratory", "Training", "Engineering"],
};
const names: Record<Program, string[][]> = {
  runner: [
    [
      "Warm-up routine",
      "Aerobic base",
      "Lactate threshold",
      "Dense mitochondria",
      "Efficient lungs",
      "Synthetic tendons",
      "Cellular recovery",
      "Limitless endurance",
    ],
    [
      "Longer stride",
      "Cadence drills",
      "Perfect footstrike",
      "Elastic rebound",
      "Wind reading",
      "Flow state",
      "Neural timing",
      "Perfect motion",
    ],
    [
      "Track shoes",
      "Carbon soles",
      "Compression kit",
      "Active cooling",
      "Exosuit frame",
      "Servo assistance",
      "Kinetic armour",
      "Inertial boots",
    ],
    [
      "Sprint protocol",
      "Altitude training",
      "Biofeedback",
      "Nerve interface",
      "Muscle fibres II",
      "Metabolic overdrive",
      "Quantum stride",
      "Human singularity",
    ],
  ],
  projectile: [
    [
      "Find a good rock",
      "Wrist mechanics",
      "Overarm throw",
      "Rotational launch",
      "Elastic release",
      "Robotic arm",
      "Sonic release",
      "Orbital throw",
    ],
    [
      "Paper airplane",
      "Folded winglets",
      "Glider profile",
      "Carbon airframe",
      "Laminar flow",
      "Hypersonic shape",
      "Plasma envelope",
      "Vacuum tunnel",
    ],
    [
      "Slingshot",
      "Tension bands",
      "Compound launcher",
      "Trebuchet",
      "Field cannon",
      "Coilgun",
      "Railgun",
      "Orbital mass driver",
    ],
    [
      "Motion capture",
      "Impact chamber",
      "Magnetic lenses",
      "Vacuum chamber",
      "Particle injector",
      "Linear accelerator",
      "Synchrotron",
      "Particle accelerator",
    ],
  ],
  wheels: [
    [
      "Ball bearings",
      "Chain drive",
      "Precision gears",
      "Limited-slip axle",
      "Sequential gearbox",
      "Electric differential",
      "Magnetic bearings",
      "Frictionless drive",
    ],
    [
      "Skateboard",
      "Soapbox cart",
      "Bicycle",
      "Racing kart",
      "Streamlined racer",
      "Land-speed car",
      "Rocket sled",
      "Maglev prototype",
    ],
    [
      "Foot power",
      "Flywheel",
      "Electric motor",
      "Battery cooling",
      "Dual motors",
      "Turbine drive",
      "Rocket engine",
      "Fusion drive",
    ],
    [
      "Tyre compound",
      "Grip telemetry",
      "Active suspension",
      "Ground effect",
      "Stability control",
      "Ceramic brakes",
      "Active aero",
      "Inertial control",
    ],
  ],
};
const stats: Stat[] = ["stamina", "speed", "speed", "yield"];
export const NODES: ResearchNode[] = (Object.keys(names) as Program[]).flatMap(
  (program) =>
    names[program].flatMap((lane, col) =>
      lane.map((name, tier) => ({
        id: `${program}-${col}-${tier}`,
        name,
        program,
        lane: col,
        tier,
        description: `${col === 3 ? "Equip to gain" : "Permanently adds"} ${col === 0 ? "12% capacity and recovery" : col === 3 ? "18% research from every trial" : "14% top speed"}. ${tier === 0 ? "The first step of this research line." : "Builds on the previous discovery."}`,
        cost: Math.round(12 * Math.pow(2.05, tier)),
        localCost: Math.round(6 * Math.pow(1.85, tier)),
        requires: [],
        kind: col === 3 ? ("module" as const) : ("permanent" as const),
        stat: stats[col],
        power: col === 0 ? 0.12 : col === 3 ? 0.18 : 0.14,
      })),
    ),
);
for (let lane = 0; lane < 4; lane++)
  for (let tier = 0; tier < 3; tier++)
    NODES.push({
      id: `global-${lane}-${tier}`,
      name: [
        ["Better notebooks", "Peer review", "Open science"],
        ["Sample archive", "Automated analysis", "Research network"],
        ["Team coaching", "Shared techniques", "Collective intelligence"],
        ["Precision tools", "Rapid prototyping", "Unified engineering"],
      ][lane][tier],
      description: [
        "+12% research for all programs.",
        "+12% research for all programs.",
        "+12% experience for all programs.",
        "+12% speed for all programs.",
      ][lane],
      program: "global",
      lane,
      tier,
      cost: 40 * Math.pow(4, tier),
      localCost: 0,
      requires: tier ? [`global-${lane}-${tier - 1}`] : [],
      kind: "permanent",
      stat: lane === 2 ? "xp" : lane === 3 ? "speed" : "yield",
      power: 0.12,
    });
// A directed research web: entry points, alternative paths and hybrid discoveries.
// Deep hybrids require knowledge from two disciplines. Alternate paths are OR gates.
for (const n of NODES) {
  if (n.program === "global") {
    if (n.tier === 2) n.anyOf = ["runner-2-2", "projectile-2-2", "wheels-2-2"];
    continue;
  }
  const id = (lane: number, tier: number) =>
    n.program + "-" + lane + "-" + tier;
  if (n.tier === 0) {
    n.requires = n.lane === 2 ? [id(0, 0)] : n.lane === 3 ? [id(1, 0)] : [];
  } else if ([3, 5, 7].includes(n.tier)) {
    n.requires = [id(n.lane, n.tier - 1), id((n.lane + 1) % 4, n.tier - 1)];
  } else if (n.tier === 1) {
    n.requires = [id(n.lane, 0)];
  } else {
    n.requires = [];
    n.anyOf = [id(n.lane, n.tier - 1), id((n.lane + 3) % 4, n.tier - 1)];
  }
  n.kind =
    n.lane === 3 ||
    (n.lane === 1 && n.tier === 4) ||
    (n.lane === 0 && n.tier === 6)
      ? "module"
      : "permanent";
  if (n.kind === "module") {
    const options: Stat[] = ["speed", "stamina", "xp", "yield"];
    n.stat = options[(n.tier + n.lane) % 4];
    n.power = 0.28 + n.tier * 0.065;
    n.penalty = n.stat === "speed" ? "stamina" : "speed";
    n.penaltyPower = 0.1;
    n.description =
      "Equip for +" +
      Math.round(n.power * 100) +
      "% " +
      {
        speed: "speed",
        stamina: "stamina capacity",
        xp: "experience",
        yield: "research",
      }[n.stat] +
      ", but −10% " +
      (n.penalty === "speed" ? "speed" : "capacity") +
      ". One of three build slots. Swap freely.";
  } else {
    n.power = (n.lane === 0 ? 0.16 : 0.18) * (1 + n.tier * 0.4);
    n.description =
      "Permanently adds " +
      Math.round(n.power * 100) +
      "% " +
      (n.stat === "stamina"
        ? "stamina capacity"
        : n.stat === "speed"
          ? "speed"
          : "research") +
      ". " +
      ([3, 5, 7].includes(n.tier)
        ? "A hybrid breakthrough: combine both connected disciplines."
        : n.anyOf?.length
          ? "Reach this discovery through either connected path."
          : "Opens new paths in the research web.");
  }
}
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
