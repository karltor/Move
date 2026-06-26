import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { ACTIVE_OBJECT_ID, getObject } from '../data';
import type { CurrencyId } from '../data/types';
import {
  awardsFor,
  emptyWallet,
  type RunMetrics,
} from '../data/currencies';
import {
  aggregateStats,
  canAllocate,
  nodeById,
  type AllocatedSet,
  type Wallet,
} from '../game/tree';
import { simulateRide, autoPilot } from '../sim/ride';

// Bump when the persisted shape changes; handle old shapes in `migrate`.
const SAVE_VERSION = 2;

// Offline catch-up tuning.
const OFFLINE_EFFICIENCY = 0.5; // away runs earn half of an auto-pilot run
const MAX_OFFLINE_SECONDS = 8 * 3600; // cap idle accrual at 8 hours

export interface OfflineReport {
  runs: number;
  elapsedSec: number;
  awards: Wallet;
}

export interface GameState {
  saveVersion: number;
  objectId: string;
  wallet: Wallet;
  /** Allocated tree-node ids (always includes the root). */
  allocated: AllocatedSet;
  bestDistance: number;
  runCount: number;
  autoRun: boolean;
  lastActive: number; // epoch ms
  pendingOffline: OfflineReport | null;

  // --- actions ---
  /** Award currencies for a run. `activeMult` (>=1) rewards active pedalling
   *  over idle auto-runs — see App's active-fraction tracking. */
  addRunRewards: (metrics: RunMetrics, activeMult?: number) => Record<CurrencyId, number>;
  allocate: (nodeId: string) => boolean;
  respec: () => void;
  setAutoRun: (on: boolean) => void;
  claimOffline: () => void;
  touchActive: () => void;
  reset: () => void;
}

function rootAllocated(): AllocatedSet {
  return [getObject(ACTIVE_OBJECT_ID).tree.rootId];
}

const initial = {
  saveVersion: SAVE_VERSION,
  objectId: ACTIVE_OBJECT_ID,
  wallet: emptyWallet(),
  allocated: rootAllocated(),
  bestDistance: 0,
  runCount: 0,
  autoRun: false,
  lastActive: Date.now(),
  pendingOffline: null as OfflineReport | null,
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

/** Estimate idle earnings since `lastActive` using a headless auto-pilot run. */
function computeOffline(state: GameState): OfflineReport | null {
  const elapsed = (Date.now() - state.lastActive) / 1000;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return null;
  const obj = getObject(state.objectId);
  const stats = aggregateStats(obj, state.allocated);
  const capped = Math.min(elapsed, MAX_OFFLINE_SECONDS);
  const runs = Math.floor(capped / stats.runTime);
  if (runs <= 0) return null;

  const { metrics } = simulateRide(stats, autoPilot);
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
        const base = awardsFor(metrics);
        const awards = {} as Record<CurrencyId, number>;
        for (const id of Object.keys(base) as CurrencyId[]) {
          awards[id] = Math.floor(base[id] * Math.max(1, activeMult));
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

      allocate: (nodeId) => {
        const s = get();
        const obj = getObject(s.objectId);
        if (!canAllocate(obj, s.allocated, s.wallet, nodeId)) return false;
        const node = nodeById(obj, nodeId)!;
        const wallet = { ...s.wallet };
        for (const id of Object.keys(node.cost) as CurrencyId[]) {
          wallet[id] = (wallet[id] ?? 0) - (node.cost[id] ?? 0);
        }
        set({ wallet, allocated: [...s.allocated, nodeId] });
        return true;
      },

      // Free, full-refund respec — experimentation should be painless in the
      // prototype. Refunds every spent currency, then resets to the root.
      respec: () => {
        const s = get();
        const obj = getObject(s.objectId);
        const wallet = { ...s.wallet };
        for (const id of s.allocated) {
          const node = nodeById(obj, id);
          if (!node) continue;
          for (const cid of Object.keys(node.cost) as CurrencyId[]) {
            wallet[cid] = (wallet[cid] ?? 0) + (node.cost[cid] ?? 0);
          }
        }
        set({ wallet, allocated: [obj.tree.rootId] });
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

      reset: () =>
        set({
          ...initial,
          wallet: emptyWallet(),
          allocated: rootAllocated(),
          lastActive: Date.now(),
        }),
    }),
    {
      name: 'move.save',
      storage,
      version: SAVE_VERSION,
      // SAVE MIGRATION — keyed on the persisted version. v1 was the old
      // slot/variant prototype; map its coins forward and reset the tree.
      migrate: (persisted, fromVersion) => {
        const anyState = persisted as Record<string, unknown> | undefined;
        if (!anyState) return { ...initial } as GameState;

        if (fromVersion < 2) {
          // v1 -> v2: carry coins + best/run counters, drop equipped slots,
          // start the passive tree at the root.
          const wallet = emptyWallet();
          if (typeof anyState.coins === 'number') wallet.coins = anyState.coins;
          return {
            ...initial,
            wallet,
            allocated: rootAllocated(),
            bestDistance:
              typeof anyState.bestDistance === 'number' ? anyState.bestDistance : 0,
            runCount: typeof anyState.runCount === 'number' ? anyState.runCount : 0,
            lastActive: Date.now(),
          } as GameState;
        }

        // Same version: merge onto defaults so new fields are present.
        return {
          ...initial,
          ...(anyState as Partial<GameState>),
          saveVersion: SAVE_VERSION,
        } as GameState;
      },
      partialize: (s) => ({
        saveVersion: s.saveVersion,
        objectId: s.objectId,
        wallet: s.wallet,
        allocated: s.allocated,
        bestDistance: s.bestDistance,
        runCount: s.runCount,
        autoRun: s.autoRun,
        lastActive: s.lastActive,
      }) as GameState,
      // After load, compute offline catch-up and stash it for a welcome-back.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const report = computeOffline(state);
        if (report) state.pendingOffline = report;
        state.lastActive = Date.now();
      },
    },
  ),
);
