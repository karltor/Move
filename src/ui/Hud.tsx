interface Props {
  coins: number;
  bestDistance: number;
  runCount: number;
  liveDistance: number;
}

export function Hud({ coins, bestDistance, runCount, liveDistance }: Props) {
  return (
    <div className="hud">
      <div className="hud-distance">
        <span className="hud-distance-value">{Math.floor(liveDistance)}</span>
        <span className="hud-distance-unit">m</span>
      </div>
      <div className="hud-stats">
        <div className="hud-stat">
          <span className="hud-stat-label">Coins</span>
          <span className="hud-stat-value">🪙 {coins}</span>
        </div>
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
