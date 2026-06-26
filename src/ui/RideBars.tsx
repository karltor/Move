import type { RideStats, RideState } from '../sim/ride';

interface Props {
  state: RideState | null;
  stats: RideStats;
  running: boolean;
}

/** Live overlay on the canvas: speed readout + stamina (and battery) bars. */
export function RideBars({ state, stats, running }: Props) {
  const stamina = state ? state.stamina : stats.maxStamina;
  const staminaPct = (stamina / Math.max(1, stats.maxStamina)) * 100;
  const hasBattery = stats.battery > 0;
  const battery = state ? state.battery : stats.battery;
  const batteryPct = hasBattery ? (battery / stats.battery) * 100 : 0;
  const speedKmh = state ? state.v * 3.6 : 0;
  const timeLeft = state ? Math.max(0, stats.runTime - state.t) : stats.runTime;

  return (
    <div className="ridebars">
      <div className="ridebars-top">
        <span className="ride-speed">{Math.round(speedKmh)} km/h</span>
        {running && <span className="ride-time">{timeLeft.toFixed(1)}s left</span>}
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

      {hasBattery && (
        <div className="bar">
          <div className="bar-label">Battery</div>
          <div className="bar-track">
            <div
              className="bar-fill battery"
              style={{ width: `${Math.max(0, Math.min(100, batteryPct))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
