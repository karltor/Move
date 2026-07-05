import { useEffect, useMemo, useState } from 'react';
import type { NodeDef } from '../data/types';
import { NODES, BRANCH_COLORS } from '../data/nodes';
import { MODES } from '../data/modes';
import { getCurrency, CURRENCIES } from '../data/currencies';
import {
  getNode,
  rankOf,
  isUnlocked,
  nextRankCost,
  canUnlock,
  canUpgrade,
  canEquip,
  fluxUsed,
  nodeState,
  activeModeId,
  aggregateStats,
  treeProgress,
  type Wallet,
  type Ranks,
  type NodeState,
} from '../game/tree';
import { STAT_INFO, STAT_GROUPS, formatStat, describeMod } from './statInfo';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// THE LAB — one full-window view of the whole game:
//   left  = the node graph (what's locked / unlockable / unlocked / equipped)
//   right = selected-node actions, the loadout (Flux budget), and every stat
//           of the current build, explained.
// ---------------------------------------------------------------------------

const COL_W = 172;
const ROW_H = 116;
const NODE_W = 128;
const NODE_H = 78;
const PAD_X = 24;
const PAD_Y = 20;

function nodeXY(n: NodeDef) {
  return { x: PAD_X + n.pos.col * COL_W, y: PAD_Y + n.pos.row * ROW_H };
}

const GRAPH_W = PAD_X * 2 + Math.max(...NODES.map((n) => n.pos.col)) * COL_W + NODE_W;
const GRAPH_H = PAD_Y * 2 + Math.max(...NODES.map((n) => n.pos.row)) * ROW_H + NODE_H;

interface Props {
  wallet: Wallet;
  ranks: Ranks;
  equipped: string[];
  onUnlock: (id: string) => void;
  onUpgrade: (id: string) => void;
  onEquip: (id: string) => void;
  onUnequip: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function Lab(props: Props) {
  const { wallet, ranks, equipped, onClose } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const progress = treeProgress(ranks, equipped);
  const selected = selectedId ? getNode(selectedId) : undefined;

  return (
    <div className="lab">
      <header className="lab-head">
        <h2>🧪 The Lab</h2>
        <div className="lab-wallet">
          {CURRENCIES.map((c) => (
            <span key={c.id} className="lab-wallet-chip" title={c.blurb}>
              <span className="lab-wallet-sym">{c.symbol}</span>
              <b style={{ color: c.color }}>{Math.floor(wallet[c.id]).toLocaleString()}</b>
              <small>{c.verb}</small>
            </span>
          ))}
        </div>
        <span className="lab-progress">
          {progress.unlocked}/{progress.total} unlocked · {progress.equipped} equipped
        </span>
        <button className="lab-reset" onClick={props.onReset} title="Full refund — respec from scratch">
          ⟲ Reset
        </button>
        <button className="lab-close" onClick={onClose} aria-label="Close">✕</button>
      </header>

      <div className="lab-body">
        <div className="lab-graph-scroll">
          <div className="lab-graph" style={{ width: GRAPH_W, height: GRAPH_H }}>
            <svg className="lab-edges" width={GRAPH_W} height={GRAPH_H}>
              {NODES.flatMap((node) =>
                node.prereqs.map((p) => {
                  const from = getNode(p);
                  if (!from) return null;
                  const a = nodeXY(from);
                  const b = nodeXY(node);
                  const on = isUnlocked(ranks, p) && isUnlocked(ranks, node.id);
                  const half = isUnlocked(ranks, p);
                  return (
                    <line
                      key={`${p}->${node.id}`}
                      x1={a.x + NODE_W} y1={a.y + NODE_H / 2}
                      x2={b.x} y2={b.y + NODE_H / 2}
                      className={`lab-edge ${on ? 'on' : half ? 'half' : ''}`}
                      stroke={BRANCH_COLORS[node.branch]}
                    />
                  );
                }),
              )}
            </svg>
            {NODES.map((node) => (
              <NodeChip
                key={node.id}
                node={node}
                state={nodeState(ranks, equipped, node.id)}
                rank={rankOf(ranks, node.id)}
                affordUnlock={canUnlock(wallet, ranks, node.id)}
                selected={selectedId === node.id}
                onSelect={() => setSelectedId(node.id)}
              />
            ))}
          </div>
        </div>

        <aside className="lab-side">
          {selected ? (
            <NodeDetail {...props} node={selected} />
          ) : (
            <div className="lab-card lab-card-empty">
              Select a node — 🔬 unlock it, 💡 upgrade it, ⚡ equip it.
            </div>
          )}
          <LoadoutPanel {...props} />
          <StatsPanel ranks={ranks} equipped={equipped} />
        </aside>
      </div>

      <footer className="lab-foot">{CONFIG.texts.treeHint}</footer>
    </div>
  );
}

// --- node chip ---------------------------------------------------------------

function NodeChip({
  node, state, rank, affordUnlock, selected, onSelect,
}: {
  node: NodeDef;
  state: NodeState;
  rank: number;
  affordUnlock: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { x, y } = nodeXY(node);
  const badge =
    state === 'equipped' ? '⚡ ON'
    : state === 'unlocked' ? `⚡ ${node.equipCost}`
    : state === 'unlockable' ? `🔬 ${node.unlockCost.toLocaleString()}`
    : '🔒';
  return (
    <button
      className={`lab-node ${state} ${selected ? 'sel' : ''} ${node.mode ? 'is-mode' : ''} ${state === 'unlockable' && affordUnlock ? 'afford' : ''}`}
      style={{ left: x, top: y, width: NODE_W, height: NODE_H, ['--branch' as string]: BRANCH_COLORS[node.branch] }}
      onClick={onSelect}
      title={node.name}
    >
      <span className="lab-node-top">
        <span className="lab-node-icon">{node.icon}</span>
        {node.maxRanks > 1 && (
          <span className="lab-node-pips">
            {Array.from({ length: node.maxRanks }, (_, i) => (
              <i key={i} className={i < rank ? 'pip on' : 'pip'} />
            ))}
          </span>
        )}
      </span>
      <span className="lab-node-name">{node.name}</span>
      <span className="lab-node-badge">{badge}</span>
    </button>
  );
}

// --- detail panel --------------------------------------------------------------

function NodeDetail({
  node, wallet, ranks, equipped, onUnlock, onUpgrade, onEquip, onUnequip,
}: Props & { node: NodeDef }) {
  const rank = rankOf(ranks, node.id);
  const state = nodeState(ranks, equipped, node.id);
  const upCost = nextRankCost(node, rank);
  const missing = node.prereqs.filter((p) => !isUnlocked(ranks, p)).map((p) => getNode(p)?.name ?? p);
  const mode = node.mode ? MODES[node.mode] : null;

  return (
    <div className="lab-card lab-detail" style={{ ['--branch' as string]: BRANCH_COLORS[node.branch] }}>
      <div className="lab-detail-head">
        <span className="lab-detail-icon">{node.icon}</span>
        <div>
          <div className="lab-detail-name">{node.name}</div>
          <div className="lab-detail-sub">
            <span className="lab-branch-chip">{node.branch}</span>
            {node.maxRanks > 1 ? ` rank ${rank}/${node.maxRanks}` : rank >= 1 ? ' unlocked' : ''}
          </div>
        </div>
      </div>
      <p className="lab-detail-desc">{node.desc}</p>
      {mode && (
        <p className="lab-detail-modeinfo">
          {mode.icon} <b>{mode.name}</b> — {mode.blurb} Equipping replaces your current ride.
        </p>
      )}

      {node.mods.length > 0 && (
        <ul className="lab-detail-mods">
          {node.mods.map((m, i) => (
            <li key={i} title={STAT_INFO[m.stat].blurb}>
              {describeMod(m)}
              {rank > 0 && <ModTotals m={m} rank={rank} max={node.maxRanks} />}
            </li>
          ))}
        </ul>
      )}

      <div className="lab-detail-actions">
        {state === 'locked' && <span className="lab-locked">🔒 Requires {missing.join(' + ')}</span>}
        {state === 'unlockable' && (
          <button
            className="lab-btn-unlock"
            disabled={!canUnlock(wallet, ranks, node.id)}
            onClick={() => onUnlock(node.id)}
          >
            🔬 Unlock — {node.unlockCost.toLocaleString()}
          </button>
        )}
        {(state === 'unlocked' || state === 'equipped') && upCost !== null && (
          <button
            className="lab-btn-upgrade"
            disabled={!canUpgrade(wallet, ranks, node.id)}
            onClick={() => onUpgrade(node.id)}
          >
            💡 Upgrade to rank {rank + 1} — {upCost.toLocaleString()}
          </button>
        )}
        {state === 'unlocked' && (
          <button
            className="lab-btn-equip"
            disabled={!canEquip(wallet, ranks, equipped, node.id)}
            onClick={() => onEquip(node.id)}
            title={!canEquip(wallet, ranks, equipped, node.id) ? 'Not enough free Flux — unequip something or earn more.' : undefined}
          >
            ⚡ Equip — {node.equipCost.toLocaleString()}
          </button>
        )}
        {state === 'equipped' && (
          <button className="lab-btn-unequip" onClick={() => onUnequip(node.id)}>
            Unequip (frees ⚡ {node.equipCost.toLocaleString()})
          </button>
        )}
      </div>
    </div>
  );
}

function ModTotals({ m, rank, max }: { m: NodeDef['mods'][number]; rank: number; max: number }) {
  const info = STAT_INFO[m.stat];
  const fmt = (r: number) => {
    if (m.add != null) return `${m.add * r > 0 ? '+' : ''}${round2(m.add * r)}${info.unit ? ' ' + info.unit : ''}`;
    const pct = (Math.pow(m.mul ?? 1, r) - 1) * 100;
    return `${pct > 0 ? '+' : ''}${Math.round(pct)}%`;
  };
  return (
    <span className="lab-mod-totals">
      {' '}· now {fmt(rank)}{rank < max ? ` → next ${fmt(rank + 1)}` : ''}
    </span>
  );
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// --- loadout panel ---------------------------------------------------------------

function LoadoutPanel({ wallet, ranks, equipped, onUnequip }: Props) {
  const used = fluxUsed(equipped);
  const total = Math.floor(wallet.flux);
  const mode = MODES[activeModeId(equipped)];
  const flux = getCurrency('flux');

  return (
    <div className="lab-card lab-loadout">
      <div className="lab-card-title">
        Loadout
        <span className="lab-mode-chip" title={mode.blurb}>{mode.icon} {mode.name}</span>
      </div>
      <div className="lab-flux" title={flux.blurb}>
        <div className="lab-flux-label">⚡ {used} / {total.toLocaleString()} used</div>
        <div className="lab-flux-track">
          <div className="lab-flux-fill" style={{ width: `${total > 0 ? Math.min(100, (used / total) * 100) : 0}%` }} />
        </div>
      </div>
      {equipped.length === 0 ? (
        <p className="lab-loadout-empty">Nothing equipped — unlocked nodes do nothing until you equip them.</p>
      ) : (
        <ul className="lab-loadout-list">
          {equipped.map((id) => {
            const n = getNode(id);
            if (!n) return null;
            return (
              <li key={id}>
                <span className="lab-loadout-icon">{n.icon}</span>
                <span className="lab-loadout-name">
                  {n.name}
                  {n.maxRanks > 1 && <small> r{rankOf(ranks, id)}</small>}
                </span>
                <span className="lab-loadout-cost">⚡{n.equipCost}</span>
                <button className="lab-loadout-x" onClick={() => onUnequip(id)} title="Unequip">✕</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// --- stats panel -------------------------------------------------------------------

function StatsPanel({ ranks, equipped }: { ranks: Ranks; equipped: string[] }) {
  const stats = useMemo(() => aggregateStats(ranks, equipped), [ranks, equipped]);
  return (
    <div className="lab-card lab-stats">
      <div className="lab-card-title">Build stats <small>hover a stat for what it does</small></div>
      {STAT_GROUPS.map((g) => (
        <div key={g.name} className="lab-stat-group">
          <div className="lab-stat-group-name">{g.name}</div>
          {g.stats.map((key) => (
            <div key={key} className="lab-stat-row" title={STAT_INFO[key].blurb}>
              <span className="lab-stat-label">{STAT_INFO[key].label}</span>
              <span className="lab-stat-value">{formatStat(key, stats[key])}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
