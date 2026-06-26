import type { CurrencyId } from './types';

// ---------------------------------------------------------------------------
// CURRENCIES — derived from a run's METRICS, not handed out flatly.
// ---------------------------------------------------------------------------
// Each currency rewards a different way of playing, so upgrades can cost a mix
// and every play-style stays relevant. `momentum` is log-scaled on purpose:
// future objects (a particle accelerator: tiny mass, enormous velocity; a
// train: huge mass, modest velocity) would otherwise either trivialise or
// be worthless. Log keeps the numbers comparable across wildly different
// objects.
//
// EXTENSION POINT: add a currency by adding an id to `CurrencyId` and an entry
// here. Tree-node costs, the HUD and the store all iterate this list.
// ---------------------------------------------------------------------------

/** The measurable outcome of a single run. */
export interface RunMetrics {
  distance: number; // metres travelled
  duration: number; // seconds
  avgSpeed: number; // m/s
  maxSpeed: number; // m/s
  peakMomentum: number; // mass * maxSpeed (raw, pre-scaling)
  mass: number;
}

export interface CurrencyDef {
  id: CurrencyId;
  name: string;
  symbol: string;
  color: string;
  blurb: string;
  /** How much of this currency a run awards, given its metrics. */
  award: (m: RunMetrics) => number;
}

export const CURRENCIES: CurrencyDef[] = [
  {
    id: 'coins',
    name: 'Coins',
    symbol: '🪙',
    color: '#d69e2e',
    blurb: 'Earned from raw distance. The everyday upgrade currency.',
    award: (m) => Math.floor(m.distance),
  },
  {
    id: 'tempo',
    name: 'Tempo',
    symbol: '⏱️',
    color: '#3182ce',
    blurb: 'Earned from your average speed — rewards sustained pace.',
    award: (m) => Math.floor(m.avgSpeed * 6),
  },
  {
    id: 'rush',
    name: 'Rush',
    symbol: '⚡',
    color: '#9f7aea',
    blurb: 'Earned from your top speed — rewards going fast at all.',
    award: (m) => Math.floor(m.maxSpeed * 4),
  },
  {
    id: 'momentum',
    name: 'Momentum',
    symbol: '🌀',
    color: '#dd6b20',
    blurb: 'Mass × top speed, log-scaled so every object stays relevant.',
    award: (m) => Math.floor(12 * Math.log2(1 + m.peakMomentum / 60)),
  },
];

export const CURRENCY_IDS: CurrencyId[] = CURRENCIES.map((c) => c.id);

export function getCurrency(id: CurrencyId): CurrencyDef {
  const c = CURRENCIES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown currency ${id}`);
  return c;
}

/** Award every currency for a run's metrics. */
export function awardsFor(m: RunMetrics): Record<CurrencyId, number> {
  const out = {} as Record<CurrencyId, number>;
  for (const c of CURRENCIES) out[c.id] = Math.max(0, c.award(m));
  return out;
}

/** An empty currency wallet. */
export function emptyWallet(): Record<CurrencyId, number> {
  const out = {} as Record<CurrencyId, number>;
  for (const c of CURRENCIES) out[c.id] = 0;
  return out;
}
