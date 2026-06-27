import type { CurrencyId } from './types';

// ---------------------------------------------------------------------------
// CURRENCIES — derived from a run's METRICS, themed to the story + physics.
// ---------------------------------------------------------------------------
// Research is the headline currency (spent on tech-tree node ranks). The rest
// are physics quantities that gate the deeper/stronger nodes, so they stay
// meaningful and shape which branches you can actually push into. KE and
// momentum are log-scaled so future heavy/fast objects stay relevant.
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
  blurb: string;
  award: (m: RunMetrics) => number;
}

export const CURRENCIES: CurrencyDef[] = [
  {
    id: 'research',
    name: 'Research',
    symbol: '🧪',
    color: '#38b2ac',
    blurb: 'Research points from the distance you cover. Spent on tech-tree ranks.',
    award: (m) => Math.floor(m.distance),
  },
  {
    id: 'pace',
    name: 'Pace',
    symbol: '🏃',
    color: '#3182ce',
    blurb: 'From your average speed — gates pacing/endurance nodes.',
    award: (m) => Math.floor(m.avgSpeed * 6),
  },
  {
    id: 'kinetic',
    name: 'Kinetic',
    symbol: '⚡',
    color: '#9f7aea',
    blurb: '½·m·v² at peak speed, log-scaled — gates power nodes.',
    award: (m) => Math.floor(10 * Math.log2(1 + m.peakKE / 200)),
  },
  {
    id: 'momentum',
    name: 'Momentum',
    symbol: '🌀',
    color: '#dd6b20',
    blurb: 'm·v at peak speed, log-scaled — gates heavy/tech nodes.',
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
