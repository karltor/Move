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
  levelStart,
  distance,
  clock,
  EVENTS,
  type Save,
} from "./game";
const World = lazy(() => import("./World"));
export default function Expedition({
  game,
  setGame,
  onResearch,
}: {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onResearch: () => void;
}) {
  const [closeup, setCloseup] = useState(false),
    p = game.program,
    d = PROGRAMS[p],
    t = game.trial,
    progress = game.progress[p],
    st = stats(game),
    lv = level(progress.xp),
    biome = biomeAt(t?.distance ?? 0);
  const capacity = 100 * st.stamina,
    energy = t?.energy ?? capacity,
    fatigue = t?.fatigue ?? 0,
    segment = (t?.distance ?? 0) - biome.start,
    span = biome.end - biome.start;
  const event =
    t?.event === null || t?.event === undefined ? null : EVENTS[t.event % 3];
  const speed = t?.speed ?? 0;
  return (
    <>
      <section className="expedition-stage">
        <div className="expedition-topline">
          <span>
            <i className={t ? "live-dot" : "idle-dot"} />{" "}
            {t
              ? t.restTime > 0
                ? "FIELD REST"
                : "EXPEDITION LIVE"
              : game.rest > 0
                ? "PREPARING NEXT EXPEDITION"
                : "READY WHEN YOU ARE"}
          </span>
          <span>
            {biome.terrain.toUpperCase()} / {d.short.toUpperCase()}
          </span>
        </div>
        <Suspense
          fallback={<div className="world-loading">Preparing your route…</div>}
        >
          <World
            game={game}
            closeup={closeup}
            onView={() => setCloseup((v) => !v)}
          />
        </Suspense>
        <div className="journey-readout">
          <span className="tag">{biome.name}</span>
          <div className="journey-distance">{distance(t?.distance ?? 0)}</div>
          <span className="speed-label">
            {speed.toFixed(1)} m/s · {(speed * 3.6).toFixed(1)} km/h
          </span>
        </div>
        <div className="expedition-clock">
          <span>TIME IN THE FIELD</span>
          <strong>{clock(t?.time ?? 0)}</strong>
          <small>
            {t
              ? "No timer. Your stamina sets the limit."
              : "A longer journey, one step at a time."}
          </small>
        </div>
        <div className="journey-hud">
          <div className="stamina-hud">
            <div>
              <span>{d.unit.toUpperCase()}</span>
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
            <p>
              {fatigue > 0
                ? Math.round(fatigue) + " capacity lost to fatigue"
                : "Conserve energy for the road ahead"}{" "}
              · {t?.rations ?? 3} supplies left
            </p>
          </div>
          <div className="journey-next">
            <span>NEXT ENVIRONMENT</span>
            <strong>
              {Number.isFinite(biome.end)
                ? BIOMES[BIOMES.indexOf(biome) + 1]?.short
                : "Beyond the horizon"}
            </strong>
            <small>
              {Number.isFinite(biome.end)
                ? distance(Math.max(0, biome.end - (t?.distance ?? 0))) +
                  " to go"
                : "Keep exploring"}
            </small>
          </div>
        </div>
      </section>
      <div className="biome-route">
        {BIOMES.map((b, i) => (
          <div
            key={b.name}
            className={
              biome === b
                ? "current"
                : (t?.distance ?? 0) >= b.end
                  ? "visited"
                  : ""
            }
          >
            <i>{i + 1}</i>
            <span>
              {b.short}
              <small>
                {distance(b.start)}
                {Number.isFinite(b.end) ? " – " + distance(b.end) : " +"}
              </small>
            </span>
          </div>
        ))}
      </div>
      <div className="biome-progress">
        <div
          style={{
            width:
              (Number.isFinite(span)
                ? Math.min(100, (segment / span) * 100)
                : 100) + "%",
          }}
        />
      </div>
      <section className="expedition-controls">
        <div className="run-controls">
          <button
            className="primary start"
            onClick={() =>
              setGame((s) =>
                s.trial ? finish({ ...s, auto: false }) : start(s),
              )
            }
          >
            {t ? "Finish & collect research" : "▶ Start expedition"}
          </button>
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
            <span className="switch" />
            Auto-repeat{game.rest > 0 ? " · " + Math.ceil(game.rest) + "s" : ""}
          </label>
        </div>
        <div className="pace-control">
          <div className="control-label">
            CHOOSE YOUR PACE <span>CHANGE ANYTIME</span>
          </div>
          <div className="segmented">
            {(["recover", "steady", "push"] as const).map((pace) => (
              <button
                key={pace}
                className={game.pace === pace ? "active" : ""}
                onClick={() => setGame((s) => ({ ...s, pace }))}
              >
                <b>
                  {pace === "recover"
                    ? p === "runner"
                      ? "Walk & recover"
                      : "Recharge"
                    : pace === "steady"
                      ? "Sustainable"
                      : "Push hard"}
                </b>
                <small>
                  {pace === "recover"
                    ? "+ stamina · lower speed"
                    : pace === "steady"
                      ? "Efficient distance"
                      : "1.55× speed · high drain"}
                </small>
              </button>
            ))}
          </div>
        </div>
        <div className="supplies-control">
          <div className="control-label">
            FIELD SUPPLIES <span>{t?.rations ?? 3} / 3</span>
          </div>
          <button
            className="secondary"
            disabled={!t || t.rations === 0 || t.supplyCooldown > 0}
            onClick={() => setGame(supply)}
          >
            {t && t.supplyCooldown > 0
              ? "Ready in " + Math.ceil(t.supplyCooldown) + "s"
              : p === "runner"
                ? "Use field ration"
                : "Install energy pack"}
          </button>
          <p>Restore 27% capacity. Fatigue remains.</p>
        </div>
      </section>
      <div className="expedition-bottom">
        <section className="field-choice">
          <div className="card-kicker">
            {event ? "FIELD DECISION" : "EXPEDITION NOTES"}{" "}
            <span>{event ? "YOUR CALL" : "LAB RADIO"}</span>
          </div>
          {event ? (
            <>
              <h2>{event.title}</h2>
              <p>{event.text}</p>
              <div className="choice-buttons">
                <button onClick={() => setGame((s) => decide(s, "a"))}>
                  <b>{event.a} ↗</b>
                  <small>{event.ad}</small>
                </button>
                <button onClick={() => setGame((s) => decide(s, "b"))}>
                  <b>{event.b} ↗</b>
                  <small>{event.bd}</small>
                </button>
              </div>
              <small className="small-note">
                Optional. The team continues the current route if you do not
                intervene.
              </small>
            </>
          ) : (
            <>
              <h2>
                {t
                  ? "Find a pace that goes the distance."
                  : "Where will the next run take you?"}
              </h2>
              <p aria-live="polite">{game.notice}</p>
              <div className="field-advice">
                <span>Every 100 m: research + local currency</span>
                <span>Every 15 s: program experience</span>
                <span>Finish anytime to collect the full field report</span>
              </div>
            </>
          )}
        </section>
        <section className="compact-subject">
          <img
            src={import.meta.env.BASE_URL + "models/portrait-" + p + ".png"}
            alt={d.person}
          />
          <div className="subject-info">
            <div className="card-kicker">
              RESEARCH LEAD <span>LEVEL {lv}</span>
            </div>
            <h2>{d.person}</h2>
            <p>
              {d.role} · {d.currency}: <b>{Math.floor(progress.funds)}</b>
            </p>
            <div className="meter">
              <div
                style={{
                  width:
                    ((progress.xp - levelStart(lv)) /
                      (levelStart(lv + 1) - levelStart(lv))) *
                      100 +
                    "%",
                }}
              />
            </div>
            <small>Next level: +8% stamina · +3% speed</small>
            <label className="variant-label">
              TEST EQUIPMENT
              <select
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
                {VARIANTS[p].map((v) => (
                  <option
                    key={v.id}
                    value={v.id}
                    disabled={!!v.node && !game.researched.includes(v.node)}
                  >
                    {v.name}
                    {v.node && !game.researched.includes(v.node)
                      ? " · locked"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
        <section className="expedition-records">
          <span className="card-kicker">PERSONAL BEST</span>
          <strong>{distance(progress.bestDistance)}</strong>
          <p>
            {progress.best.toFixed(1)} m/s top speed
            <br />
            {progress.trials} completed expeditions
          </p>
          <button className="secondary" onClick={onResearch}>
            Explore research ↗
          </button>
        </section>
      </div>
    </>
  );
}
