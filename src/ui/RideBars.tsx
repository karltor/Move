import type { RideStats, RideState } from '../sim/ride';

interface Props {
  state: RideState | null;
  stats: RideStats;
}

/** Live overlay: speed, stamina (burst), energy reserve and freshness bars. */
export function RideBars({ state, stats }: Props) {
  const stamina = state ? state.stamina : stats.maxStamina;
  const staminaPct = pct(stamina, stats.maxStamina);
  const reserve = state ? state.reserve : stats.maxReserve;
  const reservePct = pct(reserve, stats.maxReserve);
  const freshPct = pct(state ? state.freshness : 1, 1);
  const speed = state ? state.v : 0;

  return (
    <div className="ridebars">
      <div className="ridebars-top">
        <span className="ride-speed">{speed.toFixed(1)}</span>
        <span className="ride-speed-unit">m/s</span>
      </div>

      <Bar label="Stamina" kind="stamina" pct={staminaPct} />
      <Bar label="Energy" kind="energy" pct={reservePct} />
      <Bar label="Fresh" kind="fresh" pct={freshPct} />
    </div>
  );
}

function Bar({ label, kind, pct }: { label: string; kind: string; pct: number }) {
  return (
    <div className="bar">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div className={`bar-fill ${kind}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function pct(value: number, max: number): number {
  return Math.max(0, Math.min(100, (value / Math.max(1e-6, max)) * 100));
}
