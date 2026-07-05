import type { CurrencyId } from './types';

// ---------------------------------------------------------------------------
// CURRENCIES — three currencies, three verbs.
// ---------------------------------------------------------------------------
//   🔬 Research (distance)  → UNLOCK nodes.       Spent permanently.
//   💡 Insight  (speed)     → UPGRADE node ranks. Spent permanently.
//   ⚡ Flux     (momentum)  → EQUIP nodes.        A budget: reserved while
//                             equipped, freed on unequip.
// Flux is log-scaled so faster/heavier late-game rides keep growing it
// without exploding.
// ---------------------------------------------------------------------------

export interface RunMetrics {
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  peakMomentum: number;
  peakKE: number;
  mass: number;
}

export interface CurrencyDef {
  id: CurrencyId;
  name: string;
  symbol: string;
  color: string;
  /** What this currency DOES (shown in the HUD/Lab). */
  verb: string;
  blurb: string;
  award: (m: RunMetrics) => number;
}

export const CURRENCIES: CurrencyDef[] = [
  {
    id: 'research',
    name: 'Research',
    symbol: '🔬',
    color: '#38b2ac',
    verb: 'unlocks nodes',
    blurb: 'Earned from distance covered. Spend it to unlock nodes.',
    award: (m) => Math.floor(m.distance),
  },
  {
    id: 'insight',
    name: 'Insight',
    symbol: '💡',
    color: '#d69e2e',
    verb: 'upgrades nodes',
    blurb: 'Earned from speed. Spend it to rank up unlocked nodes.',
    award: (m) => Math.floor(m.avgSpeed * 4 + m.maxSpeed * 3),
  },
  {
    id: 'flux',
    name: 'Flux',
    symbol: '⚡',
    color: '#9f7aea',
    verb: 'powers your loadout',
    blurb: 'Earned from peak momentum. Equipped nodes reserve Flux; unequip to free it.',
    award: (m) => Math.floor(12 * Math.log2(1 + m.peakMomentum / 40)),
  },
];

export const CURRENCY_IDS: CurrencyId[] = CURRENCIES.map((c) => c.id);

export function getCurrency(id: CurrencyId): CurrencyDef {
  const c = CURRENCIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown currency ${id}`);
  return c;
}

export function awardsFor(m: RunMetrics): Record<CurrencyId, number> {
  const out = {} as Record<CurrencyId, number>;
  for (const c of CURRENCIES) out[c.id] = Math.max(0, c.award(m));
  return out;
}

export function emptyWallet(): Record<CurrencyId, number> {
  const out = {} as Record<CurrencyId, number>;
  for (const c of CURRENCIES) out[c.id] = 0;
  return out;
}
