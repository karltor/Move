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
import { CURRENCIES, type RunMetrics } from './data/currencies';
import { Hud } from './ui/Hud';
import { RideBars } from './ui/RideBars';
import { SkillTree } from './ui/SkillTree';
import { WelcomeBack } from './ui/WelcomeBack';
import { Intro } from './ui/Intro';
import type { CurrencyId } from './data/types';
import './App.css';

export default function App() {
  const objectId = useGameStore((s) => s.objectId);
  const wallet = useGameStore((s) => s.wallet);
  const allocated = useGameStore((s) => s.allocated);
  const bestDistance = useGameStore((s) => s.bestDistance);
  const runCount = useGameStore((s) => s.runCount);
  const autoRun = useGameStore((s) => s.autoRun);
  const pendingOffline = useGameStore((s) => s.pendingOffline);
  const introSeen = useGameStore((s) => s.introSeen);
  const addRunRewards = useGameStore((s) => s.addRunRewards);
  const allocate = useGameStore((s) => s.allocate);
  const respec = useGameStore((s) => s.respec);
  const setAutoRun = useGameStore((s) => s.setAutoRun);
  const claimOffline = useGameStore((s) => s.claimOffline);
  const touchActive = useGameStore((s) => s.touchActive);
  const setIntroSeen = useGameStore((s) => s.setIntroSeen);

  const object = getObject(objectId);
  const stats = useMemo(() => aggregateStats(object, allocated), [object, allocated]);

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
  const [toast, setToast] = useState<{
    awards: Record<CurrencyId, number>;
    mult: number;
    key: number;
  } | null>(null);

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
      const runStats: RideStats = aggregateStats(getObject(st.objectId), st.allocated);
      runningRef.current = true;
      setRunning(true);
      setLive(null);
      activeTicks.current = 0;
      totalTicks.current = 0;
      stage.startRun(runStats, policy, {
        onTick,
        onComplete: (final, finalStats) => {
          const metrics: RunMetrics = metricsFor(finalStats, final);
          const activeFrac = totalTicks.current
            ? activeTicks.current / totalTicks.current
            : 0;
          const mult = 1 + Math.min(1, activeFrac) * 1.5;
          const awards = addRunRewards(metrics, mult);
          setLive(final);
          setToast({ awards, mult, key: Date.now() });
          if (autoRunRef.current) {
            window.setTimeout(() => beginRun(loopPolicy), 600);
          } else {
            runningRef.current = false;
            setRunning(false);
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
    if (on && !runningRef.current) beginRun(loopPolicy);
  }, [beginRun, loopPolicy, setAutoRun]);

  // Resume a persisted auto-run loop once the stage is ready (after intro).
  useEffect(() => {
    if (!introSeen) return;
    const id = window.setTimeout(() => {
      if (autoRunRef.current && !runningRef.current) beginRun(loopPolicy);
    }, 300);
    return () => window.clearTimeout(id);
  }, [beginRun, loopPolicy, introSeen]);

  // Hold-to-run input (pointer on the stage + Space). Ignored while a modal is
  // open so the player can read/click upgrades without triggering a run.
  useEffect(() => {
    const blocked = () => treeOpen || !introSeen || !!pendingOffline;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || blocked()) return;
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
  }, [beginRun, manualPolicy, treeOpen, introSeen, pendingOffline]);

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
  const canRunInput = introSeen && !treeOpen && !pendingOffline;

  return (
    <div className="app">
      <div className="stage-col">
        <Hud
          wallet={wallet}
          bestDistance={bestDistance}
          runCount={runCount}
          liveDistance={liveDistance}
        />

        <div
          className="stage-wrap"
          onPointerDown={() => {
            if (!canRunInput) return;
            heldRef.current = true;
            if (!runningRef.current && !autoRunRef.current) beginRun(manualPolicy);
          }}
          onPointerUp={() => (heldRef.current = false)}
          onPointerLeave={() => (heldRef.current = false)}
        >
          <PixiStage ref={stageRef} object={object} allocated={allocated} />
          <RideBars state={live} stats={stats} running={running} />
          {!running && (
            <div className="stage-hint">Hold to run · ease off to refill stamina</div>
          )}
          {toast && (
            <div className="reward-toast" key={toast.key}>
              {toast.mult > 1.05 && (
                <span className="reward-mult">Active ×{toast.mult.toFixed(1)}</span>
              )}
              {CURRENCIES.filter((c) => (toast.awards[c.id] ?? 0) > 0).map((c) => (
                <span key={c.id} style={{ color: c.color }}>
                  {c.symbol} +{toast.awards[c.id]}
                </span>
              ))}
            </div>
          )}
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
          <button className="lab-btn" onClick={() => setTreeOpen(true)}>
            🔬 Upgrades
          </button>
          <label className="autorun-toggle">
            <input type="checkbox" checked={autoRun} onChange={toggleAutoRun} />
            <span>Auto-run</span>
          </label>
        </div>
      </div>

      {treeOpen && (
        <div className="modal-backdrop tree-backdrop" onClick={() => setTreeOpen(false)}>
          <div className="tree-modal" onClick={(e) => e.stopPropagation()}>
            <SkillTree
              object={object}
              allocated={allocated}
              wallet={wallet}
              onAllocate={allocate}
              onRespec={respec}
              onClose={() => setTreeOpen(false)}
            />
          </div>
        </div>
      )}

      {!introSeen && <Intro onDone={setIntroSeen} />}
      {introSeen && pendingOffline && (
        <WelcomeBack report={pendingOffline} onClaim={claimOffline} />
      )}
    </div>
  );
}
