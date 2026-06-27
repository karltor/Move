import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameObjectDef, TreeNode, StatKey, CurrencyId } from '../data/types';
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

const CELL_Y = 128;
const W = 176; // tile width
const H = 64; // tile height

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

function perRankText(m: { stat: StatKey; add?: number; mul?: number }) {
  if (m.add != null) return `${STAT_LABELS[m.stat]} ${m.add > 0 ? '+' : ''}${m.add}/rank`;
  const pct = Math.round((1 - (m.mul ?? 1)) * 100);
  return `${STAT_LABELS[m.stat]} −${pct}%/rank`;
}

interface Props {
  object: GameObjectDef;
  wallet: Wallet;
  ranks: Ranks;
  onBuy: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function TechTree({ object, wallet, ranks, onBuy, onReset, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [view, setView] = useState({ tx: 0, ty: 0, scale: 1 });
  const drag = useRef<{ tx: number; ty: number; px: number; py: number; moved: boolean } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Hub-and-spokes layout: a central Scientist node with categories fanned out
  // in a top band (growing upward) and a bottom band (growing downward).
  const layout = useMemo(() => {
    const BAND_GAP = 150; // hub -> nearest (root) row
    const CAT_SPACING = 620; // horizontal gap between category clusters
    const NODE_COL = 192; // horizontal gap between node columns within a category
    const top = object.categories.filter((c) => c.band === 'top');
    const bottom = object.categories.filter((c) => c.band === 'bottom');

    const catX = (list: typeof top, i: number) => (i - (list.length - 1) / 2) * CAT_SPACING;

    const placed = object.categories.map((cat) => {
      const band = cat.band;
      const list = band === 'top' ? top : bottom;
      const cx = catX(list, list.indexOf(cat));
      const rootY = band === 'top' ? -BAND_GAP : BAND_GAP;
      const dir = band === 'top' ? -1 : 1; // rows grow away from hub
      const nodes = cat.nodes.map((node) => ({
        node,
        x: cx + (node.col - 1) * NODE_COL,
        y: rootY + dir * node.row * CELL_Y,
      }));
      return { cat, cx, rootY, nodes };
    });

    const byId = new Map(placed.flatMap((c) => c.nodes.map((n) => [n.node.id, n])));
    const all = placed.flatMap((c) => c.nodes);
    const minX = Math.min(...all.map((p) => p.x));
    const maxX = Math.max(...all.map((p) => p.x)) + W;
    const minY = Math.min(...all.map((p) => p.y)) - CELL_Y;
    const maxY = Math.max(...all.map((p) => p.y)) + H;
    return { cats: placed, byId, minX, maxX, minY, maxY };
  }, [object]);

  // Open centred on the hub at a readable zoom.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const scale = CONFIG.tree.defaultZoom;
    setView({ scale, tx: el.clientWidth / 2, ty: el.clientHeight / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { tx: view.tx, ty: view.ty, px: e.clientX, py: e.clientY, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px, dy = e.clientY - d.py;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onWheel(e: React.WheelEvent) {
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setView((v) => ({ ...v, scale: Math.min(1.6, Math.max(0.3, v.scale * factor)) }));
  }

  const center = (id: string) => {
    const p = layout.byId.get(id)!;
    return { x: p.x + W / 2, y: p.y + H / 2 };
  };
  const rootOf = (catId: string) => layout.cats.find((c) => c.cat.id === catId)!.cat.nodes[0].id;

  const selected = selectedId ? findNode(object, selectedId) : null;
  const progress = treeProgress(object, ranks, wallet);
  const q = query.trim().toLowerCase();

  const research = Math.floor(wallet.research);

  return (
    <section className="techtree">
      <header className="tt-head">
        <h2>Upgrade System</h2>
        <span className="tt-sub">SCIENCE · ENDURANCE · EVOLUTION</span>
        <div className="tt-research">
          <span className="tt-research-sym">🧪</span>
          <span className="tt-research-val">{research.toLocaleString()}</span>
          <span className="tt-research-lbl">research</span>
        </div>
        <input
          className="tt-search"
          placeholder="Search upgrades…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tt-progress">
          <span><b>{progress.maxed}</b>/{progress.total} maxed</span>
          <span className="ip">{progress.inProgress} in progress</span>
          <span className="lk">{progress.locked} locked</span>
        </div>
        <button className="tt-reset" onClick={onReset} title="Refund all research points">⟲ Reset</button>
        <button className="tt-close" onClick={onClose}>✕</button>
      </header>

      <div
        ref={canvasRef}
        className="tt-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        <svg width="100%" height="100%">
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
            {/* spokes: hub -> each category root */}
            {layout.cats.map(({ cat }) => {
              const r = center(rootOf(cat.id));
              return <line key={`spoke-${cat.id}`} x1={0} y1={0} x2={r.x} y2={r.y} className="tt-spoke" stroke={cat.color} />;
            })}

            {/* prerequisite edges */}
            {layout.cats.flatMap(({ nodes }) =>
              nodes.flatMap(({ node }) =>
                node.prereqs.map((p) => {
                  if (!layout.byId.has(p)) return null;
                  const a = center(p), b = center(node.id);
                  const on = rankOf(object, ranks, p) >= 1;
                  return (
                    <line key={`${p}-${node.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      className={on ? 'tt-edge on' : 'tt-edge'} />
                  );
                }),
              ),
            )}

            {/* central hub */}
            <g className="tt-hub">
              <circle r={34} />
              <text y={5} textAnchor="middle">🔬</text>
              <text y={54} textAnchor="middle" className="tt-hub-label">SCIENTIST</text>
            </g>

            {/* category headers (above the root, near the hub) */}
            {layout.cats.map(({ cat, cx, rootY }) => {
              const hy = cat.band === 'top' ? rootY - 60 : rootY + H + 26;
              return (
                <g key={cat.id} transform={`translate(${cx - 4},${hy})`}>
                  <rect x={-6} y={-26} width={216} height={36} rx={9} fill="rgba(255,255,255,0.05)" stroke={cat.color} strokeWidth={2} />
                  <image href={cat.icon} x={4} y={-22} width={24} height={24} />
                  <text x={36} y={-4} className="tt-cat-name" fill={cat.color}>{cat.name}</text>
                </g>
              );
            })}

            {/* nodes */}
            {layout.cats.flatMap(({ cat, nodes }) =>
              nodes.map(({ node, x, y }) => {
                const cur = rankOf(object, ranks, node.id);
                const status = node.root ? 'root' : nodeStatus(object, ranks, wallet, node.id);
                const dim = q.length > 0 && !node.name.toLowerCase().includes(q);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${x},${y})`}
                    className={`tt-node ${status} ${selectedId === node.id ? 'sel' : ''} ${dim ? 'dim' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (drag.current?.moved) return;
                      setSelectedId(node.id);
                      if (canBuyRank(object, ranks, wallet, node.id)) onBuy(node.id);
                    }}
                  >
                    <rect width={W} height={H} rx={9} className="tt-tile" style={{ ['--cat' as string]: cat.color }} />
                    <image href={node.icon} x={10} y={H / 2 - 18} width={36} height={36} />
                    <text x={54} y={27} className="tt-node-name">{trunc(node.name)}</text>
                    <text x={54} y={48} className="tt-node-rank">
                      {node.root ? '1/1' : `${cur}/${node.maxRanks}`}
                    </text>
                  </g>
                );
              }),
            )}
          </g>
        </svg>
      </div>

      <div className="tt-detail">
        {selected ? (
          <NodeDetail object={object} node={selected} ranks={ranks} wallet={wallet} onBuy={onBuy} />
        ) : (
          <p className="tt-detail-empty">{CONFIG.texts.treeHint}</p>
        )}
      </div>
    </section>
  );
}

function NodeDetail({
  object, node, ranks, wallet, onBuy,
}: {
  object: GameObjectDef; node: TreeNode; ranks: Ranks; wallet: Wallet; onBuy: (id: string) => void;
}) {
  const cur = rankOf(object, ranks, node.id);
  const status = node.root ? 'maxed' : nodeStatus(object, ranks, wallet, node.id);
  const maxed = cur >= node.maxRanks;
  const cost = nextRankCost(node, cur);
  const can = canBuyRank(object, ranks, wallet, node.id);

  return (
    <>
      <div className="tt-detail-main">
        <img className="tt-detail-icon" src={node.icon} alt="" />
        <div>
          <div className="tt-detail-name">
            {node.name}
            <span className="tt-detail-rank">{node.root ? '1/1' : `${cur}/${node.maxRanks}`}</span>
          </div>
          <p className="tt-detail-desc">{node.desc}</p>
          {node.mods.length > 0 && (
            <div className="tt-detail-mods">
              {node.mods.map((m, i) => <span key={i}>{perRankText(m)}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="tt-detail-buy">
        {maxed ? (
          <span className="tt-maxed">✓ Maxed</span>
        ) : status === 'lockedPrereq' ? (
          <span className="tt-locked">Locked — research the prerequisite first</span>
        ) : (
          <>
            <div className="tt-cost">
              {(Object.keys(cost) as CurrencyId[]).map((c) => {
                const ok = (wallet[c] ?? 0) >= (cost[c] ?? 0);
                return (
                  <span key={c} className={`tt-cost-chip ${ok ? '' : 'short'}`}>
                    {getCurrency(c).symbol} {cost[c]}
                  </span>
                );
              })}
            </div>
            <button className="tt-buy" disabled={!can} onClick={() => onBuy(node.id)}>
              {cur > 0 ? `Rank up → ${cur + 1}/${node.maxRanks}` : 'Research'}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function trunc(s: string) {
  return s.length > 18 ? s.slice(0, 17) + '…' : s;
}
