import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { PROGRAMS, VARIANTS, STAT_LABELS, type Stat } from "./research";
import { SLOTS, slotName, gearName } from "./equipment";
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
  eventDetails,
  totalTrials,
  suppliesUnlocked,
  pendingRewards,
  equipmentUnlocked,
  trainingProgress,
  levelStart,
  routeChallenge,
  selectProgram,
  equipGear,
  hasAbility,
  era,
  projectileFlight,
  type Save,
} from "./game";
import Glyph from "./ResearchGlyph";
const World = lazy(() => import("./World"));

/** Only disclose modifiers the player has actually acquired. */
export function telemetryStats(game: Save): Stat[] {
  const values = stats(game);
  const keys: Stat[] =
    game.program === "projectile"
      ? [
          "launchSpeed",
          "drag",
          "lift",
          "stability",
          "reload",
          "payload",
          "yield",
          "xp",
          "luck",
          "automation",
        ]
      : [
          "speed",
          "stamina",
          "acceleration",
          "economy",
          "recovery",
          "resilience",
          "wind",
          "yield",
          "xp",
          "luck",
          "traction", "cooling", "oxygen", "automation", "overdrive", "aerodynamics",
        ];
  return keys.filter((key) => Math.abs(values[key] - 1) > 0.0001);
}

const PACES = [
  ["recover", "Recover", "40% speed · restore energy"],
  ["steady", "Steady", "Normal speed · normal energy use"],
  ["push", "Push", "+30% speed · 2.6× energy use"],
] as const;

export default function Expedition({
  game,
  setGame,
  onResearch,
  onEquipment,
  stagingReady = true,
  timeScale = 1,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onResearch: () => void;
  onEquipment: () => void;
  stagingReady?: boolean;
  timeScale?: number;
}) {
  const [closeup, setCloseup] = useState(false);
  const telemetry = useRef<HTMLDialogElement>(null),
    staging = useRef<HTMLDialogElement>(null);
  const t = game.trial,
    p = game.program,
    projectile = p === "projectile";
  const def = PROGRAMS[p],
    st = stats(game),
    progress = game.progress[p];
  const reward = pendingRewards(game),
    training = trainingProgress(game),
    challenge = routeChallenge(game);
  const flight = projectile ? projectileFlight(game) : null;
  const nextTraining = stats({...game, progress: {...game.progress, [p]: {...progress, xp: levelStart(training.level + 1)}}});
  const previousLevel = useRef(training.level);
  const [levelUp, setLevelUp] = useState(false);
  useEffect(() => {
    previousLevel.current = training.level;
    setLevelUp(false);
  }, [p]);
  useEffect(() => {
    if (training.level <= previousLevel.current) return;
    previousLevel.current = training.level;
    setLevelUp(true);
    const timer = setTimeout(() => setLevelUp(false), 4500);
    return () => clearTimeout(timer);
  }, [training.level]);
  useEffect(() => {
    if (!t && stagingReady && !staging.current?.open)
      staging.current?.showModal();
    else if (t || !stagingReady) staging.current?.close();
  }, [!!t, stagingReady]);
  const capacity = 100 * st.stamina,
    energy = t?.energy ?? capacity,
    fatigue = t?.fatigue ?? 0;
  const bio = biomeAt(t?.distance ?? 0),
    next = BIOMES[BIOMES.indexOf(bio) + 1];
  const experienced = totalTrials(game) > 0;
  const event = projectile || t?.event == null ? null : eventDetails(game);
  const drop = equipmentUnlocked(game)
    ? game.inventory.find((g) => g.id === game.lastDrop && g.program === p)
    : undefined;
  const variants = VARIANTS[p].filter(
    (v) => !v.node || game.researched.includes(v.node),
  );
  const gear = equipmentUnlocked(game)
    ? game.inventory.filter((g) => g.program === p)
    : [];
  const paceControls = (
    <div className="pace-options" role="group" aria-label="Pace">
      {PACES.map(([id, label, desc]) => (
        <button
          key={id}
          className={game.pace === id ? "selected" : ""}
          aria-pressed={game.pace === id}
          onClick={() => setGame((s) => ({ ...s, pace: id }))}
        >
          <b>{label}</b>
          <small>{id==='push' ? `+${Math.round((1.3*Math.pow(st.overdrive,.35)-1)*100)}% speed · higher energy use` : desc}</small>
        </button>
      ))}
    </div>
  );
  const angleControl = hasAbility(game, "angle-control") && (
    <label className="launch-angle">
      <span>
        Launch angle <b>{game.launchAngle}°</b>
      </span>
      <input
        type="range"
        min="20"
        max="65"
        step="1"
        value={game.launchAngle}
        aria-label="Launch angle"
        onChange={(e) =>
          setGame((s) => ({ ...s, launchAngle: Number(e.target.value) }))
        }
      />
      <small>
        {t
          ? "Applied to the next shot."
          : "Lower angles trade height for a flatter flight."}
      </small>
    </label>
  );
  return (
    <div className="mission-screen">
      <div className="mission-heading">
        <div>
          <span className="eyebrow">
            {def.name} / Experiment {progress.trials + 1}
          </span>
          <h1>
            {projectile
              ? "Ballistics range"
              : t
                ? bio.name
                : "Prepare your next experiment"}
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
            fallback={
              <div className="world-message">Preparing the experiment…</div>
            }
          >
            <World
              timeScale={timeScale}
              game={game}
              closeup={closeup}
              onView={() => setCloseup((v) => !v)}
            />
          </Suspense>
          <div className="mission-distance">
            <span>{projectile ? "Current flight" : bio.short}</span>
            <strong>
              {distance(projectile ? (flight?.x ?? 0) : (t?.distance ?? 0))}
            </strong>
            <small>
              {projectile
                ? flight?.phase === "flight"
                  ? "In flight"
                  : flight?.phase === "landed"
                    ? "Landed"
                    : "Preparing launch"
                : (t?.speed ?? 0).toFixed(1) + " m/s"}{" "}
              <i>·</i> {clock(t?.time ?? 0)}
              {!!t?.maxTime && <span> / {clock(t.maxTime)}</span>}
            </small>
          </div>
          {!projectile && next && (
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
          <div className="field-instruments">
            <div
              className={
                "route-effort " +
                (projectile ? "easy" : t ? challenge.difficulty : "ready")
              }
            >
              <div className="instrument-title">
                <span>{projectile ? "LAUNCH SERIES" : "ROUTE SECTION"}</span>
                <b>
                  {projectile
                    ? (flight?.completed ?? 0) + " / 6 landed"
                    : distance(challenge.remaining) + " left"}
                </b>
              </div>
              <strong>
                {projectile
                  ? "Last landing: " + distance(flight?.lastRange ?? 0)
                  : challenge.name}
              </strong>
              <div
                className="route-effort-track"
                role="progressbar"
                aria-label={
                  projectile
                    ? "Launch series progress"
                    : "Route section progress"
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(
                  (projectile
                    ? (flight?.completed ?? 0) / 6
                    : challenge.progress) * 100,
                )}
              >
                <i
                  style={{
                    width:
                      (projectile
                        ? ((flight?.completed ?? 0) / 6) * 100
                        : t
                          ? challenge.progress * 100
                          : 0) + "%",
                  }}
                />
              </div>
              <small>
                {projectile
                  ? "Six launches. RP is awarded on landing."
                  : challenge.description}
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
                <b>{t ? "+" + training.earned + " this experiment" : ""}</b>
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
                {projectile
                  ? "Next level: +" + (100 * (nextTraining.launchSpeed / st.launchSpeed - 1)).toFixed(1) + "% launch speed"
                  : "Next level: +" + Math.round(100 * (nextTraining.stamina - st.stamina)).toLocaleString() + " " + def.unit + " · +" + (100 * (nextTraining.speed / st.speed - 1)).toFixed(1) + "% speed"}
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
                <span className="eyebrow">OPTIONAL · CONTINUE OR CHOOSE</span>
                <h2>{event.title}</h2>
              </div>
              {(["a", "b"] as const).map((c) => (
                <button key={c} onClick={() => setGame((s) => decide(s, c))}>
                  <b>{event[c]}</b>
                  <small>
                    {(c === "a" ? event.ad : event.bd).replace(
                      /program currency/g,
                      "RP",
                    )}
                  </small>
                </button>
              ))}
            </div>
          )}
        </section>
        <aside className="mission-console">
          <div className="finish-console">
            <span className="eyebrow">BANK IF YOU FINISH NOW</span>
            <div className="pending-rp">
              <strong>+{reward.science.toLocaleString()}</strong>
              <span>RP</span>
            </div>
            <div className="bank-local">Spend RP on talents, equipment or projects.</div>
            <button
              className="primary"
              disabled={!t}
              onClick={() => {
                setGame((s) => finish({ ...s, auto: false }));
                onResearch();
              }}
            >
              Finish experiment · +{reward.science.toLocaleString()} RP →
            </button>
          </div>
          {projectile ? (
            <div className="launch-readout">
              <span className="eyebrow">
                {flight?.phase === "flight" ? "FLIGHT" : "LAUNCHER"}
              </span>
              <dl>
                {(flight?.clockRate ?? 1)>1 && <div><dt>Flight clock</dt><dd>×{flight!.clockRate.toFixed(1)}</dd></div>}
                <div>
                  <dt>Height</dt>
                  <dd>{(flight?.y ?? 0).toFixed(1)} m</dd>
                </div>
                <div>
                  <dt>Angle</dt>
                  <dd>{flight?.angle ?? 45}°</dd>
                </div>
                <div>
                  <dt>Shots left</dt>
                  <dd>{flight?.remaining ?? 6}</dd>
                </div>
                {flight?.predicted != null && (
                  <div>
                    <dt>Predicted range</dt>
                    <dd>{distance(flight.predicted)}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
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
                  style={{
                    width: Math.max(0, (energy / capacity) * 100) + "%",
                  }}
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
                  : ""}
                {(t?.secondWind ?? 0) > 0 ? " · Second wind active" : ""}
              </small>
            </div>
          )}
          {projectile ? (
            angleControl
          ) : (
            <div className="console-pace">
              <span className="eyebrow">PACE</span>
              {paceControls}
            </div>
          )}
          {!projectile && t && (
            <div className={"effort-readout " + challenge.difficulty}>
              <span>Terrain resistance</span>
              <b>{challenge.drainMultiplier.toFixed(1)}×</b>
            </div>
          )}
          <div className="console-options">
            {!projectile && suppliesUnlocked(game) && (
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
                />
                Repeat this experiment automatically
              </label>
            )}
          </div>
          <div className="console-bottom">
            {experienced && <span>{game.talentPoints} TP · {game.vouchers} vouchers</span>}
            <button
              className="text-button"
              onClick={() => telemetry.current?.showModal()}
            >
              Telemetry ↗
            </button>
          </div>
        </aside>
      </div>
      <dialog
        ref={staging}
        className="staging-dialog"
        aria-labelledby="staging-title"
        onCancel={(e) => e.preventDefault()}
      >
        <span className="eyebrow">
          Experiment {progress.trials + 1} · {def.person}
        </span>
        <h1 id="staging-title">
          {experienced ? "Prepare an experiment" : "The first field test"}
        </h1>
        <p>
          {projectile
            ? "Test six launches and measure each landing. The launcher stays at the start line."
            : p === "runner"
              ? "Run as far as your stamina allows. Switch pace during the run; finish whenever you want to bank your research."
              : "Test your vehicle on the route. Manage its energy and record how far it travels."}
        </p>
        {game.unlocked.length > 1 && (
          <section className="staging-section">
            <h2>Research program</h2>
            <div className="staging-programs">
              {game.unlocked.map((mode) => (
                <button
                  key={mode}
                  className={mode === p ? "selected" : ""}
                  aria-pressed={mode === p}
                  onClick={() => setGame((s) => selectProgram(s, mode))}
                >
                  <Glyph
                    name={
                      mode === "runner"
                        ? "foot"
                        : mode === "projectile"
                          ? "arrow"
                          : "gear"
                    }
                  />
                  <b>{PROGRAMS[mode].short}</b>
                  <small>{mode === "projectile" ? "Six-shot test" : "Distance trial"}</small>
                </button>
              ))}
            </div>
          </section>
        )}
        {variants.length > 1 && (
          <section className="staging-section">
            <h2>{projectile ? "Launcher" : "Vehicle"}</h2>
            <div className="staging-variants">
              {variants.map((v) => (
                <button
                  key={v.id}
                  className={v.id === progress.variant ? "selected" : ""}
                  aria-pressed={v.id === progress.variant}
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
          </section>
        )}
        <section className="staging-section">
          {projectile ? (
            angleControl || (
              <p className="fixed-angle">
                Launch angle: {flight?.angle ?? 45}°. Each shot reloads
                automatically.
              </p>
            )
          ) : (
            <>
              <h2>Starting pace</h2>
              {paceControls}
            </>
          )}
        </section>
        {!projectile && era(game) >= 1 && (
          <section className="staging-section">
            <h2>Run length</h2>
            <div className="staging-variants" aria-label="Run length">
              {[[0, "Until exhausted"], [120, "2 minutes"], [300, "5 minutes"], [900, "15 minutes"]].map(([seconds, label]) => (
                <button key={seconds} className={game.sampleDuration === seconds ? "selected" : ""} aria-pressed={game.sampleDuration === seconds} onClick={() => setGame(s => ({...s, sampleDuration: Number(seconds)}))}>{label}</button>
              ))}
            </div>
            <p className="fixed-angle">Timed runs bank RP when the timer ends. Auto-repeat uses the same limit.</p>
          </section>
        )}
        {gear.length > 0 && (
          <section className="staging-section">
            <h2>Equipment</h2>
            <div className="staging-gear">
              {SLOTS.filter((slot) => gear.some((g) => g.slot === slot)).map(
                (slot) => {
                  const current = gear.find(
                    (g) => g.slot === slot && game.equipped.includes(g.id),
                  );
                  return (
                    <label key={slot}>
                      {slotName(p, slot)}
                      <select
                        aria-label={slotName(p, slot)}
                        value={current?.id ?? ""}
                        onChange={(e) =>
                          setGame((s) =>
                            e.target.value
                              ? equipGear(s, e.target.value)
                              : current
                                ? equipGear(s, current.id)
                                : s,
                          )
                        }
                      >
                        <option value="">None</option>
                        {gear
                          .filter((g) => g.slot === slot)
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {gearName(g)} · level {g.upgradeLevel ?? 0}
                            </option>
                          ))}
                      </select>
                    </label>
                  );
                },
              )}
            </div>
          </section>
        )}
        <div className="staging-actions">
          {experienced && (
            <button
              className="secondary"
              onClick={() => {
                staging.current?.close();
                onResearch();
              }}
            >
              Back to funding
            </button>
          )}
          <button
            autoFocus
            className="primary"
            onClick={() => {
              staging.current?.close();
              setGame((s) => start(s));
            }}
          >
            Begin experiment →
          </button>
        </div>
      </dialog>
      <dialog ref={telemetry} className="telemetry-dialog">
        <div className="section-title">
          <h2>Active modifiers</h2>
          <button
            className="secondary"
            onClick={() => telemetry.current?.close()}
          >
            Close
          </button>
        </div>
        <div className="telemetry-grid">
          {telemetryStats(game).map((k) => (
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
        <p>
          {telemetryStats(game).length
            ? "Combined bonuses from training, talents, laboratory projects and equipped items."
            : "No modifiers yet. Complete a field test to fund your first discovery."}
        </p>
      </dialog>
    </div>
  );
}
