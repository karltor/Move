import { rollGear, random, validateGear, gearEffects, gearMultipliers, type Gear } from "./equipment";
import { currentEra, DEVELOPMENT_PROJECTS } from './development';
import {
  advanceFlight,
  initialBallistic,
  launchFlight,
  predictFlight,
  SHOTS_PER_TRIAL,
  type BallisticState,
  type FlightConfig,
} from "./ballistics";
import {
  NODES,
  NODE_MAP,
  PROGRAMS,
  VARIANTS,
  type Program,
  type Stat,
} from "./research";
export interface Progress {
  xp: number;
  funds: number;
  trials: number;
  best: number;
  distance: number;
  bestDistance: number;
  variant: string;
}
export interface Trial {
  maxTime?: number;
  time: number;
  distance: number;
  speed: number;
  energy: number;
  fatigue: number;
  peak: number;
  samples: number;
  rations: number;
  supplyCooldown: number;
  nextEvent: number;
  event: number | null;
  route: "normal" | "shade" | "fast";
  restTime: number;
  lastMilestone: number;
  lastXP: number;
  rng: number;
  nextDrop: number;
  drops: string[];
  secondWind: number;
  usedSecondWind: boolean;
  ballistic?: BallisticState;
  lastEvent?: number;
  routeTime?: number;
}
export interface Result {
  id: number;
  program: Program;
  science: number;
  funds: number;
  xp: number;
  speed: number;
  distance: number;
  duration: number;
}
export interface Save {
  version: 2;
  science: number;
  talentPoints: number;
  vouchers: number;
  currencyBought: { talent: number; voucher: number };
  talentRanks: Record<string, number>;
  development: Record<string, number>;
  debriefPending: boolean;
  sampleDuration: number;
  program: Program;
  unlocked: Program[];
  progress: Record<Program, Progress>;
  researched: string[];
  modules: string[];
  inventory: Gear[];
  equipped: string[];
  nextGear: number;
  lastDrop: string | null;
  auto: boolean;
  pace: "steady" | "push" | "recover";
  launchAngle: number;
  trial: Trial | null;
  rest: number;
  history: Result[];
  lastActive: number;
  offline: number;
  notice: string;
  storySeen: string[];
  tipsEnabled: boolean;
}
export const SAVE_KEY = "move.expedition.v2";
export const BIOMES = [
  {
    name: "City limits",
    short: "City",
    start: 0,
    end: 100,
    color: "#c1c6be",
    sky: "#c0cdd2",
    terrain: "Pavement",
    drain: 1,
  },
  {
    name: "Lanternwood trail",
    short: "Forest",
    start: 100,
    end: 1000,
    color: "#667d56",
    sky: "#a6bdb1",
    terrain: "Woodland trail",
    drain: 1.06,
  },
  {
    name: "Open countryside",
    short: "Country",
    start: 1000,
    end: 10000,
    color: "#a8b772",
    sky: "#c9d5cd",
    terrain: "Country road",
    drain: 1.02,
  },
  {
    name: "Redstone desert",
    short: "Desert",
    start: 10000,
    end: 100000,
    color: "#c6a178",
    sky: "#e1cdb0",
    terrain: "Sun-baked highway",
    drain: 1.25,
  },
  {
    name: "Alpine frontier",
    short: "Alpine",
    start: 100000,
    end: 1000000,
    color: "#96a9ac",
    sky: "#c5dce2",
    terrain: "Mountain pass",
    drain: 1.4,
  },
  {
    name: "Aurora expanse",
    short: "Aurora",
    start: 1000000,
    end: Infinity,
    color: "#4a6165",
    sky: "#283948",
    terrain: "The unknown",
    drain: 1.5,
  },
];
export const biomeAt = (d: number) =>
  BIOMES.find((b) => d >= b.start && d < b.end) ?? BIOMES[BIOMES.length - 1];
export function biomeBlend(distance: number) {
  for (let i = 1; i < BIOMES.length; i++) {
    const boundary = BIOMES[i].start,
      width = Math.min(500, Math.max(30, boundary * 0.04));
    if (distance >= boundary - width && distance <= boundary + width) {
      const u = (distance - boundary + width) / (width * 2);
      return { from: i - 1, to: i, mix: u * u * (3 - 2 * u) };
    }
  }
  const index = BIOMES.indexOf(biomeAt(distance));
  return { from: index, to: index, mix: 0 };
}
export const distance = (d: number) =>
  d >= 1000
    ? (d / 1000).toLocaleString("en", {
        maximumFractionDigits: d >= 100000 ? 0 : 2,
      }) + " km"
    : Math.floor(d) + " m";
export const clock = (s: number) =>
  Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
export function fresh(): Save {
  const p = (variant: string): Progress => ({
    xp: 0,
    funds: 0,
    trials: 0,
    best: 0,
    distance: 0,
    bestDistance: 0,
    variant,
  });
  return {
    version: 2,
    storySeen: [],
    tipsEnabled: true,
    science: 0,
    talentPoints: 0,
    vouchers: 0,
    currencyBought: { talent: 0, voucher: 0 },
    talentRanks: {},
    development: {},
    debriefPending: false,
    sampleDuration: 0,
    program: "runner",
    unlocked: ["runner"],
    progress: {
      runner: p("runner"),
      projectile: p("rock"),
      wheels: p("board"),
    },
    researched: [],
    modules: [],
    inventory: [],
    equipped: [],
    nextGear: 1,
    lastDrop: null,
    auto: false,
    pace: "steady",
    launchAngle: 45,
    trial: null,
    rest: 0,
    history: [],
    lastActive: Date.now(),
    offline: 0,
    notice:
      "A long road starts here. Set a sustainable pace and see how far the team can go.",
  };
}
const ADVANCED_XP = 35 * 99 * 99;
export function level(xp: number) {
  if (!Number.isFinite(xp)) return 1;
  if (xp < ADVANCED_XP) return Math.floor(Math.sqrt(Math.max(0, xp) / 35)) + 1;
  let value = 100 + Math.floor(Math.log1p((xp - ADVANCED_XP) * .12 / 7000) / Math.log(1.12));
  // Verify the boundary instead of rounding the logarithm across a level.
  while (value > 100 && xp < levelStart(value)) value--;
  while (xp >= levelStart(value + 1)) value++;
  return value;
}
export const levelStart = (l: number) => l <= 100
  ? 35 * (l - 1) * (l - 1)
  : ADVANCED_XP + 7000 * (Math.pow(1.12, l - 100) - 1) / .12;
export function stats(s: Save, p = s.program) {
  const out: Record<Stat, number> = {
    speed: 1,
    stamina: 1,
    yield: 1,
    xp: 1,
    acceleration: 1,
    economy: 1,
    recovery: 1,
    resilience: 1,
    wind: 1,
    luck: 1,
    launchSpeed: 1,
    drag: 1,
    lift: 1,
    stability: 1,
    reload: 1,
    payload: 1,
    traction: 1,
    cooling: 1,
    oxygen: 1,
    automation: 1,
    overdrive: 1,
    aerodynamics: 1,
  };
  for (const id of s.researched) {
    const n = NODE_MAP.get(id);
    if (n && (n.program === p || n.program === "global")) {
      for (const [stat, value] of Object.entries(n.effects))
        out[stat as Stat] += value * talentRank(s, id);
    }
  }
  for (const item of s.inventory) {
    if (item.program === p && s.equipped.includes(item.id))
      for (const [stat, value] of Object.entries(gearEffects(item))) out[stat as Stat] += value;
  }
  for (const project of DEVELOPMENT_PROJECTS) {
    const ranks = s.development[project.id] ?? 0;
    for (const [stat,value] of Object.entries(project.effects ?? {})) out[stat as Stat] += value * ranks;
  }
  const lv = level(s.progress[p].xp);
  if (p === "projectile") {
    out.launchSpeed += (lv - 1) * 0.025;
    out.stability += (lv - 1) * 0.03;
  } else {
    out.stamina += (lv - 1) * 0.08;
    out.speed += (lv - 1) * 0.03;
  }
  // Additive training is combined first. Physical breakthroughs then multiply
  // the result, so bionic and field technologies create new speed scales.
  for (const id of s.researched) {
    const n=NODE_MAP.get(id);
    if (n && (n.program===p || n.program==='global'))
      for (const [stat,value] of Object.entries(n.multipliers ?? {})) out[stat as Stat] *= Math.pow(value,talentRank(s,id));
  }
  for (const item of s.inventory) if(item.program===p && s.equipped.includes(item.id))
    for(const [stat,value] of Object.entries(gearMultipliers(item))) out[stat as Stat] *= value;
  for (const project of DEVELOPMENT_PROJECTS) for(const [stat,value] of Object.entries(project.multipliers ?? {}))
    out[stat as Stat] *= Math.pow(value,s.development[project.id] ?? 0);
  for(const stat of Object.keys(out) as Stat[]) out[stat]=Math.max(.15,Math.min(1e12,out[stat]));
  return out;
}
export const era = currentEra;
export const talentRank = (s: Save,id:string) => s.talentRanks[id] ?? (s.researched.includes(id) ? 1 : 0);
/** Learn the basics once; the clinic opens repeatable training afterwards. */
export const talentLimit = (s: Save,id:string) => {
  const node = NODE_MAP.get(id);
  return node ? (currentEra(s) === 0 ? 1 : node.maxRank) : 0;
};
export const talentCost = (_s: Save,id:string) => NODE_MAP.get(id)?.cost ?? Infinity;
export const spentTalents = (s: Save) => s.researched.reduce((total,id)=>total+talentRank(s,id),0);
export function grantRP(s:Save,amount:number):Save {
  if(!Number.isFinite(amount) || amount<=0)return s;
  return {...s,science:Math.min(1e15,s.science+Math.min(10000000,Math.floor(amount))),notice:'Test RP added.'};
}
export const totalTrials = (s: Save) =>
  Object.values(s.progress).reduce((a, p) => a + p.trials, 0);
export const totalDistance = (s: Save) =>
  Object.values(s.progress).reduce((a, p) => a + p.distance, 0) +
  (s.trial?.distance ?? 0);
export const equipmentUnlocked = (s: Save) =>
  totalTrials(s) >= 2 || s.vouchers > 0 || s.inventory.length > 0;
export const sharedUnlocked = (s: Save) =>
  currentEra(s) >= 2;
export function trainingProgress(s: Save) {
  const xp = s.progress[s.program].xp,
    lv = level(xp);
  const current = xp - levelStart(lv),
    needed = levelStart(lv + 1) - levelStart(lv);
  return {
    level: lv,
    current,
    needed,
    progress: current / needed,
    earned: s.trial?.lastXP ?? 0,
  };
}

/** Resistance ramps before a frontier, then eases on entering the next region. */
export function frontierPressure(distance: number) {
  const index = BIOMES.indexOf(biomeAt(distance)),
    region = BIOMES[index];
  if (!Number.isFinite(region.end)) return Math.pow(2.2, index);
  const u = Math.max(
    0,
    Math.min(1, (distance - region.start) / (region.end - region.start)),
  );
  return Math.pow(2.2, index) * (1 + 5 * Math.pow(u, 3));
}

/** Shared by the actual surface patches and their movement effects. */
export function routeSegment(d: number) {
  const bio = biomeAt(d),
    region = BIOMES.indexOf(bio);
  const length = region === 0 ? 36 : 60 + region * 20;
  const segment = Math.floor(d / length),
    phase = (d % length) / length;
  const kind = segment % 3;
  return {
    kind: (kind === 1 ? "effort" : kind === 2 ? "recovery" : "easy") as
      "easy" | "effort" | "recovery",
    phase,
    region,
    length,
  };
}
/** Rough paving/trail slows movement; there are no invisible hills. */
export function routeChallenge(s: Save) {
  const d = s.trial?.distance ?? 0;
  const { kind: segmentKind, phase, region, length } = routeSegment(d);
  const kind =
    segmentKind === "effort" ? 1 : segmentKind === "recovery" ? 2 : 0;
  const effort = kind === 1,
    recovery = kind === 2;
  const names =
    region === 0
      ? ["Open pavement", "Roadworks", "Smooth pavement"]
      : region === 1
        ? ["Firm trail", "Rough trail", "Packed gravel"]
        : ["Open road", "Broken surface", "Smooth road"];
  const pressure = frontierPressure(d);
  const st = stats(s);
  const speedPenalty = .38 / Math.sqrt(st.traction);
  let terrainDrain = 1 + (pressure * (effort ? 1.25 : recovery ? .78 : 1) - 1) / Math.sqrt(st.oxygen);
  if (hasAbility(s, "trailcraft") && d >= 70) terrainDrain = 1 + (terrainDrain - 1) * .65;
  const bio = biomeAt(d);
  if ((bio.short === "Desert" && hasAbility(s, "heat")) || (bio.short === "Alpine" && hasAbility(s, "altitude"))) terrainDrain = 1 + (terrainDrain - 1) * .5;
  return {
    name: names[kind],
    description: effort
      ? `Uneven footing: ${Math.round(speedPenalty * 100)}% slower. Traction reduces the slowdown; acceleration restores speed afterwards.`
      : recovery
        ? "Smooth footing: 8% faster, 22% less energy use."
        : "Normal footing. No surface penalty.",
    progress: phase,
    remaining: length - (d % length),
    difficulty: (effort ? "effort" : recovery ? "recovery" : "easy") as
      "effort" | "recovery" | "easy",
    drainMultiplier: terrainDrain,
    speedMultiplier: effort ? 1 - speedPenalty : recovery ? 1.08 : 1,
  };
}
export function available(s: Save, id: string) {
  const n = NODE_MAP.get(id);
  return (
    !!n &&
    currentEra(s) >= n.era &&
    talentRank(s,id) < talentLimit(s,id) &&
    (!n.choiceGroup ||
      !s.researched.some(
        (owned) => owned !== id && NODE_MAP.get(owned)?.choiceGroup === n.choiceGroup,
      )) &&
    n.requires.every((r) => s.researched.includes(r)) &&
    (!n.anyOf?.length || n.anyOf.some((r) => s.researched.includes(r))) &&
    (n.program === "global"
      ? sharedUnlocked(s)
      : s.unlocked.includes(n.program))
  );
}
export function afford(s: Save, id: string) {
  const n = NODE_MAP.get(id);
  return (
    !!n &&
    available(s, id) &&
    s.talentPoints >= talentCost(s,id)
  );
}
export function research(s: Save, id: string): Save {
  if (!afford(s, id)) return s;
  const n = NODE_MAP.get(id)!;
  return {
    ...s,
    talentPoints: s.talentPoints - talentCost(s,id),
    researched: s.researched.includes(id) ? s.researched : [...s.researched,id],
    talentRanks: {...s.talentRanks,[id]:talentRank(s,id)+1},
    notice: n.name + (currentEra(s) === 0 ? " learned." : " · rank " + (talentRank(s,id)+1) + "/" + n.maxRank + "."),
  };
}
export function equipGear(s: Save, id: string): Save {
  const item = s.inventory.find((g) => g.id === id);
  if (!item || s.trial) return s;
  if (s.equipped.includes(id))
    return { ...s, equipped: s.equipped.filter((x) => x !== id) };
  const equipped = s.equipped.filter((x) => {
    const g = s.inventory.find((g) => g.id === x);
    return g && (g.program !== item.program || g.slot !== item.slot);
  });
  return {
    ...s,
    equipped: [...equipped, id],
    notice: item.name + " equipped.",
  };
}
export function salvageGear(s: Save, id: string): Save {
  const item = s.inventory.find((g) => g.id === id);
  if (!item || s.equipped.includes(id) || s.trial) return s;
  return {
    ...s,
    inventory: s.inventory.filter((g) => g.id !== id),
    science: s.science + item.affixes.length * 5,
  };
}
export const suppliesUnlocked = (s: Save) =>
  s.development['supply-lab'] > 0 || s.researched.includes("global-1-1");
export const hasAbility = (s: Save, ability: string) =>
  s.researched.some((id) => {
    const n = NODE_MAP.get(id);
    return (
      n?.ability === ability &&
      (n.program === s.program || n.program === "global")
    );
  });
export function programDiscovered(s: Save, p: Program) {
  if (s.unlocked.includes(p)) return true;
  if (p === "projectile")
    return (
      totalTrials(s) >= 3 &&
      totalDistance(s) >= PROGRAMS[p].distance &&
      s.progress.runner.bestDistance >= 1000 &&
      s.researched.filter((id) => id.startsWith("runner-")).length >= 4
    );
  if (p === "wheels")
    return (
      s.unlocked.includes("projectile") &&
      totalTrials(s) >= 6 &&
      totalDistance(s) >= 6000
    );
  return true;
}
export function selectProgram(s: Save, p: Program): Save {
  if (s.program === p || s.trial) return s;
  if (!s.unlocked.includes(p)) {
    if (
      !programDiscovered(s, p) ||
      s.science < PROGRAMS[p].unlock ||
      totalDistance(s) < PROGRAMS[p].distance
    )
      return s;
    s = {
      ...s,
      science: s.science - PROGRAMS[p].unlock,
      unlocked: [...s.unlocked, p],
    };
  }
  return {
    ...s,
    program: p,
    rest: 0,
    notice:
      PROGRAMS[p].name +
      " selected. All research and training stays with the team.",
  };
}
export function start(
  s: Save,
  seed = Math.floor(Math.random() * 4294967296),
): Save {
  return s.trial
    ? s
    : {
        ...s,
        debriefPending: false,
        rest: 0,
        trial: {
          maxTime: s.program==='projectile' ? 0 : s.sampleDuration,
          time: 0,
          distance: 0,
          speed: hasAbility(s, "rolling-start")
            ? PROGRAMS[s.program].base * stats(s).speed * 0.5
            : 0,
          energy: 100 * stats(s).stamina,
          fatigue: 0,
          peak: 0,
          samples: 0,
          rations: suppliesUnlocked(s) ? 3 : 0,
          supplyCooldown: 0,
          nextEvent: 30,
          event: null,
          route: "normal",
          restTime: 0,
          lastMilestone: 0,
          lastXP: 0,
          rng: seed >>> 0,
          nextDrop: 28 + ((seed >>> 0) % 18),
          drops: [],
          secondWind: 0,
          usedSecondWind: false,
          ...(s.program === "projectile"
            ? { ballistic: initialBallistic() }
            : {}),
        },
        notice:
          s.program === "projectile"
            ? "Six shots. Landings earn RP and training XP."
            : "Experiment underway.",
      };
}
export function supply(s: Save): Save {
  if (
    s.program === "projectile" ||
    !suppliesUnlocked(s) ||
    !s.trial ||
    s.trial.rations <= 0 ||
    s.trial.supplyCooldown > 0
  )
    return s;
  const t = s.trial;
  const capacity = 100 * stats(s).stamina;
  return {
    ...s,
    trial: {
      ...t,
      rations: t.rations - 1,
      energy: Math.min(
        capacity - t.fatigue,
        t.energy + capacity * (hasAbility(s, "hydration") ? 0.37 : 0.27),
      ),
      supplyCooldown: hasAbility(s, "hydration") ? 30 : 45,
    },
    notice:
      s.program === "runner"
        ? "Field ration used. Energy restored; long-term fatigue remains."
        : "Spare energy pack installed. Three per expedition.",
  };
}
export const EVENTS = [
  {
    title: "A fork in the trail",
    text: "The direct route is exposed. The shaded path is easier on the team.",
    a: "Take the shade",
    ad: "−8% stamina drain · −6% speed",
    b: "Take the shortcut",
    bd: "+6% speed · +12% stamina drain",
  },
  {
    title: "An interesting discovery",
    text: "A strange sample could help the lab. Collect it, or keep your rhythm?",
    a: "Collect the sample",
    ad: "+3 research at finish · +8 fatigue",
    b: "Keep moving",
    bd: "+1 RP at finish · no detour",
  },
  {
    title: "Field support station",
    text: "The support crew has a place to rest. Is the lost time worth the recovery?",
    a: "Take an 8s break",
    ad: "Restore 8% stamina · lose 2 fatigue",
    b: "Press on",
    bd: "+2 research at finish · keep pace",
  },
  {
    title: "A delivery trolley",
    text: "A trolley blocks the pavement. Go around it or slow down to pass?",
    a: "Go around",
    ad: "+6% speed · +12% energy use for 30s",
    b: "Slow down and pass",
    bd: "−6% speed · −8% energy use for 30s",
  },
  {
    title: "Water from the support crew",
    text: "The crew offers a cup at the roadside. A short stop restores some energy.",
    a: "Stop for 4 seconds",
    ad: "Restore 5% energy",
    b: "Keep running",
    bd: "+1 RP at finish",
  },
  {
    title: "A loose route marker",
    text: "The marker has fallen over. Photograph it for the lab, or leave it to the crew?",
    a: "Take a photograph",
    ad: "+2 RP at finish · +3 fatigue",
    b: "Leave it to the crew",
    bd: "Keep pace",
  },
];
export function eventDetails(s: Save) {
  const e = EVENTS[s.trial?.event ?? 0];
  return {
    ...e,
    ad: e.ad.split("Endurance").join("RP"),
    bd: e.bd.split("Endurance").join("RP"),
  };
}
export function decide(s: Save, choice: "a" | "b"): Save {
  const t = s.trial;
  if (!t || t.event === null) return s;
  const event = t.event;
  const [delay, seed] = random(t.rng);
  const next = {
    ...t,
    event: null,
    lastEvent: event,
    rng: seed,
    nextEvent: t.time + 24 + delay * 24,
  };
  let progress = s.progress;
  if (event === 0 || event === 3) {
    next.route = choice === (event === 0 ? "a" : "b") ? "shade" : "fast";
    next.routeTime = 30;
  }
  if (event === 1) {
    if (choice === "a") {
      next.samples += 3;
      next.fatigue += 8;
    } else next.samples += 1;
  }
  if (event === 2) {
    if (choice === "a") {
      next.restTime = 8;
      next.fatigue = Math.max(0, next.fatigue - 2);
      next.energy = Math.min(
        100 * stats(s).stamina - next.fatigue,
        next.energy + 8 * stats(s).stamina,
      );
    } else next.samples += 2;
  }
  if (event === 4) {
    if (choice === "a") {
      next.restTime = 4;
      next.energy = Math.min(
        100 * stats(s).stamina - next.fatigue,
        next.energy + 5 * stats(s).stamina,
      );
    } else next.samples += 1;
  }
  if (event === 5 && choice === "a") {
    next.samples += 2;
    next.fatigue += 3;
  }
  return {
    ...s,
    trial: next,
    progress,
    notice: EVENTS[event][choice] + ". The expedition continues.",
  };
}
export function pendingRewards(s: Save) {
  const t = s.trial,
    st = stats(s);
  if (!t) return { science: 0, funds: 0, xp: 0 };
  if (s.program === "projectile")
    return {
      science: t.ballistic?.science ?? 0,
      funds: t.ballistic?.funds ?? 0,
      xp: 0,
    };
  const survey = hasAbility(s, "survey")
    ? BIOMES.filter((b) => b.start > 0 && b.start <= t.distance).length * 5
    : 0;
  // A reading from a few seconds of motion is thin evidence. This curve makes
  // full expeditions more valuable per minute than repeatedly restarting.
  const observation = Math.pow(Math.min(1, t.time / 65), 1.5);
  return {
    science: Math.floor(
      (Math.sqrt(t.distance) * 2.1 + t.samples + survey) *
        st.yield * (1+Math.log10(1+t.distance/1000)) *
        observation,
    ),
    funds: Math.floor(Math.sqrt(t.distance) * 0.5),
    xp: 0,
  };
}
export function finish(s: Save): Save {
  const t = s.trial;
  if (!t) return s;
  const p = s.progress[s.program];
  const { science, funds, xp } = pendingRewards(s);
  const result: Result = {
    id: totalTrials(s) + 1,
    program: s.program,
    science,
    funds,
    xp: t.lastXP,
    speed: t.peak,
    distance: t.distance,
    duration: t.time,
  };
  return {
    ...s,
    trial: null,
    debriefPending: !s.auto,
    rest: s.auto ? Math.max(1,7 / Math.sqrt(stats(s).automation)) : 0,
    science: Math.min(1e15,s.science + science),
    progress: {
      ...s.progress,
      [s.program]: {
        ...p,
        xp: p.xp + xp,
        funds: p.funds + funds,
        trials: p.trials + 1,
        best: Math.max(p.best, t.peak),
        bestDistance: Math.max(p.bestDistance, t.distance),
        distance: p.distance + t.distance,
      },
    },
    history: [result, ...s.history].slice(0, 30),
    notice:
      distance(t.distance) +
      " logged. +" +
      science +
      " RP · +" +
      t.lastXP +
      (s.program === "projectile"
        ? " XP from landed shots."
        : " XP earned along the route."),
  };
}
export function projectilePhysics(s: Save): FlightConfig {
  const variant = s.progress.projectile.variant;
  const st = stats(s, "projectile");
  const base =
    variant === "plane"
      ? 11
      : variant === "sling"
        ? 28
        : variant === "cannon"
          ? 70
          : variant === "particle"
            ? 400
            : 12;
  const angle = hasAbility(s, "angle-control")
    ? s.launchAngle
    : variant === "particle"
      ? 2
      : 45;
  return {
    speed: Math.min(1e7,base * Math.max(0.2, st.launchSpeed) * Math.max(0.5, st.speed)),
    angle,
    height:
      variant === "sling"
        ? 1.1
        : variant === "particle"
          ? 1
          : variant === "cannon"
            ? 0.8 + Math.hypot(1.6, 0.65) * Math.sin((angle * Math.PI) / 180)
            : 1.45,
    drag:
      (variant === "plane"
        ? 0.009
        : variant === "cannon"
          ? 0.0015
          : variant === "particle"
            ? 0.0008
            : 0.0035) / Math.max(0.2, st.drag),
    lift: variant === "plane" ? 0.03 * Math.max(0.2, st.lift) : 0,
    reload:
      (variant === "cannon" ? 5 : variant === "particle" ? 4 : 3) /
      Math.max(0.25, st.reload),
    charged: hasAbility(s, "charged-launch"),
    skip: hasAbility(s, "skip-shot") && variant === "rock",
  };
}
export function projectileFlight(s: Save) {
  const b = s.trial?.ballistic;
  return {
    phase: b?.phase ?? "prepare",
    x: b?.x ?? 0,
    y: b?.y ?? 0,
    completed: b?.completed ?? 0,
    remaining: SHOTS_PER_TRIAL - (b?.completed ?? 0),
    lastRange: b?.lastRange ?? 0,
    clockRate: projectileClockRate(b?.config ?? projectilePhysics(s)),
    angle:
      b?.phase === "flight"
        ? (b.config?.angle ?? projectilePhysics(s).angle)
        : projectilePhysics(s).angle,
    predicted: hasAbility(s, "rangefinder")
      ? predictFlight(b?.config ?? projectilePhysics(s)).range
      : null,
  };
}
/** High-energy trajectories use an accelerated flight clock, with SI gravity
 * and distance unchanged. A long flight need not become hours of idle UI. */
export function projectileClockRate(config:FlightConfig) {
  return Math.min(25000,Math.max(1,config.speed/400));
}
function stepProjectile(s: Save, dt: number): Save {
  const t = { ...s.trial! },
    config = projectilePhysics(s),
    st = stats(s);
  let b = { ...(t.ballistic ?? initialBallistic()) };
  t.time += dt;
  t.energy = 100;
  t.fatigue = 0;
  t.event = null;
  let progress = s.progress,
    next: Save = { ...s, trial: t };
  if (b.phase === "prepare") {
    b.phaseTime += dt;
    const charge = config.charged && (b.shots + 1) % 3 === 0 ? 1.5 : 0;
    if (b.phaseTime >= config.reload + charge) {
      const [roll, seed] = random(t.rng);
      t.rng = seed;
      b = launchFlight(
        b,
        config,
        ((roll - 0.5) * 8) / Math.max(0.2, st.stability),
      );
    }
  } else if (b.phase === "flight") {
    b = advanceFlight(b, dt*projectileClockRate(b.config ?? config), config);
    t.speed = Math.hypot(b.vx, b.vy);
    t.peak = Math.max(t.peak, t.speed);
    if (b.phase === "landed") {
      b.completed += 1;
      b.lastRange = b.x;
      b.totalRange += b.x;
      t.distance = Math.max(t.distance, b.x);
      b.science += Math.max(1, Math.floor(Math.sqrt(b.x) * 1.3 * st.yield * st.payload * (1+Math.log10(1+b.x/1000))));
      b.funds += Math.max(1, Math.floor(Math.sqrt(b.x) * 0.35 * st.payload));
      const earned = Math.max(1, Math.floor(Math.sqrt(b.x) * 0.7 * st.xp));
      t.lastXP += earned;
      progress = {
        ...s.progress,
        projectile: {
          ...s.progress.projectile,
          xp: s.progress.projectile.xp + earned,
        },
      };
      b.phaseTime = 0;
      if (equipmentUnlocked(s)) {
        const [roll, seed] = random(t.rng);
        t.rng = seed;
        if (roll < Math.min(0.4, 0.1 * st.luck) && s.inventory.length < 90) {
          const drop = rollGear("projectile", b.x, t.rng, s.nextGear, st.luck);
          t.rng = drop.seed;
          t.drops = [...t.drops, drop.gear.id];
          next = {
            ...next,
            inventory: [...s.inventory, drop.gear],
            nextGear: s.nextGear + 1,
            lastDrop: drop.gear.id,
          };
        }
      }
    }
  } else {
    t.speed = 0;
    b.phaseTime += dt;
    if (b.phaseTime >= 1.1) {
      if (b.completed >= SHOTS_PER_TRIAL) {
        t.ballistic = b;
        return finish({ ...next, progress, trial: t });
      }
      b = {
        ...b,
        phase: "prepare",
        phaseTime: 0,
        x: 0,
        y: config.height,
        vx: 0,
        vy: 0,
        config: undefined,
      };
    }
  }
  t.ballistic = b;
  return { ...next, progress, trial: t };
}
export function step(s: Save, dt: number): Save {
  if (!Number.isFinite(dt) || dt <= 0) return s;
  dt = Math.min(0.5, dt);
  if (!s.trial) {
    if (s.auto && s.rest > 0) {
      const rest = Math.max(0, s.rest - dt);
      return rest === 0 ? start({ ...s, rest: 0 }) : { ...s, rest };
    }
    return s;
  }
  if (s.program === "projectile") return stepProjectile(s, dt);
  const t = { ...s.trial };
  const st = stats(s);
  const challenge = routeChallenge(s);
  const terrainDrain = challenge.drainMultiplier;
  if (
    hasAbility(s, "second-wind") &&
    !t.usedSecondWind &&
    t.energy < 25 * st.stamina
  ) {
    t.usedSecondWind = true;
    t.secondWind = 12;
  }
  t.secondWind = Math.max(0, (t.secondWind ?? 0) - dt);
  t.time += dt;
  t.supplyCooldown = Math.max(0, t.supplyCooldown - dt);
  t.routeTime = Math.max(0, (t.routeTime ?? 0) - dt);
  if (t.routeTime === 0) t.route = "normal";
  if (t.event !== null && t.time >= t.nextEvent + 15) {
    t.event = null;
    t.lastEvent = s.trial.event ?? undefined;
    const [delay, seed] = random(t.rng);
    t.rng = seed;
    t.nextEvent = t.time + 24 + delay * 24;
  }
  if (totalTrials(s) >= 3 && t.event === null && t.time >= t.nextEvent) {
    const [roll, seed] = random(t.rng);
    t.rng = seed;
    // Reproducible saves, varied expeditions, and no immediate repeated event.
    const eligible = EVENTS.map((_, i) => i).filter(
      (i) =>
        i !== t.lastEvent && (biomeAt(t.distance).short === "City" || i !== 3),
    );
    t.event = eligible[Math.floor(roll * eligible.length)];
  }
  const resting = t.restTime > 0;
  t.restTime = Math.max(0, t.restTime - dt);
  const maxEnergy = 100 * st.stamina - t.fatigue;
  t.fatigue +=
    (dt *
      (resting
        ? 0.1
        : s.pace === "push"
          ? 0.3
          : s.pace === "recover"
            ? 0.2
            : 0.13) *
      Math.sqrt(terrainDrain)) /
    (st.resilience * Math.sqrt(st.oxygen));
  const routeDrain =
    t.route === "shade"
      ? 0.92
      : t.route === "fast" && !hasAbility(s, "shortcut")
        ? 1.12
        : 1;
  const drain =
    ((resting
      ? (-0.3 * st.recovery) / terrainDrain
      : s.pace === "recover"
        ? (-0.55 * st.recovery) / terrainDrain
        : s.pace === "push"
          ? 2.08
          : 0.8) *
      terrainDrain *
      routeDrain) /
    (s.pace === "recover" || resting ? 1 : st.economy);
  // Cooling and streamlining become useful when assisted movement is fast
  // enough to generate substantial heat and drag. They do not punish a new
  // runner moving at ordinary walking/running speeds.
  const heat = s.pace==='push' ? 1+Math.log2(1+Math.max(0,t.speed-30)/100)/Math.sqrt(st.cooling) : 1;
  const dragLoss = 1+Math.log2(1+Math.max(0,t.speed-30)/1000)/Math.sqrt(st.aerodynamics);
  t.energy = Math.max(
    0,
    Math.min(
      maxEnergy,
      t.energy -
        drain * dt * (s.pace==='recover' || resting ? 1 : heat*dragLoss) +
        (t.secondWind > 0 && s.pace === "steady" ? 0.8 * dt * st.recovery : 0),
    ),
  );
  const vehicle = VARIANTS[s.program].find(
    (v) => v.id === s.progress[s.program].variant,
  );
  const multiplier = vehicle?.multiplier ?? 1;
  const goal = resting
    ? 0
    : (PROGRAMS[s.program].base * st.speed * multiplier + (st.wind - 1) * 2) *
      (hasAbility(s, "negative-split") && t.distance >= 1000 ? 1.15 : 1) *
      (s.pace === "push" ? 1.3*Math.pow(st.overdrive,.35) : s.pace === "recover" ? 0.4 : 1) *
      challenge.speedMultiplier *
      (t.route === "shade" ? 0.94 : t.route === "fast" ? 1.06 : 1) *
      (t.energy < 20 ? 0.55 + (0.45 * t.energy) / 20 : 1);
  // Braking responds quickly; rebuilding speed after rough paving takes training.
  t.speed +=
    (Math.min(1e8,goal) - t.speed) *
    (1 - Math.exp(-dt * (goal < t.speed ? 1.4 : 0.12 * st.acceleration)));
  t.distance += t.speed * dt;
  t.peak = Math.max(t.peak, t.speed);
  let science = s.science;
  let progress = s.progress;
  const milestone = BIOMES.filter(
    (b) => b.start > 0 && b.start <= t.distance,
  ).length;
  // Keep the training bar live while limiting experience from tiny aborts.
  const xpTick = Math.floor(
    Math.sqrt(t.distance) * 2.2 * st.xp * Math.min(1, t.time / 65),
  );
  if (milestone > t.lastMilestone) {
    const gained = milestone - t.lastMilestone;
    science += Math.floor(gained * 2 * st.yield);
    progress = {
      ...progress,
      [s.program]: {
        ...progress[s.program],
        funds: progress[s.program].funds + gained,
      },
    };
    t.lastMilestone = milestone;
  }
  if (xpTick > t.lastXP) {
    const xp = xpTick - t.lastXP;
    progress = {
      ...progress,
      [s.program]: { ...progress[s.program], xp: progress[s.program].xp + xp },
    };
    t.lastXP = xpTick;
  }
  let next = { ...s, science, progress, trial: t };
  if (equipmentUnlocked(s) && t.time >= t.nextDrop) {
    const [roll, seed] = random(t.rng);
    t.rng = seed;
    t.nextDrop = t.time + (50 + Math.floor(roll * 40)) / Math.sqrt(st.luck);
    if (roll < 0.45 || s.inventory.length === 0) {
      const drop = rollGear(s.program, t.distance, t.rng, s.nextGear, st.luck);
      t.rng = drop.seed;
      if (s.inventory.length < 90) {
        t.drops = [...t.drops, drop.gear.id];
        next = {
          ...next,
          inventory: [...s.inventory, drop.gear],
          nextGear: s.nextGear + 1,
          lastDrop: drop.gear.id,
          notice:
            drop.gear.rarity +
            " find: " +
            drop.gear.name +
            ". Equip it between runs.",
        };
      } else
        next = {
          ...next,
          notice:
            "Equipment storage is full. Recycle spare pieces between runs to make room.",
        };
    }
  }
  return t.energy <= 0 || maxEnergy <= 1 || ((t.maxTime ?? 0)>0 && t.time>=t.maxTime!) ? finish(next) : next;
}
const number = (n: unknown, d = 0) =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : d;
export function restore(raw: string | null, now = Date.now()): Save {
  const s = fresh();
  try {
    if (!raw) return s;
    const x = JSON.parse(raw);
    if (x.version !== 2) return s;
    const keys = Object.keys(PROGRAMS) as Program[];
    s.science = number(x.science, 0);
    s.science = Math.min(1e15,s.science);
    s.talentPoints=Math.min(1e12,Math.floor(number(x.talentPoints)));
    s.vouchers=Math.min(1e12,Math.floor(number(x.vouchers)));
    s.currencyBought={talent:Math.min(1e12,Math.floor(number(x.currencyBought?.talent))),voucher:Math.min(1e12,Math.floor(number(x.currencyBought?.voucher)))};
    for(const p of DEVELOPMENT_PROJECTS) {
      const rank=Math.min(p.maxRank,Math.floor(number(x.development?.[p.id])));
      if(rank>0)s.development[p.id]=rank;
    }
    s.storySeen = Array.isArray(x.storySeen)
      ? x.storySeen.filter((v: unknown) => typeof v === "string")
      : [];
    s.tipsEnabled = x.tipsEnabled !== false;
    s.unlocked = keys.filter(
      (k) =>
        k === "runner" || (Array.isArray(x.unlocked) && x.unlocked.includes(k)),
    );
    s.program = s.unlocked.includes(x.program) ? x.program : "runner";
    s.researched = NODES.filter(
      (n) => Array.isArray(x.researched) && x.researched.includes(n.id),
    ).map((n) => n.id);
    for(const id of s.researched) {
      const n=NODE_MAP.get(id)!;
      s.talentRanks[id]=Math.max(1,Math.min(n.maxRank,Math.floor(number(x.talentRanks?.[id],1))));
    }
    s.modules = [];
    s.inventory = validateGear(x.inventory);
    s.equipped = [];
    for (const g of s.inventory) {
      if (
        Array.isArray(x.equipped) &&
        x.equipped.includes(g.id) &&
        !s.inventory.some(
          (other) =>
            other.program === g.program &&
            other.slot === g.slot &&
            s.equipped.includes(other.id),
        )
      )
        s.equipped.push(g.id);
    }
    s.nextGear = Math.max(
      Math.floor(number(x.nextGear, 1)),
      ...s.inventory.map((g) => (Number(g.id.replace("gear-", "")) || 0) + 1),
    );
    for (const k of keys) {
      const p = x.progress?.[k] ?? {};
      s.progress[k] = {
        xp: number(p.xp),
        funds: number(p.funds, 0),
        trials: Math.floor(number(p.trials)),
        best: number(p.best),
        bestDistance: number(p.bestDistance),
        distance: number(p.distance),
        variant:
          VARIANTS[k].find(
            (v) =>
              v.id === p.variant && (!v.node || s.researched.includes(v.node)),
          )?.id ?? VARIANTS[k][0].id,
      };
    }
    s.auto = x.auto === true;
    s.debriefPending=x.debriefPending===true;
    s.sampleDuration=[0,120,300,900].includes(x.sampleDuration) ? x.sampleDuration : 0;
    s.pace = ["steady", "push", "recover"].includes(x.pace) ? x.pace : "steady";
    s.launchAngle = Math.max(20, Math.min(65, number(x.launchAngle, 45)));
    s.history = Array.isArray(x.history)
      ? x.history
          .filter(
            (r: Result) =>
              r &&
              keys.includes(r.program) &&
              [
                "id",
                "science",
                "funds",
                "xp",
                "speed",
                "distance",
                "duration",
              ].every(
                (k) =>
                  typeof (r as unknown as Record<string, unknown>)[k] ===
                    "number" &&
                  Number.isFinite((r as unknown as Record<string, number>)[k]),
              ),
          )
          .slice(0, 30)
          .map((r: Result) => ({id:Math.floor(Math.min(1e12,number(r.id))),program:r.program,science:Math.min(1e15,number(r.science)),funds:Math.min(1e15,number(r.funds)),xp:Math.min(1e15,number(r.xp)),speed:Math.min(1e15,number(r.speed)),distance:Math.min(1e15,number(r.distance)),duration:Math.min(1e15,number(r.duration))}))
      : [];
    // Resume only a validated live expedition; offline rewards stay conservative.
    if (
      x.trial &&
      [
        "time",
        "distance",
        "energy",
        "fatigue",
        "peak",
        "samples",
        "rations",
        "supplyCooldown",
        "nextEvent",
        "restTime",
        "lastMilestone",
        "lastXP",
      ].every(
        (k) =>
          typeof x.trial[k] === "number" &&
          Number.isFinite(x.trial[k]) &&
          x.trial[k] >= 0,
      )
    ) {
      s.trial = {
        ...x.trial,
        maxTime:[0,120,300,900].includes(x.trial.maxTime) ? x.trial.maxTime : 0,
        speed: 0,
        secondWind: number(x.trial.secondWind),
        usedSecondWind: x.trial.usedSecondWind === true,
        rations: suppliesUnlocked(s) ? Math.min(3, x.trial.rations) : 0,
        rng: number(x.trial.rng, 123456789) >>> 0,
        nextDrop: number(x.trial.nextDrop, x.trial.time + 50),
        drops: Array.isArray(x.trial.drops)
          ? x.trial.drops.filter((id: string) =>
              s.inventory.some((g) => g.id === id),
            )
          : [],
        route: ["normal", "shade", "fast"].includes(x.trial.route)
          ? x.trial.route
          : "normal",
        event: EVENTS.map((_, i) => i).includes(x.trial.event)
          ? x.trial.event
          : null,
        lastEvent: EVENTS.map((_, i) => i).includes(x.trial.lastEvent)
          ? x.trial.lastEvent
          : undefined,
        routeTime: number(x.trial.routeTime),
      };
      if (s.program === "projectile") {
        const b = x.trial.ballistic;
        const config = b?.config;
        const validConfig =
          !config ||
          (["speed", "angle", "height", "drag", "lift", "reload"].every(
            (key) =>
              typeof config[key] === "number" &&
              Number.isFinite(config[key]) &&
              config[key] >= 0,
          ) &&
            config.angle <= 90 &&
            config.speed > 0 && config.speed <= 1e7 &&
            config.reload > 0 &&
            typeof config.charged === "boolean" &&
            typeof config.skip === "boolean");
        const valid =
          b &&
          ["prepare", "flight", "landed"].includes(b.phase) &&
          [
            "phaseTime",
            "x",
            "y",
            "vx",
            "vy",
            "shots",
            "completed",
            "lastRange",
            "totalRange",
            "science",
            "funds",
            "skips",
          ].every(
            (key) => typeof b[key] === "number" && Number.isFinite(b[key]),
          ) &&
          b.shots >= b.completed &&
          b.shots <= SHOTS_PER_TRIAL &&
          b.completed >= 0 &&
          Number.isInteger(b.shots) &&
          Number.isInteger(b.completed) &&
          b.x >= 0 &&
          b.y >= 0 &&
          b.science >= 0 &&
          b.funds >= 0 &&
          b.phaseTime >= 0 &&
          validConfig;
        if (valid && s.trial) s.trial.ballistic = { ...b };
        // Old projectile runs had no flights. Finish their runtime migration at
        // the staging screen while preserving all banked progress.
        else s.trial = null;
      }
    }
    const elapsed = Math.min(
      86400 * 7,
      Math.max(0, (now - number(x.lastActive, now)) / 1000),
    );
    if (s.auto && elapsed > 120 && totalTrials(s) > 0) {
      const lastRate=s.history[0] ? s.history[0].science/Math.max(65,s.history[0].duration+7) : .08;
      const support=Math.min(.8,.12+.08*Math.log2(stats(s).automation));
      const supportIncome = Math.floor(elapsed * Math.min(1e15,lastRate) * support);
      s.offline = Math.min(1e15-s.science,supportIncome);
      s.science = Math.min(1e15,s.science+s.offline);
      s.notice =
        "The support team collected " +
        s.offline +
        " research while away. Expedition position preserved.";
    }
  } catch {
    /* Invalid saves start a clean expedition. */
  }
  s.lastActive = now;
  return s;
}
