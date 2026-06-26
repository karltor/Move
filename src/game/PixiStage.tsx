import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import type { GameObjectDef } from '../data/types';
import {
  rideStep,
  initRideState,
  DT,
  type RideStats,
  type RideState,
  type RidePolicy,
} from '../sim/ride';
import { resolveArt, type AllocatedSet } from './tree';

const PPU = 1.3; // pixels per simulation metre
const CYCLIST_SCALE = 0.7;
const GROUND_FROM_BOTTOM = 86;
const CAMERA_LEFT_FRAC = 0.2;
const STEP_MS = 1000 * DT;

export interface StageHandle {
  /** Begin a run with the given stats and pedalling policy. */
  startRun: (
    stats: RideStats,
    policy: RidePolicy,
    handlers: {
      onTick: (state: RideState, stats: RideStats) => void;
      onComplete: (final: RideState, stats: RideStats) => void;
    },
  ) => void;
  stopRun: () => void;
  isRunning: () => boolean;
}

interface Props {
  object: GameObjectDef;
  allocated: AllocatedSet;
}

/**
 * Imperative Pixi layer. Object-agnostic: it renders whatever layered
 * composition the allocated art describes and steps the PURE ride physics in
 * real time, with pedalling decided by whatever policy it's handed.
 */
export const PixiStage = forwardRef<StageHandle, Props>(function PixiStage(
  { object, allocated },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const bgRef = useRef<Container | null>(null);
  const cyclistRef = useRef<Container | null>(null);

  const runRef = useRef<{
    stats: RideStats;
    policy: RidePolicy;
    state: RideState;
    acc: number;
    onTick: (s: RideState, st: RideStats) => void;
    onComplete: (s: RideState, st: RideStats) => void;
  } | null>(null);

  const latest = useRef({ object, allocated });
  latest.current = { object, allocated };

  useEffect(() => {
    let destroyed = false;
    const app = new Application();

    (async () => {
      await app.init({
        background: '#bfe3ff',
        antialias: true,
        resizeTo: hostRef.current ?? undefined,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });
      if (destroyed) {
        app.destroy(true);
        return;
      }
      appRef.current = app;
      hostRef.current?.appendChild(app.canvas);

      const bg = new Container();
      app.stage.addChild(bg);
      bgRef.current = bg;
      drawBackground(bg, app);

      const world = new Container();
      app.stage.addChild(world);
      worldRef.current = world;
      drawGround(world, app);

      const cyclist = new Container();
      world.addChild(cyclist);
      cyclistRef.current = cyclist;

      await rebuildComposition();
      placeAtStart();

      app.ticker.add((t) => tick(t.deltaMS));
    })();

    return () => {
      destroyed = true;
      appRef.current = null;
      worldRef.current = null;
      bgRef.current = null;
      cyclistRef.current = null;
      runRef.current = null;
      app.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rebuildComposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocated, object]);

  function groundY(app: Application): number {
    return app.screen.height - GROUND_FROM_BOTTOM;
  }

  function drawBackground(bg: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    // Rolling hills for parallax depth.
    for (let i = -2; i < 40; i++) {
      const cx = i * 320;
      g.ellipse(cx, gy + 30, 240, 150).fill(i % 2 ? '#9ad27a' : '#86c267');
    }
    bg.addChild(g);
  }

  function drawGround(world: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    g.rect(-400, gy, 400000, app.screen.height).fill('#5a8f3c');
    g.rect(-400, gy, 400000, 6).fill('#3f6e29');
    for (let u = 0; u <= 300000; u += 25) {
      g.rect(u * PPU, gy + 14, 3, 9).fill('#cfe9b8');
    }
    // Start ramp.
    g.moveTo(-70, gy).lineTo(0, gy - 30).lineTo(0, gy).closePath().fill('#8a5a2b');
    world.addChildAt(g, 0);
  }

  async function rebuildComposition() {
    const cyclist = cyclistRef.current;
    if (!cyclist) return;
    const { object: obj, allocated: alloc } = latest.current;
    const layers = resolveArt(obj, alloc);
    const urls = layers.map((l) => l.svg);
    const textures = await Assets.load(urls);
    if (!cyclistRef.current) return;

    cyclist.removeChildren();
    for (const layer of layers) {
      const sprite = new Sprite(textures[layer.svg]);
      sprite.anchor.set(0.5, 0.9);
      sprite.scale.set(CYCLIST_SCALE);
      cyclist.addChild(sprite);
    }
  }

  function placeAtStart() {
    const app = appRef.current;
    const cyclist = cyclistRef.current;
    const world = worldRef.current;
    if (!app || !cyclist || !world) return;
    cyclist.x = 0;
    cyclist.y = groundY(app);
    cyclist.rotation = 0;
    world.x = app.screen.width * CAMERA_LEFT_FRAC;
    world.y = 0;
    if (bgRef.current) bgRef.current.x = world.x * 0.5;
  }

  function tick(deltaMS: number) {
    const app = appRef.current;
    const cyclist = cyclistRef.current;
    const world = worldRef.current;
    const run = runRef.current;
    if (!app || !cyclist || !world) return;
    if (!run) return;

    // Fixed-step integration for stable, policy-consistent physics.
    run.acc += Math.min(deltaMS, 250);
    let finished = false;
    while (run.acc >= STEP_MS) {
      const pedal = run.policy(run.state, run.stats);
      run.state = rideStep(run.state, run.stats, pedal, DT);
      run.acc -= STEP_MS;
      if (run.state.t >= run.stats.runTime) {
        finished = true;
        break;
      }
    }

    const screenX = run.state.x * PPU;
    cyclist.x = screenX;
    // Bob + lean a touch with speed for some juice.
    const speedFrac = run.state.v / Math.max(2, run.stats.topSpeed);
    cyclist.y = groundY(app) - Math.sin(run.state.t * 14) * speedFrac * 3;
    cyclist.rotation = -speedFrac * 0.05;

    world.x = app.screen.width * CAMERA_LEFT_FRAC - screenX;
    if (bgRef.current) bgRef.current.x = world.x * 0.5;

    run.onTick(run.state, run.stats);

    if (finished) {
      const final = run.state;
      const stats = run.stats;
      const done = run.onComplete;
      runRef.current = null;
      done(final, stats);
    }
  }

  useImperativeHandle(ref, () => ({
    startRun: (stats, policy, handlers) => {
      placeAtStart();
      runRef.current = {
        stats,
        policy,
        state: initRideState(stats),
        acc: 0,
        onTick: handlers.onTick,
        onComplete: handlers.onComplete,
      };
    },
    stopRun: () => {
      runRef.current = null;
      placeAtStart();
    },
    isRunning: () => runRef.current !== null,
  }));

  return <div ref={hostRef} className="stage-host" />;
});
