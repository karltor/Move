import type { NodeDef, CurrencyId, ModeId, VehicleId } from '../data/types';
import type { RideStats } from '../sim/ride';
import { NODES, NODES_BY_ID } from '../data/nodes';
import { MODES } from '../data/modes';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// NODE-GRAPH LOGIC — unlock / upgrade / equip.
// ---------------------------------------------------------------------------
// Player state is:
//   ranks:    nodeId -> rank (>=1 means UNLOCKED; unlock buys rank 1)
//   equipped: nodeIds currently in the loadout
// A node's mods apply ONLY while equipped. Equipped nodes reserve their
// equip cost from the Flux total (never consumed — unequip frees it).
// At most one MODE node can be equipped; it selects the ride's base stats
// and vehicle. With none equipped you're on foot.
// ---------------------------------------------------------------------------

export type Wallet = Record<CurrencyId, number>;
export type Ranks = Record<string, number>;

export function getNode(id: string): NodeDef | undefined {
  return NODES_BY_ID.get(id);
}

export function rankOf(ranks: Ranks, id: string): number {
  return ranks[id] ?? 0;
}

export function isUnlocked(ranks: Ranks, id: string): boolean {
  return rankOf(ranks, id) >= 1;
}

export function prereqsMet(ranks: Ranks, node: NodeDef): boolean {
  return node.prereqs.every((p) => isUnlocked(ranks, p));
}

// --- unlock (🔬 research) ---------------------------------------------------

export function canUnlock(wallet: Wallet, ranks: Ranks, id: string): boolean {
  const node = getNode(id);
  if (!node || isUnlocked(ranks, id)) return false;
  return prereqsMet(ranks, node) && wallet.research >= node.unlockCost;
}

// --- upgrade (💡 insight) ----------------------------------------------------

/** Insight cost of the NEXT rank, or null when maxed (or not yet unlocked). */
export function nextRankCost(node: NodeDef, currentRank: number): number | null {
  if (currentRank < 1 || currentRank >= node.maxRanks) return null;
  return Math.round(node.rankCost * Math.pow(CONFIG.tree.costGrowth, currentRank - 1));
}

export function canUpgrade(wallet: Wallet, ranks: Ranks, id: string): boolean {
  const node = getNode(id);
  if (!node) return false;
  const cost = nextRankCost(node, rankOf(ranks, id));
  return cost !== null && wallet.insight >= cost;
}

// --- equip (⚡ flux budget) ---------------------------------------------------

export function fluxUsed(equipped: string[]): number {
  return equipped.reduce((sum, id) => sum + (getNode(id)?.equipCost ?? 0), 0);
}

export function fluxFree(wallet: Wallet, equipped: string[]): number {
  return wallet.flux - fluxUsed(equipped);
}

export function equippedModeNode(equipped: string[]): NodeDef | undefined {
  return equipped.map((id) => getNode(id)).find((n) => n?.mode) ?? undefined;
}

/** Equipping a mode node implicitly swaps out the current mode node, so its
 *  reserved flux counts as free for the check. */
export function canEquip(wallet: Wallet, ranks: Ranks, equipped: string[], id: string): boolean {
  const node = getNode(id);
  if (!node || !isUnlocked(ranks, id) || equipped.includes(id)) return false;
  let free = fluxFree(wallet, equipped);
  if (node.mode) free += equippedModeNode(equipped)?.equipCost ?? 0;
  return free >= node.equipCost;
}

// --- aggregation --------------------------------------------------------------

export function activeModeId(equipped: string[]): ModeId {
  return equippedModeNode(equipped)?.mode ?? 'run';
}

/** Loadout stats: active mode's base stats + every EQUIPPED node's mods
 *  (add·rank first, then mul^rank), then sanity clamps. */
export function aggregateStats(ranks: Ranks, equipped: string[]): RideStats {
  const stats = { ...MODES[activeModeId(equipped)].baseStats } as RideStats;
  const nodes = equipped
    .map((id) => ({ n: getNode(id), r: rankOf(ranks, id) }))
    .filter((x): x is { n: NodeDef; r: number } => !!x.n && x.r > 0);

  for (const { n, r } of nodes)
    for (const m of n.mods) if (m.add != null) stats[m.stat] += m.add * r;
  for (const { n, r } of nodes)
    for (const m of n.mods) if (m.mul != null) stats[m.stat] *= Math.pow(m.mul, r);

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
  stats.weatherResist = Math.min(0.9, Math.max(0, stats.weatherResist));
  return stats;
}

// --- look ----------------------------------------------------------------------

export interface Cosmetics {
  shoes: number;
  coat: number;
  headgear: number;
  back: number;
  vehicle: VehicleId;
}

/** What the character wears/rides — from EQUIPPED nodes only. */
export function resolveCosmetics(ranks: Ranks, equipped: string[]): Cosmetics {
  const out: Cosmetics = { shoes: 0, coat: 0, headgear: 0, back: 0, vehicle: 'none' };
  out.vehicle = MODES[activeModeId(equipped)].vehicle;
  for (const id of equipped) {
    const n = getNode(id);
    if (!n?.cosmetic) continue;
    const r = rankOf(ranks, id);
    for (const t of n.cosmetic.tiers) {
      if (r >= t.minRank && t.tier > out[n.cosmetic.slot]) out[n.cosmetic.slot] = t.tier;
    }
  }
  return out;
}

// --- misc ------------------------------------------------------------------------

/** Everything permanently spent (for a full-refund respec). Flux is never spent. */
export function totalSpent(ranks: Ranks): { research: number; insight: number } {
  let research = 0;
  let insight = 0;
  for (const node of NODES) {
    const r = rankOf(ranks, node.id);
    if (r < 1) continue;
    research += node.unlockCost;
    for (let step = 1; step < r; step++) insight += nextRankCost(node, step) ?? 0;
  }
  return { research, insight };
}

export type NodeState = 'locked' | 'unlockable' | 'unlocked' | 'equipped';

export function nodeState(ranks: Ranks, equipped: string[], id: string): NodeState {
  const node = getNode(id);
  if (!node) return 'locked';
  if (equipped.includes(id)) return 'equipped';
  if (isUnlocked(ranks, id)) return 'unlocked';
  return prereqsMet(ranks, node) ? 'unlockable' : 'locked';
}

export interface TreeProgress {
  total: number;
  unlocked: number;
  maxed: number;
  equipped: number;
}

export function treeProgress(ranks: Ranks, equipped: string[]): TreeProgress {
  let unlocked = 0;
  let maxed = 0;
  for (const n of NODES) {
    const r = rankOf(ranks, n.id);
    if (r >= 1) unlocked++;
    if (r >= n.maxRanks) maxed++;
  }
  return { total: NODES.length, unlocked, maxed, equipped: equipped.length };
}
