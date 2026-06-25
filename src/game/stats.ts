import type { GameObjectDef, PartVariant, StatKey } from '../data/types';
import type { LaunchStats } from '../sim/simulateLaunch';

export type Equipped = Record<string, string>; // slotId -> variantId

const STAT_KEYS: StatKey[] = ['launchPower', 'weight', 'drag'];

/** The default equipped map for a fresh object: tier 0 in every slot. */
export function defaultEquipped(obj: GameObjectDef): Equipped {
  const eq: Equipped = {};
  for (const slot of obj.slots) eq[slot.id] = slot.variants[0].id;
  return eq;
}

/** Resolve the equipped variant for a slot, falling back to tier 0 if a saved
 *  id is no longer valid (e.g. after a data change). Generic across objects. */
export function equippedVariant(
  obj: GameObjectDef,
  slotId: string,
  equipped: Equipped,
): PartVariant {
  const slot = obj.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`Unknown slot ${slotId} on ${obj.id}`);
  return slot.variants.find((v) => v.id === equipped[slotId]) ?? slot.variants[0];
}

/** Aggregate base stats + every equipped variant's contributions. Generic:
 *  works for any object/slot/stat without object-specific code. */
export function aggregateStats(obj: GameObjectDef, equipped: Equipped): LaunchStats {
  const total: LaunchStats = { launchPower: 0, weight: 0, drag: 0 };
  for (const k of STAT_KEYS) total[k] = obj.baseStats[k];

  for (const slot of obj.slots) {
    const variant = equippedVariant(obj, slot.id, equipped);
    for (const k of STAT_KEYS) {
      const delta = variant.stats[k];
      if (delta != null) total[k] += delta;
    }
  }
  return total;
}

/** The variant in `slot` that comes after the currently-equipped one, or null
 *  if the top tier is already equipped. Drives the "next upgrade" UI. */
export function nextVariant(
  obj: GameObjectDef,
  slotId: string,
  equipped: Equipped,
): PartVariant | null {
  const slot = obj.slots.find((s) => s.id === slotId);
  if (!slot) return null;
  const idx = slot.variants.findIndex((v) => v.id === equipped[slotId]);
  return slot.variants[idx + 1] ?? null;
}

export { STAT_KEYS };
