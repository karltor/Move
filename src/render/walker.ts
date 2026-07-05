import { Container, Graphics } from 'pixi.js';
import type { Cosmetics } from '../game/tree';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// PROCEDURAL WALKER — the scientist and their rides, drawn with Pixi Graphics.
// ---------------------------------------------------------------------------
// No assets, no async: `setCosmetics` rebuilds the rig synchronously from
// typed cosmetic tiers + the equipped traversal vehicle.
//
//   root
//   ├── vehicleC   ground-fixed (deck / bicycle / nothing) — doesn't bob
//   └── body       the character: two-segment legs & arms, torso, head
//
// Origin is at the feet (ground); up is negative y. All lengths in px.
// ---------------------------------------------------------------------------

const HIP_Y = -62;
const THIGH_LEN = 28;
const SHIN_LEN = 30;
const SHOULDER_Y = -104;
const UPARM_LEN = 24;
const FOREARM_LEN = 22;
const HEAD_CY = SHOULDER_Y - 18;

const SKIN = 0xeeb98a;
const SKIN_SHADE = 0xd9a276;
const HAIR = 0x5b4632;
const TROUSER = 0x3f4a5c;
const TROUSER_SHADE = 0x323b4a;

/** Coat body + sleeve colours per tier (0 lab coat, 1 windbreaker, 2 speed suit). */
const COATS = [
  { body: 0xf4f6f8, shade: 0xd7dde4, sleeve: 0xe9edf2, trim: 0x9aa7b5 },
  { body: 0x3b82f6, shade: 0x2563eb, sleeve: 0x60a5fa, trim: 0xdbeafe },
  { body: 0x1e293b, shade: 0x0f172a, sleeve: 0x334155, trim: 0x22d3ee },
];

/** Shoe colours per tier (0 loafers, 1 runners, 2 spring soles). */
const SHOES = [
  { body: 0x6b4f2a, sole: 0x4a371d, accent: 0x6b4f2a },
  { body: 0xf97316, sole: 0xf8fafc, accent: 0xffffff },
  { body: 0x0ea5e9, sole: 0xe0f2fe, accent: 0x22d3ee },
];

const BACK_TINT = 0xb9c1cc;

// Bicycle geometry (body coords).
const BIKE_WHEEL_R = 19;
const BIKE_WHEELS: [number, number][] = [[-30, -BIKE_WHEEL_R], [30, -BIKE_WHEEL_R]];
const BIKE_CRANK: [number, number] = [0, -24];
const BIKE_PEDAL_R = 10;
const BIKE_SADDLE: [number, number] = [-13, -64];
const BIKE_BARS: [number, number] = [26, -72];
/** Shift torso/head/arms so the hip sits on the saddle. */
const BIKE_RIDER_OFF: [number, number] = [BIKE_SADDLE[0], BIKE_SADDLE[1] - HIP_Y];

// Skateboard geometry.
const DECK_Y = -13; // deck top
const SKATE_WHEELS: [number, number][] = [[-16, -5.5], [16, -5.5]];

interface Limb {
  upper: Container; // rotates at the proximal joint (hip / shoulder)
  lower: Container; // rotates at the distal joint (knee / elbow)
}

function tintAll(c: Container, tint: number) {
  for (const child of c.children) {
    if (child instanceof Graphics) child.tint = tint;
    if (child instanceof Container) tintAll(child, tint);
  }
}

function drawShoe(g: Graphics, tier: number) {
  const s = SHOES[Math.min(tier, SHOES.length - 1)];
  const y = SHIN_LEN - 4;
  g.roundRect(-5, y - 4, 19, 9, 4).fill(s.body);
  g.roundRect(-5, y + 2, 20, 4, 2).fill(s.sole);
  if (tier >= 1) g.moveTo(-1, y).lineTo(6, y + 2).stroke({ width: 1.5, color: s.accent });
  if (tier >= 2) {
    for (let i = 0; i < 3; i++) {
      g.moveTo(-2 + i * 5, y + 6).lineTo(1 + i * 5, y + 8).stroke({ width: 1.5, color: s.accent });
    }
  }
}

/** Two-segment IK: rotations for upper/lower so the tip lands on (dx,dy)
 *  relative to the proximal joint. bend=+1 bows the joint toward +x. */
function solveIK(dx: number, dy: number, l1: number, l2: number, bend: 1 | -1): [number, number] {
  const d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(-dx, dy);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const b = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  return [base - bend * a, bend * (Math.PI - b)];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export class Walker {
  /** Position this at (screenX, groundY); everything else is internal. */
  readonly root = new Container();

  private vehicleC = new Container();
  private body = new Container();
  private legF!: Limb;
  private legB!: Limb;
  private armF!: Limb;
  private armB!: Limb;
  private coatTail!: Graphics;
  private wheels: Container[] = [];
  private crankG: Graphics | null = null;
  private flames: Graphics[] = [];
  private vehicle: Cosmetics['vehicle'] = 'none';
  private phase = 0;
  private wheelRot = 0;

  constructor(cosmetics: Cosmetics) {
    this.root.addChild(this.vehicleC, this.body);
    this.build(cosmetics);
  }

  setCosmetics(cosmetics: Cosmetics) {
    for (const c of this.body.removeChildren()) c.destroy({ children: true });
    for (const c of this.vehicleC.removeChildren()) c.destroy({ children: true });
    this.wheels = [];
    this.crankG = null;
    this.flames = [];
    this.build(cosmetics);
  }

  // --- assembly ------------------------------------------------------------

  private build(cos: Cosmetics) {
    this.vehicle = cos.vehicle;
    const coat = COATS[Math.min(cos.coat, COATS.length - 1)];

    if (cos.vehicle === 'skateboard') this.buildSkateboard();
    if (cos.vehicle === 'bicycle') this.buildBicycleRear();

    this.legB = this.makeLeg(-3, cos);
    this.armB = this.makeArm(-2, coat.sleeve);
    tintAll(this.legB.upper, BACK_TINT);
    tintAll(this.armB.upper, BACK_TINT);
    this.body.addChild(this.legB.upper, this.armB.upper);

    const backpack = cos.back >= 1 ? this.makeBackpack() : null;
    if (backpack) this.body.addChild(backpack);

    this.coatTail = this.makeCoatTail(coat.shade);
    this.body.addChild(this.coatTail);
    const torso = this.makeTorso(coat, cos.coat);
    const head = this.makeHead(cos.headgear);
    this.body.addChild(torso, head);

    this.armF = this.makeArm(5, coat.sleeve);
    this.legF = this.makeLeg(4, cos);
    this.body.addChild(this.armF.upper, this.legF.upper);

    if (cos.vehicle === 'bicycle') {
      // seat the rider: torso & co shift onto the saddle, legs ride from it
      const [ox, oy] = BIKE_RIDER_OFF;
      for (const p of [torso, head, this.coatTail, backpack, this.armF.upper, this.armB.upper]) {
        if (p) p.position.set(p.position.x + ox, p.position.y + oy);
      }
      this.legF.upper.position.set(BIKE_SADDLE[0] + 2, BIKE_SADDLE[1]);
      this.legB.upper.position.set(BIKE_SADDLE[0] - 2, BIKE_SADDLE[1]);
      this.buildBicycleFront();
    }
  }

  private makeLeg(hipX: number, cos: Cosmetics): Limb {
    const upper = new Container();
    upper.position.set(hipX, HIP_Y);
    const thigh = new Graphics();
    thigh.roundRect(-5, -3, 10, THIGH_LEN + 7, 5).fill(TROUSER);
    upper.addChild(thigh);

    const lower = new Container();
    lower.position.set(0, THIGH_LEN);
    const shin = new Graphics();
    shin.roundRect(-4, -2, 8, SHIN_LEN - 4, 4).fill(TROUSER_SHADE);
    shin.roundRect(-3, SHIN_LEN - 12, 6, 7, 2).fill(0xf8fafc); // sock
    drawShoe(shin, cos.shoes);
    lower.addChild(shin);

    if (cos.vehicle === 'rocket') {
      const flame = new Graphics();
      const y = SHIN_LEN + 1;
      flame.poly([-4, y - 3, -22, y + 1, -4, y + 4]).fill({ color: 0xf97316, alpha: 0.9 });
      flame.poly([-4, y - 1, -14, y + 1, -4, y + 3]).fill({ color: 0xfde047, alpha: 0.95 });
      lower.addChild(flame);
      this.flames.push(flame);
    }

    upper.addChild(lower);
    return { upper, lower };
  }

  private makeArm(shoulderX: number, sleeve: number): Limb {
    const upper = new Container();
    upper.position.set(shoulderX, SHOULDER_Y);
    const ua = new Graphics();
    ua.roundRect(-4, -3, 8, UPARM_LEN + 6, 4).fill(sleeve);
    upper.addChild(ua);

    const lower = new Container();
    lower.position.set(0, UPARM_LEN);
    const fa = new Graphics();
    fa.roundRect(-3.5, -2, 7, FOREARM_LEN, 3.5).fill(SKIN);
    fa.circle(0, FOREARM_LEN - 1, 4).fill(SKIN_SHADE); // hand
    lower.addChild(fa);
    upper.addChild(lower);
    return { upper, lower };
  }

  private makeTorso(coat: (typeof COATS)[number], tier: number): Graphics {
    const g = new Graphics();
    g.roundRect(-12, SHOULDER_Y - 2, 24, HIP_Y - SHOULDER_Y + 14, 7).fill(coat.body);
    g.roundRect(-12, SHOULDER_Y - 2, 7, HIP_Y - SHOULDER_Y + 14, 7).fill(coat.shade);
    g.moveTo(-8, SHOULDER_Y + 2).lineTo(9, SHOULDER_Y + 2).stroke({ width: 3, color: coat.trim });
    if (tier === 0) {
      for (let i = 0; i < 3; i++) g.circle(7, SHOULDER_Y + 14 + i * 11, 1.6).fill(coat.trim);
    } else {
      g.moveTo(7, SHOULDER_Y + 6).lineTo(7, HIP_Y + 8).stroke({ width: 2, color: coat.trim });
    }
    return g;
  }

  private makeCoatTail(color: number): Graphics {
    const g = new Graphics();
    g.poly([-10, HIP_Y + 4, -22, HIP_Y + 26, -8, HIP_Y + 14]).fill(color);
    g.pivot.set(-10, HIP_Y + 4);
    g.position.set(-10, HIP_Y + 4);
    return g;
  }

  private makeHead(headgearTier: number): Container {
    const c = new Container();
    const g = new Graphics();
    g.circle(0, HEAD_CY - 1, 15.5).fill(HAIR); // hair ball (back + top)
    g.circle(4, HEAD_CY + 2, 13).fill(SKIN); // face carved out, facing right
    g.circle(-2, HEAD_CY + 6, 3).fill(SKIN_SHADE); // ear
    g.circle(10, HEAD_CY, 1.8).fill(0x2d3748); // eye (facing right)
    g.moveTo(12, HEAD_CY + 8).lineTo(16, HEAD_CY + 7).stroke({ width: 1.5, color: SKIN_SHADE }); // mouth
    c.addChild(g);

    if (headgearTier === 1) {
      const gg = new Graphics();
      gg.moveTo(-12, HEAD_CY - 4).lineTo(4, HEAD_CY - 6).stroke({ width: 3, color: 0x334155 });
      gg.circle(10, HEAD_CY - 5, 6).fill(0xfbbf24).stroke({ width: 2, color: 0x334155 });
      c.addChild(gg);
    } else if (headgearTier >= 2) {
      const h = new Graphics();
      h.moveTo(-14.5, HEAD_CY - 2).arc(2, HEAD_CY - 2, 16.5, Math.PI, Math.PI * 2).closePath().fill(0xe11d48);
      h.roundRect(-15, HEAD_CY - 4, 34, 5, 2).fill(0xf8fafc);
      h.circle(2, HEAD_CY - 16, 3).fill(0xf8fafc);
      c.addChild(h);
    }
    return c;
  }

  private makeBackpack(): Graphics {
    const g = new Graphics();
    g.roundRect(-24, SHOULDER_Y + 2, 13, 34, 5).fill(0x475569);
    g.roundRect(-22, SHOULDER_Y + 6, 9, 12, 3).fill(0x22d3ee);
    g.moveTo(-18, SHOULDER_Y + 36).lineTo(-18, HIP_Y + 4).stroke({ width: 3, color: 0x64748b });
    return g;
  }

  // --- vehicles --------------------------------------------------------------

  private makeWheel(x: number, y: number, r: number, tire: number, hub: number): Container {
    const w = new Container();
    w.position.set(x, y);
    const g = new Graphics();
    g.circle(0, 0, r).fill(tire);
    g.circle(0, 0, r * 0.55).fill(hub);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      g.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8).stroke({ width: r > 8 ? 2 : 1.5, color: 0x94a3b8 });
    }
    g.circle(0, 0, Math.max(1.5, r * 0.16)).fill(0x334155);
    w.addChild(g);
    this.wheels.push(w);
    return w;
  }

  private buildSkateboard() {
    const g = new Graphics();
    // trucks
    g.rect(-16, DECK_Y + 4, 3, 4).fill(0x94a3b8);
    g.rect(13, DECK_Y + 4, 3, 4).fill(0x94a3b8);
    // deck with upturned tail/nose
    g.roundRect(-26, DECK_Y, 52, 5, 2.5).fill(0xb45309);
    g.roundRect(-26, DECK_Y, 52, 2, 1).fill(0x1f2937); // grip tape
    this.vehicleC.addChild(g);
    for (const [x, y] of SKATE_WHEELS) this.vehicleC.addChild(this.makeWheel(x, y, 4.5, 0xfbbf24, 0xf8fafc));
  }

  /** Frame + wheels, drawn behind the rider. */
  private buildBicycleRear() {
    const g = new Graphics();
    const [rw, fw] = BIKE_WHEELS;
    const crank = BIKE_CRANK;
    const seatTop: [number, number] = [BIKE_SADDLE[0], BIKE_SADDLE[1] + 4];
    const headTube: [number, number] = [24, -62];
    // rear triangle: chainstay + seatstay + seat tube
    g.moveTo(rw[0], rw[1]).lineTo(crank[0], crank[1]).lineTo(seatTop[0], seatTop[1]).lineTo(rw[0], rw[1])
      .stroke({ width: 3.5, color: 0xdc2626 });
    // top tube + down tube + fork
    g.moveTo(seatTop[0], seatTop[1]).lineTo(headTube[0], headTube[1]).stroke({ width: 3.5, color: 0xdc2626 });
    g.moveTo(crank[0], crank[1]).lineTo(headTube[0], headTube[1]).stroke({ width: 3.5, color: 0xdc2626 });
    g.moveTo(headTube[0], headTube[1]).lineTo(fw[0], fw[1]).stroke({ width: 3, color: 0xb91c1c });
    // saddle
    g.roundRect(BIKE_SADDLE[0] - 8, BIKE_SADDLE[1] - 3, 16, 5, 2).fill(0x1f2937);
    // stem up to the handlebars + grip
    g.moveTo(headTube[0], headTube[1]).lineTo(BIKE_BARS[0], BIKE_BARS[1]).stroke({ width: 3, color: 0x334155 });
    g.roundRect(BIKE_BARS[0] - 2, BIKE_BARS[1] - 2, 10, 4, 2).fill(0x1f2937);
    this.vehicleC.addChild(g);
    this.vehicleC.addChild(this.makeWheel(rw[0], rw[1], BIKE_WHEEL_R, 0x1f2937, 0xcbd5e0));
    this.vehicleC.addChild(this.makeWheel(fw[0], fw[1], BIKE_WHEEL_R, 0x1f2937, 0xcbd5e0));
  }

  /** Crank + pedals, drawn over the rear leg (into the body container). */
  private buildBicycleFront() {
    this.crankG = new Graphics();
    this.body.addChild(this.crankG);
  }

  // --- posing ----------------------------------------------------------------

  /** Advance the animation; `v = 0` idles. */
  run(v: number, dtMs: number) {
    const dt = dtMs / 1000;
    this.vehicleC.rotation = 0; // un-collapse
    this.vehicleC.y = 0;
    this.wheelRot += (v * CONFIG.render.pixelsPerMetre * dt) / 12;
    for (const w of this.wheels) w.rotation = this.wheelRot;

    switch (this.vehicle) {
      case 'skateboard':
        this.poseSkater(v, dt);
        break;
      case 'bicycle':
        this.poseCyclist(v, dt);
        break;
      case 'rocket':
        this.poseGait(v, dtMs, 0.55, 0.12);
        this.flickerFlames(v);
        break;
      default:
        this.poseGait(v, dtMs, 1, 0);
    }
  }

  /** Classic run cycle (also rocket glide with damped swing + extra lean). */
  private poseGait(v: number, dtMs: number, swingScale: number, extraLean: number) {
    const G = CONFIG.render.gait;
    this.phase += (G.strideBase + v * G.stridePerSpeed) * (dtMs / 1000);
    const ph = this.phase * G.dir;
    const swing = Math.min(G.swingMax, G.swingBase + v * G.swingPerSpeed) * swingScale;

    const kneeF = Math.max(0, -Math.cos(ph)) * swing * 1.9;
    const kneeB = Math.max(0, Math.cos(ph)) * swing * 1.9;
    this.setLimb(this.legF, Math.sin(ph) * swing, kneeF);
    this.setLimb(this.legB, -Math.sin(ph) * swing, kneeB);
    // Arms counter-swing the same-side leg; elbows bend so the forearm
    // carries FORWARD (negative rotation) — bent backwards it reads as
    // running the other way.
    this.setLimb(this.armF, -Math.sin(ph) * swing * 0.85, -(0.45 + Math.max(0, Math.cos(ph)) * 0.4));
    this.setLimb(this.armB, Math.sin(ph) * swing * 0.85, -(0.45 + Math.max(0, -Math.cos(ph)) * 0.4));

    this.coatTail.rotation = -0.2 - v * 0.02 + Math.sin(ph) * 0.08;
    this.body.y = -Math.abs(Math.sin(ph)) * (1.5 + v * 0.18);
    this.body.rotation = Math.min(0.1, v * 0.01) + extraLean;
  }

  private poseSkater(v: number, dt: number) {
    this.phase += (1.2 + v * 0.25) * dt;
    const ph = this.phase;
    // crouch so the feet land on the deck
    this.body.y = DECK_Y + 2;
    this.body.rotation = 0.04 + Math.min(0.06, v * 0.003);

    // front leg planted on the deck, knee bowed forward
    this.setLimb(this.legF, -0.32, 0.62);
    // back leg pushes the ground in a cycle, then rests on the tail
    const kick = Math.max(0, Math.sin(ph));
    this.setLimb(this.legB, 0.15 + kick * 0.5, 0.55 - kick * 0.35);

    // arms out for balance, trailing a little sway
    this.setLimb(this.armF, -0.55 + Math.sin(ph) * 0.08, -0.35);
    this.setLimb(this.armB, 0.5 - Math.sin(ph) * 0.08, -0.3);
    this.coatTail.rotation = -0.35 - v * 0.015;
  }

  private poseCyclist(v: number, dt: number) {
    this.phase += (1.5 + v * 0.45) * dt; // cadence
    const ph = this.phase;
    this.body.y = 0;
    this.body.rotation = 0; // crank drawing must stay aligned with the frame

    // pedal both feet on opposite cranks (IK from the saddle)
    const pedal = (offset: number): [number, number] => [
      BIKE_CRANK[0] + Math.cos(ph + offset) * BIKE_PEDAL_R,
      BIKE_CRANK[1] + Math.sin(ph + offset) * BIKE_PEDAL_R,
    ];
    this.aimLeg(this.legF, pedal(0));
    this.aimLeg(this.legB, pedal(Math.PI));

    // arms reach the handlebars (elbow bows down-back)
    for (const arm of [this.armF, this.armB]) {
      const [r1, r2] = solveIK(
        BIKE_BARS[0] - arm.upper.x,
        BIKE_BARS[1] - arm.upper.y,
        UPARM_LEN,
        FOREARM_LEN + 3,
        -1,
      );
      arm.upper.rotation = r1;
      arm.lower.rotation = r2;
    }

    // crank arms + pedal plates over the rear leg
    const g = this.crankG;
    if (g) {
      g.clear();
      for (const off of [0, Math.PI]) {
        const [px, py] = pedal(off);
        g.moveTo(BIKE_CRANK[0], BIKE_CRANK[1]).lineTo(px, py).stroke({ width: 3, color: 0x334155 });
        g.roundRect(px - 4, py - 1.5, 8, 3, 1.5).fill(0x1f2937);
      }
      g.circle(BIKE_CRANK[0], BIKE_CRANK[1], 4).fill(0x475569);
    }
    this.coatTail.rotation = -0.4 - v * 0.008;
    void v;
  }

  private aimLeg(limb: Limb, target: [number, number]) {
    const [rot1, rot2] = solveIK(
      target[0] - limb.upper.x,
      target[1] - limb.upper.y,
      THIGH_LEN,
      SHIN_LEN,
      1, // knee bows forward, like a cyclist's
    );
    limb.upper.rotation = rot1;
    limb.lower.rotation = rot2;
  }

  private flickerFlames(v: number) {
    const s = 0.7 + Math.min(1, v / 30) * 0.5;
    for (const f of this.flames) {
      f.scale.x = s + Math.sin(this.phase * 7 + f.y) * 0.12;
      f.alpha = 0.75 + Math.sin(this.phase * 11) * 0.2;
    }
  }

  /** Faceplant, `t` 0..1 (eased internally). */
  collapse(t: number) {
    const e = 1 - Math.pow(1 - t, 3);
    this.setLimb(this.legF, 0.5 * e, 0.2 * e);
    this.setLimb(this.legB, -0.5 * e, 0.9 * e);
    this.setLimb(this.armF, 1.2 * e, 0.6 * e);
    this.setLimb(this.armB, -0.8 * e, 0.4 * e);
    this.coatTail.rotation = -0.2 + 0.5 * e;
    this.body.rotation = 1.5 * e;
    this.body.y = (this.vehicle === 'skateboard' ? DECK_Y + 2 : 0) + 4 * e;
    this.vehicleC.rotation = 0.5 * e;
    this.vehicleC.y = 2 * e;
  }

  private setLimb(limb: Limb, upperRot: number, lowerRot: number) {
    limb.upper.rotation = upperRot;
    limb.lower.rotation = lowerRot;
  }
}
