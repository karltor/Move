import type { StatKey } from '../data/types';

// ---------------------------------------------------------------------------
// STAT EXPLANATIONS — one place that says what every stat actually does.
// Shown in the Lab's stats panel and on node effects.
// ---------------------------------------------------------------------------

export interface StatInfo {
  label: string;
  /** Plain-language explanation. */
  blurb: string;
  unit?: string;
  /** Whether a higher value is good ('high') or bad ('low'). */
  better: 'high' | 'low';
  /** Decimal places when displaying. */
  decimals?: number;
}

export const STAT_INFO: Record<StatKey, StatInfo> = {
  walkPower: {
    label: 'Base power',
    blurb: 'Steady forward drive that applies the whole run, even when you are not pressing anything. On a bicycle this is your pedalling cadence.',
    unit: 'N', better: 'high',
  },
  runPower: {
    label: 'Burst power',
    blurb: 'EXTRA drive while you hold Space / press the screen. Strong but it drains Stamina — this is the difference between cruising and sprinting.',
    unit: 'N', better: 'high',
  },
  topSpeed: {
    label: 'Top speed',
    blurb: 'Your speed ceiling: pushing force fades to zero as you approach it.',
    unit: 'm/s', better: 'high', decimals: 1,
  },
  assist: {
    label: 'Assist',
    blurb: 'Externally powered drive (exosuit, rockets). Costs no body energy, so it helps idle runs just as much as active ones.',
    unit: 'N', better: 'high',
  },
  maxReserve: {
    label: 'Energy',
    blurb: 'Total energy for one run. It only depletes — at zero you collapse and the run ends.',
    better: 'high',
  },
  energyBurn: {
    label: 'Burn rate',
    blurb: 'Energy consumed per second just to keep moving. Exerting burns extra on top.',
    unit: '/s', better: 'low', decimals: 1,
  },
  maxStamina: {
    label: 'Stamina',
    blurb: 'The fast burst pool that Burst power spends. Easing off refills it from your Energy.',
    better: 'high',
  },
  staminaRefill: {
    label: 'Refill rate',
    blurb: 'How fast Stamina refills while you ease off (paid from Energy).',
    unit: '/s', better: 'high', decimals: 1,
  },
  runDrain: {
    label: 'Burst drain',
    blurb: 'Stamina spent per second while exerting. Lower = longer sprints.',
    unit: '/s', better: 'low', decimals: 1,
  },
  weight: {
    label: 'Weight',
    blurb: 'Heavier is slower to accelerate — but earns more Flux (momentum = mass × speed).',
    unit: 'kg', better: 'low', decimals: 1,
  },
  drag: {
    label: 'Air drag',
    blurb: 'Air resistance. Its cost grows with the SQUARE of your speed, so it dominates at high speed.',
    better: 'low', decimals: 3,
  },
  rollResist: {
    label: 'Ground drag',
    blurb: 'Constant friction from the surface — the main brake at low speed. Wheels shrink it dramatically.',
    better: 'low', decimals: 2,
  },
  weatherResist: {
    label: 'Weather resist',
    blurb: 'Dampens the weather\'s effect on your stats — the bad AND the good.',
    better: 'high', decimals: 2,
  },
};

/** Order used by the stats panel, grouped for reading. */
export const STAT_GROUPS: { name: string; stats: StatKey[] }[] = [
  { name: 'Drive', stats: ['walkPower', 'runPower', 'assist', 'topSpeed'] },
  { name: 'Endurance', stats: ['maxReserve', 'energyBurn', 'maxStamina', 'staminaRefill', 'runDrain'] },
  { name: 'Physics', stats: ['weight', 'drag', 'rollResist', 'weatherResist'] },
];

export function formatStat(key: StatKey, value: number): string {
  const info = STAT_INFO[key];
  const v = value.toFixed(info.decimals ?? 0);
  return info.unit ? `${v} ${info.unit}` : v;
}

export function describeMod(m: { stat: StatKey; add?: number; mul?: number }): string {
  const info = STAT_INFO[m.stat];
  if (m.add != null) {
    const good = (m.add > 0) === (info.better === 'high');
    return `${info.label} ${m.add > 0 ? '+' : ''}${m.add}${info.unit ? ' ' + info.unit : ''} per rank${good ? '' : ' ⚠'}`;
  }
  const pct = Math.round(((m.mul ?? 1) - 1) * 100);
  return `${info.label} ${pct > 0 ? '+' : ''}${pct}% per rank`;
}
