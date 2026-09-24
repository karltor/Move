import { useEffect, useRef, useState } from "react";
import { totalTrials, type Save } from "./game";
export const STORIES = {
  intro: {
    tag: "An unsolicited research proposal",
    title: "The clocks stopped at 08:03.",
    pages: [
      [
        "DR. ELLIS",
        "Every clock in town stopped. The kettle stopped boiling. Even the dean stopped complaining. Briefly, we thought things had improved.",
      ],
      [
        "UNKNOWN VISITOR",
        "Your laboratory's inertia engine has misplaced Tuesday. To restart it, I need motion data. A lot of motion data. Your budget covers one scientist and two shoes. Guess who's the vehicle.",
      ],
      [
        "DR. ELLIS",
        "We run. We measure. We build something faster. Start a run; stamina decides how far we get. The visitor calls himself SANIK. His business card is warm.",
      ],
    ],
    button: "For science. Apparently.",
  },
  forest: {
    tag: "Field transmission · 100 m",
    title: "The pavement gives up.",
    pages: [
      [
        "SANIK",
        "Trees. Nature's crash barriers. Keep an eye on your stamina, and the RP on your finish button: that's what you'll bank if you stop now. The money already in the lab stays there. Even if you trip.",
      ],
    ],
    button: "Keep moving",
  },
  research: {
    tag: "The first field report",
    title: "A breakthrough. Also a blister.",
    pages: [
      [
        "DR. ELLIS",
        "We can turn this data into actual improvements. Follow the research branches, pick a discovery and compare its effects. Shoes save energy. Breathing helps recovery. The fan is... technically aerodynamics.",
      ],
      [
        "SANIK",
        "Every discovery stays with the lab. Some need two ideas working together; others let you take a different route. I once took a shortcut so good I arrived yesterday. Unrelated to Tuesday. Probably.",
      ],
    ],
    button: "Open the research map",
  },
  equipment: {
    tag: "An unexpected find",
    title: "Someone left science on the road.",
    pages: [
      [
        "SANIK",
        "A piece of equipment! Ordinary finds have one small bonus. Rarer ones do several useful things at once. Travel further to improve your odds, or just be offensively lucky.",
      ],
      [
        "DR. ELLIS",
        "Equipment has its own menu now. Fit one piece in each slot between runs. Please stop calling the abandoned coat a 'legendary torso'.",
      ],
    ],
    button: "Noted. Legendary torso.",
  },
  distance: {
    tag: "Field transmission · 1 km",
    title: "The visitor keeps catching up.",
    pages: [
      [
        "DR. ELLIS",
        "SANIK arrived before us. On foot. He claims the orange scarf is 'aerodynamic paperwork'. We are investigating.",
      ],
      [
        "SANIK",
        "Running is only the beginning. First, prove the lab can finish a kilometre and make a few discoveries. Then we'll discuss throwing things. Ideally things with no employment contract.",
      ],
    ],
    button: "More research required",
  },
  programs: {
    tag: "A broader interpretation of movement",
    title: "The scientist may now sit down.",
    pages: [
      [
        "SANIK",
        "Other ways to move! Your unlocked programs have their own buttons and currencies. Each keeps its research and equipment. I'm told wheels are an excellent invention. Personally, I find them a little... leisurely.",
      ],
    ],
    button: "Expand the experiment",
  },
  far: {
    tag: "Classified transmission · 10 km",
    title: "S.A.N.I.K.",
    pages: [
      [
        "DR. ELLIS",
        "The visitor crossed ten kilometres while my stopwatch was blinking. Asked how, he said: 'Suspiciously Agile, Non-disclosed Independent Kineticist.' That is not a qualification.",
      ],
      ["SANIK", "The scarf stays on. Tuesday is getting closer. Keep going."],
    ],
    button: "Chase the answer",
  },
};
export type StoryId = keyof typeof STORIES;
export function nextStory(s: Save, tab: string): StoryId | null {
  if (!s.tipsEnabled) return null;
  const seen = (id: StoryId) => s.storySeen.includes(id);
  if (!seen("intro")) return "intro";
  if (tab === "research" && totalTrials(s) > 0 && !seen("research"))
    return "research";
  if (s.inventory.length && !seen("equipment")) return "equipment";
  if (s.unlocked.length > 1 && !seen("programs")) return "programs";
  const reach = Math.max(
    s.trial?.distance ?? 0,
    ...Object.values(s.progress).map((p) => p.bestDistance),
  );
  if (reach >= 100 && !seen("forest")) return "forest";
  if (reach >= 1000 && !seen("distance")) return "distance";
  if (reach >= 10000 && !seen("far")) return "far";
  return null;
}
export function SanikPortrait() {
  return (
    <svg
      viewBox="0 0 260 330"
      role="img"
      aria-label="SANIK, a shadowy tall figure in a plum coat, angular helmet and amber scarf"
    >
      <defs>
        <linearGradient id="coat" x1="0" x2="1">
          <stop stopColor="#323142" />
          <stop offset="1" stopColor="#686076" />
        </linearGradient>
      </defs>
      <circle cx="130" cy="148" r="110" fill="#e9dcc3" />
      <path
        d="M30 259 86 141 173 145 232 273 181 300 77 300Z"
        fill="url(#coat)"
      />
      <path d="m85 126 9-73 37-28 47 35 8 79-48 28Z" fill="#252b37" />
      <path d="m100 75 27-22 38 24-6 25-54 0Z" fill="#101923" />
      <path d="m111 91 46-3-7 13-34 2Z" fill="#efb245" />
      <path d="m80 144 76-9 30 14-33 22-62-1Z" fill="#d88235" />
      <path d="m161 150 69 12 23 30-53-13-44-17Z" fill="#edb44a" />
      <path d="m91 169 32 45-19 65-37-14Z" fill="#373848" />
      <path d="m173 173-32 42 15 68 30-17Z" fill="#807386" />
      <path
        d="m126 213 4 87"
        stroke="#b7a99e"
        strokeWidth="2"
        strokeDasharray="4 12"
      />
      <rect
        x="105"
        y="239"
        width="57"
        height="29"
        rx="4"
        fill="#b2c1bc"
        transform="rotate(-8 130 250)"
      />
      <path d="M113 246h27m-25 7h18" stroke="#425c60" strokeWidth="2" />
      <path
        d="m73 299 111 0"
        stroke="#34444d"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <text
        x="130"
        y="322"
        textAnchor="middle"
        fill="#4d5c69"
        fontSize="10"
        letterSpacing="3"
      >
        IDENTITY: UNVERIFIED
      </text>
    </svg>
  );
}
export default function Story({
  id,
  onDone,
  onSkip,
}: {
  id: StoryId;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const story = STORIES[id];
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  const [speaker, text] = story.pages[page];
  return (
    <dialog
      ref={ref}
      className="story-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onDone();
      }}
    >
      <div className="story-art">
        <SanikPortrait />
        <span>PROJECT / LOST TUESDAY</span>
      </div>
      <div className="story-copy">
        <span className="eyebrow">{story.tag}</span>
        <h1>{story.title}</h1>
        <div className="speaker">{speaker}</div>
        <p>{text}</p>
        <div className="story-progress">
          {story.pages.map((_, i) => (
            <i className={i === page ? "active" : ""} key={i} />
          ))}
        </div>
        <button
          autoFocus
          className="primary"
          onClick={() =>
            page + 1 < story.pages.length ? setPage(page + 1) : onDone()
          }
        >
          {page + 1 < story.pages.length ? "Go on →" : story.button}
        </button>
        <button className="text-button" onClick={onSkip}>
          Skip story tips
        </button>
      </div>
    </dialog>
  );
}
