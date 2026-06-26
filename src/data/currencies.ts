import type { CurrencyId } from './types';

// ---------------------------------------------------------------------------
// CURRENCIES — derived from a run's METRICS, themed to the story + real physics
// ---------------------------------------------------------------------------
// A shadowy backer funds the lab to "go fast", so the headline currency is
// Grants. The rest are physics quantities, so they stay meaningful as the game
// scales from a walking scientist to a bicycle to (one day) relativistic
// regimes. Kinetic energy and momentum are LOG-scaled so a future heavy/fast
// object neither trivialises nor wastes them.
//
// EXTENSION POINT: add a currency by adding an id to `CurrencyId` + an entry
// here. The HUD, store and tree-costs all iterate this list.
// ---------------------------------------------------------------------------

/** The measurable outcome of a single run. */
export interface RunMetrics {
  distance: number; // metres travelled
  duration: number; // seconds
  avgSpeed: number; // m/s
  maxSpeed: number; // m/s
  peakMomentum: number; // mass * maxSpeed (raw)
  peakKE: number; // 0.5 * mass * maxSpeed^2 (raw)
  mass: number;
}

export interface CurrencyDef {
  id: CurrencyId;
  name: string;
  symbol: string;
  color: string;
  blurb: string;
  award: (m: RunMetrics) => number;
}

export const CURRENCIES: CurrencyDef[] = [
  {
    id: 'grants',
    name: 'Grants',
    symbol: '💰',
    color: '#38a169',
    blurb: 'Funding from your backer for the distance you cover. Spend it freely.',
    award: (m) => Math.floor(m.distance),
  },
  {
    id: 'pace',
    name: 'Pace',
    symbol: '🏃',
    color: '#3182ce',
    blurb: 'Earned from your average speed — rewards keeping momentum up.',
    award: (m) => Math.floor(m.avgSpeed * 6),
  },
  {
    id: 'kinetic',
    name: 'Kinetic Energy',
    symbol: '⚡',
    color: '#9f7aea',
    blurb: '½·m·v² at peak speed, log-scaled. The physicist’s favourite.',
    award: (m) => Math.floor(10 * Math.log2(1 + m.peakKE / 200)),
  },
  {
    id: 'momentum',
    name: 'Momentum',
    symbol: '🌀',
    color: '#dd6b20',
    blurb: 'm·v at peak speed, log-scaled so every object stays relevant.',
    award: (m) => Math.floor(12 * Math.log2(1 + m.peakMomentum / 60)),
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
