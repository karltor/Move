import type {
  GameObjectDef,
  TreeNode,
  CurrencyId,
} from '../data/types';
import type { RideStats } from '../sim/ride';
import { CURRENCY_IDS } from '../data/currencies';

// ---------------------------------------------------------------------------
// PASSIVE-TREE LOGIC (generic across every object)
// ---------------------------------------------------------------------------
// Allocation rules (Path-of-Exile style):
//   • the root is always allocated and free,
//   • a node can be allocated only if it touches an already-allocated node,
//   • you can afford its currency cost,
//   • at most ONE speciality (keystone) may be allocated per object.
// Stats are the object's base stats plus every allocated node's modifiers
// (additive pass, then multiplicative pass). Art layers come from the highest
// `setArt.tier` among allocated nodes per slot.
// ---------------------------------------------------------------------------

export type Wallet = Record<CurrencyId, number>;
export type AllocatedSet = string[]; // node ids (includes root)

export function nodeById(obj: GameObjectDef, id: string): TreeNode | undefined {
  return obj.tree.nodes.find((n) => n.id === id);
}

/** Ids of nodes directly connected to `id` by an edge. */
export function neighbors(obj: GameObjectDef, id: string): string[] {
  const out: string[] = [];
  for (const e of obj.tree.edges) {
    if (e.a === id) out.push(e.b);
    else if (e.b === id) out.push(e.a);
  }
  return out;
}

export function isAllocated(allocated: AllocatedSet, id: string): boolean {
  return allocated.includes(id);
}

export function specialityAllocated(
  obj: GameObjectDef,
  allocated: AllocatedSet,
): TreeNode | null {
  for (const id of allocated) {
    const n = nodeById(obj, id);
    if (n && n.kind === 'speciality') return n;
  }
  return null;
}

export function canAfford(wallet: Wallet, cost: TreeNode['cost']): boolean {
  for (const id of CURRENCY_IDS) {
    const need = cost[id] ?? 0;
    if ((wallet[id] ?? 0) < need) return false;
  }
  return true;
}

/** Why a node can't be allocated, or null if it can. Drives the UI. */
export function allocationBlock(
  obj: GameObjectDef,
  allocated: AllocatedSet,
  wallet: Wallet,
  id: string,
): null | 'allocated' | 'unreachable' | 'cost' | 'speciality' {
  if (isAllocated(allocated, id)) return 'allocated';
  const node = nodeById(obj, id);
  if (!node) return 'unreachable';
  const reachable = neighbors(obj, id).some((n) => isAllocated(allocated, n));
  if (!reachable) return 'unreachable';
  if (node.kind === 'speciality' && specialityAllocated(obj, allocated)) {
    return 'speciality';
  }
  if (!canAfford(wallet, node.cost)) return 'cost';
  return null;
}

export function canAllocate(
  obj: GameObjectDef,
  allocated: AllocatedSet,
  wallet: Wallet,
  id: string,
): boolean {
  return allocationBlock(obj, allocated, wallet, id) === null;
}

/** Aggregate base stats + every allocated node's modifiers. Generic: works for
 *  any object/stat with no object-specific code. */
export function aggregateStats(
  obj: GameObjectDef,
  allocated: AllocatedSet,
): RideStats {
  const stats = { ...obj.baseStats } as RideStats;

  // Additive pass.
  for (const id of allocated) {
    const node = nodeById(obj, id);
    if (!node) continue;
    for (const m of node.mods) {
      if (m.add != null) stats[m.stat] += m.add;
    }
  }
  // Multiplicative pass.
  for (const id of allocated) {
    const node = nodeById(obj, id);
    if (!node) continue;
    for (const m of node.mods) {
      if (m.mul != null) stats[m.stat] *= m.mul;
    }
  }

  // Sanity clamps so wild builds never break the sim.
  stats.maxStamina = Math.max(10, stats.maxStamina);
  stats.weight = Math.max(20, stats.weight);
  stats.drag = Math.max(0.02, stats.drag);
  stats.rollResist = Math.max(0, stats.rollResist);
  stats.topSpeed = Math.max(2, stats.topSpeed);
  stats.runTime = Math.max(5, stats.runTime);
  stats.battery = Math.max(0, stats.battery);
  return stats;
}

/** Resolve the SVG to draw for each slot: default art unless an allocated node
 *  overrides it with a higher tier. Returns slotId -> svg url, sorted by z. */
export function resolveArt(
  obj: GameObjectDef,
  allocated: AllocatedSet,
): { slot: string; z: number; svg: string }[] {
  const best: Record<string, { svg: string; tier: number }> = {};
  for (const slot of obj.slots) best[slot.id] = { svg: slot.svg, tier: 0 };

  for (const id of allocated) {
    const node = nodeById(obj, id);
    if (!node?.setArt) continue;
    const cur = best[node.setArt.slot];
    if (cur && node.setArt.tier > cur.tier) {
      best[node.setArt.slot] = { svg: node.setArt.svg, tier: node.setArt.tier };
    }
  }

  return obj.slots
    .map((s) => ({ slot: s.id, z: s.z, svg: best[s.id].svg }))
    .sort((a, b) => a.z - b.z);
}
