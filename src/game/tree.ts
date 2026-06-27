import type { GameObjectDef, TreeNode, CurrencyId, Cost } from '../data/types';
import type { RideStats } from '../sim/ride';
import { CURRENCY_IDS } from '../data/currencies';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// TECH-TREE LOGIC (generic across every object)
// ---------------------------------------------------------------------------
// Player state is `ranks: nodeId -> ranks bought`. Root nodes are free and
// always count as allocated. A node can take its next rank when its prereqs
// each have >=1 rank, it isn't maxed, and you can afford the (scaling) cost.
// ---------------------------------------------------------------------------

export type Wallet = Record<CurrencyId, number>;
export type Ranks = Record<string, number>;
const DEFAULT_GROWTH = CONFIG.tree.costGrowth;

export function allNodes(obj: GameObjectDef): TreeNode[] {
  return obj.categories.flatMap((c) => c.nodes);
}
export function findNode(obj: GameObjectDef, id: string): TreeNode | undefined {
  return allNodes(obj).find((n) => n.id === id);
}

/** Rank a node currently has (root nodes are implicitly 1). */
export function rankOf(obj: GameObjectDef, ranks: Ranks, id: string): number {
  const n = findNode(obj, id);
  if (!n) return 0;
  if (n.root) return 1;
  return ranks[id] ?? 0;
}

/** Cost of the next rank: rank-1 cost scaled by growth^(currentRank). */
export function nextRankCost(node: TreeNode, currentRank: number): Cost {
  const growth = node.costGrowth ?? DEFAULT_GROWTH;
  const factor = Math.pow(growth, currentRank);
  const out: Cost = {};
  for (const c of CURRENCY_IDS) {
    const base = node.cost[c];
    if (base) out[c] = Math.round(base * factor);
  }
  return out;
}

function canPay(wallet: Wallet, cost: Cost): boolean {
  return CURRENCY_IDS.every((c) => (wallet[c] ?? 0) >= (cost[c] ?? 0));
}

export function prereqsMet(obj: GameObjectDef, ranks: Ranks, node: TreeNode): boolean {
  return node.prereqs.every((p) => rankOf(obj, ranks, p) >= 1);
}

export type NodeStatus = 'maxed' | 'available' | 'inprogress' | 'lockedPrereq' | 'cantAfford';

export function nodeStatus(
  obj: GameObjectDef,
  ranks: Ranks,
  wallet: Wallet,
  id: string,
): NodeStatus {
  const node = findNode(obj, id)!;
  const cur = rankOf(obj, ranks, id);
  if (cur >= node.maxRanks) return 'maxed';
  if (!prereqsMet(obj, ranks, node)) return 'lockedPrereq';
  if (!canPay(wallet, nextRankCost(node, cur))) return cur > 0 ? 'inprogress' : 'cantAfford';
  return cur > 0 ? 'inprogress' : 'available';
}

export function canBuyRank(obj: GameObjectDef, ranks: Ranks, wallet: Wallet, id: string): boolean {
  const node = findNode(obj, id);
  if (!node) return false;
  const cur = rankOf(obj, ranks, id);
  if (cur >= node.maxRanks) return false;
  if (!prereqsMet(obj, ranks, node)) return false;
  return canPay(wallet, nextRankCost(node, cur));
}

/** Aggregate base stats + every allocated rank's mods (add·rank, then mul^rank). */
export function aggregateStats(obj: GameObjectDef, ranks: Ranks): RideStats {
  const stats = { ...obj.baseStats } as RideStats;
  const allocated = allNodes(obj)
    .map((n) => ({ n, r: rankOf(obj, ranks, n.id) }))
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

/** Character SVG layers from allocated nodes (highest satisfied minRank wins). */
export function resolveArt(obj: GameObjectDef, ranks: Ranks): { layer: string; svg: string }[] {
  const byLayer = new Map<string, { svg: string; minRank: number }>();
  for (const n of allNodes(obj)) {
    if (!n.art) continue;
    const r = rankOf(obj, ranks, n.id);
    if (r <= 0) continue;
    let best: { minRank: number; svg: string } | null = null;
    for (const e of n.art.ranks) if (r >= e.minRank && (!best || e.minRank > best.minRank)) best = e;
    if (best) {
      const cur = byLayer.get(n.art.layer);
      if (!cur || best.minRank > cur.minRank) byLayer.set(n.art.layer, { svg: best.svg, minRank: best.minRank });
    }
  }
  return [...byLayer.entries()].map(([layer, v]) => ({ layer, svg: v.svg }));
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
    if (n.root) continue;
    total++;
    const s = nodeStatus(obj, ranks, wallet, n.id);
    if (s === 'maxed') maxed++;
    else if (s === 'inprogress') inProgress++;
    else if (s === 'lockedPrereq') locked++;
  }
  return { total, maxed, inProgress, locked };
}

export function zeroWallet(): Wallet {
  const out = {} as Wallet;
  for (const c of CURRENCY_IDS) out[c] = 0;
  return out;
}
