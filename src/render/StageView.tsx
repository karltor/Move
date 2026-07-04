import { useEffect, useRef } from 'react';
import type { RunEngine } from '../game/engine';
import type { Cosmetics } from '../game/tree';
import { Stage } from './stage';

/** Thin React mount for the Pixi stage. All rendering lives in `stage.ts`. */
export function StageView({ engine, cosmetics }: { engine: RunEngine; cosmetics: Cosmetics }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const cosmeticsRef = useRef(cosmetics);
  cosmeticsRef.current = cosmetics;

  useEffect(() => {
    const stage = new Stage(engine, hostRef.current!, cosmeticsRef.current);
    stageRef.current = stage;
    stage.init();
    return () => {
      stageRef.current = null;
      stage.destroy();
    };
  }, [engine]);

  useEffect(() => {
    stageRef.current?.setCosmetics(cosmetics);
  }, [cosmetics]);

  return <div ref={hostRef} className="stage-host" />;
}
