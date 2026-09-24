import Story, { nextStory } from "./lab/Story";
import { useEffect, useRef, useState } from "react";
import { PROGRAMS, type Program } from "./lab/research";
import {
  fresh,
  restore,
  SAVE_KEY,
  step,
  selectProgram,
  totalTrials,
  type Save,
} from "./lab/game";
import Research from "./lab/ResearchPanel";
import Records from "./lab/Records";
import Expedition from "./lab/Expedition";
import Equipment from "./lab/EquipmentPanel";
import "./App.css";
import "./atlas.css";
function read() {
  try {
    return restore(localStorage.getItem(SAVE_KEY));
  } catch {
    return fresh();
  }
}
type Tab = "field" | "research" | "equipment" | "journal" | "settings";
export default function App() {
  const [game, setGame] = useState<Save>(read);
  const [tab, setTab] = useState<Tab>("field");
  const [saveError, setSaveError] = useState(false),
    [resetOpen, setResetOpen] = useState(false);
  const live = useRef(game),
    lastRuns = useRef(totalTrials(game)),
    dialog = useRef<HTMLDialogElement>(null);
  live.current = game;
  const story = nextStory(game, tab);
  const paused = useRef(false);
  paused.current = !!story || resetOpen;
  useEffect(() => {
    let last = performance.now();
    const tick = setInterval(() => {
      const now = performance.now(),
        dt = (now - last) / 1000;
      last = now;
      if (!document.hidden && !paused.current) setGame((s) => step(s, dt));
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
    const runs = totalTrials(game);
    if (runs > lastRuns.current) setTab("research");
    lastRuns.current = runs;
  }, [game.progress]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);
  useEffect(() => {
    if (resetOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [resetOpen]);
  const experienced = totalTrials(game) > 0;

  function reset() {
    const s = fresh();
    live.current = s;
    lastRuns.current = 0;
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
  const nav: [Tab, string][] = [
    ["field", "Run"],
    ...(experienced ? [["research", "Research"] as [Tab, string]] : []),
    ...(game.inventory.length
      ? [["equipment", "Equipment"] as [Tab, string]]
      : []),
    ...(totalTrials(game) >= 3
      ? [["journal", "Journal"] as [Tab, string]]
      : []),
  ];
  return (
    <div
      className={
        "app " +
        (tab === "field" ? "run-app" : tab === "research" ? "atlas-app" : "")
      }
    >
      <header className="app-header">
        <button
          className="wordmark"
          aria-label="MOVE home"
          onClick={() => setTab("field")}
        >
          MOVE<span>motion laboratory</span>
        </button>
        <nav aria-label="Main navigation">
          {nav.map(([id, label]) => (
            <button
              key={id}
              aria-current={tab === id ? "page" : undefined}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
              {id === "equipment" && game.lastDrop && <i className="new-dot" />}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          {experienced && (
            <span className="wallet">
              <span>RESEARCH</span>
              <b>
                {Math.floor(game.science).toLocaleString("en")} <em>RP</em>
              </b>
            </span>
          )}
          <button
            className={
              "settings-button " + (tab === "settings" ? "active" : "")
            }
            onClick={() => setTab("settings")}
            aria-label="Settings"
          >
            •••
          </button>
        </div>
      </header>
      {game.unlocked.length > 1 && (
        <div className="program-strip" aria-label="Research programs">
          {game.unlocked.map((p: Program) => (
            <button
              key={p}
              className={p === game.program ? "active" : ""}
              disabled={!!game.trial && p !== game.program}
              onClick={() => setGame((s) => selectProgram(s, p))}
            >
              {PROGRAMS[p].short}
            </button>
          ))}
        </div>
      )}
      <main>
        {tab === "field" && (
          <Expedition
            game={game}
            setGame={setGame}
            onResearch={() => setTab("research")}
            onEquipment={() => setTab("equipment")}
          />
        )}
        {tab === "research" && (
          <Research
            key={game.program}
            game={game}
            setGame={setGame}
            onRun={() => setTab("field")}
          />
        )}
        {tab === "equipment" && <Equipment game={game} setGame={setGame} />}
        {tab === "journal" && (
          <Records
            game={game}
            setGame={setGame}
            guide={false}
            onField={() => setTab("field")}
            onReset={() => setResetOpen(true)}
          />
        )}
        {tab === "settings" && (
          <>
            <button
              className="secondary replay-story"
              onClick={() =>
                setGame((s) => ({ ...s, tipsEnabled: true, storySeen: [] }))
              }
            >
              Replay SANIK story & tips
            </button>
            <Records
              game={game}
              setGame={setGame}
              guide
              onField={() => setTab("field")}
              onReset={() => setResetOpen(true)}
            />
          </>
        )}
        {saveError && (
          <p className="inline-note" role="alert">
            Saving is unavailable. Export a backup in Settings before leaving.
          </p>
        )}
      </main>
      {story && (
        <Story
          key={story}
          id={story}
          onDone={() =>
            setGame((s) => ({ ...s, storySeen: [...s.storySeen, story] }))
          }
          onSkip={() =>
            setGame((s) => ({
              ...s,
              tipsEnabled: false,
              storySeen: [...s.storySeen, story],
            }))
          }
        />
      )}
      <dialog
        ref={dialog}
        className="reset-dialog"
        onCancel={() => setResetOpen(false)}
      >
        <h2>Start from scratch?</h2>
        <p>
          Reset all research, equipment, levels and run records in this browser.
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
      </dialog>
    </div>
  );
}
