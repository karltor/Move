import Story, { initializeSkillGuides, nextStory, storySimulationRate } from "./lab/Story";
import { useEffect, useRef, useState } from "react";
import {
  fresh,
  restore,
  SAVE_KEY,
  step,
  totalTrials,
  equipmentUnlocked,
  type Save,
} from "./lab/game";
import Research from "./lab/ResearchPanel";
import Records from "./lab/Records";
import Expedition from "./lab/Expedition";
import Equipment from "./lab/EquipmentPanel";
import FundingPanel, { type FundingDestination } from "./lab/FundingPanel";
import FundingModal from "./lab/FundingModal";
import "./App.css";
import "./atlas.css";
import "./lab/expedition-feedback.css";
import "./lab/story-look.css";
import "./lab/funding.css";
function read() {
  try {
    return initializeSkillGuides(restore(localStorage.getItem(SAVE_KEY)));
  } catch {
    return initializeSkillGuides(fresh());
  }
}
type Tab = "field" | "research" | "equipment" | "funding" | "development" | "journal" | "settings";
export default function App() {
  const [game, setGame] = useState<Save>(read);
  const [tab, setTab] = useState<Tab>("field");
  const [saveError, setSaveError] = useState(false),
    [resetOpen, setResetOpen] = useState(false);
  const [fundingOpen, setFundingOpen] = useState(() => game.debriefPending && !game.auto);
  const live = useRef(game),
    lastRuns = useRef(totalTrials(game)),
    dialog = useRef<HTMLDialogElement>(null);
  live.current = game;
  const story = nextStory(game, tab);
  const paused = useRef(false);
  const simulationRate = useRef(1);
  paused.current = resetOpen;
  simulationRate.current = storySimulationRate(story);
  useEffect(() => {
    let last = performance.now();
    const tick = setInterval(() => {
      const now = performance.now(),
        dt = (now - last) / 1000;
      last = now;
      if (!document.hidden && !paused.current) setGame((s) => step(s, dt * simulationRate.current));
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
    if (runs > lastRuns.current && game.debriefPending && !game.auto) {
      setTab("funding");
      setFundingOpen(true);
    }
    lastRuns.current = runs;
  }, [game.progress, game.auto, game.debriefPending]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [tab]);
  useEffect(() => {
    if (resetOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [resetOpen]);
  const experienced = totalTrials(game) > 0;
  const hasFunding = experienced || game.science > 0 || game.talentPoints > 0 || game.vouchers > 0;

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
    setFundingOpen(false);
    setTab("field");
  }
  const nav: [Tab, string][] = [
    ["field", game.unlocked.length > 1 ? "Experiment" : "Run"],
    ...(hasFunding ? [["funding", "Funding"] as [Tab, string]] : []),
    ...(experienced || game.talentPoints > 0 ? [["research", "Talents"] as [Tab, string]] : []),
    ...(equipmentUnlocked(game)
      ? [["equipment", "Equipment"] as [Tab, string]]
      : []),
    ...(totalTrials(game) >= 3
      ? [["journal", "Journal"] as [Tab, string]]
      : []),
  ];
  function fundingNavigate(destination: FundingDestination) {
    setFundingOpen(false);
    setGame((s) => ({ ...s, debriefPending: false }));
    setTab(destination);
  }
  function dismissFunding() {
    setFundingOpen(false);
    setGame((s) => ({ ...s, debriefPending: false }));
    setTab("field");
  }
  return (
    <div
      className={
        "app " +
        (tab === "field" ? "run-app" : tab === "research" ? "atlas-app" : tab === "funding" || tab === "development" ? "funding-app" : tab === "settings" ? "settings-app" : "")
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
              aria-current={tab === id || (id === "funding" && tab === "development") ? "page" : undefined}
              className={tab === id || (id === "funding" && tab === "development") ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
              {id === "equipment" && game.lastDrop && <i className="new-dot" />}
            </button>
          ))}
        </nav>
        <div className="header-tools">
          {hasFunding && (
            <span className="wallet">
              <span>LAB FUNDING</span>
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
      <main>
        {tab === "field" && (
          <Expedition
            game={game}
            setGame={setGame}
            onResearch={() => setTab("funding")}
            onEquipment={() => setTab("equipment")}
            stagingReady={!story && !resetOpen && !fundingOpen}
            timeScale={storySimulationRate(story)}
          />
        )}
        {tab === "research" && (
          <Research
            key={game.program}
            game={game}
            setGame={setGame}
            onRun={() => setTab("field")}
            onFunding={() => setTab("funding")}
          />
        )}
        {tab === "equipment" && <Equipment game={game} setGame={setGame} onFunding={() => setTab("funding")} />}
        {(tab === "funding" || tab === "development") && <FundingPanel game={game} setGame={setGame} onNavigate={fundingNavigate} development={tab === "development"} />}
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
      {fundingOpen && !story && !resetOpen && <FundingModal game={game} setGame={setGame} onNavigate={fundingNavigate} onDismiss={dismissFunding} />}
      {story && (
        <Story
          key={story}
          id={story}
          game={game}
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
          Reset talents, equipment, development projects, currencies and run records in this browser.
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
