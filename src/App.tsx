import { useCallback, useRef, useState } from 'react';
import { getObject } from './data';
import { useGameStore } from './store/gameStore';
import { aggregateStats } from './game/stats';
import { simulateLaunch } from './sim/simulateLaunch';
import { PixiStage, type StageHandle } from './game/PixiStage';
import { Hud } from './ui/Hud';
import { UpgradeMenu } from './ui/UpgradeMenu';
import './App.css';

export default function App() {
  const objectId = useGameStore((s) => s.objectId);
  const coins = useGameStore((s) => s.coins);
  const bestDistance = useGameStore((s) => s.bestDistance);
  const runCount = useGameStore((s) => s.runCount);
  const equipped = useGameStore((s) => s.equipped);
  const addCoins = useGameStore((s) => s.addCoins);
  const recordRun = useGameStore((s) => s.recordRun);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);

  const object = getObject(objectId);

  const stageRef = useRef<StageHandle>(null);
  const [launching, setLaunching] = useState(false);
  const [liveDistance, setLiveDistance] = useState(0);

  const handleLaunch = useCallback(() => {
    if (launching || !stageRef.current) return;
    const stats = aggregateStats(object, equipped);
    const { trajectory } = simulateLaunch(stats);
    setLaunching(true);
    setLiveDistance(0);
    stageRef.current.launch(
      trajectory,
      (d) => setLiveDistance(d),
      (finalDistance) => {
        const dist = Math.floor(finalDistance);
        recordRun(dist);
        addCoins(dist); // coins = floor(distance)
        setLiveDistance(finalDistance);
        setLaunching(false);
      },
    );
  }, [launching, object, equipped, recordRun, addCoins]);

  return (
    <div className="app">
      <div className="stage-col">
        <Hud
          coins={coins}
          bestDistance={bestDistance}
          runCount={runCount}
          liveDistance={liveDistance}
        />
        <div className="stage-wrap">
          <PixiStage ref={stageRef} object={object} equipped={equipped} />
        </div>
        <div className="launch-bar">
          <button className="launch-btn" disabled={launching} onClick={handleLaunch}>
            {launching ? 'Launching…' : runCount === 0 ? '🚀 Launch!' : '🚀 Relaunch'}
          </button>
        </div>
      </div>

      <UpgradeMenu
        object={object}
        equipped={equipped}
        coins={coins}
        disabled={launching}
        onBuy={(slotId) => buyUpgrade(slotId)}
      />
    </div>
  );
}
