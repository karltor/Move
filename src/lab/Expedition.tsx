import { lazy, Suspense, useRef, useState } from "react";
import { PROGRAMS, VARIANTS, STAT_LABELS, type Stat } from "./research";
import {
  biomeAt,
  BIOMES,
  start,
  finish,
  supply,
  decide,
  stats,
  level,
  distance,
  clock,
  EVENTS,
  totalTrials,
  suppliesUnlocked,
  pendingRewards,
  type Save,
} from "./game";
import Glyph from "./ResearchGlyph";
const World = lazy(() => import("./World"));
export default function Expedition({
  game,
  setGame,
  onResearch,
  onEquipment,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onResearch: () => void;
  onEquipment: () => void;
}) {
  const [closeup, setCloseup] = useState(false),
    telemetry = useRef<HTMLDialogElement>(null);
  const t = game.trial,
    p = game.program,
    def = PROGRAMS[p],
    st = stats(game),
    progress = game.progress[p],
    reward = pendingRewards(game);
  const capacity = 100 * st.stamina,
    energy = t?.energy ?? capacity,
    fatigue = t?.fatigue ?? 0,
    bio = biomeAt(t?.distance ?? 0),
    next = BIOMES[BIOMES.indexOf(bio) + 1];
  const experienced = totalTrials(game) > 0,
    event = t?.event == null ? null : EVENTS[t.event % 3],
    drop = game.inventory.find((g) => g.id === game.lastDrop);
  const variants = VARIANTS[p].filter(
    (v) => !v.node || game.researched.includes(v.node),
  );
  const toggle = () => {
    if (t) {
      setGame((s) => finish({ ...s, auto: false }));
      onResearch();
    } else setGame((s) => start(s));
  };
  return (
    <div className="mission-screen">
      <div className="mission-heading">
        <div>
          <span className="eyebrow">
            PROJECT LOST TUESDAY / {def.short} · LV {level(progress.xp)}
          </span>
          <h1>
            {t
              ? bio.name
              : experienced
                ? "Another step toward Tuesday."
                : "First, we run."}
          </h1>
        </div>
        {experienced && (
          <span className="personal-best">
            Best <b>{distance(progress.bestDistance)}</b>
          </span>
        )}
      </div>
      <div className="mission-layout">
        <section className="mission-stage">
          <Suspense
            fallback={<div className="world-message">Preparing the route…</div>}
          >
            <World
              game={game}
              closeup={closeup}
              onView={() => setCloseup((v) => !v)}
            />
          </Suspense>
          <div className="mission-distance">
            <span>{bio.short}</span>
            <strong>{distance(t?.distance ?? 0)}</strong>
            <small>
              {(t?.speed ?? 0).toFixed(1)} m/s <i>·</i> {clock(t?.time ?? 0)}
            </small>
          </div>
          {next && (
            <div className="next-biome">
              <Glyph name="route" />
              <span>
                Next: {next.short}
                <b>
                  {distance(Math.max(0, bio.end - (t?.distance ?? 0)))} away
                </b>
              </span>
            </div>
          )}
          {drop && (
            <button
              className={"field-find " + drop.rarity.toLowerCase()}
              onClick={onEquipment}
            >
              <Glyph name="pack" />
              <span>
                {drop.rarity} find<b>{drop.name} →</b>
              </span>
            </button>
          )}
          {event && (
            <div className="mission-decision">
              <div>
                <span className="eyebrow">FIELD DECISION</span>
                <h2>{event.title}</h2>
              </div>
              {(["a", "b"] as const).map((c) => (
                <button key={c} onClick={() => setGame((s) => decide(s, c))}>
                  <b>{event[c]}</b>
                  <small>{c === "a" ? event.ad : event.bd}</small>
                </button>
              ))}
            </div>
          )}
        </section>
        <aside className="mission-console">
          <div className="finish-console">
            <span className="eyebrow">
              {t ? "READY TO BANK" : "YOUR NEXT EXPERIMENT"}
            </span>
            {t ? (
              <div className="pending-rp">
                <strong>+{reward.science}</strong>
                <span>RP</span>
              </div>
            ) : (
              <div className="ready-mark">
                <Glyph name="arrow" />
                <b>
                  Make a little
                  <br />
                  scientific progress.
                </b>
              </div>
            )}
            <button className="primary" onClick={toggle}>
              {t ? "Finish run · +" + reward.science + " RP →" : "Start run →"}
            </button>
            <small>
              {t
                ? "Additional to RP already banked."
                : "A long road. A questionable hypothesis."}
            </small>
          </div>
          <div className="console-stamina">
            <div>
              <span>{def.unit}</span>
              <b>
                {Math.round(energy)}
                <small> / {Math.round(capacity)}</small>
              </b>
            </div>
            <div className="stamina-track">
              <i
                style={{ width: Math.max(0, (energy / capacity) * 100) + "%" }}
              />
              <span
                style={{
                  width: Math.min(100, (fatigue / capacity) * 100) + "%",
                }}
              />
            </div>
            <small>
              {fatigue > 1
                ? Math.round(fatigue) + " capacity lost to fatigue"
                : "Ready for the road"}
              {(t?.secondWind ?? 0) > 0 ? " · SECOND WIND" : ""}
            </small>
          </div>
          {experienced && (
            <div className="console-pace">
              <span className="eyebrow">PACE</span>
              <div className="pace-options" role="group" aria-label="Pace">
                {(
                  [
                    ["recover", "Recover", "Regain energy"],
                    ["steady", "Steady", "Go further"],
                    ["push", "Push", "Use more energy"],
                  ] as const
                ).map(([id, label, desc]) => (
                  <button
                    key={id}
                    className={game.pace === id ? "selected" : ""}
                    aria-pressed={game.pace === id}
                    onClick={() => setGame((s) => ({ ...s, pace: id }))}
                  >
                    <b>{label}</b>
                    <small>{desc}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="console-options">
            {suppliesUnlocked(game) && (
              <button
                className="secondary supply-button"
                disabled={!t || !t.rations || t.supplyCooldown > 0}
                onClick={() => setGame((s) => supply(s))}
              >
                {t && t.supplyCooldown > 0
                  ? "Supply ready in " + Math.ceil(t.supplyCooldown) + "s"
                  : "Use supply · " + (t?.rations ?? 3) + " left"}
              </button>
            )}
            {totalTrials(game) >= 4 && (
              <label className="auto">
                <input
                  type="checkbox"
                  checked={game.auto}
                  onChange={(e) =>
                    setGame((s) => ({
                      ...s,
                      auto: e.target.checked,
                      rest: e.target.checked ? s.rest : 0,
                    }))
                  }
                />{" "}
                Repeat after exhaustion
              </label>
            )}
          </div>
          {variants.length > 1 && (
            <div className="vehicle-buttons">
              <span className="eyebrow">TEST VEHICLE</span>
              {variants.map((v) => (
                <button
                  key={v.id}
                  disabled={!!t}
                  className={v.id === progress.variant ? "selected" : ""}
                  onClick={() =>
                    setGame((s) => ({
                      ...s,
                      progress: {
                        ...s.progress,
                        [p]: { ...s.progress[p], variant: v.id },
                      },
                    }))
                  }
                >
                  {v.name}
                </button>
              ))}
            </div>
          )}
          <div className="console-bottom">
            {experienced ? (
              <>
                <span>
                  {Math.floor(progress.funds)} <b>{def.currency}</b>
                </span>
                <button
                  className="text-button"
                  onClick={() => telemetry.current?.showModal()}
                >
                  Telemetry ↗
                </button>
              </>
            ) : (
              <p>
                The lab's clocks are frozen.
                <br />
                Your legs are the research budget.
              </p>
            )}
          </div>
        </aside>
      </div>
      <dialog ref={telemetry} className="telemetry-dialog">
        <div className="section-title">
          <h2>Live telemetry</h2>
          <button
            className="secondary"
            onClick={() => telemetry.current?.close()}
          >
            Close
          </button>
        </div>
        <div className="telemetry-grid">
          {(Object.keys(st) as Stat[]).map((k) => (
            <div key={k}>
              <span>{STAT_LABELS[k]}</span>
              <b>
                {k === "wind"
                  ? ((st[k] - 1) * 2).toFixed(1) + " m/s"
                  : k === "stamina"
                    ? Math.round(capacity)
                    : st[k].toFixed(2) + "×"}
              </b>
            </div>
          ))}
        </div>
        <p>Research and equipped items contribute to these totals.</p>
      </dialog>
    </div>
  );
}
