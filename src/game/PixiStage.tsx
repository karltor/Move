import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { GameObjectDef } from '../data/types';
import type { TrajectoryPoint } from '../sim/simulateLaunch';
import { equippedVariant, type Equipped } from './stats';

// Sim->screen mapping. Camera follows the object, so these can stay fixed.
const PPU = 3; // pixels per simulation unit
const CYCLIST_SCALE = 0.7;
const GROUND_FROM_BOTTOM = 90; // px of ground baseline from canvas bottom
const CAMERA_LEFT_FRAC = 0.22; // keep object this far from the left edge
const ANIM_MS = 3200; // total launch animation duration (capped)

export interface StageHandle {
  /** Play a launch animation along `trajectory`, ticking distance via
   *  onProgress and resolving via onComplete (both in sim units / coins). */
  launch: (
    trajectory: TrajectoryPoint[],
    onProgress: (distance: number) => void,
    onComplete: (distance: number) => void,
  ) => void;
}

interface Props {
  object: GameObjectDef;
  equipped: Equipped;
}

/**
 * Imperative Pixi layer. It is object-agnostic: it renders whatever layered
 * composition the equipped variants describe and animates along whatever
 * trajectory it's handed. No cyclist-specific logic lives here.
 */
export const PixiStage = forwardRef<StageHandle, Props>(function PixiStage(
  { object, equipped },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const cyclistRef = useRef<Container | null>(null);
  const fxRef = useRef<Container | null>(null);

  // Animation state held in refs so the ticker can read/mutate without
  // re-rendering React.
  const animRef = useRef<{
    points: TrajectoryPoint[];
    elapsed: number;
    playing: boolean;
    onProgress: (d: number) => void;
    onComplete: (d: number) => void;
  } | null>(null);

  // Keep latest equipped/object available to async rebuilds.
  const latest = useRef({ object, equipped });
  latest.current = { object, equipped };

  // --- Pixi app lifecycle ---------------------------------------------------
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

      const world = new Container();
      app.stage.addChild(world);
      worldRef.current = world;

      drawGround(world, app);

      const cyclist = new Container();
      world.addChild(cyclist);
      cyclistRef.current = cyclist;

      const fx = new Container();
      world.addChild(fx);
      fxRef.current = fx;

      await rebuildComposition();
      placeAtStart();

      app.ticker.add((ticker) => tick(ticker.deltaMS));
    })();

    return () => {
      destroyed = true;
      appRef.current = null;
      worldRef.current = null;
      cyclistRef.current = null;
      fxRef.current = null;
      animRef.current = null;
      app.destroy(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the layered composition whenever equipped parts change.
  useEffect(() => {
    rebuildComposition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipped, object]);

  // --- helpers --------------------------------------------------------------
  function groundY(app: Application): number {
    return app.screen.height - GROUND_FROM_BOTTOM;
  }

  function drawGround(world: Container, app: Application) {
    const g = new Graphics();
    const h = app.screen.height;
    // Long ground strip well beyond any plausible run.
    g.rect(-200, groundY(app), 200000, h).fill('#5a8f3c');
    g.rect(-200, groundY(app), 200000, 6).fill('#3f6e29');
    // Distance stripes every 50 units for a sense of speed.
    for (let u = 0; u <= 60000; u += 50) {
      const x = u * PPU;
      g.rect(x, groundY(app) + 14, 3, 10).fill('#cfe9b8');
    }
    // A little launch ramp at the origin.
    g.moveTo(-90, groundY(app))
      .lineTo(0, groundY(app) - 46)
      .lineTo(0, groundY(app))
      .closePath()
      .fill('#8a5a2b');
    world.addChildAt(g, 0);
  }

  async function rebuildComposition() {
    const cyclist = cyclistRef.current;
    if (!cyclist) return;
    const { object: obj, equipped: eq } = latest.current;

    const slots = [...obj.slots].sort((a, b) => a.z - b.z);
    const urls = slots.map((s) => equippedVariant(obj, s.id, eq).svg);
    const textures = await Assets.load(urls);
    if (!cyclistRef.current) return; // unmounted mid-load

    cyclist.removeChildren();
    for (const slot of slots) {
      const url = equippedVariant(obj, slot.id, eq).svg;
      const sprite = new Sprite(textures[url]);
      // All variants share one 260x180 viewBox; anchor at the ground-contact
      // point (~x center, ~wheel bottom) so layers align and sit on the road.
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
  }

  function sample(points: TrajectoryPoint[], t: number): TrajectoryPoint {
    // t in [0,1] across the whole path, linearly interpolated.
    if (points.length === 1) return points[0];
    const f = Math.min(1, Math.max(0, t)) * (points.length - 1);
    const i = Math.floor(f);
    const frac = f - i;
    const a = points[i];
    const b = points[Math.min(points.length - 1, i + 1)];
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
  }

  function tick(deltaMS: number) {
    const app = appRef.current;
    const cyclist = cyclistRef.current;
    const world = worldRef.current;
    const anim = animRef.current;
    if (!app || !cyclist || !world) return;

    // Fade/float any FX (coin pops).
    const fx = fxRef.current;
    if (fx) {
      for (const child of [...fx.children]) {
        child.y -= deltaMS * 0.04;
        child.alpha -= deltaMS * 0.0011;
        if (child.alpha <= 0) fx.removeChild(child);
      }
    }

    if (!anim || !anim.playing) return;

    anim.elapsed += deltaMS;
    const t = anim.elapsed / ANIM_MS;
    const p = sample(anim.points, t);

    const screenX = p.x * PPU;
    cyclist.x = screenX;
    cyclist.y = groundY(app) - p.y * PPU;
    // Tilt with vertical motion for a bit of juice.
    const ahead = sample(anim.points, t + 0.01);
    const dx = (ahead.x - p.x) * PPU;
    const dy = -(ahead.y - p.y) * PPU;
    cyclist.rotation = dx !== 0 ? Math.atan2(dy, dx) * 0.5 : 0;

    // Camera follows.
    world.x = app.screen.width * CAMERA_LEFT_FRAC - screenX;

    anim.onProgress(p.x);

    if (t >= 1) {
      anim.playing = false;
      cyclist.rotation = 0;
      const finalX = anim.points[anim.points.length - 1].x;
      spawnCoinPop(finalX, Math.floor(finalX));
      anim.onComplete(finalX);
    }
  }

  function spawnCoinPop(simX: number, coins: number) {
    const app = appRef.current;
    const fx = fxRef.current;
    if (!app || !fx) return;
    const label = new Text({
      text: `+${coins} 🪙`,
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 28, fill: '#1a202c', fontWeight: '800' },
    });
    label.anchor.set(0.5, 1);
    label.x = simX * PPU;
    label.y = groundY(app) - 60;
    fx.addChild(label);
  }

  // --- imperative API -------------------------------------------------------
  useImperativeHandle(ref, () => ({
    launch: (trajectory, onProgress, onComplete) => {
      if (!trajectory.length) {
        onComplete(0);
        return;
      }
      placeAtStart();
      animRef.current = {
        points: trajectory,
        elapsed: 0,
        playing: true,
        onProgress,
        onComplete,
      };
    },
  }));

  return <div ref={hostRef} className="stage-host" />;
});
