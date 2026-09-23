import { useState } from "react";
import {
  NODES,
  NODE_MAP,
  PROGRAMS,
  LANES,
  type ResearchNode,
} from "./research";
import {
  available,
  afford,
  research,
  totalTrials,
  distance,
  type Save,
} from "./game";
export default function Research({
  game,
  setGame,
  onRun,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onRun: () => void;
}) {
  const [shared, setShared] = useState(false);
  const [filter, setFilter] = useState<"next" | "all" | "owned">("next");
  const [selected, setSelected] = useState<string | null>(null);
  const tree = shared ? "global" : game.program;
  const nodes = NODES.filter((n) => n.program === tree);
  const ready = nodes.filter((n) => afford(game, n.id)).length;
  const visible = nodes.filter((n) =>
    filter === "owned"
      ? game.researched.includes(n.id)
      : filter === "all"
        ? true
        : available(game, n.id),
  );
  const detail = selected ? NODE_MAP.get(selected) : null;
  const last = game.history[0];
  const inspect = (id: string) => {
    const n = NODE_MAP.get(id);
    if (!n) return;
    setSelected(id);
    if (n.program === "global") setShared(true);
    else if (n.program === game.program) setShared(false);
  };
  const status = (n: ResearchNode) =>
    game.researched.includes(n.id)
      ? "Discovered"
      : afford(game, n.id)
        ? "Can afford"
        : available(game, n.id)
          ? "Save up"
          : "Locked";
  return (
    <div className="research-page">
      <div className="section-title">
        <div>
          <span className="eyebrow">Make the next run better</span>
          <h1>Research</h1>
          <p>Permanent discoveries. Choose your own path.</p>
        </div>
        <button className="primary" onClick={onRun}>
          Back to the road →
        </button>
      </div>
      {last && (
        <div className="run-receipt">
          <b>Last run · {distance(last.distance)}</b>
          <span>+{last.science} research</span>
          <span>
            +{last.funds} {PROGRAMS[last.program].currency}
          </span>
          <span>+{last.xp} XP</span>
        </div>
      )}
      <div className="research-tools">
        <div className="segmented">
          <button
            className={!shared ? "selected" : ""}
            onClick={() => {
              setShared(false);
              setSelected(null);
            }}
          >
            {PROGRAMS[game.program].short}
          </button>
          {totalTrials(game) >= 3 && (
            <button
              className={shared ? "selected" : ""}
              onClick={() => {
                setShared(true);
                setSelected(null);
              }}
            >
              Shared science
            </button>
          )}
        </div>
        <div className="segmented" aria-label="Research filter">
          {(
            [
              ["next", "Next discoveries"],
              ["all", "All discoveries"],
              ["owned", "Discovered"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? "selected" : ""}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="research-budget">
          <b>{Math.floor(game.science)} RP</b>
          {!shared && (
            <span>
              {" "}
              · {Math.floor(game.progress[game.program].funds)}{" "}
              {PROGRAMS[game.program].currency}
            </span>
          )}
        </span>
      </div>
      <div className="research-overview">
        <b>
          {ready} {ready === 1 ? "discovery" : "discoveries"} you can afford
        </b>
        <span>
          Research stays active forever. Equipment is managed separately.
        </span>
      </div>
      <div className={"research-layout " + (detail ? "with-detail" : "")}>
        <div className="discovery-groups">
          {LANES[tree].map((lane, i) => {
            const group = visible.filter((n) => n.lane === i);
            return (
              <section className="discovery-group" key={lane}>
                <h2>
                  <span>0{i + 1}</span>
                  {lane}
                </h2>
                {group.length ? (
                  group.map((n) => {
                    const owned = game.researched.includes(n.id),
                      can = afford(game, n.id),
                      open = available(game, n.id);
                    return (
                      <article
                        key={n.id}
                        className={
                          "discovery " +
                          (can
                            ? "affordable"
                            : owned
                              ? "owned"
                              : open
                                ? "saving"
                                : "locked") +
                          (selected === n.id ? " inspecting" : "")
                        }
                      >
                        <div className="discovery-top">
                          <span className="status-pill">{status(n)}</span>
                          <span className="tier">Tier {n.tier + 1}</span>
                        </div>
                        <button
                          className="discovery-name"
                          onClick={() => inspect(n.id)}
                        >
                          {n.name}
                        </button>
                        <p>{n.description}</p>
                        {!owned && (
                          <div className="cost-line">
                            <span
                              className={
                                game.science >= n.cost ? "enough" : "short"
                              }
                            >
                              {n.cost} RP
                            </span>
                            {n.localCost > 0 && (
                              <span
                                className={
                                  game.progress[game.program].funds >=
                                  n.localCost
                                    ? "enough"
                                    : "short"
                                }
                              >
                                {n.localCost} {PROGRAMS[game.program].currency}
                              </span>
                            )}
                          </div>
                        )}
                        {!owned && open && !can && (
                          <small className="shortfall">
                            Need{" "}
                            {[
                              [
                                Math.max(0, n.cost - Math.floor(game.science)),
                                "RP",
                              ],
                              [
                                Math.max(
                                  0,
                                  n.localCost -
                                    Math.floor(
                                      game.progress[game.program].funds,
                                    ),
                                ),
                                PROGRAMS[game.program].currency,
                              ],
                            ]
                              .filter(([v]) => Number(v) > 0)
                              .map(([v, label]) => v + " " + label)
                              .join(" + ")}{" "}
                            more
                          </small>
                        )}
                        <div className="discovery-actions">
                          {can ? (
                            <button
                              className="primary"
                              onClick={() => setGame((s) => research(s, n.id))}
                            >
                              Research · {n.cost} RP
                            </button>
                          ) : (
                            <button
                              className="secondary"
                              onClick={() => inspect(n.id)}
                            >
                              {owned
                                ? "View discovery"
                                : open
                                  ? "View details"
                                  : "See requirements"}
                            </button>
                          )}
                          {can && (
                            <button
                              className="text-button"
                              onClick={() => inspect(n.id)}
                              aria-label={"Details for " + n.name}
                            >
                              Details
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="empty-lane">
                    {filter === "owned"
                      ? "No discoveries yet."
                      : filter === "next"
                        ? "Open a connected path in another discipline."
                        : "No discoveries."}
                  </p>
                )}
              </section>
            );
          })}
        </div>
        {detail && (
          <aside className="research-detail">
            <button
              className="detail-close"
              aria-label="Close discovery details"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <span className="eyebrow">
              {LANES[detail.program][detail.lane]}
            </span>
            <h2>{detail.name}</h2>
            <p>{detail.description}</p>
            {!detail.requires.length && !detail.anyOf?.length && (
              <p>This is a starting discovery. No prerequisites.</p>
            )}
            {detail.requires.length > 0 && (
              <div className="requirements">
                <b>Discover all of these</b>
                {detail.requires.map((id) => (
                  <button onClick={() => inspect(id)} key={id}>
                    {game.researched.includes(id) ? "✓" : "○"}{" "}
                    {NODE_MAP.get(id)?.name}
                  </button>
                ))}
              </div>
            )}
            {!!detail.anyOf?.length && (
              <div className="requirements">
                <b>Choose either route</b>
                {detail.anyOf.map((id) => (
                  <button onClick={() => inspect(id)} key={id}>
                    {game.researched.includes(id) ? "✓" : "○"}{" "}
                    {NODE_MAP.get(id)?.name}
                  </button>
                ))}
              </div>
            )}
            <div className="requirements">
              <b>Opens paths toward</b>
              {NODES.filter(
                (n) =>
                  n.requires.includes(detail.id) ||
                  n.anyOf?.includes(detail.id),
              ).map((n) => (
                <button key={n.id} onClick={() => inspect(n.id)}>
                  {n.name} →
                </button>
              ))}
            </div>
            <button
              className="primary"
              disabled={!afford(game, detail.id)}
              onClick={() => setGame((s) => research(s, detail.id))}
            >
              {game.researched.includes(detail.id)
                ? "Permanently active"
                : afford(game, detail.id)
                  ? "Research · " + detail.cost + " RP"
                  : available(game, detail.id)
                    ? "More resources needed"
                    : "Requirements not met"}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
