import type { GameObjectDef, TreeNode, CurrencyId, Cost, CosmeticSlot } from '../data/types';
import type { RideStats } from '../sim/ride';
import { CURRENCY_IDS } from '../data/currencies';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// TECH-TREE LOGIC (generic across every object)
// ---------------------------------------------------------------------------
// Player state is `ranks: nodeId -> ranks bought`. A node can take its next
// rank when its prereqs each have >=1 rank, it isn't maxed, and you can
// afford the (scaling) cost.
// ---------------------------------------------------------------------------

export type Wallet = Record<CurrencyId, number>;
export type Ranks = Record<string, number>;

export function allNodes(obj: GameObjectDef): TreeNode[] {
  return obj.categories.flatMap((c) => c.nodes);
}

export function findNode(obj: GameObjectDef, id: string): TreeNode | undefined {
  return allNodes(obj).find((n) => n.id === id);
}

export function rankOf(ranks: Ranks, id: string): number {
  return ranks[id] ?? 0;
}

/** Cost of the next rank: rank-1 cost scaled by growth^(currentRank). */
export function nextRankCost(node: TreeNode, currentRank: number): Cost {
  const growth = node.costGrowth ?? CONFIG.tree.costGrowth;
  const factor = Math.pow(growth, currentRank);
  const out: Cost = {};
  for (const c of CURRENCY_IDS) {
    const base = node.cost[c];
    if (base) out[c] = Math.round(base * factor);
  }
  return out;
}

export function canPay(wallet: Wallet, cost: Cost): boolean {
  return CURRENCY_IDS.every((c) => (wallet[c] ?? 0) >= (cost[c] ?? 0));
}

export function prereqsMet(ranks: Ranks, node: TreeNode): boolean {
  return node.prereqs.every((p) => rankOf(ranks, p) >= 1);
}

export type NodeStatus = 'maxed' | 'available' | 'inprogress' | 'lockedPrereq' | 'cantAfford';

export function nodeStatus(node: TreeNode, ranks: Ranks, wallet: Wallet): NodeStatus {
  const cur = rankOf(ranks, node.id);
  if (cur >= node.maxRanks) return 'maxed';
  if (!prereqsMet(ranks, node)) return 'lockedPrereq';
  if (!canPay(wallet, nextRankCost(node, cur))) return cur > 0 ? 'inprogress' : 'cantAfford';
  return cur > 0 ? 'inprogress' : 'available';
}

export function canBuyRank(obj: GameObjectDef, ranks: Ranks, wallet: Wallet, id: string): boolean {
  const node = findNode(obj, id);
  if (!node) return false;
  const cur = rankOf(ranks, id);
  if (cur >= node.maxRanks) return false;
  if (!prereqsMet(ranks, node)) return false;
  return canPay(wallet, nextRankCost(node, cur));
}

/** Everything spent to reach the current ranks (for a full-refund respec). */
export function totalSpent(obj: GameObjectDef, ranks: Ranks): Cost {
  const out: Cost = {};
  for (const node of allNodes(obj)) {
    const r = rankOf(ranks, node.id);
    for (let step = 0; step < r; step++) {
      const cost = nextRankCost(node, step);
      for (const c of Object.keys(cost) as CurrencyId[]) {
        out[c] = (out[c] ?? 0) + (cost[c] ?? 0);
      }
    }
  }
  return out;
}

/** Aggregate base stats + every allocated rank's mods (add·rank, then mul^rank). */
export function aggregateStats(obj: GameObjectDef, ranks: Ranks): RideStats {
  const stats = { ...obj.baseStats } as RideStats;
  const allocated = allNodes(obj)
    .map((n) => ({ n, r: rankOf(ranks, n.id) }))
    .filter((x) => x.r > 0);

  for (const { n, r } of allocated)
    for (const m of n.mods) if (m.add != null) stats[m.stat] += m.add * r;
  for (const { n, r } of allocated)
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

/** Tier per cosmetic slot from allocated ranks (0 = base look). */
export type Cosmetics = Record<CosmeticSlot, number>;

export function resolveCosmetics(obj: GameObjectDef, ranks: Ranks): Cosmetics {
  const out: Cosmetics = { shoes: 0, coat: 0, headgear: 0, back: 0 };
  for (const n of allNodes(obj)) {
    if (!n.cosmetic) continue;
    const r = rankOf(ranks, n.id);
    for (const t of n.cosmetic.tiers) {
      if (r >= t.minRank && t.tier > out[n.cosmetic.slot]) out[n.cosmetic.slot] = t.tier;
    }
  }
  return out;
}

export interface TreeProgress {
  total: number;
  maxed: number;
  inProgress: number;
  locked: number;
}

export function treeProgress(obj: GameObjectDef, ranks: Ranks, wallet: Wallet): TreeProgress {
  let maxed = 0, inProgress = 0, locked = 0, total = 0;
  for (const n of allNodes(obj)) {
    total++;
    const s = nodeStatus(n, ranks, wallet);
    if (s === 'maxed') maxed++;
    else if (s === 'inprogress') inProgress++;
    else if (s === 'lockedPrereq') locked++;
  }
  return { total, maxed, inProgress, locked };
}
