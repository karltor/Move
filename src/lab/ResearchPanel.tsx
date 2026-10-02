import { useState } from "react";
import { NODES, NODE_MAP, LANES, PROGRAMS, STAT_LABELS, effectLabel, chosenAlternative, choiceAlternatives, type ResearchNode, type Stat } from "./research";
import { available, afford, research, talentRank, talentLimit, talentCost, era, sharedUnlocked, type Save } from "./game";
import { ERA_NAMES } from "./development";
import { nextFacility, facilityProgress, projectCost } from "./economy";
import Glyph from "./ResearchGlyph";
import "./talent-tree.css";

type ResearchProps = { game: Save; setGame: React.Dispatch<React.SetStateAction<Save>>; onRun: () => void; onFunding?: () => void };
export function nodePosition(n: ResearchNode) { return { x: n.lane * 180, y: n.tier * 160 }; }
export function talentGate(game: Save, n: ResearchNode) {
  const rival = chosenAlternative(n, game.researched);
  if (rival) return `Closed by ${rival.name}`;
  if (talentRank(game, n.id) >= n.maxRank) return "Fully learned";
  if (talentRank(game, n.id) >= talentLimit(game, n.id)) return "Learned · further training opens with the clinic";
  if (era(game) < n.era) return `Develop ${ERA_NAMES[n.era]}`;
  const missing = n.requires.filter(id => !game.researched.includes(id));
  if (missing.length) return `Learn ${missing.map(id => NODE_MAP.get(id)?.name).join(", ")} first`;
  if (n.anyOf?.length && !n.anyOf.some(id => game.researched.includes(id))) return `Choose either specialization in ${LANES[n.program][n.lane]}`;
  if (game.talentPoints < talentCost(game, n.id)) return `Need ${talentCost(game, n.id) - game.talentPoints} more TP`;
  return "Ready to learn";
}
const ART = ["training", "stride", "shoes", "fan", "bionics", "vest"];
const SKILL_BENEFITS: Record<string, string> = {
  "second-wind": "Recover once below 25% stamina",
  trailcraft: "35% less extra energy use on rough ground",
  "rolling-start": "Start already moving at 50% speed",
  shortcut: "Fast detours keep their bonus without extra energy use",
  "negative-split": "+15% cruising speed beyond 1 km",
  heat: "Half the desert's extra energy cost",
  hydration: "Stronger supplies with a shorter cooldown",
  survey: "+5 RP for each new biome",
  "angle-control": "Choose your launch angle",
  "skip-shot": "Rocks bounce once for extra range",
  "charged-launch": "Every third shot launches 18% faster",
  rangefinder: "Preview the landing distance",
};
const STARTING_PATHS = [
  { name: "Go further", hint: "More stamina. Less wasted energy." },
  { name: "Run smarter", hint: "Quicker starts. Better footing." },
  { name: "Stay comfortable", hint: "A faster pace. Less fatigue." },
];
function pathArt(n: ResearchNode) { return `${import.meta.env.BASE_URL}menu-art/${n.program === "runner" ? ART[n.lane] : n.program === "global" ? "clinic" : n.program === "projectile" ? "launcher" : "wheels"}.webp`; }
function Effects({ node, compact = false }: { node: ResearchNode; compact?: boolean }) {
  const entries = [
    ...(Object.entries(node.effects) as [Stat, number][]).map(([stat, value]) => ({ stat, value, label: effectLabel(stat, value) })),
    ...(Object.entries(node.multipliers ?? {}) as [Stat, number][]).map(([stat, value]) => ({ stat, value: value - 1, label: `×${value.toLocaleString("en", { maximumFractionDigits: 3 })} ${STAT_LABELS[stat].toLowerCase()}` })),
  ];
  return <ul className={`talent-benefits${compact ? " compact" : ""}`}>{entries.map((entry, i) => <li key={entry.stat + i} className={entry.value < 0 ? "tradeoff" : ""}>{entry.label}</li>)}</ul>;
}
export default function Research({ game, setGame, onRun, onFunding }: ResearchProps) {
  const [shared, setShared] = useState(false), [selected, setSelected] = useState<string | null>(null), [showHistory, setShowHistory] = useState(false);
  const tree = shared && sharedUnlocked(game) ? "global" : game.program, nodes = NODES.filter(n => n.program === tree);
  const activeEra = era(game), beginner = activeEra === 0, ready = nodes.filter(n => afford(game, n.id));
  const chosen = selected ? NODE_MAP.get(selected) : undefined;
  const detail = chosen?.program === tree ? chosen : ready.find(n => !talentRank(game, n.id)) ?? nodes.find(n => !talentRank(game, n.id) && available(game, n.id)) ?? ready[0] ?? nodes[0];
  const rank = talentRank(game, detail.id), limit = talentLimit(game, detail.id), facility = nextFacility(game);
  const goals = facility ? facilityProgress(game, facility.id) : [], learned = nodes.filter(n => talentRank(game, n.id) > 0);
  const lanes = LANES[tree].map((name, lane) => ({ name, lane, nodes: nodes.filter(n => n.lane === lane) })).filter(path => path.nodes.some(n => n.era <= activeEra));
  const learn = (id: string) => { setSelected(id); setGame(s => research(s, id)); };
  return <section className={`talents-screen${beginner ? " beginner" : ""}`} aria-label="Talent tree">
    <header className="talents-header">
      <div><span className="eyebrow">{beginner ? "One discovery at a time" : ERA_NAMES[activeEra]}</span><h1>{beginner ? `Build your ${tree === "runner" ? "runner" : tree === "projectile" ? "launcher" : "vehicle"}` : "Talents"}</h1></div>
      {sharedUnlocked(game) && <div className="talents-programs" aria-label="Talent program"><button className={tree !== "global" ? "active" : ""} onClick={() => { setShared(false); setSelected(null); }}>{PROGRAMS[game.program].short}</button><button className={tree === "global" ? "active" : ""} onClick={() => { setShared(true); setSelected(null); }}>Laboratory</button></div>}
      <div className="talents-budget"><strong>{game.talentPoints.toLocaleString("en")} <small>TP</small></strong><span>{ready.length} talents available</span></div>
      {onFunding && <button className="secondary" onClick={onFunding}>Buy talent points</button>}
      <button className="primary" onClick={onRun}>{game.trial ? "Back to experiment" : "Prepare experiment"} →</button>
    </header>
    <div className="talents-layout">
      <div className="talent-notebook">
        <div className="talent-map-intro"><p>{beginner ? `${tree === "runner" ? "Six basic discoveries." : "Starter discoveries."} Start in any path; learning one opens the next.` : "Each path continues downwards. At a fork, choose the specialization you want to keep."}</p>{!beginner && learned.length > 6 && <button onClick={() => setShowHistory(!showHistory)}>{showHistory ? "Focus on next discoveries" : "Show all learned talents"}</button>}</div>
        <div className="talent-trails" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(${lanes.length <= 3 ? "0" : "160px"}, 1fr))` }}>
          {lanes.map(path => {
            const accessible = path.nodes.filter(n => n.era <= activeEra || talentRank(game, n.id) > 0);
            const firstUnlearned = accessible.find(n => !talentRank(game, n.id) && !chosenAlternative(n, game.researched));
            const focusTier = firstUnlearned?.tier ?? Math.max(...accessible.map(n => n.tier));
            const visible = beginner || showHistory ? accessible : accessible.filter(n => (!talentRank(game, n.id) && n.tier >= focusTier && n.tier <= focusTier + 1) || n.id === detail.id || (!firstUnlearned && n.tier === focusTier));
            const hidden = accessible.filter(n => talentRank(game, n.id) > 0 && !visible.includes(n)).length;
            return <section className="talent-trail" key={path.lane} aria-label={path.name + " talent path"}>
              <header className={`talent-trail-art art-${path.lane}`}><img src={pathArt(path.nodes[0])} alt="" draggable={false} /><div><span>{beginner && tree === "runner" ? path.name : accessible.some(n => talentRank(game, n.id)) ? "CONTINUE THIS PATH" : "NEW PATH"}</span><h2>{beginner && tree === "runner" ? STARTING_PATHS[path.lane].name : path.name}</h2>{beginner && tree === "runner" && <p>{STARTING_PATHS[path.lane].hint}</p>}</div></header>
              {hidden > 0 && <button className="talent-earlier" onClick={() => setShowHistory(true)}>✓ {hidden} learned · view training</button>}
              <div className="talent-trail-nodes">{visible.map(n => {
                const owned = talentRank(game, n.id), can = afford(game, n.id), usable = available(game, n.id), rival = chosenAlternative(n, game.researched), complete = owned >= talentLimit(game, n.id);
                return <article key={n.id} className={`talent-step${can ? " affordable" : ""}${owned ? " learned" : ""}${!usable && !owned ? " locked" : ""}${rival ? " closed" : ""}${detail.id === n.id ? " selected" : ""}${n.choiceGroup ? " fork" : ""}`}>
                  {n.choiceGroup && <span className="talent-fork-tag">{rival ? "Other specialization chosen" : "Choose one specialization"}</span>}
                  <button className="talent-step-select" onClick={() => setSelected(n.id)} aria-pressed={detail.id === n.id} aria-label={`${n.name}, ${owned ? "learned" : can ? "can afford" : talentGate(game, n)}`}><Glyph name={n.icon} /><div><h3>{n.name}</h3>{n.ability && <span className="talent-skill-tag">{SKILL_BENEFITS[n.ability] ?? "New field skill"}</span>}<Effects node={n} compact /></div></button>
                  <div className="talent-step-footer"><span>{rival ? "Closed" : complete ? "Learned ✓" : !usable ? n.requires.length ? "Learn the talent above" : "Locked" : owned ? `Rank ${owned} / ${n.maxRank}` : `${talentCost(game, n.id)} TP`}</span>{!rival && !complete && <button className="talent-learn" disabled={!can && !n.choiceGroup} onClick={() => n.choiceGroup ? setSelected(n.id) : learn(n.id)}>{n.choiceGroup ? "Compare →" : `${owned ? "Train" : "Learn"} · ${talentCost(game, n.id)} TP`}</button>}</div>
                </article>;
              })}</div>
            </section>;
          })}
        </div>
        {facility && <footer className="talent-facility-goal"><img src={`${import.meta.env.BASE_URL}menu-art/${facility.id === "athletics" ? "clinic" : "bionics"}.webp`} alt="" /><div><span>YOUR NEXT UNLOCK</span><h2>{facility.id === "athletics" ? "Training clinic" : ERA_NAMES[facility.opensEra!]}</h2><p>{beginner ? "Opens athletic skills, repeatable talent training and new equipment." : facility.description}</p><div className="talent-goals">{goals.map(goal => <span key={goal.id} className={goal.complete ? "done" : ""} title={goal.label}>{goal.complete ? "✓" : "○"} {goal.id === "talents" ? "Talents" : goal.id === "distance" ? "Best run" : goal.id === "trials" ? "Runs" : goal.id === "gear" ? "Gear" : "RP"} <b>{goal.current.toLocaleString("en")} / {goal.target.toLocaleString("en")}{goal.id === "distance" ? " m" : ""}</b></span>)}</div></div>{onFunding && <button className="secondary" onClick={onFunding}>{projectCost(game, facility.id).toLocaleString("en")} RP · View goal →</button>}</footer>}
      </div>
      <aside className="talent-inspector" aria-label="Selected talent details">
        <div className={`talent-inspector-art art-${detail.lane}`}><img src={pathArt(detail)} alt="" /><span className="talent-inspector-badge"><Glyph name={detail.icon} /></span></div>
        <div className="talent-inspector-copy"><span className="eyebrow">{LANES[tree][detail.lane]}{detail.ability ? " · Field skill" : ""}</span><h2>{detail.name}</h2><p>{detail.description}</p><div className="talent-inspector-effects"><span>{rank && !beginner ? "NEXT TRAINING RANK" : "PERMANENT BENEFIT"}</span><Effects node={detail} /></div>{choiceAlternatives(detail).length > 0 && <div className="talent-choice-warning"><b>A permanent specialization</b><p>Choose this or {choiceAlternatives(detail).map(n => n.name).join(" / ")}. You can continue down this path after either choice.</p></div>}{!beginner && rank > 0 && detail.maxRank > 1 && <div className="talent-rank-progress"><span>Training · {rank} / {detail.maxRank}</span><progress value={rank} max={detail.maxRank} /></div>}{beginner && rank > 0 && <div className="talent-learned-note">✓ Applied to every run.<br />More training opens with the clinic.</div>}</div>
        <div className="talent-inspector-purchase">{rank < limit && <p>{talentGate(game, detail)}</p>}<button className="primary" disabled={!afford(game, detail.id)} onClick={() => learn(detail.id)}>{rank >= limit ? beginner ? "Learned ✓" : "Fully trained ✓" : `${rank ? "Train" : "Learn"} · ${talentCost(game, detail.id)} TP`}</button>{rank < limit && available(game, detail.id) && !afford(game, detail.id) && onFunding && <button className="talent-funding-link" onClick={onFunding}>Buy talent points with RP →</button>}</div>
      </aside>
    </div>
  </section>;
}
export const FirstExperiments = Research;
