import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useGameStore } from './store/gameStore';
import { aggregateStats, resolveCosmetics } from './game/tree';
import { RunEngine, type EndReason, type EngineSnapshot } from './game/engine';
import { StageView } from './render/StageView';
import type { RunMetrics } from './data/currencies';
import type { CurrencyId } from './data/types';
import { CONFIG } from './config';
import { Hud } from './ui/Hud';
import { RideBars } from './ui/RideBars';
import { Lab } from './ui/Lab';
import { Results } from './ui/Results';
import { WelcomeBack } from './ui/WelcomeBack';
import { WeatherChip } from './ui/WeatherChip';
import { Intro } from './ui/Intro';
import './App.css';

interface ResultState {
  metrics: RunMetrics;
  awards: Record<CurrencyId, number>;
  mult: number;
  reason: EndReason;
}

const NULL_SNAPSHOT: EngineSnapshot = {
  phase: 'idle',
  ride: null,
  stats: null,
  weather: null,
  autoRun: false,
  collapseT: 0,
  lastEnd: null,
};
const noopSubscribe = () => () => {};
const nullSnapshot = () => NULL_SNAPSHOT;

export default function App() {
  const wallet = useGameStore((s) => s.wallet);
  const ranks = useGameStore((s) => s.ranks);
  const equipped = useGameStore((s) => s.equipped);
  const bestDistance = useGameStore((s) => s.bestDistance);
  const runCount = useGameStore((s) => s.runCount);
  const autoRun = useGameStore((s) => s.autoRun);
  const pendingOffline = useGameStore((s) => s.pendingOffline);
  const introSeen = useGameStore((s) => s.introSeen);
  const unlockNode = useGameStore((s) => s.unlockNode);
  const upgradeNode = useGameStore((s) => s.upgradeNode);
  const equipNode = useGameStore((s) => s.equipNode);
  const unequipNode = useGameStore((s) => s.unequipNode);
  const resetTree = useGameStore((s) => s.resetTree);
  const setAutoRun = useGameStore((s) => s.setAutoRun);
  const claimOffline = useGameStore((s) => s.claimOffline);
  const touchActive = useGameStore((s) => s.touchActive);
  const setIntroSeen = useGameStore((s) => s.setIntroSeen);

  const stats = useMemo(() => aggregateStats(ranks, equipped), [ranks, equipped]);
  const cosmetics = useMemo(() => resolveCosmetics(ranks, equipped), [ranks, equipped]);

  const [engine, setEngine] = useState<RunEngine | null>(null);
  const [labOpen, setLabOpen] = useState(false);
  const [results, setResults] = useState<ResultState | null>(null);

  // The engine outlives renders and owns the run loop; React only feeds it
  // input and reads snapshots.
  useEffect(() => {
    const eng = new RunEngine({
      getBaseStats: () => {
        const s = useGameStore.getState();
        return aggregateStats(s.ranks, s.equipped);
      },
      onRunEnd: (info) => {
        const mult = 1 + Math.min(1, info.activeFrac) * CONFIG.economy.activeBonusMax;
        const awards = useGameStore.getState().addRunRewards(info.metrics, mult);
        if (!info.auto) setResults({ metrics: info.metrics, awards, mult, reason: info.reason });
      },
    });
    setEngine(eng);
    return () => eng.destroy();
  }, []);

  const snap = useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    engine ? engine.getSnapshot : nullSnapshot,
  );
  const running = snap.phase !== 'idle';

  // Restore persisted auto-run once the player is actually looking at the game.
  useEffect(() => {
    if (engine && introSeen && !pendingOffline && useGameStore.getState().autoRun) {
      engine.setAutoRun(true);
    }
  }, [engine, introSeen, pendingOffline]);

  const blocked = labOpen || !introSeen || !!pendingOffline;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const resultsOpenRef = useRef(!!results);
  resultsOpenRef.current = !!results;

  useEffect(() => {
    if (!engine) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || blockedRef.current) return;
      e.preventDefault();
      if (resultsOpenRef.current) setResults(null); // Space on results = next run
      engine.setHeld(true);
      engine.startRun();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') engine.setHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [engine]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') touchActive();
    };
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', touchActive);
    return () => {
      window.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', touchActive);
    };
  }, [touchActive]);

  const toggleAutoRun = () => {
    if (!engine) return;
    const on = !autoRun;
    setAutoRun(on);
    if (on) setResults(null);
    engine.setAutoRun(on);
  };

  return (
    <div className="app">
      <div className="stage-col">
        <Hud
          wallet={wallet}
          bestDistance={bestDistance}
          runCount={runCount}
          liveDistance={running ? (snap.ride?.x ?? 0) : 0}
        />

        <div
          className="stage-wrap"
          onPointerDown={() => {
            if (!engine || blocked || results) return;
            engine.setHeld(true);
            engine.startRun();
          }}
          onPointerUp={() => engine?.setHeld(false)}
          onPointerLeave={() => engine?.setHeld(false)}
        >
          {engine && <StageView engine={engine} cosmetics={cosmetics} />}
          <RideBars state={running ? snap.ride : null} stats={snap.stats ?? stats} />
          {running && snap.weather && <WeatherChip weather={snap.weather} resist={stats.weatherResist} />}
          {!running && !results && <div className="stage-hint">{CONFIG.texts.runHint}</div>}
        </div>

        <div className="launch-bar">
          {running && !autoRun ? (
            <button
              className="launch-btn stop"
              disabled={snap.phase === 'collapsing'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => engine?.giveUp()}
            >
              🛑 End run
            </button>
          ) : (
            <button
              className="launch-btn"
              disabled={!engine || running || autoRun || blocked}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => engine?.startRun()}
            >
              {running ? 'Running…' : '🏃 Run! (hold Space)'}
            </button>
          )}
          <button className="lab-open-btn" onClick={() => setLabOpen(true)}>🧪 The Lab</button>
          <label className="autorun-toggle">
            <input type="checkbox" checked={autoRun} onChange={toggleAutoRun} />
            <span>Auto-run</span>
          </label>
        </div>
      </div>

      {labOpen && (
        <Lab
          wallet={wallet}
          ranks={ranks}
          equipped={equipped}
          onUnlock={unlockNode}
          onUpgrade={upgradeNode}
          onEquip={equipNode}
          onUnequip={unequipNode}
          onReset={resetTree}
          onClose={() => setLabOpen(false)}
        />
      )}

      {results && !labOpen && (
        <Results
          metrics={results.metrics}
          awards={results.awards}
          mult={results.mult}
          reason={results.reason}
          onContinue={() => setResults(null)}
          onUpgrades={() => {
            setResults(null);
            setLabOpen(true);
          }}
        />
      )}

      {!introSeen && <Intro onDone={setIntroSeen} />}
      {introSeen && pendingOffline && <WelcomeBack report={pendingOffline} onClaim={claimOffline} />}
    </div>
  );
}
