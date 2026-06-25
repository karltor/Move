import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { ACTIVE_OBJECT_ID, getObject } from '../data';
import { defaultEquipped, nextVariant, type Equipped } from '../game/stats';

// Bump this whenever the persisted shape changes, and handle the old shape in
// `migrate` below.
const SAVE_VERSION = 1;

export interface GameState {
  saveVersion: number;
  /** Which object is active (single object today; field future-proofs it). */
  objectId: string;
  coins: number;
  bestDistance: number;
  runCount: number;
  /** slotId -> equipped variantId for the active object. */
  equipped: Equipped;

  // --- actions ---
  addCoins: (amount: number) => void;
  recordRun: (distance: number) => void;
  buyUpgrade: (slotId: string) => boolean;
  reset: () => void;
}

function freshEquipped(): Equipped {
  return defaultEquipped(getObject(ACTIVE_OBJECT_ID));
}

const initial = {
  saveVersion: SAVE_VERSION,
  objectId: ACTIVE_OBJECT_ID,
  coins: 0,
  bestDistance: 0,
  runCount: 0,
  equipped: freshEquipped(),
};

// localStorage may be unavailable (SSR/tests/private mode). Fall back to a
// no-op store so the app still runs.
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

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,

      addCoins: (amount) => set((s) => ({ coins: s.coins + Math.max(0, amount) })),

      recordRun: (distance) =>
        set((s) => ({
          runCount: s.runCount + 1,
          bestDistance: Math.max(s.bestDistance, distance),
        })),

      buyUpgrade: (slotId) => {
        const obj = getObject(get().objectId);
        const next = nextVariant(obj, slotId, get().equipped);
        if (!next) return false;
        if (get().coins < next.cost) return false;
        set((s) => ({
          coins: s.coins - next.cost,
          equipped: { ...s.equipped, [slotId]: next.id },
        }));
        return true;
      },

      reset: () => set({ ...initial, equipped: freshEquipped() }),
    }),
    {
      name: 'move.save',
      storage,
      version: SAVE_VERSION,
      // SAVE MIGRATION HOOK — currently a no-op (only one version exists). When
      // SAVE_VERSION is bumped, transform `persisted` from `fromVersion` up to
      // the current shape here, version by version. Baked in now so future
      // game changes don't strand existing saves.
      migrate: (persisted, fromVersion) => {
        let state = persisted as Partial<GameState> | undefined;
        if (!state) return { ...initial } as GameState;

        // Example of the intended pattern (no migrations needed yet):
        // if (fromVersion < 1) { state = { ...state, /* reshape v0 -> v1 */ }; }
        void fromVersion;

        // Merge onto fresh defaults so any newly-added fields are present.
        return {
          ...initial,
          ...state,
          saveVersion: SAVE_VERSION,
        } as GameState;
      },
      partialize: (s) => ({
        saveVersion: s.saveVersion,
        objectId: s.objectId,
        coins: s.coins,
        bestDistance: s.bestDistance,
        runCount: s.runCount,
        equipped: s.equipped,
      }) as GameState,
    },
  ),
);
