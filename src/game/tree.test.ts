import { describe, it, expect } from 'vitest';
import { scientist } from '../data/scientist';
import {
  aggregateStats,
  canBuyRank,
  nextRankCost,
  findNode,
  resolveCosmetics,
  totalSpent,
  nodeStatus,
  type Wallet,
} from './tree';
import { emptyWallet } from '../data/currencies';

function richWallet(): Wallet {
  const w = emptyWallet();
  for (const k of Object.keys(w) as (keyof Wallet)[]) w[k] = 1e9;
  return w;
}

describe('nextRankCost', () => {
  it('scales by the growth factor per rank', () => {
    const node = findNode(scientist, 'fw_light')!; // research: 60, default growth 1.7
    expect(nextRankCost(node, 0).research).toBe(60);
    expect(nextRankCost(node, 1).research).toBe(Math.round(60 * 1.7));
    expect(nextRankCost(node, 2).research).toBe(Math.round(60 * 1.7 * 1.7));
  });
});

describe('canBuyRank', () => {
  it('requires prerequisites at rank >= 1', () => {
    const wallet = richWallet();
    expect(canBuyRank(scientist, {}, wallet, 'fw_spring')).toBe(false); // needs fw_light
    expect(canBuyRank(scientist, { fw_light: 1 }, wallet, 'fw_spring')).toBe(true);
  });

  it('requires affordable cost and respects maxRanks', () => {
    expect(canBuyRank(scientist, {}, emptyWallet(), 'fw_light')).toBe(false);
    expect(canBuyRank(scientist, { fw_light: 3 }, richWallet(), 'fw_light')).toBe(false); // maxed
  });

  it('rejects unknown nodes', () => {
    expect(canBuyRank(scientist, {}, richWallet(), 'nope')).toBe(false);
  });
});

describe('nodeStatus', () => {
  it('distinguishes locked, available, in-progress and maxed', () => {
    const node = findNode(scientist, 'fw_spring')!;
    expect(nodeStatus(node, {}, richWallet())).toBe('lockedPrereq');
    expect(nodeStatus(node, { fw_light: 1 }, richWallet())).toBe('available');
    expect(nodeStatus(node, { fw_light: 1, fw_spring: 1 }, richWallet())).toBe('inprogress');
    expect(nodeStatus(node, { fw_light: 1, fw_spring: 3 }, richWallet())).toBe('maxed');
  });
});

describe('aggregateStats', () => {
  it('applies additive mods then multiplicative mods per rank', () => {
    const base = scientist.baseStats;
    // ow_light: weight -2/rank (add); fw_light: weight ×0.97/rank (mul)
    const stats = aggregateStats(scientist, { ow_light: 2, fw_light: 3 });
    expect(stats.weight).toBeCloseTo((base.weight - 4) * Math.pow(0.97, 3), 6);
  });

  it('returns base stats with no ranks', () => {
    expect(aggregateStats(scientist, {}).runPower).toBe(scientist.baseStats.runPower);
  });
});

describe('resolveCosmetics', () => {
  it('picks the highest satisfied tier per slot', () => {
    expect(resolveCosmetics(scientist, {})).toEqual({ shoes: 0, coat: 0, headgear: 0, back: 0 });
    const c = resolveCosmetics(scientist, { fw_light: 3, br_reaction: 1, te_exo: 1 });
    expect(c.shoes).toBe(2); // rank 3 unlocks tier 2
    expect(c.headgear).toBe(1); // rank 1 only reaches tier 1
    expect(c.back).toBe(1);
    expect(c.coat).toBe(0);
  });
});

describe('totalSpent', () => {
  it('sums every rank at its scaled price (full-refund invariant)', () => {
    const spent = totalSpent(scientist, { fw_light: 2 });
    expect(spent.research).toBe(60 + Math.round(60 * 1.7));
  });
});
