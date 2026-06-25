import type { GameObjectDef, StatKey } from '../data/types';
import {
  aggregateStats,
  equippedVariant,
  nextVariant,
  type Equipped,
} from '../game/stats';

interface Props {
  object: GameObjectDef;
  equipped: Equipped;
  coins: number;
  disabled: boolean;
  onBuy: (slotId: string) => void;
}

const STAT_LABELS: Record<StatKey, string> = {
  launchPower: 'Power',
  weight: 'Weight',
  drag: 'Drag',
};

function fmtDelta(key: StatKey, value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${STAT_LABELS[key]} ${sign}${Math.round(value * 100) / 100}`;
}

export function UpgradeMenu({ object, equipped, coins, disabled, onBuy }: Props) {
  const stats = aggregateStats(object, equipped);

  return (
    <aside className="upgrades">
      <h2>{object.name} — Garage</h2>

      <div className="stat-readout">
        <span>⚡ Power {Math.round(stats.launchPower)}</span>
        <span>🏋️ Weight {Math.round(stats.weight * 10) / 10}</span>
        <span>💨 Drag {Math.round(stats.drag * 100) / 100}</span>
      </div>

      <ul className="slot-list">
        {object.slots.map((slot) => {
          const current = equippedVariant(object, slot.id, equipped);
          const next = nextVariant(object, slot.id, equipped);
          const canAfford = next ? coins >= next.cost : false;

          return (
            <li key={slot.id} className="slot-row">
              <div className="slot-head">
                <span className="slot-name">{slot.name}</span>
                <span className="slot-current">{current.name}</span>
              </div>

              {next ? (
                <button
                  className="buy-btn"
                  disabled={disabled || !canAfford}
                  onClick={() => onBuy(slot.id)}
                  title={canAfford ? '' : 'Not enough coins'}
                >
                  <span className="buy-name">Upgrade → {next.name}</span>
                  <span className="buy-deltas">
                    {(Object.keys(next.stats) as StatKey[])
                      .filter((k) => (next.stats[k] ?? 0) !== 0)
                      .map((k) => (
                        <em
                          key={k}
                          className={
                            // For drag lower is better, so flip the color sense.
                            (k === 'drag' ? -(next.stats[k] ?? 0) : (next.stats[k] ?? 0)) > 0
                              ? 'good'
                              : 'bad'
                          }
                        >
                          {fmtDelta(k, next.stats[k] ?? 0)}
                        </em>
                      ))}
                  </span>
                  <span className="buy-cost">🪙 {next.cost}</span>
                </button>
              ) : (
                <div className="maxed">Max tier ✓</div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
