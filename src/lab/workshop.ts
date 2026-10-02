import type { Save } from "./game";
import { currentEra, ERA_NAMES } from "./development";
import { GEAR_LEVEL_CAP, GEAR_MILESTONES, gearEffects, gearMultipliers, gearName, gearPaths, gearStage, type Gear, type Slot } from "./equipment";
import type { Program, Stat } from "./research";

export const CRAFT_CATALOG: Record<Program, Record<Slot, { name: string; stat: Stat; cost: number; description: string }>> = {
  runner: {
    footwear: { name: "Running shoes", stat: "speed", cost: 2, description: "Lighter shoes add 5% cruising speed. Fit them for faster starts or longer runs." },
    outfit: { name: "Training vest", stat: "stamina", cost: 2, description: "A fitted training vest adds 5% stamina. Choose burst support or cooling as you improve it." },
    instrument: { name: "Stopwatch", stat: "xp", cost: 2, description: "Timed training adds 5% experience. Tune it to collect research or improve your training." },
  },
  projectile: {
    footwear: { name: "Throwing grip", stat: "launchSpeed", cost: 2, description: "A repeatable release adds 5% launch velocity. Develop launch rails and impulse chambers." },
    outfit: { name: "Balanced stone", stat: "drag", cost: 2, description: "A smoother body improves aerodynamic efficiency by 5%. Develop gliding and guided flight bodies." },
    instrument: { name: "Range tape", stat: "yield", cost: 2, description: "Measured landings earn 5% more RP. Build rangefinding and flight guidance systems." },
  },
  wheels: {
    footwear: { name: "Road tyres", stat: "speed", cost: 2, description: "Reduce rolling losses for 5% more speed. Develop traction rings and magnetic hubs." },
    outfit: { name: "Steel frame", stat: "economy", cost: 2, description: "A stable frame improves energy efficiency by 5%. Add suspension, cooling and powered structure." },
    instrument: { name: "Speedometer", stat: "xp", cost: 2, description: "Measured driving gives 5% more experience. Develop terrain response and navigation computers." },
  },
};
export const stageLevelCap = (s: Save) => [9, 24, 49, 74, 99, 100, GEAR_LEVEL_CAP][currentEra(s)];
/** Found and imported equipment stays accessible even before its recipe opens. */
export function workshopSlots(s: Save, program: Program): Slot[] {
  const era = currentEra(s);
  const measured = era >= 2 || (era >= 1 && (s.progress[program].bestDistance >= 400 || s.progress[program].trials >= 12));
  return (["footwear", "outfit", "instrument"] as Slot[]).filter((slot) => slot === "footwear" || (slot === "outfit" && era >= 1) || (slot === "instrument" && measured) || s.inventory.some((g) => g.program === program && g.slot === slot));
}
export function slotRequirement(s: Save, program: Program, slot: Slot) {
  if (workshopSlots(s, program).includes(slot)) return "";
  if (slot === "outfit" || currentEra(s) === 0) return "Build the training clinic to open this workbench.";
  return "Reach 400 m or complete 12 experiments to unlock measuring instruments.";
}
export function craftRequirement(s: Save, program: Program, slot: Slot) {
  if (!s.unlocked.includes(program)) return "Open this experiment program first.";
  const locked = slotRequirement(s, program, slot);
  if (locked) return locked;
  if (s.inventory.some((g) => g.program === program && g.slot === slot)) return "You already own this component. Improve it or fit a field find.";
  if (s.inventory.length >= 90) return "Equipment storage is full.";
  return "";
}
export function craftCost(_s: Save, program: Program, slot: Slot) {
  return CRAFT_CATALOG[program][slot].cost;
}
export function craftGear(s: Save, program: Program, slot: Slot): Save {
  const recipe = CRAFT_CATALOG[program]?.[slot];
  if (!recipe || craftRequirement(s, program, slot) || s.vouchers < recipe.cost) return s;
  const gear: Gear = {
    id: "gear-" + s.nextGear,
    program,
    name: recipe.name,
    slot,
    rarity: "Common",
    foundAt: 0,
    affixes: [{ stat: recipe.stat, value: .05 }],
    upgradeLevel: 0,
    crafted: true,
    era: 0,
  };
  const fitted = !s.trial;
  return { ...s, vouchers: s.vouchers - recipe.cost, inventory: [...s.inventory, gear], equipped: fitted ? [...s.equipped, gear.id] : s.equipped, nextGear: s.nextGear + 1, notice: `${gear.name} built${fitted ? " and fitted" : " for your next experiment"}.` };
}
/** Enough to finish the current starter loadout, without funding duplicate stock. */
export function beginnerVoucherNeed(s: Save) {
  let needed = 0;
  for (const program of s.unlocked) for (const slot of workshopSlots(s, program)) {
    const owned = s.inventory.filter((g) => g.program === program && g.slot === slot).sort((a, b) => Number(s.equipped.includes(b.id)) - Number(s.equipped.includes(a.id)) || (b.upgradeLevel ?? 0) - (a.upgradeLevel ?? 0));
    const recipe = CRAFT_CATALOG[program][slot];
    const item: Gear = owned[0] ?? { id: "starter-budget", program, name: recipe.name, slot, rarity: "Common", foundAt: 0, affixes: [{ stat: recipe.stat, value: .05 }], upgradeLevel: 0, crafted: true };
    if (!owned.length) needed += recipe.cost;
    const quote = quoteUpgrade({ ...s, trial: null, inventory: [item] }, item.id, 9, item.upgradePath ? undefined : gearPaths(item)[0].id);
    needed += quote.cost;
  }
  return needed;
}
/** Basic gear uses everyday language; powered hardware earns its later terminology. */
export function visibleGearPaths(g: Gear) {
  const paths = gearPaths(g);
  if ((g.upgradeLevel ?? 0) >= 10) return paths;
  const copy: Record<string, [string, string]> = g.program === "runner" ? {
    kinetic: ["Sprint fit", "Stiffer soles add speed and faster starts, but use more energy."],
    distance: ["Trail fit", "Grippy soles conserve energy on rough ground, with slightly less speed."],
    power: ["Burst support", "Support Push pace and oxygen delivery, but retain more heat."],
    thermal: ["Cooling mesh", "Control heat and fatigue, with a smaller stamina reserve."],
    survey: ["Sample logging", "Collect more RP and useful finds, with slower experience gain."],
    training: ["Training timer", "Gain experience and recover faster, with less RP per metre."],
  } : g.program === "projectile" ? {
    pressure: ["Power release", "Throw harder, with a longer wait between shots."],
    cycling: ["Quick release", "Prepare shots faster, with less launch speed."],
    penetrator: ["Streamlined body", "Reduce drag and improve consistency, with less wing lift."],
    glider: ["Winged body", "Gain lift and reduce drag, with less consistent releases."],
    range: ["Precise measurements", "Gain consistency and landing data, with slower preparation."],
    samples: ["Sample logging", "Gain experiment RP and experience, with less landing data."],
  } : {
    motor: ["Powered frame", "Add Push output and faster starts, with more heat to control."],
    touring: ["Touring frame", "Conserve energy and control heat, with a lower cruising speed."],
    autonomy: ["Route assistant", "React to rough ground and repeat experiments sooner, with less RP per kilometre."],
    telemetry: ["Data logger", "Gain more RP and experience, with slower automatic restarts."],
  };
  return paths.map((p) => copy[p.id] ? { ...p, name: copy[p.id][0], description: copy[p.id][1] } : p);
}
/** A later spare must serve a different permanent specialization. */
export function quoteAlternate(s: Save, program: Program, slot: Slot, path: string) {
  const owned = s.inventory.filter((g) => g.program === program && g.slot === slot);
  const base: Gear = { id: "gear-" + s.nextGear, program, name: CRAFT_CATALOG[program][slot].name, slot, rarity: "Common", foundAt: 0, affixes: [{ stat: CRAFT_CATALOG[program][slot].stat, value: .05 }], upgradeLevel: 0, crafted: true, era: 0 };
  let blocked = "";
  if (!s.unlocked.includes(program)) blocked = "Open this experiment program first.";
  else if (currentEra(s) < 2) blocked = "The biomechanics workshop opens alternate builds.";
  else if (!owned.some((g) => g.upgradePath)) blocked = "Specialize your current component first.";
  else if (owned.some((g) => !g.upgradePath)) blocked = "Tune your stored component before building another.";
  else if (owned.some((g) => g.upgradePath === path)) blocked = "You already own this specialization.";
  else if (s.inventory.length >= 90) blocked = "Equipment storage is full.";
  else if (!gearPaths(base).some((p) => p.id === path)) blocked = "Choose a valid specialization.";
  const quote = quoteUpgrade({ ...s, trial: null, inventory: [...s.inventory, base] }, base.id, 5, path);
  return { cost: CRAFT_CATALOG[program][slot].cost + quote.cost, gear: quote.gear, blocked: blocked || quote.blocked };
}
export function craftAlternate(s: Save, program: Program, slot: Slot, path: string): Save {
  const quote = quoteAlternate(s, program, slot, path);
  if (quote.blocked || !quote.gear || s.vouchers < quote.cost) return s;
  return { ...s, vouchers: s.vouchers - quote.cost, inventory: [...s.inventory, quote.gear], nextGear: s.nextGear + 1, notice: `${gearName(quote.gear)} built with ${visibleGearPaths(quote.gear).find((p) => p.id === path)?.name}. Your current loadout is unchanged.` };
}
export function upgradeCost(s: Save, id: string) {
  const item = s.inventory.find((g) => g.id === id);
  if (!item || (item.upgradeLevel ?? 0) >= GEAR_LEVEL_CAP) return 0;
  const next = (item.upgradeLevel ?? 0) + 1;
  if (next > 100) return Math.ceil(1050 + Math.pow(next - 100, 1.18) * 5);
  const component = next < 10 ? 1 : next < 25 ? 1.5 : next < 50 ? 2.5 : next < 75 ? 4 : next < 100 ? 6 : 8;
  return Math.ceil(Math.pow(1.05, next - 1) * component);
}
export function pathChoices(g: Gear) {
  return gearPaths(g);
}
export function upgradeRequirement(s: Save, id: string) {
  const item = s.inventory.find((g) => g.id === id);
  if (!item) return "Choose an item.";
  if (s.trial && item.program === s.program && s.equipped.includes(id)) return "Equipped components stay unchanged until this experiment ends.";
  const next = (item.upgradeLevel ?? 0) + 1;
  if (next > GEAR_LEVEL_CAP) return "Fully overclocked.";
  if (next > stageLevelCap(s)) return `${ERA_NAMES[currentEra(s) + 1]} unlocks level ${next}.`;
  if (next >= 5 && !item.upgradePath) return "Choose a permanent enhancement path.";
  return "";
}
export function upgradeGear(s: Save, id: string, path?: string): Save {
  const item = s.inventory.find((g) => g.id === id);
  if (!item || (s.trial && item.program === s.program && s.equipped.includes(id))) return s;
  const next = (item.upgradeLevel ?? 0) + 1;
  if (next > GEAR_LEVEL_CAP || next > stageLevelCap(s)) return s;
  if (path && (next < 5 || item.upgradePath || !gearPaths(item).some((p) => p.id === path))) return s;
  const selectedPath = item.upgradePath ?? path;
  if (next >= 5 && !selectedPath) return s;
  const cost = upgradeCost(s, id);
  if (s.vouchers < cost) return s;
  const upgraded: Gear = { ...item, upgradeLevel: next, upgradePath: selectedPath, era: next > 100 ? 6 : GEAR_MILESTONES.filter((n) => next >= n).length };
  upgraded.name = gearName(upgraded);
  upgraded.rarity = ["Common", "Uncommon", "Rare", "Epic", "Epic", "Epic"][gearStage(upgraded)] as Gear["rarity"];
  return { ...s, vouchers: s.vouchers - cost, inventory: s.inventory.map((g) => g.id === id ? upgraded : g), notice: `${upgraded.name} · level ${next}${GEAR_MILESTONES.includes(next as typeof GEAR_MILESTONES[number]) ? " · new components installed" : ""}.` };
}
/** A batch purchase is atomic: the complete quoted upgrade must be affordable. */
export function quoteUpgrade(s: Save, id: string, target: number, path?: string) {
  const item = s.inventory.find((g) => g.id === id);
  if (!item) return { levels: 0, cost: 0, level: 0, gear: null, blocked: "Choose an item." };
  const level = item.upgradeLevel ?? 0;
  const goal = Math.min(GEAR_LEVEL_CAP, stageLevelCap(s), Math.floor(target));
  if (!Number.isFinite(target) || goal <= level) return { levels: 0, cost: 0, level, gear: item, blocked: upgradeRequirement(s, id) };
  if (s.trial && item.program === s.program && s.equipped.includes(id)) return { levels: 0, cost: 0, level, gear: item, blocked: upgradeRequirement(s, id) };
  if (path && (item.upgradePath || !gearPaths(item).some((p) => p.id === path))) return { levels: 0, cost: 0, level, gear: item, blocked: "This enhancement path cannot be selected." };
  if (goal >= 5 && !item.upgradePath && !path) return { levels: 0, cost: 0, level, gear: item, blocked: "Choose a permanent enhancement path." };
  // Quote without spending, so the UI can show the whole cost even when short.
  let cost = 0, preview = item;
  for (let rank = level + 1; rank <= goal; rank++) {
    cost += upgradeCost({ ...s, inventory: s.inventory.map((g) => g.id === id ? preview : g) }, id);
    preview = { ...preview, upgradeLevel: rank, upgradePath: preview.upgradePath ?? (rank >= 5 ? path : undefined), era: rank > 100 ? 6 : GEAR_MILESTONES.filter((n) => rank >= n).length };
  }
  preview = { ...preview, name: gearName(preview), rarity: ["Common", "Uncommon", "Rare", "Epic", "Epic", "Epic"][gearStage(preview)] as Gear["rarity"] };
  return { levels: goal - level, cost, level: goal, gear: preview, blocked: "" };
}
export function upgradeGearTo(s: Save, id: string, target: number, path?: string): Save {
  const quote = quoteUpgrade(s, id, target, path);
  if (quote.blocked || !quote.levels || !quote.gear || s.vouchers < quote.cost) return s;
  return { ...s, vouchers: s.vouchers - quote.cost, inventory: s.inventory.map((g) => g.id === id ? quote.gear! : g), notice: `${quote.gear.name} · level ${quote.level}.` };
}
export const effectiveAffixes = (g: Gear) => Object.entries(gearEffects(g)).map(([stat, value]) => ({ stat: stat as Stat, value: value! }));
export function effectiveBonus(g: Gear, stat: Stat) {
  return (1 + (gearEffects(g)[stat] ?? 0)) * (gearMultipliers(g)[stat] ?? 1) - 1;
}
export function nextMilestone(g: Gear) {
  const level = g.upgradeLevel ?? 0;
  const next = GEAR_MILESTONES.find((n) => n > level);
  return next ? { level: next, name: gearName(g, next), preview: { ...g, upgradeLevel: next } as Gear } : level < GEAR_LEVEL_CAP ? { level: Math.min(GEAR_LEVEL_CAP, Math.ceil((level + 1) / 25) * 25), name: "Component overclock", preview: { ...g, upgradeLevel: Math.min(GEAR_LEVEL_CAP, Math.ceil((level + 1) / 25) * 25) } as Gear } : null;
}
