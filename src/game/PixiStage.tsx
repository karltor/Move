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

// Base body parts (always drawn; equipped art overrides torso / adds shoes etc.)
import headSvg from '../assets/char/sci_head.svg';
import thighSvg from '../assets/char/sci_thigh.svg';
import shinSvg from '../assets/char/sci_shin.svg';
import uparmSvg from '../assets/char/sci_uparm.svg';
import forearmSvg from '../assets/char/sci_forearm.svg';
import torsoBaseSvg from '../assets/char/torso0.svg';

const PPU = 20;
const GROUND_FROM_BOTTOM = 96;
const CAMERA_LEFT_FRAC = 0.2;
const STEP_MS = 1000 * DT;
const COLLAPSE_MS = 750;

// Rig anatomy (px, in feet-origin space; up is negative y).
const HIP_Y = -62;
const THIGH_LEN = 28;
const SHOULDER_Y = -104;
const UPARM_LEN = 24;

const BASE_PARTS = [headSvg, thighSvg, shinSvg, uparmSvg, forearmSvg, torsoBaseSvg];

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

interface Limb {
  upper: Container; // rotates at proximal joint (hip / shoulder)
  lower: Container; // rotates at distal joint (knee / elbow)
}
interface WalkerRig {
  legFront: Limb;
  legBack: Limb;
  armFront: Limb;
  armBack: Limb;
}

export const PixiStage = forwardRef<StageHandle, Props>(function PixiStage({ object, ranks }, ref) {
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
    phase: 'running' | 'collapsing';
    collapseMs: number;
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
    const urls = [...new Set([...BASE_PARTS, ...layers.map((l) => l.svg)])];
    const textures = await Assets.load(urls);
    if (!fgRef.current) return;
    const art = (layerId: string): Texture | null => {
      const l = layers.find((x) => x.layer === layerId);
      return l ? textures[l.svg] : null;
    };

    fg.removeChildren();
    walkerRef.current = obj.renderKind === 'walker' ? buildWalker(fg, textures, art) : null;
  }

  function buildWalker(
    fg: Container,
    tex: Record<string, Texture>,
    art: (id: string) => Texture | null,
  ): WalkerRig {
    const shoeTex = art('shoe');
    const torsoTex = art('torso') ?? tex[torsoBaseSvg];
    const headgearTex = art('headgear');
    const backTex = art('back');

    const makeLeg = (hipX: number, behind: boolean): Limb => {
      const upper = new Container();
      upper.position.set(hipX, HIP_Y);
      const thigh = new Sprite(tex[thighSvg]);
      thigh.anchor.set(0.5, 0);
      upper.addChild(thigh);
      const lower = new Container();
      lower.position.set(0, THIGH_LEN);
      upper.addChild(lower);
      const shin = new Sprite(tex[shinSvg]);
      shin.anchor.set(0.35, 0);
      lower.addChild(shin);
      if (shoeTex) {
        const shoe = new Sprite(shoeTex);
        shoe.anchor.set(0.32, 0.2);
        shoe.position.set(4, 26);
        lower.addChild(shoe);
      }
      if (behind) {
        thigh.tint = 0xb9c1cc;
        shin.tint = 0xb9c1cc;
      }
      return { upper, lower };
    };

    const makeArm = (shX: number, behind: boolean): Limb => {
      const upper = new Container();
      upper.position.set(shX, SHOULDER_Y);
      const ua = new Sprite(tex[uparmSvg]);
      ua.anchor.set(0.5, 0);
      upper.addChild(ua);
      const lower = new Container();
      lower.position.set(0, UPARM_LEN);
      upper.addChild(lower);
      const fa = new Sprite(tex[forearmSvg]);
      fa.anchor.set(0.5, 0);
      lower.addChild(fa);
      if (behind) {
        ua.tint = 0xcfd6df;
        fa.tint = 0xd8be97;
      }
      return { upper, lower };
    };

    const legBack = makeLeg(-3, true);
    const armBack = makeArm(-2, true);
    fg.addChild(legBack.upper, armBack.upper);

    if (backTex) {
      const back = new Sprite(backTex);
      back.anchor.set(0.5, 0.5);
      back.position.set(-10, -86);
      fg.addChild(back);
    }

    const torso = new Sprite(torsoTex);
    torso.anchor.set(0.5, 0);
    torso.position.set(0, SHOULDER_Y);
    fg.addChild(torso);

    const head = new Sprite(tex[headSvg]);
    head.anchor.set(0.5, 0.93);
    head.position.set(1, SHOULDER_Y + 2);
    fg.addChild(head);

    if (headgearTex) {
      const hg = new Sprite(headgearTex);
      hg.anchor.set(0.5, 0.55);
      hg.position.set(2, SHOULDER_Y - 26);
      fg.addChild(hg);
    }

    const armFront = makeArm(5, false);
    const legFront = makeLeg(4, false);
    fg.addChild(armFront.upper, legFront.upper);

    return { legFront, legBack, armFront, armBack };
  }

  function placeAtStart() {
    const app = appRef.current;
    const world = worldRef.current;
    const fg = fgRef.current;
    if (!app || !world || !fg) return;
    fg.x = 0;
    fg.y = groundY(app);
    fg.rotation = 0;
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

    if (!run) {
      idlePose(app, fg, deltaMS);
      drawSpeedLines(app, null);
      return;
    }

    if (run.phase === 'running') {
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
      const screenX = run.state.x * PPU;
      fg.x = screenX;
      world.x = app.screen.width * CAMERA_LEFT_FRAC - screenX;
      if (bgRef.current) bgRef.current.x = world.x * 0.45;
      run.onTick(run.state, run.stats);
      animateWalker(app, fg, run.state.v, deltaMS);
      drawSpeedLines(app, run.state);
      if (finished) {
        run.phase = 'collapsing';
        run.collapseMs = 0;
      }
    } else {
      // collapsing: a quick faceplant, then finish.
      run.collapseMs += deltaMS;
      const t = Math.min(1, run.collapseMs / COLLAPSE_MS);
      const e = 1 - Math.pow(1 - t, 3);
      animateCollapse(app, fg, e);
      drawSpeedLines(app, null);
      if (t >= 1) {
        const done = run.onComplete, final = run.state, stats = run.stats;
        runRef.current = null;
        done(final, stats);
      }
    }
  }

  function setLimb(limb: Limb, upperRot: number, lowerRot: number) {
    limb.upper.rotation = upperRot;
    limb.lower.rotation = lowerRot;
  }

  function animateWalker(app: Application, fg: Container, v: number, deltaMS: number) {
    const rig = walkerRef.current;
    phaseRef.current += (2.0 + v * 0.9) * (deltaMS / 1000);
    const ph = phaseRef.current;
    const swing = Math.min(0.7, 0.05 + v * 0.06);
    if (rig) {
      setLimb(rig.legFront, Math.sin(ph) * swing, Math.max(0, Math.sin(ph + 2.2)) * swing * 1.7);
      setLimb(rig.legBack, Math.sin(ph + Math.PI) * swing, Math.max(0, Math.sin(ph + Math.PI + 2.2)) * swing * 1.7);
      setLimb(rig.armFront, Math.sin(ph + Math.PI) * swing * 0.8, 0.25 + Math.max(0, Math.sin(ph)) * 0.3);
      setLimb(rig.armBack, Math.sin(ph) * swing * 0.8, 0.25 + Math.max(0, Math.sin(ph + Math.PI)) * 0.3);
    }
    fg.y = groundY(app) - Math.abs(Math.sin(ph)) * (1.5 + v * 0.18);
    fg.rotation = Math.min(0.1, v * 0.01);
  }

  function idlePose(app: Application, fg: Container, deltaMS: number) {
    animateWalker(app, fg, 0, deltaMS); // gentle idle sway
  }

  function animateCollapse(app: Application, fg: Container, e: number) {
    const rig = walkerRef.current;
    if (rig) {
      // limbs go limp / splay
      setLimb(rig.legFront, 0.5 * e, 0.2 * e);
      setLimb(rig.legBack, -0.5 * e, 0.9 * e);
      setLimb(rig.armFront, 1.2 * e, 0.6 * e);
      setLimb(rig.armBack, -0.8 * e, 0.4 * e);
    }
    fg.rotation = 1.5 * e; // faceplant forward
    fg.y = groundY(app) + 4 * e;
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
        phase: 'running',
        collapseMs: 0,
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
