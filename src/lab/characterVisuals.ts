import type { Save } from "./game";
import { RARITIES, gearStage, type Gear, type Slot } from "./equipment";

const colors = ["#9d6442", "#38796b", "#346fa4", "#7755a5", "#e57828", "#48cbd4"];

/** The worn item, rather than the newest drop, controls the model. */
export function characterEquipment(s: Pick<Save, "inventory" | "equipped" | "program">) {
  const equipped = new Set(s.equipped);
  const slots: Partial<Record<Slot, Gear>> = {};
  for (const item of s.inventory)
    if (item.program === s.program && equipped.has(item.id)) slots[item.slot] = item;
  const tier = (slot: Slot) => slots[slot] ? Math.max(gearStage(slots[slot]!),RARITIES.indexOf(slots[slot]!.rarity)) : -1;
  return {
    key: `${s.program}:${["footwear", "outfit", "instrument"].map(slot => {const g=slots[slot as Slot];return g ? `${g.id}-${g.upgradeLevel ?? 0}-${g.upgradePath ?? ''}` : '-';}).join(":")}`,
    glow: Math.max(0,tier('footwear')-2)*.22,
    augmentation: tier('footwear')>=2,
    visible: {
      EverydayShoeL: !slots.footwear,
      EverydayShoeR: !slots.footwear,
      GearShoeL: !!slots.footwear,
      GearShoeR: !!slots.footwear,
      GearOutfit: !!slots.outfit,
      GearPack: tier("outfit") >= 2,
      GearInstrument: !!slots.instrument,
      GearAntenna: tier("instrument") >= 1,
    },
    colors: {
      footwear: colors[Math.max(0, tier("footwear"))],
      outfit: colors[Math.max(0, tier("outfit"))],
      instrument: colors[Math.max(0, tier("instrument"))],
    },
  };
}
