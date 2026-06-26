import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { ACTIVE_OBJECT_ID, getObject } from '../data';
import type { CurrencyId } from '../data/types';
import { awardsFor, emptyWallet, type RunMetrics } from '../data/currencies';
import {
  aggregateStats,
  baseUpgradeIds,
  defaultEquipped,
  findUpgrade,
  canUnlock,
  canEquip,
  slotOf,
  zeroWallet,
  type Wallet,
  type Unlocked,
  type Equipped,
} from '../game/builds';
import { simulateRide, autoPilot } from '../sim/ride';

const SAVE_VERSION = 4;
const OFFLINE_EFFICIENCY = 0.5;
const MAX_OFFLINE_SECONDS = 8 * 3600;

export interface OfflineReport {
  runs: number;
  elapsedSec: number;
  awards: Wallet;
}

export interface GameState {
  saveVersion: number;
  objectId: string;
  wallet: Wallet;
  unlocked: Unlocked;
  equipped: Equipped;
  bestDistance: number;
  runCount: number;
  autoRun: boolean;
  lastActive: number;
  pendingOffline: OfflineReport | null;
  introSeen: boolean;

  addRunRewards: (metrics: RunMetrics, activeMult?: number) => Record<CurrencyId, number>;
  unlock: (upgradeId: string) => boolean;
  equip: (slotId: string, upgradeId: string) => boolean;
  setAutoRun: (on: boolean) => void;
  claimOffline: () => void;
  touchActive: () => void;
  setIntroSeen: () => void;
  reset: () => void;
}

function freshUnlocked(): Unlocked {
  return baseUpgradeIds(getObject(ACTIVE_OBJECT_ID));
}
function freshEquipped(): Equipped {
  return defaultEquipped(getObject(ACTIVE_OBJECT_ID));
}

const initial = {
  saveVersion: SAVE_VERSION,
  objectId: ACTIVE_OBJECT_ID,
  wallet: emptyWallet(),
  unlocked: freshUnlocked(),
  equipped: freshEquipped(),
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
  const obj = getObject(state.objectId);
  const stats = aggregateStats(obj, state.equipped);
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

      unlock: (upgradeId) => {
        const s = get();
        const obj = getObject(s.objectId);
        if (!canUnlock(obj, s.unlocked, s.wallet, upgradeId)) return false;
        const u = findUpgrade(obj, upgradeId)!;
        const wallet = { ...s.wallet };
        for (const c of Object.keys(u.unlockCost) as CurrencyId[]) {
          wallet[c] = (wallet[c] ?? 0) - (u.unlockCost[c] ?? 0);
        }
        set({ wallet, unlocked: [...s.unlocked, upgradeId] });
        return true;
      },

      equip: (slotId, upgradeId) => {
        const s = get();
        const obj = getObject(s.objectId);
        const slot = slotOf(obj, upgradeId);
        if (!slot || slot.id !== slotId) return false;
        if (!canEquip(obj, s.unlocked, s.wallet, s.equipped, upgradeId)) return false;
        set({ equipped: { ...s.equipped, [slotId]: upgradeId } });
        return true;
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
        set({
          ...initial,
          wallet: emptyWallet(),
          unlocked: freshUnlocked(),
          equipped: freshEquipped(),
          lastActive: Date.now(),
        }),
    }),
    {
      name: 'move.save',
      storage,
      version: SAVE_VERSION,
      // SAVE MIGRATION — v1 launch proto, v2 cyclist tree, v3 scientist tree,
      // v4 scientist BUILD board. Carry funding + counters; reset the loadout.
      migrate: (persisted, fromVersion) => {
        const anyState = persisted as Record<string, unknown> | undefined;
        if (!anyState) return { ...initial } as GameState;
        if (fromVersion < 4) {
          const oldWallet = (anyState.wallet ?? {}) as Record<string, number>;
          const wallet = emptyWallet();
          wallet.grants =
            (typeof anyState.coins === 'number' ? anyState.coins : 0) +
            (oldWallet.coins ?? 0) +
            (oldWallet.grants ?? 0);
          wallet.pace += (oldWallet.tempo ?? 0) + (oldWallet.pace ?? 0);
          wallet.kinetic += (oldWallet.rush ?? 0) + (oldWallet.kinetic ?? 0);
          wallet.momentum += oldWallet.momentum ?? 0;
          return {
            ...initial,
            wallet,
            unlocked: freshUnlocked(),
            equipped: freshEquipped(),
            bestDistance:
              typeof anyState.bestDistance === 'number' ? anyState.bestDistance : 0,
            runCount: typeof anyState.runCount === 'number' ? anyState.runCount : 0,
            introSeen: anyState.introSeen === true,
            lastActive: Date.now(),
          } as GameState;
        }
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
        unlocked: s.unlocked,
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

export { zeroWallet };
