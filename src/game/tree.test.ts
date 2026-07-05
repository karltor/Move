import { describe, it, expect } from 'vitest';
import {
  aggregateStats,
  canUnlock,
  canUpgrade,
  canEquip,
  fluxUsed,
  fluxFree,
  getNode,
  nextRankCost,
  nodeState,
  activeModeId,
  resolveCosmetics,
  totalSpent,
  equippedModeNode,
  type Wallet,
} from './tree';
import { MODES } from '../data/modes';
import { NODES } from '../data/nodes';
import { emptyWallet } from '../data/currencies';
import { CONFIG } from '../config';

function richWallet(): Wallet {
  const w = emptyWallet();
  for (const k of Object.keys(w) as (keyof Wallet)[]) w[k] = 1e9;
  return w;
}

describe('node data sanity', () => {
  it('every prereq exists and no node overlaps another on the grid', () => {
    const seen = new Set<string>();
    for (const n of NODES) {
      for (const p of n.prereqs) expect(getNode(p), `${n.id} prereq ${p}`).toBeDefined();
      const key = `${n.pos.col},${n.pos.row}`;
      expect(seen.has(key), `grid clash at ${key} (${n.id})`).toBe(false);
      seen.add(key);
    }
  });

  it('mode nodes are single-rank', () => {
    for (const n of NODES.filter((n) => n.mode)) expect(n.maxRanks).toBe(1);
  });
});

describe('unlock (research)', () => {
  it('requires prerequisites unlocked and enough research', () => {
    expect(canUnlock(richWallet(), {}, 'b_sprint')).toBe(false); // needs b_stride
    expect(canUnlock(richWallet(), { b_stride: 1 }, 'b_sprint')).toBe(true);
    expect(canUnlock(emptyWallet(), {}, 'b_stride')).toBe(false); // broke
    expect(canUnlock(richWallet(), { b_stride: 1 }, 'b_stride')).toBe(false); // already unlocked
  });
});

describe('upgrade (insight)', () => {
  it('scales the rank cost by the growth factor', () => {
    const node = getNode('b_stride')!; // rankCost 12
    expect(nextRankCost(node, 1)).toBe(12);
    expect(nextRankCost(node, 2)).toBe(Math.round(12 * CONFIG.tree.costGrowth));
    expect(nextRankCost(node, 3)).toBeNull(); // maxRanks 3
    expect(nextRankCost(node, 0)).toBeNull(); // not unlocked yet
  });

  it('canUpgrade needs an unlocked, unmaxed node and enough insight', () => {
    expect(canUpgrade(richWallet(), {}, 'b_stride')).toBe(false);
    expect(canUpgrade(richWallet(), { b_stride: 1 }, 'b_stride')).toBe(true);
    expect(canUpgrade(richWallet(), { b_stride: 3 }, 'b_stride')).toBe(false);
    expect(canUpgrade(emptyWallet(), { b_stride: 1 }, 'b_stride')).toBe(false);
  });
});

describe('equip (flux budget)', () => {
  it('reserves flux while equipped and frees it for the check on mode swaps', () => {
    const wallet = { ...emptyWallet(), flux: 100 };
    const ranks = { b_stride: 1, b_lungs: 1 };
    expect(canEquip(wallet, ranks, [], 'b_stride')).toBe(true); // 20 <= 100
    expect(fluxUsed(['b_stride'])).toBe(20);
    expect(fluxFree(wallet, ['b_stride'])).toBe(80);
    expect(canEquip(wallet, ranks, ['b_stride'], 'b_stride')).toBe(false); // already on
    expect(canEquip(wallet, ranks, ['b_stride'], 'b_lungs')).toBe(true); // 25 <= 80
  });

  it('cannot equip locked nodes or beyond the budget', () => {
    const wallet = { ...emptyWallet(), flux: 10 };
    expect(canEquip(wallet, {}, [], 'b_stride')).toBe(false); // not unlocked
    expect(canEquip(wallet, { b_stride: 1 }, [], 'b_stride')).toBe(false); // 20 > 10
  });

  it('swapping modes counts the outgoing mode\'s flux as free', () => {
    const skate = getNode('v_skate')!;
    const bike = getNode('v_bike')!;
    const ranks = { v_skate: 1, v_bike: 1 };
    // budget covers the bike only if the skateboard's reservation comes back
    const wallet = { ...emptyWallet(), flux: bike.equipCost + skate.equipCost - 100 };
    expect(canEquip(wallet, ranks, ['v_skate'], 'v_bike')).toBe(bike.equipCost <= wallet.flux);
    expect(equippedModeNode(['v_skate'])?.id).toBe('v_skate');
  });
});

describe('aggregateStats', () => {
  it('starts from the equipped mode\'s base stats', () => {
    expect(activeModeId([])).toBe('run');
    expect(aggregateStats({}, []).topSpeed).toBe(MODES.run.baseStats.topSpeed);
    const withBike = aggregateStats({ v_bike: 1 }, ['v_bike']);
    expect(withBike.topSpeed).toBe(MODES.bicycle.baseStats.topSpeed);
  });

  it('applies mods only for EQUIPPED nodes (unlocked alone does nothing)', () => {
    const ranks = { b_stride: 2 };
    expect(aggregateStats(ranks, []).walkPower).toBe(MODES.run.baseStats.walkPower);
    expect(aggregateStats(ranks, ['b_stride']).walkPower).toBe(MODES.run.baseStats.walkPower + 24);
  });

  it('applies additive mods before multiplicative mods', () => {
    const base = MODES.run.baseStats;
    // g_suit: weight -4/rank (add) + b_feather: weight ×0.95/rank (mul)
    const ranks = { g_suit: 2, b_feather: 3, g_helmet: 2, g_coat: 1 };
    const stats = aggregateStats(ranks, ['g_suit', 'b_feather']);
    expect(stats.weight).toBeCloseTo((base.weight - 8) * Math.pow(0.95, 3), 6);
  });
});

describe('resolveCosmetics', () => {
  it('reflects only the equipped loadout, including the vehicle', () => {
    const ranks = { g_shoes: 3, g_helmet: 1, v_skate: 1 };
    expect(resolveCosmetics(ranks, []).shoes).toBe(0); // unlocked but not equipped
    const c = resolveCosmetics(ranks, ['g_shoes', 'v_skate']);
    expect(c.shoes).toBe(2); // rank 3 = tier 2
    expect(c.headgear).toBe(0); // helmet not equipped
    expect(c.vehicle).toBe('skateboard');
  });
});

describe('totalSpent / respec refund', () => {
  it('sums unlock costs plus every rank at its scaled price', () => {
    const spent = totalSpent({ b_stride: 3, g_shoes: 1 });
    const b = getNode('b_stride')!;
    const g = getNode('g_shoes')!;
    expect(spent.research).toBe(b.unlockCost + g.unlockCost);
    expect(spent.insight).toBe(nextRankCost(b, 1)! + nextRankCost(b, 2)!);
  });
});

describe('nodeState', () => {
  it('walks locked → unlockable → unlocked → equipped', () => {
    expect(nodeState({}, [], 'b_sprint')).toBe('locked');
    expect(nodeState({ b_stride: 1 }, [], 'b_sprint')).toBe('unlockable');
    expect(nodeState({ b_stride: 1, b_sprint: 1 }, [], 'b_sprint')).toBe('unlocked');
    expect(nodeState({ b_stride: 1, b_sprint: 1 }, ['b_sprint'], 'b_sprint')).toBe('equipped');
  });
});
