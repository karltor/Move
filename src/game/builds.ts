import type { GameObjectDef, Upgrade, CurrencyId, Cost } from '../data/types';
import type { RideStats } from '../sim/ride';
import { CURRENCY_IDS } from '../data/currencies';

// ---------------------------------------------------------------------------
// BUILD LOGIC (generic across every object)
// ---------------------------------------------------------------------------
// Two pieces of player state:
//   • unlocked: ids of upgrades permanently bought with Grants.
//   • equipped: slotId -> upgradeId, the current loadout (one per slot).
// Equipped upgrades RESERVE their `equipCost` in secondary currencies; the
// reservation is freed when you equip something else. `available` = wallet
// minus reservations. Grants are spent (not reserved) on unlock.
// ---------------------------------------------------------------------------

export type Wallet = Record<CurrencyId, number>;
export type Unlocked = string[];
export type Equipped = Record<string, string>; // slotId -> upgradeId

export function allUpgrades(obj: GameObjectDef): Upgrade[] {
  return obj.slots.flatMap((s) => s.upgrades);
}

export function findUpgrade(obj: GameObjectDef, id: string): Upgrade | undefined {
  return allUpgrades(obj).find((u) => u.id === id);
}

export function slotOf(obj: GameObjectDef, upgradeId: string) {
  return obj.slots.find((s) => s.upgrades.some((u) => u.id === upgradeId));
}

/** The free tier-1 upgrade ids — unlocked and equipped by default. */
export function baseUpgradeIds(obj: GameObjectDef): string[] {
  return obj.slots.map((s) => s.upgrades[0].id);
}

export function defaultEquipped(obj: GameObjectDef): Equipped {
  const eq: Equipped = {};
  for (const s of obj.slots) eq[s.id] = s.upgrades[0].id;
  return eq;
}

export function isUnlocked(obj: GameObjectDef, unlocked: Unlocked, id: string): boolean {
  const u = findUpgrade(obj, id);
  if (!u) return false;
  if (Object.keys(u.unlockCost).length === 0) return true; // free base tier
  return unlocked.includes(id);
}

/** Sum of equipCost across the current loadout, per currency. */
export function reservedTotals(obj: GameObjectDef, equipped: Equipped): Wallet {
  const out = zeroWallet();
  for (const id of Object.values(equipped)) {
    const u = findUpgrade(obj, id);
    if (!u) continue;
    for (const c of CURRENCY_IDS) out[c] += u.equipCost[c] ?? 0;
  }
  return out;
}

/** wallet minus reservations (grants are never reserved). */
export function availableTotals(
  obj: GameObjectDef,
  wallet: Wallet,
  equipped: Equipped,
): Wallet {
  const reserved = reservedTotals(obj, equipped);
  const out = zeroWallet();
  for (const c of CURRENCY_IDS) out[c] = (wallet[c] ?? 0) - reserved[c];
  return out;
}

function canPay(available: Wallet, cost: Cost): boolean {
  return CURRENCY_IDS.every((c) => (available[c] ?? 0) >= (cost[c] ?? 0));
}

/** The tier directly below `u` in its slot (its unlock prerequisite). */
function prereq(obj: GameObjectDef, u: Upgrade): Upgrade | null {
  const slot = slotOf(obj, u.id);
  if (!slot) return null;
  const idx = slot.upgrades.findIndex((x) => x.id === u.id);
  return idx > 0 ? slot.upgrades[idx - 1] : null;
}

/** Why an upgrade can't be unlocked, or null if it can. */
export function unlockBlock(
  obj: GameObjectDef,
  unlocked: Unlocked,
  wallet: Wallet,
  id: string,
): null | 'unlocked' | 'prereq' | 'cost' {
  const u = findUpgrade(obj, id);
  if (!u) return 'unlocked';
  if (isUnlocked(obj, unlocked, id)) return 'unlocked';
  const pre = prereq(obj, u);
  if (pre && !isUnlocked(obj, unlocked, pre.id)) return 'prereq';
  // Grants are spent directly from the wallet (not the reserved-aware view).
  if (!canPay(wallet, u.unlockCost)) return 'cost';
  return null;
}

export function canUnlock(
  obj: GameObjectDef,
  unlocked: Unlocked,
  wallet: Wallet,
  id: string,
): boolean {
  return unlockBlock(obj, unlocked, wallet, id) === null;
}

/** Why an upgrade can't be equipped, or null if it can. Accounts for freeing
 *  the currently-equipped upgrade in the same slot first. */
export function equipBlock(
  obj: GameObjectDef,
  unlocked: Unlocked,
  wallet: Wallet,
  equipped: Equipped,
  id: string,
): null | 'equipped' | 'locked' | 'reserve' {
  const u = findUpgrade(obj, id);
  const slot = slotOf(obj, id);
  if (!u || !slot) return 'locked';
  if (equipped[slot.id] === id) return 'equipped';
  if (!isUnlocked(obj, unlocked, id)) return 'locked';
  // Free the slot's current reservation, then check affordability.
  const without: Equipped = { ...equipped };
  delete without[slot.id];
  const available = availableTotals(obj, wallet, without);
  if (!canPay(available, u.equipCost)) return 'reserve';
  return null;
}

export function canEquip(
  obj: GameObjectDef,
  unlocked: Unlocked,
  wallet: Wallet,
  equipped: Equipped,
  id: string,
): boolean {
  return equipBlock(obj, unlocked, wallet, equipped, id) === null;
}

/** Aggregate base stats + every equipped upgrade's mods (add then mul). */
export function aggregateStats(obj: GameObjectDef, equipped: Equipped): RideStats {
  const stats = { ...obj.baseStats } as RideStats;
  const equippedUpgrades = Object.values(equipped)
    .map((id) => findUpgrade(obj, id))
    .filter((u): u is Upgrade => !!u);

  for (const u of equippedUpgrades)
    for (const m of u.mods) if (m.add != null) stats[m.stat] += m.add;
  for (const u of equippedUpgrades)
    for (const m of u.mods) if (m.mul != null) stats[m.stat] *= m.mul;

  stats.walkPower = Math.max(0, stats.walkPower);
  stats.runPower = Math.max(0, stats.runPower);
  stats.maxStamina = Math.max(10, stats.maxStamina);
  stats.staminaRefill = Math.max(0, stats.staminaRefill);
  stats.runDrain = Math.max(1, stats.runDrain);
  stats.maxReserve = Math.max(30, stats.maxReserve);
  stats.energyBurn = Math.max(0.5, stats.energyBurn);
  stats.weight = Math.max(20, stats.weight);
  stats.drag = Math.max(0.02, stats.drag);
  stats.rollResist = Math.max(0, stats.rollResist);
  stats.topSpeed = Math.max(2, stats.topSpeed);
  stats.assist = Math.max(0, stats.assist);
  return stats;
}

/** The character art layers to draw, from equipped upgrades, sorted by slot z. */
export function resolveArt(
  obj: GameObjectDef,
  equipped: Equipped,
): { layer: string; z: number; svg: string }[] {
  const out: { layer: string; z: number; svg: string }[] = [];
  for (const slot of obj.slots) {
    const u = findUpgrade(obj, equipped[slot.id]);
    if (u?.art) out.push({ layer: u.art.layer, z: slot.z, svg: u.art.svg });
  }
  return out.sort((a, b) => a.z - b.z);
}

export function zeroWallet(): Wallet {
  const out = {} as Wallet;
  for (const c of CURRENCY_IDS) out[c] = 0;
  return out;
}
