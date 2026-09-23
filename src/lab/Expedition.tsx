import { lazy, Suspense, useState } from "react";
import { PROGRAMS, VARIANTS } from "./research";
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
  type Save,
} from "./game";
import { STAT_NAMES } from "./equipment";
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
  const [closeup, setCloseup] = useState(false);
  const t = game.trial,
    p = game.program,
    def = PROGRAMS[p],
    st = stats(game),
    progress = game.progress[p];
  const capacity = 100 * st.stamina,
    energy = t?.energy ?? capacity,
    fatigue = t?.fatigue ?? 0;
  const biome = biomeAt(t?.distance ?? 0),
    nextBiome = BIOMES[BIOMES.indexOf(biome) + 1];
  const experienced = totalTrials(game) > 0;
  const event = t?.event == null ? null : EVENTS[t.event % 3];
  const drop = game.inventory.find((g) => g.id === game.lastDrop);
  const variants = VARIANTS[p].filter(
    (v) => !v.node || game.researched.includes(v.node),
  );
  function toggleRun() {
    if (t) {
      setGame((s) => finish({ ...s, auto: false }));
      onResearch();
    } else setGame((s) => start(s));
  }
  return (
    <div className="field-screen">
      <div className="run-bar">
        <div>
          <span className="eyebrow">
            {def.short} · Level {level(progress.xp)}
          </span>
          <h1>
            {t
              ? biome.name
              : experienced
                ? "Ready for another run?"
                : "How far can you go?"}
          </h1>
        </div>
        <button className="primary run-button" onClick={toggleRun}>
          {t ? "Finish run → Research" : "Start run →"}
        </button>
      </div>
      <section className="expedition-stage">
        <Suspense
          fallback={<div className="world-message">Preparing the route…</div>}
        >
          <World
            game={game}
            closeup={closeup}
            onView={() => setCloseup((v) => !v)}
          />
        </Suspense>
        <div className="journey-readout">
          <span className="tag">{biome.short}</span>
          <strong>{distance(t?.distance ?? 0)}</strong>
          <span>{(t?.speed ?? 0).toFixed(1)} m/s</span>
        </div>
        <div className="expedition-clock">
          <span>Run time</span>
          <strong>{clock(t?.time ?? 0)}</strong>
        </div>
        <div className="journey-hud">
          <div className="stamina-hud">
            <div>
              <span>{def.unit}</span>
              <b>
                {Math.round(energy)} / {Math.round(capacity)}
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
            {fatigue > 5 && (
              <small>{Math.round(fatigue)} capacity lost to fatigue</small>
            )}
          </div>
          {nextBiome && (
            <div className="journey-next">
              <small>Next: {nextBiome.short}</small>
              <b>
                {distance(Math.max(0, biome.end - (t?.distance ?? 0)))} away
              </b>
            </div>
          )}
        </div>
        {!experienced && !t && (
          <div className="first-run-note">
            One scientist. A long road.
            <br />
            Start running. Discover the rest along the way.
          </div>
        )}
      </section>
      {experienced && (
        <div className="field-controls">
          <div className="pace-options" role="group" aria-label="Pace">
            {(
              [
                ["recover", "Recover", "Slow down, regain stamina"],
                ["steady", "Steady", "Balanced pace"],
                ["push", "Push", "Faster, uses more stamina"],
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
          {suppliesUnlocked(game) && (
            <button
              className="secondary"
              disabled={!t || !t.rations || t.supplyCooldown > 0}
              onClick={() => setGame((s) => supply(s))}
            >
              {t && t.supplyCooldown > 0
                ? "Ready in " + Math.ceil(t.supplyCooldown) + "s"
                : "Use supply · " + (t?.rations ?? 3) + " left"}
            </button>
          )}
          {totalTrials(game) >= 3 && (
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
              Auto-repeat
            </label>
          )}
          {variants.length > 1 && (
            <label className="variant-label">
              Test vehicle
              <select
                aria-label="Test vehicle"
                value={progress.variant}
                disabled={!!t}
                onChange={(e) =>
                  setGame((s) => ({
                    ...s,
                    progress: {
                      ...s.progress,
                      [p]: { ...s.progress[p], variant: e.target.value },
                    },
                  }))
                }
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {event && (
        <section className="decision-card">
          <div>
            <span className="eyebrow">Along the way</span>
            <h2>{event.title}</h2>
            <p>{event.text}</p>
          </div>
          <div className="decision-options">
            {(["a", "b"] as const).map((choice) => (
              <button
                key={choice}
                className="secondary"
                onClick={() => setGame((s) => decide(s, choice))}
              >
                <b>{event[choice]}</b>
                <small>{choice === "a" ? event.ad : event.bd}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {drop && (
        <section className="drop-banner" aria-live="polite">
          <span className={"rarity " + drop.rarity.toLowerCase()}>
            {drop.rarity} find
          </span>
          <b>{drop.name}</b>
          <span>
            {drop.affixes
              .map(
                (a) =>
                  "+" + Math.round(a.value * 100) + "% " + STAT_NAMES[a.stat],
              )
              .join(" · ")}
          </span>
          <button className="text-button" onClick={onEquipment}>
            View equipment →
          </button>
        </section>
      )}
      {experienced && (
        <div className="field-summary">
          <span>
            Personal best <b>{distance(progress.bestDistance)}</b>
          </span>
          <span>{progress.trials} runs completed</span>
          <span>
            {Math.floor(progress.funds)} {def.currency}
          </span>
        </div>
      )}
    </div>
  );
}
