import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { CurrencyId } from '../data/types';
import { awardsFor, emptyWallet, type RunMetrics } from '../data/currencies';
import {
  aggregateStats,
  canUnlock,
  canUpgrade,
  canEquip,
  getNode,
  nextRankCost,
  rankOf,
  totalSpent,
  equippedModeNode,
  type Wallet,
  type Ranks,
} from '../game/tree';
import { simulateRide, autoPilot } from '../sim/ride';
import { CONFIG } from '../config';

const SAVE_VERSION = 6;
const OFFLINE_EFFICIENCY = CONFIG.economy.offlineEfficiency;
const MAX_OFFLINE_SECONDS = CONFIG.economy.maxOfflineHours * 3600;

export interface OfflineReport {
  runs: number;
  elapsedSec: number;
  awards: Wallet;
}

export interface GameState {
  saveVersion: number;
  wallet: Wallet;
  /** nodeId -> rank; >=1 means unlocked. */
  ranks: Ranks;
  /** Loadout: node ids whose mods currently apply (reserve Flux). */
  equipped: string[];
  bestDistance: number;
  runCount: number;
  autoRun: boolean;
  lastActive: number;
  pendingOffline: OfflineReport | null;
  introSeen: boolean;

  addRunRewards: (metrics: RunMetrics, activeMult?: number) => Record<CurrencyId, number>;
  unlockNode: (nodeId: string) => boolean;
  upgradeNode: (nodeId: string) => boolean;
  equipNode: (nodeId: string) => boolean;
  unequipNode: (nodeId: string) => void;
  resetTree: () => void;
  setAutoRun: (on: boolean) => void;
  claimOffline: () => void;
  touchActive: () => void;
  setIntroSeen: () => void;
  reset: () => void;
}

const initial = {
  saveVersion: SAVE_VERSION,
  wallet: emptyWallet(),
  ranks: {} as Ranks,
  equipped: [] as string[],
  bestDistance: 0,
  runCount: 0,
  autoRun: false,
  lastActive: Date.now(),
  pendingOffline: null as OfflineReport | null,
  introSeen: false,
};

const storage: PersistStorage<GameState> = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<GameState>) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

function computeOffline(state: GameState): OfflineReport | null {
  const elapsed = (Date.now() - state.lastActive) / 1000;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return null;
  const stats = aggregateStats(state.ranks, state.equipped);
  const capped = Math.min(elapsed, MAX_OFFLINE_SECONDS);
  const { metrics, final } = simulateRide(stats, autoPilot);
  const perRunSeconds = Math.max(1, final.t);
  const runs = Math.floor(capped / perRunSeconds);
  if (runs <= 0) return null;
  const per = awardsFor(metrics);
  const awards = emptyWallet();
  for (const id of Object.keys(awards) as CurrencyId[]) {
    awards[id] = Math.floor((per[id] ?? 0) * runs * OFFLINE_EFFICIENCY);
  }
  return { runs, elapsedSec: Math.floor(capped), awards };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,

      addRunRewards: (metrics, activeMult = 1) => {
        const baseAwards = awardsFor(metrics);
        const awards = {} as Record<CurrencyId, number>;
        for (const id of Object.keys(baseAwards) as CurrencyId[]) {
          awards[id] = Math.floor(baseAwards[id] * Math.max(1, activeMult));
        }
        set((s) => {
          const wallet = { ...s.wallet };
          for (const id of Object.keys(awards) as CurrencyId[]) {
            wallet[id] = (wallet[id] ?? 0) + awards[id];
          }
          return {
            wallet,
            runCount: s.runCount + 1,
            bestDistance: Math.max(s.bestDistance, metrics.distance),
            lastActive: Date.now(),
          };
        });
        return awards;
      },

      unlockNode: (nodeId) => {
        const s = get();
        if (!canUnlock(s.wallet, s.ranks, nodeId)) return false;
        const node = getNode(nodeId)!;
        set({
          wallet: { ...s.wallet, research: s.wallet.research - node.unlockCost },
          ranks: { ...s.ranks, [nodeId]: 1 },
        });
        return true;
      },

      upgradeNode: (nodeId) => {
        const s = get();
        if (!canUpgrade(s.wallet, s.ranks, nodeId)) return false;
        const node = getNode(nodeId)!;
        const cur = rankOf(s.ranks, nodeId);
        const cost = nextRankCost(node, cur)!;
        set({
          wallet: { ...s.wallet, insight: s.wallet.insight - cost },
          ranks: { ...s.ranks, [nodeId]: cur + 1 },
        });
        return true;
      },

      equipNode: (nodeId) => {
        const s = get();
        if (!canEquip(s.wallet, s.ranks, s.equipped, nodeId)) return false;
        const node = getNode(nodeId)!;
        let equipped = s.equipped;
        // Only one traversal mode at a time — swap the old one out.
        if (node.mode) {
          const current = equippedModeNode(equipped);
          if (current) equipped = equipped.filter((id) => id !== current.id);
        }
        set({ equipped: [...equipped, nodeId] });
        return true;
      },

      unequipNode: (nodeId) =>
        set((s) => ({ equipped: s.equipped.filter((id) => id !== nodeId) })),

      // Free, full-refund respec: refunds all Research + Insight, clears the
      // loadout. Flux was only reserved, so it comes back automatically.
      resetTree: () => {
        const s = get();
        const spent = totalSpent(s.ranks);
        set({
          wallet: {
            ...s.wallet,
            research: s.wallet.research + spent.research,
            insight: s.wallet.insight + spent.insight,
          },
          ranks: {},
          equipped: [],
        });
      },

      setAutoRun: (on) => set({ autoRun: on }),

      claimOffline: () =>
        set((s) => {
          if (!s.pendingOffline) return {};
          const wallet = { ...s.wallet };
          for (const id of Object.keys(wallet) as CurrencyId[]) {
            wallet[id] = (wallet[id] ?? 0) + (s.pendingOffline.awards[id] ?? 0);
          }
          return {
            wallet,
            runCount: s.runCount + s.pendingOffline.runs,
            pendingOffline: null,
            lastActive: Date.now(),
          };
        }),

      touchActive: () => set({ lastActive: Date.now() }),
      setIntroSeen: () => set({ introSeen: true }),

      reset: () =>
        set({ ...initial, wallet: emptyWallet(), ranks: {}, equipped: [], lastActive: Date.now() }),
    }),
    {
      name: 'move.save',
      storage,
      version: SAVE_VERSION,
      // SAVE MIGRATION — v1..v5 prototypes -> v6 unlock/upgrade/equip economy.
      // Carry currencies over to their nearest new counterpart; the tree
      // changed shape completely, so ranks/loadout start fresh.
      migrate: (persisted, fromVersion) => {
        const anyState = persisted as Record<string, unknown> | undefined;
        if (!anyState) return { ...initial } as GameState;
        if (fromVersion < 6) {
          const oldWallet = (anyState.wallet ?? {}) as Record<string, number>;
          const wallet = emptyWallet();
          wallet.research =
            (typeof anyState.coins === 'number' ? anyState.coins : 0) +
            (oldWallet.coins ?? 0) +
            (oldWallet.grants ?? 0) +
            (oldWallet.research ?? 0);
          wallet.insight =
            (oldWallet.tempo ?? 0) + (oldWallet.pace ?? 0) +
            (oldWallet.rush ?? 0) + (oldWallet.kinetic ?? 0) +
            (oldWallet.insight ?? 0);
          wallet.flux = (oldWallet.momentum ?? 0) + (oldWallet.flux ?? 0);
          return {
            ...initial,
            wallet,
            bestDistance: typeof anyState.bestDistance === 'number' ? anyState.bestDistance : 0,
            runCount: typeof anyState.runCount === 'number' ? anyState.runCount : 0,
            introSeen: anyState.introSeen === true,
            lastActive: Date.now(),
          } as GameState;
        }
        return { ...initial, ...(anyState as Partial<GameState>), saveVersion: SAVE_VERSION } as GameState;
      },
      partialize: (s) => ({
        saveVersion: s.saveVersion,
        wallet: s.wallet,
        ranks: s.ranks,
        equipped: s.equipped,
        bestDistance: s.bestDistance,
        runCount: s.runCount,
        autoRun: s.autoRun,
        lastActive: s.lastActive,
        introSeen: s.introSeen,
      }) as GameState,
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const report = computeOffline(state);
        if (report) state.pendingOffline = report;
        state.lastActive = Date.now();
      },
    },
  ),
);
