import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite } from 'pixi.js';
import type { GameObjectDef } from '../data/types';
import {
  rideStep,
  initRideState,
  isFinished,
  DT,
  type RideStats,
  type RideState,
  type RidePolicy,
} from '../sim/ride';
import { resolveArt, type AllocatedSet } from './tree';

const PPU = 20; // pixels per simulation metre — tuned so motion reads as fast
const GROUND_FROM_BOTTOM = 96;
const CAMERA_LEFT_FRAC = 0.24;
const STEP_MS = 1000 * DT;

export interface StageHandle {
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

interface WalkerRig {
  root: Container; // moved in x for the camera; bobs in y
  legFront: Graphics;
  legBack: Graphics;
  armFront: Graphics;
}

export const PixiStage = forwardRef<StageHandle, Props>(function PixiStage(
  { object, allocated },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const bgRef = useRef<Container | null>(null);
  const fgRef = useRef<Container | null>(null); // character host (walker or layers)
  const walkerRef = useRef<WalkerRig | null>(null);
  const speedLinesRef = useRef<Graphics | null>(null);
  const phaseRef = useRef(0);

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
        background: '#cdeafe',
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
      drawCrowd(world, app);

      const fg = new Container();
      world.addChild(fg);
      fgRef.current = fg;

      const lines = new Graphics();
      app.stage.addChild(lines);
      speedLinesRef.current = lines;

      await buildCharacter();
      placeAtStart();

      app.ticker.add((t) => tick(t.deltaMS));
    })();

    return () => {
      destroyed = true;
      appRef.current = null;
      worldRef.current = null;
      bgRef.current = null;
      fgRef.current = null;
      walkerRef.current = null;
      speedLinesRef.current = null;
      runRef.current = null;
      app.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    buildCharacter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocated, object]);

  function groundY(app: Application): number {
    return app.screen.height - GROUND_FROM_BOTTOM;
  }

  function drawBackground(bg: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    for (let i = -2; i < 60; i++) {
      const cx = i * 360;
      g.ellipse(cx, gy + 40, 280, 170).fill(i % 2 ? '#a7d98a' : '#93cc74');
    }
    bg.addChild(g);
  }

  function drawGround(world: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    g.rect(-600, gy, 600000, app.screen.height).fill('#6b4f2a'); // dirt field
    g.rect(-600, gy, 600000, 7).fill('#866137');
    // Rough-ground detail: tufts + clods every couple of metres so motion reads.
    for (let u = 0; u <= 200000; u += 2) {
      const x = u * PPU;
      const seed = (u * 928371) % 97;
      if (seed % 3 === 0) g.rect(x, gy + 12 + (seed % 7), 4, 4).fill('#5a4222');
      if (seed % 5 === 0)
        g.ellipse(x, gy + 4, 6, 3).fill(seed % 2 ? '#4e7a3a' : '#3f6e29'); // grass tuft
    }
    world.addChildAt(g, 0);
  }

  // Cheering colleagues at the start line.
  function drawCrowd(world: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    const colors = ['#e57373', '#64b5f6', '#fff', '#ffd54f', '#81c784', '#ba68c8'];
    for (let i = 0; i < 7; i++) {
      const x = -150 - i * 26 - (i % 2) * 6;
      const c = colors[i % colors.length];
      g.roundRect(x - 7, gy - 34, 14, 26, 5).fill(c); // body
      g.circle(x, gy - 40, 7).fill('#f1c27d'); // head
      g.rect(x - 1, gy - 58, 2, 16).fill('#777'); // raised arm/banner pole
      g.roundRect(x - 1, gy - 60, 12, 8, 2).fill('#ffeb3b'); // little flag
    }
    g.label = 'crowd';
    world.addChild(g);
  }

  async function buildCharacter() {
    const fg = fgRef.current;
    if (!fg) return;
    const { object: obj, allocated: alloc } = latest.current;
    fg.removeChildren();
    walkerRef.current = null;

    if (obj.renderKind === 'walker') {
      walkerRef.current = buildWalker(fg);
      return;
    }

    // 'layers' renderer (future vehicles): layered SVG composition.
    const layers = resolveArt(obj, alloc);
    const urls = layers.map((l) => l.svg);
    if (urls.length === 0) return;
    const textures = await Assets.load(urls);
    if (!fgRef.current) return;
    for (const layer of layers) {
      const sprite = new Sprite(textures[layer.svg]);
      sprite.anchor.set(0.5, 0.9);
      sprite.scale.set(0.7);
      fg.addChild(sprite);
    }
  }

  // Procedural scientist: lab coat, glasses, swinging limbs. Origin at the
  // feet so the camera tracks a stable ground point.
  function buildWalker(fg: Container): WalkerRig {
    const root = new Container();
    fg.addChild(root);

    const legBack = new Graphics();
    legBack.roundRect(-4, 0, 8, 46, 4).fill('#34495e');
    legBack.roundRect(-5, 42, 14, 7, 3).fill('#2c3e50'); // shoe
    legBack.position.set(0, -46);
    root.addChild(legBack);

    const body = new Graphics();
    // lab coat
    body.roundRect(-14, -52, 28, 56, 7).fill('#f7fafc');
    body.rect(-2, -50, 4, 50).fill('#e2e8f0'); // coat seam
    // neck + head
    body.rect(-4, -60, 8, 10).fill('#f1c27d');
    body.circle(0, -70, 11).fill('#f1c27d');
    body.roundRect(-12, -78, 24, 8, 4).fill('#5b4636'); // hair
    body.rect(-9, -71, 18, 3).fill('#222'); // glasses bar
    body.circle(-5, -70, 4).fill('#cfe9ff').stroke({ color: '#222', width: 1.5 });
    body.circle(5, -70, 4).fill('#cfe9ff').stroke({ color: '#222', width: 1.5 });
    body.position.set(0, -46);
    root.addChild(body);

    const armFront = new Graphics();
    armFront.roundRect(-3.5, 0, 7, 34, 3.5).fill('#edf2f7');
    armFront.position.set(2, -88);
    root.addChild(armFront);

    const legFront = new Graphics();
    legFront.roundRect(-4, 0, 8, 46, 4).fill('#3d566e');
    legFront.roundRect(-5, 42, 15, 7, 3).fill('#34495e'); // shoe
    legFront.position.set(0, -46);
    root.addChild(legFront);

    return { root, legFront, legBack, armFront };
  }

  function placeAtStart() {
    const app = appRef.current;
    const world = worldRef.current;
    const fg = fgRef.current;
    if (!app || !world || !fg) return;
    fg.x = 0;
    fg.y = groundY(app);
    world.x = app.screen.width * CAMERA_LEFT_FRAC;
    world.y = 0;
    if (bgRef.current) bgRef.current.x = world.x * 0.45;
    phaseRef.current = 0;
    if (speedLinesRef.current) speedLinesRef.current.clear();
  }

  function tick(deltaMS: number) {
    const app = appRef.current;
    const world = worldRef.current;
    const fg = fgRef.current;
    const run = runRef.current;
    if (!app || !world || !fg) return;

    let state: RideState | null = run ? run.state : null;

    if (run) {
      run.acc += Math.min(deltaMS, 250);
      let finished = false;
      while (run.acc >= STEP_MS) {
        run.state = rideStep(run.state, run.stats, run.policy(run.state, run.stats), DT);
        run.acc -= STEP_MS;
        if (isFinished(run.state)) {
          finished = true;
          break;
        }
      }
      state = run.state;

      const screenX = run.state.x * PPU;
      fg.x = screenX;
      world.x = app.screen.width * CAMERA_LEFT_FRAC - screenX;
      if (bgRef.current) bgRef.current.x = world.x * 0.45;

      run.onTick(run.state, run.stats);

      if (finished) {
        const final = run.state;
        const stats = run.stats;
        const done = run.onComplete;
        runRef.current = null;
        done(final, stats);
      }
    }

    animateCharacter(app, fg, state, deltaMS);
    drawSpeedLines(app, state);
  }

  function animateCharacter(
    app: Application,
    fg: Container,
    state: RideState | null,
    deltaMS: number,
  ) {
    const rig = walkerRef.current;
    const v = state ? state.v : 0;
    const strideRate = 2.2 + v * 0.95;
    phaseRef.current += strideRate * (deltaMS / 1000);
    const ph = phaseRef.current;
    const swing = Math.min(0.85, 0.28 + v * 0.06);

    if (rig) {
      rig.legFront.rotation = Math.sin(ph) * swing;
      rig.legBack.rotation = Math.sin(ph + Math.PI) * swing;
      rig.armFront.rotation = Math.sin(ph + Math.PI) * swing * 0.8;
      // Bob twice per stride; lean forward slightly with speed.
      fg.y = groundY(app) - Math.abs(Math.sin(ph)) * (2 + v * 0.25);
      rig.root.rotation = -Math.min(0.12, v * 0.012);
    } else {
      fg.y = groundY(app);
    }
  }

  function drawSpeedLines(app: Application, state: RideState | null) {
    const g = speedLinesRef.current;
    if (!g) return;
    g.clear();
    const v = state ? state.v : 0;
    if (v < 4) return;
    const n = Math.min(10, Math.floor(v));
    const alpha = Math.min(0.5, (v - 4) / 16);
    for (let i = 0; i < n; i++) {
      const y = (i * 53 + ((Date.now() / 2) % 53)) % app.screen.height;
      const len = 30 + (i % 4) * 22;
      const x = (app.screen.width - ((Date.now() / 3 + i * 90) % (app.screen.width + 120))) ;
      g.rect(x, y, len, 2).fill({ color: '#ffffff', alpha });
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
