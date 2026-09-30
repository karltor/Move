import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { PROGRAMS, VARIANTS, STAT_LABELS, type Stat } from "./research";
import {
  biomeAt,
  BIOMES,
  start,
  finish,
  supply,
  decide,
  stats,
  distance,
  clock,
  EVENTS,
  totalTrials,
  suppliesUnlocked,
  pendingRewards,
  equipmentUnlocked,
  trainingProgress,
  routeChallenge,
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
    reward = pendingRewards(game),
    training = trainingProgress(game),
    challenge = routeChallenge(game);
  const previousLevel = useRef(training.level);
  const [levelUp, setLevelUp] = useState(false);
  useEffect(() => {
    if (training.level <= previousLevel.current) return;
    previousLevel.current = training.level;
    setLevelUp(true);
    const timer = setTimeout(() => setLevelUp(false), 4500);
    return () => clearTimeout(timer);
  }, [training.level]);
  const capacity = 100 * st.stamina,
    energy = t?.energy ?? capacity,
    fatigue = t?.fatigue ?? 0,
    bio = biomeAt(t?.distance ?? 0),
    next = BIOMES[BIOMES.indexOf(bio) + 1];
  const experienced = totalTrials(game) > 0,
    event =
      t?.event == null || totalTrials(game) < 3 ? null : EVENTS[t.event % 3],
    drop = equipmentUnlocked(game)
      ? game.inventory.find((g) => g.id === game.lastDrop)
      : undefined;
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
            PROJECT LOST TUESDAY / EXPERIMENT {progress.trials + 1}
          </span>
          <h1>
            {t
              ? bio.name
              : experienced
                ? "Another step toward Tuesday."
                : "One scientist. A hundred metres."}
          </h1>
        </div>
        {experienced && (
          <span className="personal-best">
            Best <b>{distance(progress.bestDistance)}</b>
          </span>
        )}
      </div>
      <div className="mission-layout">
        <section
          className={"mission-stage " + (t ? "run-active" : "run-ready")}
        >
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
                {experienced ? "Next: " : "First goal: "}
                {next.short}
                <b>
                  {distance(Math.max(0, bio.end - (t?.distance ?? 0)))} away
                </b>
              </span>
            </div>
          )}
          <div className="field-instruments">
            <div
              className={"route-effort " + (t ? challenge.difficulty : "ready")}
            >
              <div className="instrument-title">
                <span>{t ? "ON THE ROUTE" : "FIRST TARGET"}</span>
                <b>
                  {t
                    ? distance(challenge.remaining) + " left"
                    : distance(next?.start ?? 100)}
                </b>
              </div>
              <strong>
                {t
                  ? challenge.name
                  : experienced
                    ? "Beat your personal best"
                    : "Reach the edge of town"}
              </strong>
              <div
                className="route-effort-track"
                role="progressbar"
                aria-label="Route section progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(challenge.progress * 100)}
              >
                <i
                  style={{ width: (t ? challenge.progress * 100 : 0) + "%" }}
                />
              </div>
              <small>
                {t
                  ? challenge.description
                  : "Run, collect data, improve one thing, try again."}
              </small>
            </div>
            <div
              className={"training-instrument " + (levelUp ? "level-up" : "")}
            >
              <div className="instrument-title">
                <span>{def.short.toUpperCase()} TRAINING</span>
                <b aria-live="polite">
                  {levelUp ? "LEVEL UP! " : "LEVEL "}
                  {training.level}
                </b>
              </div>
              <div className="training-values">
                <strong>
                  {Math.floor(training.current)}
                  <span> / {training.needed} XP</span>
                </strong>
                <b>
                  {t
                    ? "+" + training.earned + " this run"
                    : "Permanent progress"}
                </b>
              </div>
              <div
                className="training-track"
                role="progressbar"
                aria-label={def.short + " experience towards next level"}
                aria-valuemin={0}
                aria-valuemax={training.needed}
                aria-valuenow={Math.floor(training.current)}
              >
                <i style={{ width: training.progress * 100 + "%" }} />
              </div>
              <small>
                {levelUp
                  ? "Stronger legs: +8 stamina · +3% top speed"
                  : "Next level: +8 stamina · +3% top speed"}
              </small>
            </div>
          </div>
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
                <span className="eyebrow">
                  OPTIONAL DETOUR · KEEP RUNNING OR CHOOSE
                </span>
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
                ? "Keep these RP even if stamina runs out."
                : experienced
                  ? "Your training and research stay with you."
                  : "A short baseline test. Exhaustion is expected."}
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
                : t
                  ? "Keep an eye on the route ahead"
                  : "Fully rested"}
              {(t?.secondWind ?? 0) > 0 ? " · SECOND WIND" : ""}
            </small>
          </div>
          {(t || experienced) && (
            <div className="console-pace">
              <span className="eyebrow">PACE</span>
              <div className="pace-options" role="group" aria-label="Pace">
                {(
                  [
                    ["recover", "Recover", "+0.55 energy/s"],
                    ["steady", "Steady", "Balanced effort"],
                    ["push", "Push", "+30% speed"],
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
              <p className={"pace-consequence " + game.pace}>
                {game.pace === "push"
                  ? "2.6× stamina use. A burst, not a whole-run strategy."
                  : game.pace === "recover"
                    ? "40% speed. Regain energy; fatigue still builds."
                    : "Normal speed and stamina use. Save a burst for easier ground."}
              </p>
            </div>
          )}
          {t && (
            <div className={"effort-readout " + challenge.difficulty}>
              <span>Terrain effort</span>
              <b>{challenge.drainMultiplier.toFixed(1)}×</b>
              <small>
                {challenge.drainMultiplier > 1.6
                  ? "The next biome takes more preparation."
                  : challenge.difficulty === "effort"
                    ? "Lose speed here. Build it back after the obstacle."
                    : challenge.difficulty === "recovery"
                      ? "Easier ground. A chance to catch your breath."
                      : "Hold a sustainable rhythm."}
              </small>
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
          {variants.length > 1 && totalTrials(game) >= 3 && (
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
