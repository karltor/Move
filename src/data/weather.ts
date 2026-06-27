import type { StatKey } from './types';
import type { RideStats } from '../sim/ride';

// ---------------------------------------------------------------------------
// WEATHER — a per-run modifier that shapes the conditions.
// ---------------------------------------------------------------------------
// Each run rolls a weather condition that multiplies/adds to the run's stats.
// The `weatherResist` stat (raised by tree nodes) dampens the deviation from
// neutral, so a well-prepared runner is less swung by the weather — good AND
// bad. EXTENSION POINT: add conditions here; nothing else needs to change.
// ---------------------------------------------------------------------------

export interface WeatherMod {
  stat: StatKey;
  mul?: number;
  add?: number;
}

export interface Weather {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  weight: number; // relative roll weight
  mods: WeatherMod[];
}

export const WEATHERS: Weather[] = [
  { id: 'clear', name: 'Clear Skies', emoji: '☀️', blurb: 'Perfect running conditions.', weight: 30, mods: [] },
  {
    id: 'rain', name: 'Rain', emoji: '🌧️', weight: 16,
    blurb: 'Slick ground (less friction) but tougher going (more stamina).',
    mods: [{ stat: 'rollResist', mul: 0.78 }, { stat: 'energyBurn', mul: 1.18 }],
  },
  {
    id: 'heat', name: 'Heatwave', emoji: '🔥', weight: 14,
    blurb: 'Sweltering — you tire much faster.',
    mods: [{ stat: 'energyBurn', mul: 1.3 }],
  },
  {
    id: 'tailwind', name: 'Tailwind', emoji: '💨', weight: 12,
    blurb: 'The wind is at your back — low drag, higher ceiling.',
    mods: [{ stat: 'drag', mul: 0.65 }, { stat: 'topSpeed', add: 1.5 }],
  },
  {
    id: 'headwind', name: 'Headwind', emoji: '🌬️', weight: 12,
    blurb: 'Pushing into a stiff wind — heavy drag.',
    mods: [{ stat: 'drag', mul: 1.5 }],
  },
  {
    id: 'mud', name: 'Muddy Field', emoji: '🟤', weight: 10,
    blurb: 'Boots sink in — lots of rolling resistance.',
    mods: [{ stat: 'rollResist', mul: 1.7 }],
  },
  {
    id: 'cold', name: 'Cold Snap', emoji: '❄️', weight: 6,
    blurb: 'Crisp and efficient, but stiff joints slow the start.',
    mods: [{ stat: 'energyBurn', mul: 0.88 }, { stat: 'rollResist', mul: 1.15 }],
  },
];

export function pickWeather(rng: () => number = Math.random): Weather {
  const total = WEATHERS.reduce((s, w) => s + w.weight, 0);
  let r = rng() * total;
  for (const w of WEATHERS) {
    r -= w.weight;
    if (r <= 0) return w;
  }
  return WEATHERS[0];
}

/** Apply a weather's mods to run stats, scaled down by weatherResist. */
export function applyWeather(stats: RideStats, weather: Weather, weatherResist: number): RideStats {
  const factor = 1 - Math.min(0.9, Math.max(0, weatherResist));
  const out = { ...stats };
  for (const m of weather.mods) {
    if (m.mul != null) out[m.stat] *= 1 + (m.mul - 1) * factor;
    if (m.add != null) out[m.stat] += m.add * factor;
  }
  return out;
}
