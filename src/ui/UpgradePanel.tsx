import { useEffect, useMemo, useState } from 'react';
import type { GameObjectDef, TreeCategory, TreeNode, StatKey, CurrencyId } from '../data/types';
import { getCurrency } from '../data/currencies';
import {
  findNode,
  rankOf,
  nextRankCost,
  nodeStatus,
  canBuyRank,
  treeProgress,
  type Wallet,
  type Ranks,
} from '../game/tree';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// UPGRADE PANEL — category tabs + node cards.
// ---------------------------------------------------------------------------
// Replaces the pannable/zoomable SVG tree: ~30 nodes don't need a viewport,
// they need to be readable. Buying is an explicit button (the old tree bought
// a node whenever a pan gesture ended on one).
// ---------------------------------------------------------------------------

const STAT_LABELS: Record<StatKey, string> = {
  walkPower: 'Walk Power',
  runPower: 'Run Power',
  maxStamina: 'Max Stamina',
  staminaRefill: 'Stamina Refill',
  runDrain: 'Stamina Drain',
  maxReserve: 'Max Energy',
  energyBurn: 'Energy Burn',
  drag: 'Drag',
  weight: 'Weight',
  rollResist: 'Roll Resist',
  topSpeed: 'Top Speed',
  assist: 'Assist',
  weatherResist: 'Weather Resist',
};

function perRankText(m: { stat: StatKey; add?: number; mul?: number }): string {
  if (m.add != null) return `${STAT_LABELS[m.stat]} ${m.add > 0 ? '+' : ''}${m.add} / rank`;
  const pct = Math.round(((m.mul ?? 1) - 1) * 100);
  return `${STAT_LABELS[m.stat]} ${pct > 0 ? '+' : ''}${pct}% / rank`;
}

interface Props {
  object: GameObjectDef;
  wallet: Wallet;
  ranks: Ranks;
  onBuy: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function UpgradePanel({ object, wallet, ranks, onBuy, onReset, onClose }: Props) {
  const [activeCat, setActiveCat] = useState(object.categories[0].id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const progress = treeProgress(object, ranks, wallet);
  const category = object.categories.find((c) => c.id === activeCat) ?? object.categories[0];

  const buyableByCat = useMemo(() => {
    const out: Record<string, number> = {};
    for (const cat of object.categories) {
      out[cat.id] = cat.nodes.filter((n) => canBuyRank(object, ranks, wallet, n.id)).length;
    }
    return out;
  }, [object, ranks, wallet]);

  return (
    <section className="up-panel">
      <header className="up-head">
        <h2>🔬 Upgrades</h2>
        <div className="up-wallet">
          {(Object.keys(wallet) as CurrencyId[]).map((c) => {
            const def = getCurrency(c);
            return (
              <span key={c} className="up-wallet-chip" title={`${def.name} — ${def.blurb}`}>
                {def.symbol} <b style={{ color: def.color }}>{Math.floor(wallet[c]).toLocaleString()}</b>
              </span>
            );
          })}
        </div>
        <span className="up-progress">
          <b>{progress.maxed}</b>/{progress.total} maxed
        </span>
        <button className="up-reset" onClick={onReset} title="Full refund — respec from scratch">
          ⟲ Reset
        </button>
        <button className="up-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="up-body">
        <nav className="up-tabs">
          {object.categories.map((cat) => (
            <button
              key={cat.id}
              className={`up-tab ${cat.id === category.id ? 'active' : ''}`}
              style={{ ['--cat' as string]: cat.color }}
              onClick={() => setActiveCat(cat.id)}
            >
              <span className="up-tab-icon">{cat.icon}</span>
              <span className="up-tab-name">{cat.name}</span>
              {buyableByCat[cat.id] > 0 && <span className="up-tab-dot">{buyableByCat[cat.id]}</span>}
            </button>
          ))}
        </nav>

        <div className="up-cat" style={{ ['--cat' as string]: category.color }}>
          <p className="up-cat-blurb">{category.blurb}</p>
          <div className="up-cards">
            {category.nodes.map((node) => (
              <NodeCard
                key={node.id}
                object={object}
                category={category}
                node={node}
                ranks={ranks}
                wallet={wallet}
                onBuy={onBuy}
              />
            ))}
          </div>
        </div>
      </div>

      <footer className="up-foot">{CONFIG.texts.treeHint}</footer>
    </section>
  );
}

function NodeCard({
  object,
  category,
  node,
  ranks,
  wallet,
  onBuy,
}: {
  object: GameObjectDef;
  category: TreeCategory;
  node: TreeNode;
  ranks: Ranks;
  wallet: Wallet;
  onBuy: (id: string) => void;
}) {
  const cur = rankOf(ranks, node.id);
  const status = nodeStatus(node, ranks, wallet);
  const cost = nextRankCost(node, cur);
  const can = canBuyRank(object, ranks, wallet, node.id);
  const missingPrereqs = node.prereqs
    .filter((p) => rankOf(ranks, p) < 1)
    .map((p) => findNode(object, p)?.name ?? p);

  return (
    <article className={`up-card ${status}`}>
      <div className="up-card-head">
        <span className="up-card-icon">{node.icon}</span>
        <span className="up-card-name">{node.name}</span>
        <span className="up-pips" aria-label={`rank ${cur} of ${node.maxRanks}`}>
          {Array.from({ length: node.maxRanks }, (_, i) => (
            <i key={i} className={i < cur ? 'pip on' : 'pip'} style={{ ['--cat' as string]: category.color }} />
          ))}
        </span>
      </div>

      <p className="up-card-desc">{node.desc}</p>
      <div className="up-card-mods">
        {node.mods.map((m, i) => (
          <span key={i}>{perRankText(m)}</span>
        ))}
      </div>

      <div className="up-card-foot">
        {status === 'maxed' ? (
          <span className="up-maxed">✓ Maxed</span>
        ) : status === 'lockedPrereq' ? (
          <span className="up-locked">🔒 Requires {missingPrereqs.join(' + ')}</span>
        ) : (
          <>
            <span className="up-cost">
              {(Object.keys(cost) as CurrencyId[]).map((c) => {
                const ok = (wallet[c] ?? 0) >= (cost[c] ?? 0);
                return (
                  <span key={c} className={`up-cost-chip ${ok ? '' : 'short'}`}>
                    {getCurrency(c).symbol} {cost[c]?.toLocaleString()}
                  </span>
                );
              })}
            </span>
            <button className="up-buy" disabled={!can} onClick={() => onBuy(node.id)}>
              {cur > 0 ? `Rank ${cur + 1}` : 'Research'}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
