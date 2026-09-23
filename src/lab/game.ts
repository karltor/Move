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
  program: Program;
  unlocked: Program[];
  progress: Record<Program, Progress>;
  researched: string[];
  modules: string[];
  auto: boolean;
  pace: "steady" | "push" | "recover";
  trial: Trial | null;
  rest: number;
  history: Result[];
  lastActive: number;
  offline: number;
  notice: string;
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
    funds: 15,
    trials: 0,
    best: 0,
    distance: 0,
    bestDistance: 0,
    variant,
  });
  return {
    version: 2,
    science: 35,
    program: "runner",
    unlocked: ["runner"],
    progress: {
      runner: p("runner"),
      projectile: p("rock"),
      wheels: p("board"),
    },
    researched: [],
    modules: [],
    auto: true,
    pace: "steady",
    trial: null,
    rest: 0,
    history: [],
    lastActive: Date.now(),
    offline: 0,
    notice:
      "A long road starts here. Set a sustainable pace and see how far the team can go.",
  };
}
export const level = (xp: number) =>
  Math.floor(Math.sqrt(Math.max(0, xp) / 35)) + 1;
export const levelStart = (l: number) => 35 * (l - 1) * (l - 1);
export function stats(s: Save, p = s.program) {
  const out: Record<Stat, number> = { speed: 1, stamina: 1, yield: 1, xp: 1 };
  for (const id of s.researched) {
    const n = NODE_MAP.get(id);
    if (
      n &&
      (n.program === p || n.program === "global") &&
      (n.kind === "permanent" || s.modules.includes(id))
    ) {
      out[n.stat] += n.power;
      if (n.penalty) out[n.penalty] -= n.penaltyPower ?? 0;
    }
  }
  const lv = level(s.progress[p].xp);
  out.stamina += (lv - 1) * 0.08;
  out.speed += (lv - 1) * 0.03;
  return out;
}
export const totalTrials = (s: Save) =>
  Object.values(s.progress).reduce((a, p) => a + p.trials, 0);
export const totalDistance = (s: Save) =>
  Object.values(s.progress).reduce((a, p) => a + p.distance, 0) +
  (s.trial?.distance ?? 0);
export function available(s: Save, id: string) {
  const n = NODE_MAP.get(id);
  return (
    !!n &&
    !s.researched.includes(id) &&
    n.requires.every((r) => s.researched.includes(r)) &&
    (!n.anyOf?.length || n.anyOf.some((r) => s.researched.includes(r))) &&
    (n.program === "global" || s.unlocked.includes(n.program))
  );
}
export function afford(s: Save, id: string) {
  const n = NODE_MAP.get(id);
  return (
    !!n &&
    available(s, id) &&
    s.science >= n.cost &&
    (n.program === "global" || s.progress[n.program].funds >= n.localCost)
  );
}
export function research(s: Save, id: string): Save {
  if (!afford(s, id)) return s;
  const n = NODE_MAP.get(id)!;
  return {
    ...s,
    science: s.science - n.cost,
    researched: [...s.researched, id],
    progress:
      n.program === "global"
        ? s.progress
        : {
            ...s.progress,
            [n.program]: {
              ...s.progress[n.program],
              funds: s.progress[n.program].funds - n.localCost,
            },
          },
    notice:
      n.name +
      " discovered. " +
      (n.kind === "module"
        ? "Choose whether to equip it."
        : "Permanent research installed."),
  };
}
export function equip(s: Save, id: string): Save {
  const n = NODE_MAP.get(id);
  if (!n || n.kind !== "module" || !s.researched.includes(id)) return s;
  if (s.modules.includes(id))
    return { ...s, modules: s.modules.filter((x) => x !== id) };
  const other = s.modules.filter((x) => NODE_MAP.get(x)?.program === n.program);
  if (other.length >= 3)
    return {
      ...s,
      notice:
        "Three module slots per program. Unequip one to change your build.",
    };
  return { ...s, modules: [...s.modules, id], notice: n.name + " equipped." };
}
export function selectProgram(s: Save, p: Program): Save {
  if (s.program === p || s.trial) return s;
  if (!s.unlocked.includes(p)) {
    if (
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
export function start(s: Save): Save {
  return s.trial
    ? s
    : {
        ...s,
        rest: 0,
        trial: {
          time: 0,
          distance: 0,
          speed: 0,
          energy: 100 * stats(s).stamina,
          fatigue: 0,
          peak: 0,
          samples: 0,
          rations: 3,
          supplyCooldown: 0,
          nextEvent: 65,
          event: null,
          route: "normal",
          restTime: 0,
          lastMilestone: 0,
          lastXP: 0,
        },
        notice:
          "Expedition underway. Pace, supplies and route decisions determine your reach.",
      };
}
export function supply(s: Save): Save {
  if (!s.trial || s.trial.rations <= 0 || s.trial.supplyCooldown > 0) return s;
  const t = s.trial;
  const capacity = 100 * stats(s).stamina;
  return {
    ...s,
    trial: {
      ...t,
      rations: t.rations - 1,
      energy: Math.min(capacity - t.fatigue, t.energy + capacity * 0.27),
      supplyCooldown: 45,
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
    ad: "−20% stamina drain · −10% speed",
    b: "Take the shortcut",
    bd: "+15% speed · +25% stamina drain",
  },
  {
    title: "An interesting discovery",
    text: "A strange sample could help the lab. Collect it, or keep your rhythm?",
    a: "Collect the sample",
    ad: "+35 research at finish · +10 fatigue",
    b: "Keep moving",
    bd: "+8 program currency · no detour",
  },
  {
    title: "Field support station",
    text: "The support crew has a place to rest. Is the lost time worth the recovery?",
    a: "Take a 15s break",
    ad: "Restore 25% stamina · reduce fatigue",
    b: "Press on",
    bd: "+20 research at finish · keep pace",
  },
];
export function decide(s: Save, choice: "a" | "b"): Save {
  const t = s.trial;
  if (!t || t.event === null) return s;
  const event = t.event % 3;
  const next = { ...t, event: null, nextEvent: t.time + 75 };
  let progress = s.progress;
  if (event === 0) next.route = choice === "a" ? "shade" : "fast";
  if (event === 1) {
    if (choice === "a") {
      next.samples += 35;
      next.fatigue += 10;
    } else
      progress = {
        ...progress,
        [s.program]: {
          ...progress[s.program],
          funds: progress[s.program].funds + 8,
        },
      };
  }
  if (event === 2) {
    if (choice === "a") {
      next.restTime = 15;
      next.fatigue = Math.max(0, next.fatigue - 10);
      next.energy = Math.min(
        100 * stats(s).stamina - next.fatigue,
        next.energy + 25 * stats(s).stamina,
      );
    } else next.samples += 20;
  }
  return {
    ...s,
    trial: next,
    progress,
    notice: EVENTS[event][choice] + ". The expedition continues.",
  };
}
export function finish(s: Save): Save {
  const t = s.trial;
  if (!t) return s;
  const st = stats(s);
  const p = s.progress[s.program];
  const science = Math.floor(
    (Math.sqrt(t.distance) * 3 + t.time * 0.12 + t.samples) * st.yield,
  );
  const funds = Math.floor(Math.sqrt(t.distance) * 1.3 + t.time * 0.08);
  const xp = Math.floor((Math.sqrt(t.distance) + t.time * 0.04) * st.xp);
  const result: Result = {
    id: totalTrials(s) + 1,
    program: s.program,
    science,
    funds,
    xp,
    speed: t.peak,
    distance: t.distance,
    duration: t.time,
  };
  return {
    ...s,
    trial: null,
    rest: s.auto ? 7 : 0,
    science: s.science + science,
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
      " research · +" +
      funds +
      " " +
      PROGRAMS[s.program].currency +
      " · +" +
      xp +
      " XP.",
  };
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
  const t = { ...s.trial };
  const st = stats(s);
  const bio = biomeAt(t.distance);
  t.time += dt;
  t.supplyCooldown = Math.max(0, t.supplyCooldown - dt);
  if (t.event !== null && t.time >= t.nextEvent + 35) {
    t.event = null;
    t.nextEvent = t.time + 75;
  }
  if (t.event === null && t.time >= t.nextEvent)
    t.event = Math.floor((t.nextEvent - 65) / 75) % 3;
  const resting = t.restTime > 0;
  t.restTime = Math.max(0, t.restTime - dt);
  const maxEnergy = 100 * st.stamina - t.fatigue;
  t.fatigue +=
    dt * (resting ? 0.025 : s.pace === "push" ? 0.16 : 0.075) * bio.drain;
  const routeDrain = t.route === "shade" ? 0.8 : t.route === "fast" ? 1.25 : 1;
  const drain =
    (resting
      ? -0.6
      : s.pace === "recover"
        ? -0.3
        : s.pace === "push"
          ? 0.8
          : 0.31) *
    bio.drain *
    routeDrain;
  t.energy = Math.max(0, Math.min(maxEnergy, t.energy - drain * dt));
  const vehicle = VARIANTS[s.program].find(
    (v) => v.id === s.progress[s.program].variant,
  );
  const multiplier = vehicle?.multiplier ?? 1;
  const goal = resting
    ? 0
    : PROGRAMS[s.program].base *
      st.speed *
      multiplier *
      (s.pace === "push" ? 1.55 : s.pace === "recover" ? 0.45 : 1) *
      (t.route === "shade" ? 0.9 : t.route === "fast" ? 1.15 : 1) *
      (t.energy < 20 ? 0.55 + (0.45 * t.energy) / 20 : 1);
  t.speed += (goal - t.speed) * (1 - Math.exp(-dt * 1.6));
  t.distance += t.speed * dt;
  t.peak = Math.max(t.peak, t.speed);
  let science = s.science;
  let progress = s.progress;
  const milestone = Math.floor(t.distance / 100);
  const xpTick = Math.floor(t.time / 15);
  if (milestone > t.lastMilestone) {
    const gained = milestone - t.lastMilestone;
    science += Math.floor(gained * 5 * st.yield);
    progress = {
      ...progress,
      [s.program]: {
        ...progress[s.program],
        funds: progress[s.program].funds + gained * 3,
      },
    };
    t.lastMilestone = milestone;
  }
  if (xpTick > t.lastXP) {
    const xp = Math.floor((xpTick - t.lastXP) * 3 * st.xp);
    progress = {
      ...progress,
      [s.program]: { ...progress[s.program], xp: progress[s.program].xp + xp },
    };
    t.lastXP = xpTick;
  }
  const next = { ...s, science, progress, trial: t };
  return t.energy <= 0 || maxEnergy <= 1 ? finish(next) : next;
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
    s.science = number(x.science, 35);
    s.unlocked = keys.filter(
      (k) =>
        k === "runner" || (Array.isArray(x.unlocked) && x.unlocked.includes(k)),
    );
    s.program = s.unlocked.includes(x.program) ? x.program : "runner";
    s.researched = NODES.filter(
      (n) => Array.isArray(x.researched) && x.researched.includes(n.id),
    ).map((n) => n.id);
    s.modules = keys.flatMap((k) =>
      s.researched
        .filter(
          (id) =>
            NODE_MAP.get(id)?.program === k &&
            NODE_MAP.get(id)?.kind === "module" &&
            Array.isArray(x.modules) &&
            x.modules.includes(id),
        )
        .slice(0, 3),
    );
    for (const k of keys) {
      const p = x.progress?.[k] ?? {};
      s.progress[k] = {
        xp: number(p.xp),
        funds: number(p.funds, 15),
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
    s.pace = ["steady", "push", "recover"].includes(x.pace) ? x.pace : "steady";
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
        speed: 0,
        rations: Math.min(3, x.trial.rations),
        route: ["normal", "shade", "fast"].includes(x.trial.route)
          ? x.trial.route
          : "normal",
        event: [0, 1, 2].includes(x.trial.event) ? x.trial.event : null,
      };
    }
    const elapsed = Math.min(
      7200,
      Math.max(0, (now - number(x.lastActive, now)) / 1000),
    );
    if (s.auto && elapsed > 120 && totalTrials(s) > 0) {
      s.offline = Math.floor(elapsed * 0.08 * stats(s).yield);
      s.science += s.offline;
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
