import { CURRENCIES } from '../data/currencies';
import type { Wallet } from '../game/tree';

interface Props {
  wallet: Wallet;
  bestDistance: number;
  runCount: number;
  liveDistance: number;
}

export function Hud({ wallet, bestDistance, runCount, liveDistance }: Props) {
  return (
    <div className="hud">
      <div className="hud-distance">
        <span className="hud-distance-value">{Math.floor(liveDistance)}</span>
        <span className="hud-distance-unit">m</span>
      </div>

      <div className="hud-currencies">
        {CURRENCIES.map((c) => (
          <div className="hud-cur" key={c.id} title={`${c.name} — ${c.blurb}`}>
            <span className="hud-cur-sym">{c.symbol}</span>
            <span className="hud-cur-val" style={{ color: c.color }}>
              {Math.floor(wallet[c.id] ?? 0)}
            </span>
          </div>
        ))}
      </div>

      <div className="hud-stats">
        <div className="hud-stat">
          <span className="hud-stat-label">Best</span>
          <span className="hud-stat-value">{Math.floor(bestDistance)} m</span>
        </div>
        <div className="hud-stat">
          <span className="hud-stat-label">Runs</span>
          <span className="hud-stat-value">{runCount}</span>
        </div>
      </div>
    </div>
  );
}
