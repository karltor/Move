import { useRef, useState } from "react";
import {
  NODES,
  NODE_MAP,
  PROGRAMS,
  LANES,
  type Program,
  type ResearchNode,
} from "./research";
import { available, afford, research, equip, type Save } from "./game";
const W = 2170,
  H = 850,
  NW = 182,
  NH = 100;
const position = (n: ResearchNode) => ({
  x: 65 + n.tier * 250 + (n.tier === 0 && n.lane >= 2 ? 85 : 0),
  y: 85 + n.lane * 185 + (n.tier % 2 ? 30 : 0),
});
export default function Research({
  game,
  setGame,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
}) {
  const p = game.program;
  const [global, setGlobal] = useState(false);
  const tree: Program | "global" = global ? "global" : p;
  const [selected, setSelected] = useState(`${tree}-0-0`);
  const [zoom, setZoom] = useState(0.88);
  const [filter, setFilter] = useState(false);
  const [details, setDetails] = useState(true);
  const node = NODE_MAP.get(selected)!;
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sx: number; sy: number } | null>(
    null,
  );
  const nodes = NODES.filter((n) => n.program === tree);
  const activeModules = game.modules.filter(
    (id) => NODE_MAP.get(id)?.program === p,
  );
  const setView = (shared: boolean) => {
    setGlobal(shared);
    setSelected((shared ? "global" : p) + "-0-0");
    if (viewport.current) {
      viewport.current.scrollLeft = 0;
      viewport.current.scrollTop = 0;
    }
  };
  return (
    <section className="web-layout">
      <div className="web-toolbar">
        <div className="tree-tabs">
          <button
            className={!global ? "active" : ""}
            onClick={() => setView(false)}
          >
            {PROGRAMS[p].short} research
          </button>
          <button
            className={global ? "active" : ""}
            onClick={() => setView(true)}
          >
            Shared science
          </button>
        </div>
        <div className="web-legend">
          <span>━━ Required</span>
          <span>┄┄ Either path</span>
          <span>◇ Optional build module</span>
        </div>
        <label className="available-toggle">
          <input
            type="checkbox"
            checked={filter}
            onChange={(e) => setFilter(e.target.checked)}
          />
          Highlight available
        </label>
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          >
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
          >
            +
          </button>
          <button
            onClick={() =>
              setZoom(
                Math.max(0.4, (viewport.current?.clientWidth ?? 1200) / W),
              )
            }
          >
            Fit
          </button>
          <button onClick={() => setDetails((d) => !d)}>
            {details ? "Hide details" : "Show details"}
          </button>
        </div>
      </div>
      <div className="web-workspace">
        <div
          className="web-viewport"
          ref={viewport}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              sx: e.currentTarget.scrollLeft,
              sy: e.currentTarget.scrollTop,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            e.currentTarget.scrollLeft =
              drag.current.sx - (e.clientX - drag.current.x);
            e.currentTarget.scrollTop =
              drag.current.sy - (e.clientY - drag.current.y);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <div style={{ width: W * zoom, height: H * zoom }}>
            <div
              className="web-canvas"
              style={{ width: W, height: H, transform: `scale(${zoom})` }}
            >
              {LANES[tree].map((lane, i) => (
                <div
                  className="web-lane-label"
                  key={lane}
                  style={{ top: i * 185 + 45, left: 65 }}
                >
                  0{i + 1} / {lane.toUpperCase()}
                </div>
              ))}
              <svg
                className="web-edges"
                width={W}
                height={H}
                aria-hidden="true"
              >
                {nodes.flatMap((n) =>
                  [
                    ...n.requires.map((id) => ({ id, alt: false })),
                    ...(n.anyOf ?? []).map((id) => ({ id, alt: true })),
                  ].map(({ id, alt }) => {
                    const parent = NODE_MAP.get(id);
                    if (!parent || parent.program !== tree) return null;
                    const a = position(parent),
                      b = position(n);
                    const x1 = a.x + NW,
                      y1 = a.y + NH / 2,
                      x2 = b.x,
                      y2 = b.y + NH / 2;
                    const owned = game.researched.includes(id);
                    return (
                      <path
                        key={id + "-" + n.id}
                        d={
                          x2 > x1
                            ? `M${x1} ${y1} C${x1 + 70} ${y1},${x2 - 70} ${y2},${x2} ${y2}`
                            : `M${a.x + NW / 2} ${a.y + NH} C${a.x + NW / 2} ${a.y + NH + 40},${b.x - 35} ${y2},${b.x} ${y2}`
                        }
                        fill="none"
                        stroke={owned ? "#badf78" : "#49615d"}
                        strokeWidth={owned ? 2.4 : 1.5}
                        strokeDasharray={alt ? "5 6" : undefined}
                      />
                    );
                  }),
                )}
              </svg>
              {nodes.map((n) => {
                const pos = position(n),
                  owned = game.researched.includes(n.id),
                  can = available(game, n.id);
                return (
                  <button
                    key={n.id}
                    style={{
                      left: pos.x,
                      top: pos.y,
                      width: NW,
                      height: NH,
                      opacity: filter && !can && !owned ? 0.28 : 1,
                    }}
                    className={`web-node ${owned ? "owned" : can ? "available" : "locked-node"} ${selected === n.id ? "focused" : ""}`}
                    onClick={() => {
                      setSelected(n.id);
                      setDetails(true);
                    }}
                  >
                    <div className="node-top">
                      <span>{n.kind === "module" ? "◇" : "✧"}</span>
                      <small>
                        {owned
                          ? "DISCOVERED"
                          : n.requires.length > 1
                            ? "HYBRID"
                            : n.anyOf?.length
                              ? "ALTERNATE PATH"
                              : "DISCOVERY"}
                      </small>
                      <span>{owned ? "✓" : can ? "↗" : ""}</span>
                    </div>
                    <strong>{n.name}</strong>
                    <div className="web-node-cost">
                      {owned
                        ? n.kind === "module"
                          ? game.modules.includes(n.id)
                            ? "EQUIPPED"
                            : "AVAILABLE TO EQUIP"
                          : "PERMANENT"
                        : n.cost +
                          " RP" +
                          (n.localCost
                            ? " + " +
                              n.localCost +
                              " " +
                              PROGRAMS[n.program as Program].currency
                            : "")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {details && (
          <aside className="web-detail">
            <div className="card-kicker">
              DISCOVERY DETAILS{" "}
              <span>
                {game.researched.length} / {NODES.length}
              </span>
            </div>
            <div className="web-detail-symbol">
              {node.kind === "module" ? "◇" : "✧"}
            </div>
            <div className="eyebrow">{LANES[node.program][node.lane]}</div>
            <h2>{node.name}</h2>
            <p>{node.description}</p>
            <div className="detail-rule">
              <span>Research</span>
              <b>{node.cost} RP</b>
            </div>
            {node.program !== "global" && (
              <div className="detail-rule">
                <span>{PROGRAMS[node.program].currency}</span>
                <b>
                  {node.localCost} /{" "}
                  {Math.floor(game.progress[node.program].funds)} owned
                </b>
              </div>
            )}
            {node.requires.length > 0 && (
              <div className="web-requirements">
                <small>REQUIRES ALL</small>
                {node.requires.map((id) => (
                  <button key={id} onClick={() => setSelected(id)}>
                    {game.researched.includes(id) ? "✓" : "○"}{" "}
                    {NODE_MAP.get(id)?.name}
                  </button>
                ))}
              </div>
            )}
            {!!node.anyOf?.length && (
              <div className="web-requirements">
                <small>REQUIRES EITHER PATH</small>
                {node.anyOf.map((id) => (
                  <button key={id} onClick={() => setSelected(id)}>
                    {game.researched.includes(id) ? "✓" : "○"}{" "}
                    {NODE_MAP.get(id)?.name}
                  </button>
                ))}
              </div>
            )}
            {game.researched.includes(node.id) ? (
              node.kind === "module" ? (
                <button
                  className="primary"
                  onClick={() => setGame((s) => equip(s, node.id))}
                >
                  {game.modules.includes(node.id)
                    ? "Unequip module"
                    : "Equip module"}
                </button>
              ) : (
                <div className="discovered">✓ Permanent discovery active</div>
              )
            ) : (
              <button
                className="primary"
                disabled={!afford(game, node.id)}
                onClick={() => setGame((s) => research(s, node.id))}
              >
                {afford(game, node.id)
                  ? "Research discovery ↗"
                  : available(game, node.id)
                    ? "More resources needed"
                    : "Follow a connected path"}
              </button>
            )}
            <div className="module-slots">
              <div className="control-label">
                YOUR BUILD · {activeModules.length}/3
              </div>
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  disabled={!activeModules[i]}
                  onClick={() => setGame((s) => equip(s, activeModules[i]))}
                >
                  {activeModules[i]
                    ? NODE_MAP.get(activeModules[i])?.name + " ×"
                    : "Empty module slot"}
                </button>
              ))}
            </div>
            <p className="small-note">
              Drag the canvas to explore. Hybrid discoveries combine
              disciplines. Dashed paths give you a choice of prerequisites.
              Modules change your build without deleting research.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
}
