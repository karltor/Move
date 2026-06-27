import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js';
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
import { resolveArt, type Ranks } from './tree';

const PPU = 20; // pixels per simulation metre
const GROUND_FROM_BOTTOM = 96;
const CAMERA_LEFT_FRAC = 0.2;
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
  ranks: Ranks;
}

interface WalkerRig {
  legFront: Container;
  legBack: Container;
  arm: Container;
}

export const PixiStage = forwardRef<StageHandle, Props>(function PixiStage(
  { object, ranks },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const bgRef = useRef<Container | null>(null);
  const fgRef = useRef<Container | null>(null);
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

  const latest = useRef({ object, ranks });
  latest.current = { object, ranks };

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
  }, [ranks, object]);

  function groundY(app: Application): number {
    return app.screen.height - GROUND_FROM_BOTTOM;
  }

  function drawBackground(bg: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    for (let i = -2; i < 80; i++) {
      const cx = i * 360;
      g.ellipse(cx, gy + 40, 280, 170).fill(i % 2 ? '#a7d98a' : '#93cc74');
    }
    bg.addChild(g);
  }

  function drawGround(world: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    g.rect(-600, gy, 600000, app.screen.height).fill('#6b4f2a');
    g.rect(-600, gy, 600000, 7).fill('#866137');
    for (let u = 0; u <= 200000; u += 2) {
      const x = u * PPU;
      const seed = (u * 928371) % 97;
      if (seed % 3 === 0) g.rect(x, gy + 12 + (seed % 7), 4, 4).fill('#5a4222');
      if (seed % 5 === 0) g.ellipse(x, gy + 4, 6, 3).fill(seed % 2 ? '#4e7a3a' : '#3f6e29');
    }
    world.addChildAt(g, 0);
  }

  function drawCrowd(world: Container, app: Application) {
    const g = new Graphics();
    const gy = groundY(app);
    const colors = ['#e57373', '#64b5f6', '#fff', '#ffd54f', '#81c784', '#ba68c8'];
    for (let i = 0; i < 7; i++) {
      const x = -150 - i * 26 - (i % 2) * 6;
      g.roundRect(x - 7, gy - 34, 14, 26, 5).fill(colors[i % colors.length]);
      g.circle(x, gy - 40, 7).fill('#f1c27d');
      g.rect(x - 1, gy - 58, 2, 16).fill('#777');
      g.roundRect(x - 1, gy - 60, 12, 8, 2).fill('#ffeb3b');
    }
    world.addChild(g);
  }

  async function buildCharacter() {
    const fg = fgRef.current;
    if (!fg) return;
    const { object: obj, ranks: rk } = latest.current;
    const layers = resolveArt(obj, rk);
    const urls = [...new Set(layers.map((l) => l.svg))];
    const textures = urls.length ? await Assets.load(urls) : {};
    if (!fgRef.current) return;

    const texFor = (layerId: string): Texture | null => {
      const l = layers.find((x) => x.layer === layerId);
      return l ? textures[l.svg] : null;
    };

    fg.removeChildren();
    walkerRef.current = obj.renderKind === 'walker' ? buildWalker(fg, texFor) : null;
  }

  // Procedural skeleton + equipped SVG skins. Origin at the feet.
  function buildWalker(fg: Container, texFor: (id: string) => Texture | null): WalkerRig {
    const root = new Container();
    fg.addChild(root);

    const shoeTex = texFor('shoe');
    const makeLeg = (color: number, shadeShoe: boolean) => {
      const leg = new Container();
      const shin = new Graphics();
      shin.roundRect(-4, 0, 8, 46, 4).fill(color);
      leg.addChild(shin);
      if (shoeTex) {
        const shoe = new Sprite(shoeTex);
        shoe.anchor.set(0.34, 0.2);
        shoe.position.set(0, 41);
        if (shadeShoe) shoe.tint = 0xdedede;
        leg.addChild(shoe);
      }
      return leg;
    };

    const legBack = makeLeg(0x34495e, true);
    legBack.position.set(-2, -46);
    root.addChild(legBack);

    const backTex = texFor('back');
    if (backTex) {
      const back = new Sprite(backTex);
      back.anchor.set(0.5, 0.5);
      back.position.set(-12, -74);
      root.addChild(back);
    }

    const torsoTex = texFor('torso');
    if (torsoTex) {
      const torso = new Sprite(torsoTex);
      torso.anchor.set(0.5, 0.5);
      torso.position.set(0, -70);
      root.addChild(torso);
    }

    // Head (face) is always procedural; headgear is an SVG overlay.
    const head = new Graphics();
    head.circle(0, -104, 11).fill('#f1c27d');
    head.roundRect(-12, -114, 24, 9, 4).fill('#5b4636'); // hair
    head.rect(-4, -95, 8, 9).fill('#f1c27d'); // neck
    root.addChild(head);

    const headgearTex = texFor('headgear');
    if (headgearTex) {
      const hg = new Sprite(headgearTex);
      hg.anchor.set(0.5, 0.5);
      hg.position.set(1, -105);
      root.addChild(hg);
    }

    const arm = new Container();
    const armG = new Graphics();
    armG.roundRect(-3.5, 0, 7, 32, 3.5).fill('#edf2f7');
    arm.addChild(armG);
    arm.position.set(4, -88);
    root.addChild(arm);

    const legFront = makeLeg(0x3d566e, false);
    legFront.position.set(3, -46);
    root.addChild(legFront);

    return { legFront, legBack, arm };
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
        const done = run.onComplete;
        const final = run.state;
        const stats = run.stats;
        runRef.current = null;
        done(final, stats);
      }
    }

    animateWalker(app, fg, state, deltaMS);
    drawSpeedLines(app, state);
  }

  function animateWalker(
    app: Application,
    fg: Container,
    state: RideState | null,
    deltaMS: number,
  ) {
    const rig = walkerRef.current;
    const v = state ? state.v : 0;
    phaseRef.current += (2.2 + v * 0.95) * (deltaMS / 1000);
    const ph = phaseRef.current;
    const swing = Math.min(0.9, 0.28 + v * 0.06);
    if (rig) {
      rig.legFront.rotation = Math.sin(ph) * swing;
      rig.legBack.rotation = Math.sin(ph + Math.PI) * swing;
      rig.arm.rotation = Math.sin(ph + Math.PI) * swing * 0.8;
      fg.y = groundY(app) - Math.abs(Math.sin(ph)) * (2 + v * 0.25);
      fg.rotation = -Math.min(0.12, v * 0.012);
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
    const n = Math.min(12, Math.floor(v));
    const alpha = Math.min(0.5, (v - 4) / 16);
    const now = Date.now();
    for (let i = 0; i < n; i++) {
      const y = (i * 47 + ((now / 2) % 47)) % app.screen.height;
      const len = 34 + (i % 4) * 26;
      const x = app.screen.width - ((now / 2.5 + i * 110) % (app.screen.width + 140));
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
