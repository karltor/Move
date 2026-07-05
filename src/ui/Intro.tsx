import { useState } from 'react';

interface Props {
  onDone: () => void;
}

// A shadowy benefactor. Blue, round, three big quills swept back off the
// head, pointy ears, joined eyes, a cocky smirk — you know exactly who this
// is supposed to be, and legal has asked us not to say it.
function ShadowFigure() {
  return (
    <svg viewBox="0 0 220 200" className="shadow-figure" width="200" height="180">
      <defs>
        <radialGradient id="glow" cx="55%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#274a8c" />
          <stop offset="100%" stopColor="#0a1228" />
        </radialGradient>
      </defs>

      {/* three big quills swept back-left off the head */}
      <path fill="url(#glow)" d="M118 52 C 90 30, 52 26, 22 42 C 52 46, 72 56, 86 72 Z" />
      <path fill="url(#glow)" d="M112 74 C 82 60, 44 60, 16 80 C 48 80, 70 88, 84 100 Z" />
      <path fill="url(#glow)" d="M110 98 C 84 92, 52 96, 30 116 C 58 112, 78 116, 90 126 Z" />

      {/* head */}
      <circle cx="126" cy="92" r="52" fill="url(#glow)" />
      {/* pointy ears */}
      <path fill="url(#glow)" d="M96 52 L 88 22 L 118 44 Z" />
      <path fill="url(#glow)" d="M148 44 L 162 18 L 172 50 Z" />

      {/* joined eyes — one connected white mask, pupils glinting */}
      <path
        fill="#e7edf7"
        d="M104 78 q 12 -14 24 -2 q 12 -12 26 0 q 8 10 4 22 q -6 12 -17 8 q -8 -3 -11 -12 q -3 9 -11 12 q -11 4 -17 -8 q -4 -12 2 -20 z"
      />
      <ellipse cx="122" cy="92" rx="4.5" ry="7" fill="#0a1228" />
      <ellipse cx="146" cy="92" rx="4.5" ry="7" fill="#0a1228" />

      {/* muzzle + smirk */}
      <ellipse cx="138" cy="116" rx="22" ry="13" fill="#16233f" />
      <circle cx="152" cy="106" r="4" fill="#0a1228" />
      <path d="M120 122 q 18 12 34 -2" stroke="#8fa8d0" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* body + folded arms, mostly swallowed by shadow */}
      <ellipse cx="122" cy="172" rx="44" ry="22" fill="#0a1228" />
      <path d="M96 160 q 26 14 52 0" stroke="#22355c" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* white glove resting on the arm */}
      <circle cx="146" cy="158" r="8" fill="#dfe6f2" />
      {/* red shoe tip catching the light */}
      <path d="M84 184 q 10 -8 24 -4 l -2 8 q -12 4 -22 -4 z" fill="#b83232" />
    </svg>
  );
}

const SLIDES: { text: string; figure?: boolean }[] = [
  {
    text: 'Grantsville National Lab. Brilliant minds, empty coffers. The research has stalled — there is simply no money left to push anything forward.',
  },
  {
    text: '"I will fund all of it." A shadowy figure leans in from the dark, quills bristling, eyes gleaming. "Every beaker. Every blackboard. On one condition…"',
    figure: true,
  },
  {
    text: '"…you make something GO FAST. Faster than anything. I don\'t care how. Start small. Start now."',
    figure: true,
  },
  {
    text: 'So it begins — not with a rocket, but with a single scientist on a rough patch of field, colleagues cheering them on. Hold to run. Manage your breath. Go as far as you can.',
  },
];

export function Intro({ onDone }: Props) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <div className="modal-backdrop intro-backdrop">
      <div className="intro">
        <div className="intro-stage">{slide.figure && <ShadowFigure />}</div>
        <p className="intro-text">{slide.text}</p>
        <div className="intro-dots">
          {SLIDES.map((_, k) => (
            <span key={k} className={k === i ? 'dot on' : 'dot'} />
          ))}
        </div>
        <div className="intro-actions">
          <button className="intro-skip" onClick={onDone}>
            Skip
          </button>
          <button className="intro-next" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? "Let's go →" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
