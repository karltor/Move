import { useLayoutEffect, useRef, useState } from "react";
import {
  NODES,
  NODE_MAP,
  LANES,
  PROGRAMS,
  VARIANTS,
  effectLabel,
  type ResearchNode,
  type Program,
} from "./research";
import {
  afford,
  available,
  research,
  stats,
  programDiscovered,
  selectProgram,
  totalTrials,
  type Save,
} from "./game";
import Glyph from "./ResearchGlyph";
const C = 720,
  W = 1440;
export function nodePosition(n: ResearchNode) {
  const radii =
    n.program === "global"
      ? [160, 320, 490]
      : [158, 286, 286, 410, 506, 506, 634, 634];
  const offsets = [0, -17, 17, 0, -15, 15, -10, 10];
  const angle =
      (([-135, -45, 135, 45][n.lane] +
        (n.program === "global" ? 0 : offsets[n.tier])) *
        Math.PI) /
      180,
    r = radii[n.tier];
  return { x: C + Math.cos(angle) * r, y: C + Math.sin(angle) * r, angle, r };
}
export default function Research({
  game,
  setGame,
  onRun,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onRun: () => void;
}) {
  const [shared, setShared] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [zoom, setZoom] = useState(0.65),
    [showAll, setShowAll] = useState(false);
  const viewport = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; sx: number; sy: number } | null>(
      null,
    );
  const tree = shared ? "global" : game.program,
    nodes = NODES.filter((n) => n.program === tree);
  const known = (n: ResearchNode) =>
    showAll ||
    game.researched.includes(n.id) ||
    available(game, n.id) ||
    [...n.requires, ...(n.anyOf ?? [])].some(
      (id) => game.researched.includes(id) || available(game, id),
    );
  const detail = selected ? NODE_MAP.get(selected) : undefined;
  const ready = nodes.filter((n) => afford(game, n.id));
  const currentStats = stats(game);
  const recenter = (z: number) => {
    const el = viewport.current;
    if (el) {
      el.scrollLeft = C * z - el.clientWidth / 2;
      el.scrollTop = C * z - el.clientHeight / 2;
    }
  };
  useLayoutEffect(() => {
    recenter(zoom);
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() => recenter(zoom));
    observer.observe(el);
    return () => observer.disconnect();
  }, [zoom, tree]);
  const fit = () => {
    const v = viewport.current;
    if (v)
      setZoom(
        Math.max(
          0.3,
          Math.min(
            1.1,
            Math.min(v.clientWidth, v.clientHeight) / (showAll ? 1420 : 950),
          ),
        ),
      );
  };
  function inspect(id: string) {
    const n = NODE_MAP.get(id);
    if (n && n.program === tree) {
      setSelected(id);
    }
  }
  const nextProgram = (["projectile", "wheels"] as Program[]).find(
    (p) => !game.unlocked.includes(p) && programDiscovered(game, p),
  );
  return (
    <div className="atlas-screen">
      <div className="atlas-heading">
        <div>
          <span className="eyebrow">Project Lost Tuesday</span>
          <h1>The motion atlas</h1>
        </div>
        <div className="atlas-tabs">
          <button
            className={!shared ? "active" : ""}
            onClick={() => {
              setShared(false);
              setSelected(null);
            }}
          >
            {PROGRAMS[game.program].short}
          </button>
          {totalTrials(game) >= 4 && (
            <button
              className={shared ? "active" : ""}
              onClick={() => {
                setShared(true);
                setSelected(null);
              }}
            >
              Shared laboratory
            </button>
          )}
        </div>
        <button className="secondary" onClick={onRun}>
          Back to run →
        </button>
      </div>
      <div className="atlas-body">
        <div className="atlas-board">
          <div className="atlas-legend">
            <span className="key-ready" />
            Can afford
            <span className="key-owned" />
            Researched
            <span className="key-locked" />
            Unexplored
          </div>
          <div
            className="atlas-viewport"
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
              if (drag.current) {
                e.currentTarget.scrollLeft =
                  drag.current.sx - e.clientX + drag.current.x;
                e.currentTarget.scrollTop =
                  drag.current.sy - e.clientY + drag.current.y;
              }
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <div style={{ width: W * zoom, height: W * zoom }}>
              <div
                className="atlas-canvas"
                style={{
                  width: W,
                  height: W,
                  transform: "scale(" + zoom + ")",
                }}
              >
                <svg
                  className="atlas-lines"
                  width={W}
                  height={W}
                  aria-hidden="true"
                >
                  {[190, 340, 465, 580, 700].map((r) => (
                    <circle
                      key={r}
                      cx={C}
                      cy={C}
                      r={r}
                      fill="none"
                      stroke="#b9c8cc"
                      strokeWidth="1"
                      strokeDasharray="3 12"
                    />
                  ))}
                  {nodes
                    .filter((n) => known(n))
                    .map((n) => {
                      const b = nodePosition(n);
                      return [...n.requires, ...(n.anyOf ?? [])].map((id) => {
                        const parent = NODE_MAP.get(id);
                        if (
                          !parent ||
                          parent.program !== tree ||
                          !known(parent)
                        )
                          return null;
                        const a = nodePosition(parent),
                          cross = parent.lane !== n.lane;
                        if (
                          cross &&
                          n.tier !== 0 &&
                          n.id !== selected &&
                          id !== selected
                        )
                          return null;
                        const owned = game.researched.includes(id),
                          highlight = n.id === selected || id === selected;
                        const ar = n.tier === 0 ? 98 : 696;
                        const sweep =
                          ((b.angle - a.angle + Math.PI * 3) % (Math.PI * 2)) -
                            Math.PI >
                          0
                            ? 1
                            : 0;
                        const aa = {
                            x: C + Math.cos(a.angle) * ar,
                            y: C + Math.sin(a.angle) * ar,
                          },
                          bb = {
                            x: C + Math.cos(b.angle) * ar,
                            y: C + Math.sin(b.angle) * ar,
                          };
                        return (
                          <path
                            key={id + n.id}
                            d={
                              cross
                                ? "M" +
                                  a.x +
                                  " " +
                                  a.y +
                                  " L" +
                                  aa.x +
                                  " " +
                                  aa.y +
                                  " A" +
                                  ar +
                                  " " +
                                  ar +
                                  " 0 0 " +
                                  sweep +
                                  " " +
                                  bb.x +
                                  " " +
                                  bb.y +
                                  " L" +
                                  b.x +
                                  " " +
                                  b.y
                                : "M" + a.x + " " + a.y + " L" + b.x + " " + b.y
                            }
                            fill="none"
                            stroke={
                              highlight
                                ? "#bf742a"
                                : owned
                                  ? "#367a69"
                                  : "#93a8af"
                            }
                            strokeWidth={highlight ? 3 : 2}
                            strokeDasharray={
                              n.anyOf?.includes(id) || cross ? "5 7" : undefined
                            }
                          />
                        );
                      });
                    })}
                </svg>
                <div className="atlas-core">
                  <Glyph name="flask" />
                  <b>MOVE</b>
                  <small>
                    {nodes.filter((n) => game.researched.includes(n.id)).length}{" "}
                    / {nodes.length} discoveries
                  </small>
                </div>
                {LANES[tree].map((label, l) => (
                  <div key={label} className={"atlas-region region-" + l}>
                    {label}
                    <small>
                      {
                        [
                          "Build the foundation",
                          "Find your rhythm",
                          "Make better tools",
                          "Bend the rules",
                        ][l]
                      }
                    </small>
                  </div>
                ))}
                {nodes.map((n) => {
                  const pos = nodePosition(n),
                    revealed = known(n),
                    owned = game.researched.includes(n.id),
                    can = afford(game, n.id);
                  return (
                    <button
                      key={n.id}
                      className={
                        "atlas-node lane-" +
                        n.lane +
                        (can
                          ? " can-buy"
                          : owned
                            ? " unlocked"
                            : available(game, n.id)
                              ? " reachable"
                              : " sealed") +
                        (selected === n.id ? " chosen" : "") +
                        (revealed ? "" : " unknown")
                      }
                      style={{ left: pos.x, top: pos.y }}
                      aria-label={
                        revealed
                          ? n.name +
                            (owned
                              ? ", researched"
                              : can
                                ? ", can afford"
                                : ", " + n.cost + " RP")
                          : "Uncharted discovery"
                      }
                      disabled={!revealed}
                      onClick={() => inspect(n.id)}
                    >
                      <span className="node-emblem">
                        {revealed ? <Glyph name={n.icon} /> : <span>·</span>}
                        {owned && <i>✓</i>}
                        {can && <i>+</i>}
                      </span>
                      {revealed && (
                        <>
                          <strong>{n.name}</strong>
                          {!owned && <small>{n.cost} RP</small>}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="atlas-controls">
            <button
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))}
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.15))}
            >
              +
            </button>
            <button onClick={fit}>Fit map</button>
            <label>
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />{" "}
              Reveal atlas
            </label>
            <span className="pan-hint">Drag to explore</span>
          </div>
        </div>
        <aside className="atlas-dossier">
          <div className="atlas-funds">
            <span>RESEARCH AVAILABLE</span>
            <strong>
              {Math.floor(game.science).toLocaleString("en")} <small>RP</small>
            </strong>
            <p>
              {Math.floor(game.progress[game.program].funds)}{" "}
              {PROGRAMS[game.program].currency}
            </p>
          </div>
          <div className="dossier-scroll">
            {detail ? (
              <>
                <div className={"dossier-icon lane-" + detail.lane}>
                  <Glyph name={detail.icon} />
                </div>
                <span className="eyebrow">
                  {LANES[detail.program][detail.lane]}
                </span>
                <h2>{detail.name}</h2>
                <p>{detail.description}</p>
                <ul className="discovery-effects">
                  {Object.entries(detail.effects).map(([stat, value]) => (
                    <li key={stat}>
                      {effectLabel(stat as keyof typeof currentStats, value)}
                    </li>
                  ))}
                  {detail.ability && (
                    <li className="special-effect">✦ New mechanic</li>
                  )}
                  {Object.values(VARIANTS)
                    .flat()
                    .filter((v) => v.node === detail.id)
                    .map((v) => (
                      <li key={v.id} className="special-effect">
                        Unlocks {v.name} · {v.multiplier}× vehicle speed
                      </li>
                    ))}
                </ul>
                {detail.requires.length > 0 && (
                  <div className="atlas-requires">
                    <b>Needs all</b>
                    {detail.requires.map((id) => (
                      <button
                        key={id}
                        className={game.researched.includes(id) ? "met" : ""}
                        onClick={() => inspect(id)}
                      >
                        {game.researched.includes(id) ? "✓" : "○"}{" "}
                        {NODE_MAP.get(id)?.name}
                      </button>
                    ))}
                  </div>
                )}
                {!!detail.anyOf?.length && (
                  <div className="atlas-requires">
                    <b>Either discovery opens this path</b>
                    {detail.anyOf.map((id) => (
                      <button
                        key={id}
                        className={game.researched.includes(id) ? "met" : ""}
                        onClick={() => inspect(id)}
                      >
                        {game.researched.includes(id) ? "✓" : "○"}{" "}
                        {NODE_MAP.get(id)?.name}
                      </button>
                    ))}
                  </div>
                )}
                {!game.researched.includes(detail.id) && (
                  <div className="atlas-price">
                    <span
                      className={
                        game.science >= detail.cost ? "enough" : "short"
                      }
                    >
                      {detail.cost} RP
                    </span>
                    {detail.localCost > 0 && (
                      <span
                        className={
                          game.progress[game.program].funds >= detail.localCost
                            ? "enough"
                            : "short"
                        }
                      >
                        {detail.localCost} {PROGRAMS[game.program].currency}
                      </span>
                    )}
                  </div>
                )}
                {!game.researched.includes(detail.id) &&
                  available(game, detail.id) &&
                  !afford(game, detail.id) && (
                    <p className="shortfall">
                      Still need{" "}
                      {Math.max(0, detail.cost - Math.floor(game.science))} RP
                      and{" "}
                      {Math.max(
                        0,
                        detail.localCost -
                          Math.floor(game.progress[game.program].funds),
                      )}{" "}
                      {PROGRAMS[game.program].currency}.
                    </p>
                  )}
              </>
            ) : (
              <>
                <span className="eyebrow">Choose a direction</span>
                <h2>{ready.length} discoveries within reach</h2>
                <p>
                  The green nodes are affordable. Select one to see what it
                  changes.
                </p>
                <div className="ready-discoveries">
                  {ready.map((n) => (
                    <button key={n.id} onClick={() => inspect(n.id)}>
                      <Glyph name={n.icon} />
                      <span>
                        {n.name}
                        <small>
                          {Object.entries(n.effects)
                            .map(([k, v]) =>
                              effectLabel(k as keyof typeof currentStats, v),
                            )
                            .join(" · ")}
                        </small>
                      </span>
                      <b>{n.cost}</b>
                    </button>
                  ))}
                </div>
              </>
            )}
            {nextProgram && (
              <div className="new-program">
                <small>A NEW RESEARCH FRONTIER</small>
                <h3>{PROGRAMS[nextProgram].name}</h3>
                <p>{PROGRAMS[nextProgram].description}</p>
                <button
                  className="secondary"
                  disabled={
                    !!game.trial || game.science < PROGRAMS[nextProgram].unlock
                  }
                  onClick={() => setGame((s) => selectProgram(s, nextProgram))}
                >
                  Open program · {PROGRAMS[nextProgram].unlock} RP
                </button>
              </div>
            )}
          </div>
          {detail && (
            <button
              className="primary dossier-buy"
              disabled={!afford(game, detail.id)}
              onClick={() => setGame((s) => research(s, detail.id))}
            >
              {game.researched.includes(detail.id)
                ? "✓ Permanently researched"
                : afford(game, detail.id)
                  ? "Research discovery · " + detail.cost + " RP"
                  : available(game, detail.id)
                    ? "More resources needed"
                    : "Discover the prerequisites"}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
