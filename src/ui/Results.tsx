import { CURRENCIES } from '../data/currencies';
import type { RunMetrics } from '../data/currencies';
import type { CurrencyId } from '../data/types';
import type { EndReason } from '../game/engine';

interface Props {
  metrics: RunMetrics;
  awards: Record<CurrencyId, number>;
  mult: number;
  reason: EndReason;
  onContinue: () => void;
  onUpgrades: () => void;
}

const TITLES: Record<EndReason, string> = {
  exhausted: 'Run complete — out of energy',
  timecap: 'Run complete — the sun set on you',
  stopped: 'Run ended early',
};

// Which metric drives which currency — shown so the payout is legible.
const SOURCE: Record<CurrencyId, (m: RunMetrics) => string> = {
  research: (m) => `${Math.floor(m.distance)} m travelled`,
  insight: (m) => `${m.avgSpeed.toFixed(1)} m/s avg · ${m.maxSpeed.toFixed(1)} peak`,
  flux: (m) => `momentum ${Math.round(m.peakMomentum)} kg·m/s`,
};

export function Results({ metrics, awards, mult, reason, onContinue, onUpgrades }: Props) {
  return (
    <div className="modal-backdrop results-backdrop">
      <div className="results">
        <h2>{TITLES[reason]}</h2>

        <div className="results-stats">
          <Stat label="Distance" value={`${Math.floor(metrics.distance)} m`} big />
          <Stat label="Top speed" value={`${metrics.maxSpeed.toFixed(1)} m/s`} />
          <Stat label="Avg speed" value={`${metrics.avgSpeed.toFixed(1)} m/s`} />
          <Stat label="Duration" value={`${metrics.duration.toFixed(0)} s`} />
        </div>

        {mult > 1.05 && (
          <div className="results-bonus">
            Active running bonus <strong>×{mult.toFixed(1)}</strong>
          </div>
        )}

        <div className="results-rewards">
          <div className="results-rewards-head">Earned (lump sum)</div>
          {CURRENCIES.map((c) => (
            <div className="rrow" key={c.id}>
              <span className="rrow-cur" style={{ color: c.color }}>
                {c.symbol} {c.name}
              </span>
              <span className="rrow-src">{SOURCE[c.id](metrics)}</span>
              <span className="rrow-amt" style={{ color: c.color }}>
                +{awards[c.id] ?? 0}
              </span>
            </div>
          ))}
        </div>

        <div className="results-actions">
          <button className="results-upgrades" onClick={onUpgrades}>
            🧪 Open the Lab
          </button>
          <button className="results-continue" onClick={onContinue} autoFocus>
            Run again →
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={`rstat ${big ? 'big' : ''}`}>
      <span className="rstat-val">{value}</span>
      <span className="rstat-label">{label}</span>
    </div>
  );
}
