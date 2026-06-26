import { CURRENCIES } from '../data/currencies';
import type { OfflineReport } from '../store/gameStore';

interface Props {
  report: OfflineReport;
  onClaim: () => void;
}

function fmtElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

export function WelcomeBack({ report, onClaim }: Props) {
  const earned = CURRENCIES.filter((c) => (report.awards[c.id] ?? 0) > 0);
  return (
    <div className="modal-backdrop" onClick={onClaim}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome back!</h2>
        <p>
          While you were away (<strong>{fmtElapsed(report.elapsedSec)}</strong>, capped) your
          auto-pilot completed <strong>{report.runs}</strong> idle{' '}
          {report.runs === 1 ? 'run' : 'runs'}.
        </p>
        <div className="modal-awards">
          {earned.length === 0 ? (
            <span className="muted">No earnings this time.</span>
          ) : (
            earned.map((c) => (
              <div className="award" key={c.id}>
                <span>{c.symbol}</span>
                <span style={{ color: c.color }}>+{report.awards[c.id]}</span>
                <span className="award-name">{c.name}</span>
              </div>
            ))
          )}
        </div>
        <button className="claim-btn" onClick={onClaim}>
          Collect
        </button>
        <p className="modal-hint">Tip: actively pedalling earns far more than idling.</p>
      </div>
    </div>
  );
}
