import { useLayoutEffect, useRef, useState } from "react";
import {
  NODES,
  NODE_MAP,
  LANES,
  PROGRAMS,
  VARIANTS,
  effectLabel,
  STAT_PURPOSE,
  beginnerResearch,
  firstDiscoveries,
  runnerDiscoveryCount,
  choiceAlternatives,
  chosenAlternative,
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
  sharedUnlocked,
  distance,
  totalTrials,
  type Save,
} from "./game";
import Glyph from "./ResearchGlyph";
import "./research-onboarding.css";
const C = 720,
  W = 1440;
type ResearchProps = {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onRun: () => void;
};

function priceShortfall(game: Save, n: ResearchNode) {
  return [
    game.science < n.cost ? `${Math.ceil(n.cost - game.science)} RP` : "",
    game.progress.runner.funds < n.localCost
      ? `${Math.ceil(n.localCost - game.progress.runner.funds)} Endurance`
      : "",
  ]
    .filter(Boolean)
    .join(" + ");
}

/** Learn one decision at a time before introducing the complete research map. */
export function FirstExperiments({ game, setGame, onRun }: ResearchProps) {
  const choices = firstDiscoveries(game.researched),
    count = runnerDiscoveryCount(game.researched),
    runs = totalTrials(game),
    waitingForFirstRun = runs === 0,
    testingFirstFinding = runs === 1 && count > 0,
    current = stats(game),
    last = game.history.find((run) => run.program === "runner"),
    showNotes = choices.some((n) => n.localCost > 0),
    firstChoice = count === 0,
    needsAnotherRun =
      runs > 0 && firstChoice && !choices.some((n) => afford(game, n.id)),
    firstPrice = Math.min(...choices.map((n) => n.cost)),
    missingRP = Math.max(0, firstPrice - Math.floor(game.science)),
    owned = game.researched
      .map((id) => NODE_MAP.get(id))
      .filter((n): n is ResearchNode => n?.program === "runner");
  return (
    <section
      className="first-experiments"
      aria-label="First research experiments"
    >
      <header className="experiments-heading">
        <div>
          <span className="eyebrow">Ellis's field notebook</span>
          <h1>
            {waitingForFirstRun
              ? "Start with an experiment."
              : testingFirstFinding
                ? "Run again to test this finding."
                : needsAnotherRun
                  ? "Run again to collect enough research."
                  : firstChoice
                    ? "A better second attempt."
                    : "Build on what worked."}
          </h1>
          <p>
            {waitingForFirstRun
              ? "Take Ellis outside first. Distance gives the team research data."
              : testingFirstFinding
                ? "The first change is in place. See what it does on the road."
                : needsAnotherRun
                  ? `The first experiment costs ${firstPrice} RP. You need ${missingRP} more; your research carries over.`
                  : firstChoice
                    ? "Choose one improvement. Run again and feel the difference."
                    : "Follow a promising idea. Every improvement stays with Ellis."}
          </p>
        </div>
        <div
          className="experiment-budget"
          aria-label={`${Math.floor(game.science)} research points available`}
        >
          <span>AVAILABLE TO SPEND</span>
          <strong>
            {Math.floor(game.science)} <small>RP</small>
          </strong>
          {showNotes && (
            <p>{Math.floor(game.progress.runner.funds)} Endurance</p>
          )}
        </div>
      </header>
      <div className="experiment-context">
        {last ? (
          <p>
            <b>Last run · {distance(last.distance)}</b>
            <span>+{last.science} RP brought back</span>
          </p>
        ) : (
          <p>
            <b>Start with a run.</b>
            <span>Distance earns research points to spend here.</span>
          </p>
        )}
        <div
          className="experiment-chapters"
          aria-label={`${count} of 4 introductory discoveries completed`}
        >
          {[0, 1, 2, 3].map((step) => (
            <i key={step} className={step < count ? "done" : ""}>
              {step < count ? "✓" : step + 1}
            </i>
          ))}
          <span>Research map opens at 4 discoveries</span>
        </div>
      </div>
      <div
        className="experiment-choices"
        style={{
          gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))`,
        }}
      >
        {choices.map((n) => {
          const can = afford(game, n.id),
            comparisonStat =
              n.effects.stamina !== undefined
                ? "stamina"
                : n.effects.speed !== undefined
                  ? "speed"
                  : null,
            comparisonValue = comparisonStat
              ? (n.effects[comparisonStat] ?? 0)
              : 0,
            before =
              comparisonStat === "stamina"
                ? current.stamina * 100
                : PROGRAMS.runner.base * current.speed,
            after =
              comparisonStat === "stamina"
                ? before + comparisonValue * 100
                : before + PROGRAMS.runner.base * comparisonValue,
            gateCopy = waitingForFirstRun
              ? "Finish a first run"
              : testingFirstFinding
                ? "Run again to test it"
                : null;
          return (
            <article
              key={n.id}
              className={`experiment-option experiment-lane-${n.lane}${can ? " affordable" : ""}`}
            >
              <div className="experiment-option-top">
                <span>{LANES.runner[n.lane]}</span>
                <b className={can ? "can-afford" : "needs-data"}>
                  {can ? "Can afford" : (gateCopy ?? "More research needed")}
                </b>
              </div>
              <div className="experiment-illustration" aria-hidden="true">
                <Glyph name={n.icon} />
              </div>
              <h2>{n.name}</h2>
              <p className="experiment-description">{n.description}</p>
              <div className="experiment-outcome">
                {n.choiceGroup && (
                  <div className="experiment-specialization">
                    <b>Permanent specialization</b>
                    <span>
                      Choosing this closes{" "}
                      {choiceAlternatives(n)
                        .map((other) => other.name)
                        .join(" / ")}
                      .
                    </span>
                  </div>
                )}
                <div className="experiment-effects">
                  {Object.entries(n.effects).map(([stat, value], index) =>
                    index === 0 ? (
                      <strong key={stat}>
                        {effectLabel(stat as keyof typeof current, value)}
                      </strong>
                    ) : (
                      <span key={stat}>
                        {effectLabel(stat as keyof typeof current, value)}
                      </span>
                    ),
                  )}
                </div>
                {comparisonStat && (
                  <span>
                    {comparisonStat === "stamina"
                      ? Math.round(before)
                      : before.toFixed(1)}{" "}
                    <i>→</i>{" "}
                    <b>
                      {comparisonStat === "stamina"
                        ? Math.round(after)
                        : after.toFixed(1)}
                    </b>{" "}
                    {comparisonStat === "speed"
                      ? "m/s cruising target"
                      : "maximum stamina"}
                  </span>
                )}
                <p>{STAT_PURPOSE[n.stat]}</p>
                {n.ability && (
                  <small className="experiment-skill">
                    Also unlocks a permanent field skill
                  </small>
                )}
              </div>
              <div className="experiment-purchase">
                <div>
                  <strong>{n.cost} RP</strong>
                  {n.localCost > 0 && <span> + {n.localCost} Endurance</span>}
                  <small>
                    {n.choiceGroup
                      ? "Choose one · permanent"
                      : "One purchase · permanent"}
                  </small>
                </div>
                <button
                  className="primary"
                  disabled={!can}
                  onClick={() => setGame((s) => research(s, n.id))}
                >
                  {can
                    ? "Research " + n.name
                    : (gateCopy ?? "Need " + priceShortfall(game, n))}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <footer className="experiment-footer">
        <div aria-live="polite">
          {needsAnotherRun ? (
            <>
              <b>{missingRP} RP to the first discovery.</b>
              <p>
                Go a little farther, or adjust your pace, to bring back more
                data.
              </p>
            </>
          ) : testingFirstFinding ? (
            <>
              <b>One discovery at a time.</b>
              <p>
                Your research is permanent. The next run earns data for another
                choice.
              </p>
            </>
          ) : owned.length ? (
            <>
              <b>Already working for you</b>
              <p>{owned.map((n) => n.name).join(" · ")}</p>
            </>
          ) : (
            <>
              <b>Neither choice closes the other path.</b>
              <p>
                You can come back for the other improvement after another run.
              </p>
            </>
          )}
          {choices.some((n) => n.choiceGroup) && (
            <small className="specialization-note">
              Specializations trade one strength for another. Their advanced
              paths join again; the other specialization stays closed.
            </small>
          )}
          {showNotes && (
            <small>
              Endurance is training data earned while running. Some later
              research uses it alongside RP.
            </small>
          )}
        </div>
        <button className="primary" onClick={onRun}>
          {game.trial
            ? "Back to the run"
            : needsAnotherRun
              ? "Run for more data"
              : count
                ? "Try your improvements"
                : "Back to run"}{" "}
          →
        </button>
      </footer>
    </section>
  );
}

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
export default function Research({ game, setGame, onRun }: ResearchProps) {
  const [shared, setShared] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [zoom, setZoom] = useState(0.65),
    [showAll, setShowAll] = useState(false);
  const viewport = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; sx: number; sy: number } | null>(
      null,
    );
  const isShared = shared && sharedUnlocked(game);
  const tree = isShared ? "global" : game.program,
    nodes = NODES.filter((n) => n.program === tree);
  const introductory = beginnerResearch(game.program, game.researched);
  const known = (n: ResearchNode) =>
    showAll ||
    game.researched.includes(n.id) ||
    available(game, n.id) ||
    [...n.requires, ...(n.anyOf ?? [])].some(
      (id) => game.researched.includes(id) || available(game, id),
    );
  const chosen = selected ? NODE_MAP.get(selected) : undefined;
  const detail = chosen?.program === tree ? chosen : undefined;
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
  }, [zoom, tree, introductory]);
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
  if (introductory)
    return <FirstExperiments game={game} setGame={setGame} onRun={onRun} />;
  return (
    <div className="atlas-screen">
      <div className="atlas-heading">
        <div>
          <span className="eyebrow">Permanent research</span>
          <h1>The motion atlas</h1>
        </div>
        <div className="atlas-tabs">
          <button
            className={!isShared ? "active" : ""}
            onClick={() => {
              setShared(false);
              setSelected(null);
            }}
          >
            {PROGRAMS[game.program].short}
          </button>
          {sharedUnlocked(game) && (
            <button
              className={isShared ? "active" : ""}
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
                    discoveries
                  </small>
                </div>
                {LANES[tree].map((label, l) => (
                  <div key={label} className={"atlas-region region-" + l}>
                    {label}
                    <small>
                      {
                        {
                          runner: [
                            "Build endurance",
                            "Improve the stride",
                            "Choose running kit",
                            "Control airflow",
                          ],
                          projectile: [
                            "Choose a release",
                            "Shape the trajectory",
                            "Store launch energy",
                            "Measure each flight",
                          ],
                          wheels: [
                            "Reduce rolling losses",
                            "Choose propulsion",
                            "Improve the chassis",
                            "Control the vehicle",
                          ],
                          global: [
                            "Record experiments",
                            "Support field work",
                            "Develop materials",
                            "Improve measurements",
                          ],
                        }[tree][l]
                      }
                    </small>
                  </div>
                ))}
                {nodes.filter(known).map((n) => {
                  const pos = nodePosition(n),
                    revealed = known(n),
                    owned = game.researched.includes(n.id),
                    can = afford(game, n.id);
                  const excluded = chosenAlternative(n, game.researched);
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
                        (excluded && !owned ? " excluded" : "") +
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
                        {excluded && !owned && <i>×</i>}
                      </span>
                      {revealed && (
                        <>
                          <strong>{n.name}</strong>
                          {!owned && (
                            <small>
                              {excluded
                                ? "Other specialization chosen"
                                : n.choiceGroup
                                  ? "Choose one · " + n.cost + " RP"
                                  : n.cost + " RP"}
                            </small>
                          )}
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
            {!isShared && (
              <p>
                {Math.floor(game.progress[game.program].funds)}{" "}
                {PROGRAMS[game.program].currency}
              </p>
            )}
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
                <ul className="discovery-effects">
                  {Object.entries(detail.effects).map(([stat, value]) => (
                    <li
                      key={stat}
                      className={value < 0 ? "tradeoff-effect" : undefined}
                    >
                      {effectLabel(stat as keyof typeof currentStats, value)}
                    </li>
                  ))}
                  {detail.ability && (
                    <li className="special-effect">✦ Unlocks a field skill</li>
                  )}
                  {Object.values(VARIANTS)
                    .flat()
                    .filter((v) => v.node === detail.id)
                    .map((v) => (
                      <li key={v.id} className="special-effect">
                        Unlocks {v.name}
                        {detail.program === "wheels" && v.multiplier
                          ? " · " + v.multiplier + "× vehicle speed"
                          : ""}
                      </li>
                    ))}
                </ul>
                <p>{detail.description}</p>
                {detail.choiceGroup && (
                  <div
                    className={
                      "research-choice " +
                      (chosenAlternative(detail, game.researched)
                        ? "choice-closed"
                        : "")
                    }
                  >
                    <b>
                      {chosenAlternative(detail, game.researched)
                        ? "Other specialization chosen"
                        : game.researched.includes(detail.id)
                          ? "Your specialization"
                          : "Choose one specialization"}
                    </b>
                    <p>
                      {chosenAlternative(detail, game.researched)
                        ? "This path is closed because you researched " +
                          chosenAlternative(detail, game.researched)!.name +
                          "."
                        : "Choosing one closes the other option. Later shared discoveries remain reachable from either path."}
                    </p>
                    {choiceAlternatives(detail).map((other) => (
                      <button key={other.id} onClick={() => inspect(other.id)}>
                        Compare: {other.name}
                        <small>
                          {Object.entries(other.effects)
                            .map(([key, value]) =>
                              effectLabel(
                                key as keyof typeof currentStats,
                                value,
                              ),
                            )
                            .join(" · ")}
                        </small>
                      </button>
                    ))}
                  </div>
                )}

                {Object.keys(detail.effects).length === 1 && (
                  <p className="stat-purpose">{STAT_PURPOSE[detail.stat]}</p>
                )}
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
                      {[
                        game.science < detail.cost
                          ? `${Math.ceil(detail.cost - game.science)} RP`
                          : "",
                        detail.program !== "global" &&
                        game.progress[detail.program].funds < detail.localCost
                          ? `${Math.ceil(detail.localCost - game.progress[detail.program].funds)} ${PROGRAMS[detail.program].currency}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" and ")}
                      .
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
                <p className="atlas-reading-tip">
                  Lines show prerequisites. Specialization pairs are permanent
                  choices; compare their benefits and costs before buying.
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
                  ? "Research · " +
                    detail.cost +
                    " RP" +
                    (detail.localCost
                      ? " + " +
                        detail.localCost +
                        " " +
                        PROGRAMS[game.program].currency
                      : "")
                  : available(game, detail.id)
                    ? "More resources needed"
                    : chosenAlternative(detail, game.researched)
                      ? "Other specialization chosen"
                      : "Discover the prerequisites"}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
