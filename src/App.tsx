import { useEffect, useRef, useState } from "react";
import { NODES, PROGRAMS, type Program } from "./lab/research";
import {
  fresh,
  restore,
  SAVE_KEY,
  step,
  selectProgram,
  totalDistance,
  distance,
  level,
  type Save,
} from "./lab/game";
import Research from "./lab/ResearchPanel";
import Records from "./lab/Records";
import Expedition from "./lab/Expedition";
import "./App.css";
const fmt = (n: number) =>
  n >= 1e6
    ? (n / 1e6).toFixed(1) + "m"
    : n >= 10000
      ? (n / 1000).toFixed(1) + "k"
      : Math.floor(n).toLocaleString("en");
function read() {
  try {
    return restore(localStorage.getItem(SAVE_KEY));
  } catch {
    return fresh();
  }
}
export default function App() {
  const [game, setGame] = useState<Save>(read);
  const live = useRef(game);
  live.current = game;
  const [tab, setTab] = useState<"field" | "research" | "journal" | "guide">(
      "field",
    ),
    [saveError, setSaveError] = useState(false),
    [resetOpen, setResetOpen] = useState(false);
  useEffect(() => {
    let last = performance.now();
    const tick = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (!document.hidden) setGame((s) => step(s, dt));
    }, 100);
    const save = () => {
      try {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({ ...live.current, lastActive: Date.now() }),
        );
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    };
    const timer = setInterval(() => {
      if (!document.hidden) save();
    }, 2500);
    const hide = () => {
      if (document.hidden) save();
      last = performance.now();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", save);
    return () => {
      clearInterval(tick);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", save);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);
  const p = game.program,
    def = PROGRAMS[p];
  function reset() {
    const s = fresh();
    live.current = s;
    try {
      localStorage.removeItem("move.save");
      localStorage.removeItem("move.lab.v1");
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      setSaveError(true);
    }
    setGame(s);
    setResetOpen(false);
    setTab("field");
  }
  return (
    <div
      className={
        "shell expedition-shell " +
        (tab === "research" ? "research-screen" : "")
      }
      style={{ "--accent": def.color } as React.CSSProperties}
    >
      <aside className="rail">
        <a
          className="brand-mark"
          href="#"
          aria-label="Move home"
          onClick={(e) => {
            e.preventDefault();
            setTab("field");
          }}
        >
          m<span>·</span>
        </a>
        <div className="rail-nav">
          {(
            [
              ["field", "◉", "Field lab"],
              ["research", "⌘", "Research"],
              ["journal", "▤", "Trial journal"],
              ["guide", "?", "Field guide"],
            ] as const
          ).map(([id, icon, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
              title={label}
              aria-label={label}
            >
              <span>{icon}</span>
              <small>
                {id === "guide"
                  ? "Guide"
                  : id === "journal"
                    ? "Journal"
                    : id === "field"
                      ? "Field"
                      : "Research"}
              </small>
            </button>
          ))}
        </div>
        <button
          className="rail-reset"
          onClick={() => setResetOpen(true)}
          title="Reset all progress"
          aria-label="Reset all progress"
        >
          ↺<small>Reset</small>
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="wordmark">
            MOVE<span>RESEARCH DIVISION</span>
          </div>
          <div className="top-status">
            <i /> EXPEDITION PROGRAM <span className="separator">/</span>
            <span className="save-status">
              {saveError ? "SAVE UNAVAILABLE" : "LOCAL SAVE ACTIVE"}
            </span>
          </div>
          <div className="science-wallet">
            <span className="science-icon">✧</span>
            <div>
              <small>RESEARCH</small>
              <strong>{fmt(game.science)}</strong>
            </div>
            <span className="wallet-label">RP</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">THE PURSUIT OF UNREASONABLE SPEED</div>
              <h1>
                {tab === "field"
                  ? "The road is the experiment."
                  : tab === "research"
                    ? "Follow your own line of inquiry."
                    : tab === "journal"
                      ? "Every expedition tells a story."
                      : "Make things move. Then go further."}
              </h1>
            </div>
            <div className="day-label">
              <span>
                {game.trial ? "EXPEDITION IN PROGRESS" : "FIELD NOTES"}
              </span>
              <p>
                {game.trial
                  ? distance(game.trial.distance) + " and counting"
                  : "“How far can we take this?”"}
              </p>
            </div>
          </div>
          <div className="programs" role="group" aria-label="Research programs">
            {(Object.keys(PROGRAMS) as Program[]).map((pr) => {
              const d = PROGRAMS[pr],
                locked = !game.unlocked.includes(pr),
                can =
                  game.science >= d.unlock && totalDistance(game) >= d.distance;
              return (
                <button
                  key={pr}
                  className={
                    "program " +
                    (pr === p ? "selected " : "") +
                    (locked ? "locked" : "")
                  }
                  onClick={() => setGame((s) => selectProgram(s, pr))}
                  disabled={(locked && !can) || (!!game.trial && pr !== p)}
                  title={
                    game.trial && pr !== p
                      ? "Finish the expedition before switching program"
                      : locked
                        ? "Requires " +
                          d.unlock +
                          " research and " +
                          distance(d.distance) +
                          " travelled"
                        : d.description
                  }
                >
                  <span className="program-number">{d.symbol}</span>
                  <span>
                    <strong>{d.name}</strong>
                    <small>
                      {locked
                        ? d.unlock +
                          " RP · " +
                          distance(Math.min(totalDistance(game), d.distance)) +
                          " / " +
                          distance(d.distance) +
                          (can ? " · Unlock →" : "")
                        : "LEVEL " +
                          level(game.progress[pr].xp) +
                          " · " +
                          distance(game.progress[pr].distance) +
                          " LOGGED"}
                    </small>
                  </span>
                  <span className="program-end">
                    {locked ? "↗" : pr === p ? "●" : "→"}
                  </span>
                </button>
              );
            })}
          </div>
          {tab === "field" && (
            <Expedition
              game={game}
              setGame={setGame}
              onResearch={() => setTab("research")}
            />
          )}
          {tab === "research" && (
            <Research key={p} game={game} setGame={setGame} />
          )}
          {(tab === "journal" || tab === "guide") && (
            <Records
              game={game}
              setGame={setGame}
              guide={tab === "guide"}
              onField={() => setTab("field")}
              onReset={() => setResetOpen(true)}
            />
          )}
          {saveError && (
            <p className="save-warning" role="alert">
              Your browser cannot save progress. Export a backup from the
              journal before leaving.
            </p>
          )}
          {tab !== "research" && (
            <footer className="page-footer">
              <span>MOVE / EXPERIMENTAL MOTION LABORATORY</span>
              <span>
                {game.researched.length} DISCOVERIES · {NODES.length}{" "}
                POSSIBILITIES <i>↗</i>
              </span>
            </footer>
          )}
        </main>
      </div>
      {resetOpen && (
        <div className="modal-backdrop">
          <section
            className="reset-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <span className="eyebrow">A CLEAN SLATE</span>
            <h2 id="reset-title">Reset the entire laboratory?</h2>
            <p>
              This removes every discovery, currency, level and expedition
              record in this browser. You will start again with a fresh runner.
            </p>
            <div>
              <button
                className="secondary"
                autoFocus
                onClick={() => setResetOpen(false)}
              >
                Keep my progress
              </button>
              <button className="danger" onClick={reset}>
                Reset everything
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
