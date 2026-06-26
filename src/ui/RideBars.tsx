import type { RideStats, RideState } from '../sim/ride';

interface Props {
  state: RideState | null;
  stats: RideStats;
  running: boolean;
}

/** Live overlay: speed + stamina (burst) and energy reserve bars. */
export function RideBars({ state, stats }: Props) {
  const stamina = state ? state.stamina : stats.maxStamina;
  const staminaPct = (stamina / Math.max(1, stats.maxStamina)) * 100;
  const reserve = state ? state.reserve : stats.maxReserve;
  const reservePct = (reserve / Math.max(1, stats.maxReserve)) * 100;
  const speed = state ? state.v : 0;

  return (
    <div className="ridebars">
      <div className="ridebars-top">
        <span className="ride-speed">{speed.toFixed(1)}</span>
        <span className="ride-speed-unit">m/s</span>
      </div>

      <div className="bar">
        <div className="bar-label">Stamina</div>
        <div className="bar-track">
          <div
            className="bar-fill stamina"
            style={{ width: `${Math.max(0, Math.min(100, staminaPct))}%` }}
          />
        </div>
      </div>

      <div className="bar">
        <div className="bar-label">Energy</div>
        <div className="bar-track">
          <div
            className="bar-fill energy"
            style={{ width: `${Math.max(0, Math.min(100, reservePct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
