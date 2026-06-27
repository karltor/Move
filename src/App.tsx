import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getObject } from './data';
import { useGameStore } from './store/gameStore';
import { aggregateStats } from './game/tree';
import {
  autoPilot,
  metricsFor,
  type RideState,
  type RideStats,
  type RidePolicy,
} from './sim/ride';
import { PixiStage, type StageHandle } from './game/PixiStage';
import type { RunMetrics } from './data/currencies';
import type { CurrencyId } from './data/types';
import { pickWeather, applyWeather, type Weather } from './data/weather';
import { CONFIG } from './config';
import { Hud } from './ui/Hud';
import { RideBars } from './ui/RideBars';
import { TechTree } from './ui/TechTree';
import { Results } from './ui/Results';
import { WelcomeBack } from './ui/WelcomeBack';
import { WeatherChip } from './ui/WeatherChip';
import { Intro } from './ui/Intro';
import './App.css';

interface ResultState {
  metrics: RunMetrics;
  awards: Record<CurrencyId, number>;
  mult: number;
}

export default function App() {
  const objectId = useGameStore((s) => s.objectId);
  const wallet = useGameStore((s) => s.wallet);
  const ranks = useGameStore((s) => s.ranks);
  const bestDistance = useGameStore((s) => s.bestDistance);
  const runCount = useGameStore((s) => s.runCount);
  const autoRun = useGameStore((s) => s.autoRun);
  const pendingOffline = useGameStore((s) => s.pendingOffline);
  const introSeen = useGameStore((s) => s.introSeen);
  const addRunRewards = useGameStore((s) => s.addRunRewards);
  const buyRank = useGameStore((s) => s.buyRank);
  const resetTree = useGameStore((s) => s.resetTree);
  const setAutoRun = useGameStore((s) => s.setAutoRun);
  const claimOffline = useGameStore((s) => s.claimOffline);
  const touchActive = useGameStore((s) => s.touchActive);
  const setIntroSeen = useGameStore((s) => s.setIntroSeen);

  const object = getObject(objectId);
  const stats = useMemo(() => aggregateStats(object, ranks), [object, ranks]);

  const stageRef = useRef<StageHandle>(null);
  const heldRef = useRef(false);
  const runningRef = useRef(false);
  const autoRunRef = useRef(autoRun);
  autoRunRef.current = autoRun;
  const tickCount = useRef(0);
  const activeTicks = useRef(0);
  const totalTicks = useRef(0);

  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<RideState | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [results, setResults] = useState<ResultState | null>(null);
  const [weather, setWeather] = useState<Weather>(() => pickWeather());

  const loopPolicy = useRef<RidePolicy>((s, st) => heldRef.current || autoPilot(s, st)).current;
  const manualPolicy = useRef<RidePolicy>(() => heldRef.current).current;

  const onTick = useCallback((s: RideState) => {
    totalTicks.current++;
    if (heldRef.current) activeTicks.current++;
    if (tickCount.current++ % 3 === 0) setLive(s);
  }, []);

  const beginRun = useCallback(
    (policy: RidePolicy) => {
      const stage = stageRef.current;
      if (!stage) return;
      const st = useGameStore.getState();
      const baseRunStats = aggregateStats(getObject(st.objectId), st.ranks);
      const w = pickWeather();
      setWeather(w);
      const runStats: RideStats = applyWeather(baseRunStats, w, baseRunStats.weatherResist);
      runningRef.current = true;
      setRunning(true);
      setLive(null);
      setResults(null);
      activeTicks.current = 0;
      totalTicks.current = 0;
      stage.startRun(runStats, policy, {
        onTick,
        onComplete: (final, finalStats) => {
          const metrics: RunMetrics = metricsFor(finalStats, final);
          const activeFrac = totalTicks.current ? activeTicks.current / totalTicks.current : 0;
          const mult = 1 + Math.min(1, activeFrac) * CONFIG.economy.activeBonusMax;
          const awards = addRunRewards(metrics, mult);
          setLive(final);
          if (autoRunRef.current) {
            window.setTimeout(() => beginRun(loopPolicy), 600);
          } else {
            runningRef.current = false;
            setRunning(false);
            setResults({ metrics, awards, mult });
          }
        },
      });
    },
    [addRunRewards, onTick, loopPolicy],
  );

  const handleManualRun = useCallback(() => {
    if (runningRef.current) return;
    beginRun(manualPolicy);
  }, [beginRun, manualPolicy]);

  const toggleAutoRun = useCallback(() => {
    const on = !autoRunRef.current;
    setAutoRun(on);
    autoRunRef.current = on;
    if (on) {
      setResults(null);
      if (!runningRef.current) beginRun(loopPolicy);
    }
  }, [beginRun, loopPolicy, setAutoRun]);

  useEffect(() => {
    if (!introSeen) return;
    const id = window.setTimeout(() => {
      if (autoRunRef.current && !runningRef.current) beginRun(loopPolicy);
    }, 300);
    return () => window.clearTimeout(id);
  }, [beginRun, loopPolicy, introSeen]);

  const blockedRef = useRef(false);
  blockedRef.current = treeOpen || !introSeen || !!pendingOffline || !!results;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || blockedRef.current) return;
      e.preventDefault();
      heldRef.current = true;
      if (!runningRef.current && !autoRunRef.current) beginRun(manualPolicy);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') heldRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [beginRun, manualPolicy]);

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

  const liveDistance = live ? live.x : 0;

  return (
    <div className="app">
      <div className="stage-col">
        <Hud wallet={wallet} bestDistance={bestDistance} runCount={runCount} liveDistance={liveDistance} />

        <div
          className="stage-wrap"
          onPointerDown={() => {
            if (blockedRef.current) return;
            heldRef.current = true;
            if (!runningRef.current && !autoRunRef.current) beginRun(manualPolicy);
          }}
          onPointerUp={() => (heldRef.current = false)}
          onPointerLeave={() => (heldRef.current = false)}
        >
          <PixiStage ref={stageRef} object={object} ranks={ranks} />
          <RideBars state={live} stats={stats} running={running} />
          <WeatherChip weather={weather} resist={stats.weatherResist} />
          {!running && !results && <div className="stage-hint">{CONFIG.texts.runHint}</div>}
        </div>

        <div className="launch-bar">
          <button
            className="launch-btn"
            disabled={running || autoRun}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleManualRun}
          >
            {running ? 'Running…' : '🏃 Run! (hold Space)'}
          </button>
          <button className="lab-btn" onClick={() => setTreeOpen(true)}>🔬 Upgrades</button>
          <label className="autorun-toggle">
            <input type="checkbox" checked={autoRun} onChange={toggleAutoRun} />
            <span>Auto-run</span>
          </label>
        </div>
      </div>

      {treeOpen && (
        <div className="modal-backdrop tree-backdrop" onClick={() => setTreeOpen(false)}>
          <div className="tt-modal" onClick={(e) => e.stopPropagation()}>
            <TechTree
              object={object}
              wallet={wallet}
              ranks={ranks}
              onBuy={buyRank}
              onReset={resetTree}
              onClose={() => setTreeOpen(false)}
            />
          </div>
        </div>
      )}

      {results && !treeOpen && (
        <Results
          metrics={results.metrics}
          awards={results.awards}
          mult={results.mult}
          onContinue={() => setResults(null)}
          onUpgrades={() => {
            setResults(null);
            setTreeOpen(true);
          }}
        />
      )}

      {!introSeen && <Intro onDone={setIntroSeen} />}
      {introSeen && pendingOffline && <WelcomeBack report={pendingOffline} onClaim={claimOffline} />}
    </div>
  );
}
