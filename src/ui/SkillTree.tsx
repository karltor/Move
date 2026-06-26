import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameObjectDef, StatKey, TreeNode, CurrencyId } from '../data/types';
import { getCurrency } from '../data/currencies';
import {
  allocationBlock,
  isAllocated,
  specialityAllocated,
  type AllocatedSet,
  type Wallet,
} from '../game/tree';

const UNIT = 132; // px per tree unit
const R: Record<TreeNode['kind'], number> = {
  root: 30,
  minor: 18,
  notable: 24,
  speciality: 28,
};

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
};

interface Props {
  object: GameObjectDef;
  allocated: AllocatedSet;
  wallet: Wallet;
  onAllocate: (id: string) => void;
  onRespec: () => void;
  onClose?: () => void;
}

export function SkillTree({ object, allocated, wallet, onAllocate, onRespec, onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(
    null,
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 420 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spec = specialityAllocated(object, allocated);

  // Centre the layout and auto-fit it to the canvas so the whole tree is
  // visible by default; panning is for fine navigation.
  const layout = useMemo(() => {
    const xs = object.tree.nodes.map((n) => n.pos.x);
    const ys = object.tree.nodes.map((n) => n.pos.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      spanX: Math.max(1, maxX - minX),
      spanY: Math.max(1, maxY - minY),
    };
  }, [object]);

  const unit = useMemo(() => {
    const pad = 90; // room for node radius + labels
    const fitX = (size.w - pad) / layout.spanX;
    const fitY = (size.h - pad) / layout.spanY;
    return Math.max(46, Math.min(UNIT, fitX, fitY));
  }, [size, layout]);

  const px = (n: TreeNode) => (n.pos.x - layout.cx) * unit;
  const py = (n: TreeNode) => (n.pos.y - layout.cy) * unit;

  const selected = selectedId ? object.tree.nodes.find((n) => n.id === selectedId) : null;
  const block = selected
    ? allocationBlock(object, allocated, wallet, selected.id)
    : null;

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: pan.x, y: pan.y, px: e.clientX, py: e.clientY, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setPan({ x: drag.current.x + dx, y: drag.current.y + dy });
  }
  function onPointerUp() {
    drag.current = null;
  }

  function nodeClass(n: TreeNode): string {
    const b = allocationBlock(object, allocated, wallet, n.id);
    if (b === 'allocated') return 'alloc';
    if (b === null) return 'available';
    if (b === 'cost') return 'tooexpensive';
    if (b === 'speciality') return 'specblocked';
    return 'locked';
  }

  return (
    <section className="tree">
      <header className="tree-header">
        <h2>🔬 {object.name} — Upgrade Lab</h2>
        <div className="tree-header-actions">
          <button className="respec-btn" onClick={onRespec} title="Refund all points">
            ⟲ Respec
          </button>
          {onClose && (
            <button className="tree-close" onClick={onClose} title="Close (the run keeps going)">
              ✕
            </button>
          )}
        </div>
      </header>

      <div className="tree-note">
        {spec ? (
          <>Speciality: <strong>{spec.name}</strong></>
        ) : (
          <>Pick one <strong>speciality</strong> (★). Drag to pan · click a node.</>
        )}
      </div>

      <div
        ref={canvasRef}
        className="tree-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg width="100%" height="100%">
          <g transform={`translate(${size.w / 2 + pan.x}, ${size.h / 2 + pan.y})`}>
            <g>
              {/* edges */}
              {object.tree.edges.map((e, i) => {
                const a = object.tree.nodes.find((n) => n.id === e.a)!;
                const b = object.tree.nodes.find((n) => n.id === e.b)!;
                const on = isAllocated(allocated, e.a) && isAllocated(allocated, e.b);
                return (
                  <line
                    key={i}
                    x1={px(a)}
                    y1={py(a)}
                    x2={px(b)}
                    y2={py(b)}
                    className={on ? 'edge on' : 'edge'}
                  />
                );
              })}
              {/* nodes */}
              {object.tree.nodes.map((n) => (
                <g
                  key={n.id}
                  transform={`translate(${px(n)}, ${py(n)})`}
                  className={`node ${n.kind} ${nodeClass(n)} ${
                    selectedId === n.id ? 'selected' : ''
                  }`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (drag.current?.moved) return;
                    setSelectedId(n.id);
                  }}
                >
                  {n.kind === 'speciality' ? (
                    <polygon points={star(R.speciality)} />
                  ) : (
                    <circle r={R[n.kind]} />
                  )}
                  {/* Only label the important nodes (or the selected one) so
                      the graph stays readable. */}
                  {(n.kind !== 'minor' || selectedId === n.id) && (
                    <text className="node-label" y={R[n.kind] + 14}>
                      {n.name}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>

      <div className="tree-detail">
        {selected ? (
          <>
            <div className="detail-head">
              <strong>{selected.name}</strong>
              <span className={`kind-tag ${selected.kind}`}>{selected.kind}</span>
            </div>
            <p className="detail-desc">{selected.desc}</p>
            {selected.mods.length > 0 && (
              <ul className="detail-mods">
                {selected.mods.map((m, i) => (
                  <li key={i} className={modGood(m.stat, m) ? 'good' : 'bad'}>
                    {STAT_LABELS[m.stat]}{' '}
                    {m.add != null && `${m.add > 0 ? '+' : ''}${round(m.add)}`}
                    {m.mul != null && `×${round(m.mul)}`}
                  </li>
                ))}
              </ul>
            )}
            <div className="detail-cost">
              {Object.keys(selected.cost).length === 0 ? (
                <span className="free">Starter</span>
              ) : (
                (Object.keys(selected.cost) as CurrencyId[]).map((cid) => {
                  const cur = getCurrency(cid);
                  const have = wallet[cid] ?? 0;
                  const need = selected.cost[cid] ?? 0;
                  return (
                    <span
                      key={cid}
                      className={`cost-chip ${have >= need ? '' : 'short'}`}
                      title={cur.name}
                    >
                      {cur.symbol} {need}
                    </span>
                  );
                })
              )}
            </div>
            <div className="detail-action">
              {block === 'allocated' && <span className="ok">✓ Allocated</span>}
              {block === null && (
                <button className="alloc-btn" onClick={() => onAllocate(selected.id)}>
                  Allocate
                </button>
              )}
              {block === 'unreachable' && <span className="muted">Not yet reachable</span>}
              {block === 'cost' && <span className="muted">Can't afford</span>}
              {block === 'speciality' && (
                <span className="muted">One speciality already chosen (respec to change)</span>
              )}
            </div>
          </>
        ) : (
          <p className="detail-empty">Select a node to see its effects and cost.</p>
        )}
      </div>
    </section>
  );
}

function star(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(Math.cos(ang) * rad).toFixed(1)},${(Math.sin(ang) * rad).toFixed(1)}`);
  }
  return pts.join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// For drag/weight/staminaDrain/rollResist, lower is better.
function modGood(stat: StatKey, m: { add?: number; mul?: number }): boolean {
  const lowerBetter =
    stat === 'drag' ||
    stat === 'weight' ||
    stat === 'runDrain' ||
    stat === 'rollResist' ||
    stat === 'energyBurn';
  const delta = m.add != null ? m.add : (m.mul ?? 1) - 1;
  return lowerBetter ? delta < 0 : delta > 0;
}
