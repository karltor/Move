import { useState } from "react";
import {
  NODES, NODE_MAP, LANES, PROGRAMS, STAT_LABELS, STAT_PURPOSE,
  effectLabel, chosenAlternative, choiceAlternatives,
  type ResearchNode, type Stat,
} from "./research";
import { available, afford, research, talentRank, talentCost, era, sharedUnlocked, type Save } from "./game";
import { ERA_NAMES } from "./development";
import Glyph from "./ResearchGlyph";
import "./talent-tree.css";

type ResearchProps = {
  game: Save;
  setGame: React.Dispatch<React.SetStateAction<Save>>;
  onRun: () => void;
  onFunding?: () => void;
};

/** Positions within a discipline, never around a radial map. */
export function nodePosition(n: ResearchNode) {
  return { x: n.lane * 180, y: n.tier * 160 };
}
export function talentGate(game: Save, n: ResearchNode) {
  const rival = chosenAlternative(n, game.researched);
  if (rival) return `Closed by ${rival.name}`;
  if (talentRank(game, n.id) >= n.maxRank) return "Fully learned";
  if (era(game) < n.era) return `Develop ${ERA_NAMES[n.era]}`;
  const missing = n.requires.filter(id => !game.researched.includes(id));
  if (missing.length) return `Learn ${missing.map(id => NODE_MAP.get(id)?.name).join(", ")} first`;
  if (n.anyOf?.length && !n.anyOf.some(id => game.researched.includes(id)))
    return `Choose either specialization in ${LANES[n.program][n.lane]}`;
  if (game.talentPoints < talentCost(game, n.id)) return `Need ${talentCost(game, n.id) - game.talentPoints} more TP`;
  return "Ready to learn";
}
function Effects({ node, compact = false }: { node: ResearchNode; compact?: boolean }) {
  const additive = Object.entries(node.effects) as [Stat, number][];
  const multipliers = Object.entries(node.multipliers ?? {}) as [Stat, number][];
  const entries = [
    ...additive.map(([stat, value]) => ({ stat, value, label: effectLabel(stat, value) })),
    ...multipliers.map(([stat, value]) => ({ stat, value: value - 1, label: `×${value.toLocaleString("en", { maximumFractionDigits: 3 })} ${STAT_LABELS[stat].toLowerCase()}` })),
  ];
  return <ul className={compact ? "talent-effects compact" : "talent-effects"}>
    {(compact ? entries.slice(0, 1) : entries).map((entry, i) => <li key={entry.stat + i} className={entry.value < 0 ? "tradeoff" : ""}>
      <b>{entry.label}</b>{!compact && <span>{STAT_PURPOSE[entry.stat]}</span>}
    </li>)}
  </ul>;
}

export default function Research({ game, setGame, onRun, onFunding }: ResearchProps) {
  const [shared, setShared] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const tree = shared && sharedUnlocked(game) ? "global" : game.program;
  const nodes = NODES.filter(n => n.program === tree);
  const activeEra = era(game);
  const ownedRanks = nodes.reduce((sum, n) => sum + talentRank(game, n.id), 0);
  const ready = nodes.filter(n => afford(game, n.id));
  const chapters = tree === "global" ? [2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6];
  const displayChapter = chapters.includes(chapter) ? chapter : chapters[0];
  const chapterNodes = nodes.filter(n => tree === "global"
    ? n.era === displayChapter
    : [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6][n.tier] === displayChapter);
  const chosen = selected ? NODE_MAP.get(selected) : undefined;
  const detail = chosen?.program === tree ? chosen : chapterNodes.find(n => available(game, n.id)) ?? chapterNodes[0];
  const lanes = LANES[tree];
  const rank = detail ? talentRank(game, detail.id) : 0;
  const alternatives = detail ? choiceAlternatives(detail) : [];
  const currentMaxRank = detail ? rank >= detail.maxRank : false;

  return <section className="talents-screen" aria-label="Talent tree">
    <header className="talents-header">
      <div><span className="eyebrow">Permanent capabilities</span><h1>Talents</h1></div>
      <div className="talents-programs" aria-label="Talent program">
        <button className={tree !== "global" ? "active" : ""} onClick={() => { setShared(false); setChapter(0); setSelected(null); }}>{PROGRAMS[game.program].short}</button>
        {sharedUnlocked(game) && <button className={tree === "global" ? "active" : ""} onClick={() => { setShared(true); setChapter(2); setSelected(null); }}>Laboratory</button>}
      </div>
      <div className="talents-budget"><strong>{game.talentPoints.toLocaleString("en")} <small>TP</small></strong><span>{ready.length} talents available</span></div>
      {onFunding && <button className="secondary" onClick={onFunding}>Buy talent points</button>}
      <button className="primary" onClick={onRun}>{game.trial ? "Back to experiment" : "Prepare experiment"} →</button>
    </header>
    <nav className="talent-chapters" aria-label="Talent chapters">
      {chapters.map((value, index) => <button key={value} className={displayChapter === value ? "active" : ""} title={ERA_NAMES[value]}
        onClick={() => { setChapter(value); setSelected(null); }} aria-current={displayChapter === value ? "page" : undefined}>
        <span>{String(index + 1).padStart(2, "0")}</span><b>{ERA_NAMES[value]}</b><small>{value > activeEra ? "Locked" : "Open"}</small>
      </button>)}
    </nav>
    <div className="talents-layout">
      <div className="talent-paths">
        <div className="talent-path-guide"><span><i className="ready" /> Affordable</span><span><i className="owned" /> Learned</span><span><i /> Locked</span><b>{ownedRanks.toLocaleString("en")} ranks learned</b></div>
        <div className="talent-columns" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(0, 1fr))` }}>
          {lanes.map((lane, index) => {
            const laneNodes = chapterNodes.filter(n => n.lane === index);
            const earliestEra = Math.min(...nodes.filter(n => n.lane === index).map(n => n.era));
            const laneLocked = earliestEra > activeEra;
            const isFork = laneNodes.some(n => n.choiceGroup);
            return <section className={`talent-column${isFork ? " has-fork" : ""}`} key={lane} aria-label={lane + " talent path"}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><h2>{lane}</h2></header>
              {isFork && <div className="talent-fork-label">Choose one specialization</div>}
              {laneLocked ? <div className="talent-lane-locked"><Glyph name="flag" /><b>{lane}</b><span>Opens with<br />{ERA_NAMES[earliestEra]}</span></div>
                : laneNodes.map(n => {
                  const owned = talentRank(game, n.id), can = afford(game, n.id), usable = available(game, n.id);
                  const rival = chosenAlternative(n, game.researched);
                  return <button key={n.id} className={`talent-card${can ? " affordable" : ""}${owned ? " learned" : ""}${!usable && !owned ? " locked" : ""}${rival ? " closed" : ""}${detail?.id === n.id ? " selected" : ""}`}
                    onClick={() => setSelected(n.id)} aria-label={`${n.name}, rank ${owned} of ${n.maxRank}, ${can ? "can afford" : talentGate(game, n)}`} aria-pressed={detail?.id === n.id}>
                    <div className="talent-card-top"><Glyph name={n.icon} /><span>{n.ability ? "Field skill" : n.maxRank === 1 ? "Breakthrough" : `Rank ${owned} / ${n.maxRank}`}</span></div>
                    <h3>{n.name}</h3><Effects node={n} compact />
                    <div className="talent-card-bottom"><b>{owned >= n.maxRank ? "Complete ✓" : rival ? "Other choice learned" : `${talentCost(game, n.id)} TP`}</b><span>{can ? "+" : usable ? "○" : owned ? "✓" : "◇"}</span></div>
                  </button>;
                })}
              {!laneLocked && !laneNodes.length && <p className="talent-empty-chapter">Continue in the next chapter.</p>}
            </section>;
          })}
        </div>
        <footer className="talent-tree-footnote">Learn one rank to open the next talent in the same path. Extra ranks deepen that talent. Specializations close one alternative.</footer>
      </div>
      {detail && <aside className="talent-detail" aria-label="Selected talent details">
        <div className="talent-detail-heading"><span>{LANES[tree][detail.lane]} · {ERA_NAMES[detail.era]}</span><div><Glyph name={detail.icon} /><h2>{detail.name}</h2></div><b>{detail.ability ? "Field skill · one purchase" : `Rank ${rank} / ${detail.maxRank}`}</b></div>
        <div className="talent-detail-scroll">
          <span className="talent-effect-heading">{detail.maxRank === 1 ? "Permanent effect" : "Each rank adds"}</span><Effects node={detail} />
          <p className="talent-description">{detail.description}</p>
          {alternatives.length > 0 && <div className="talent-choice-warning"><b>A permanent choice</b><p>Learning this closes {alternatives.map(n => n.name).join(" / ")}. The path joins again in the next chapter.</p></div>}
          {detail.requires.length > 0 && <div className="talent-prerequisites"><span>Previous talent</span>{detail.requires.map(id => <b key={id}>{NODE_MAP.get(id)?.name} {game.researched.includes(id) ? "✓" : ""}</b>)}</div>}
          {detail.anyOf?.length && <div className="talent-prerequisites"><span>Either specialization opens this</span>{detail.anyOf.map(id => <b key={id}>{NODE_MAP.get(id)?.name} {game.researched.includes(id) ? "✓" : ""}</b>)}</div>}
          {rank > 0 && detail.maxRank > 1 && <div className="talent-rank-track" aria-label={`${rank} ranks learned`}>{Array.from({ length: detail.maxRank }, (_, i) => <i className={i < rank ? "filled" : ""} key={i} />)}</div>}
        </div>
        <div className="talent-detail-purchase"><p>{talentGate(game, detail)}</p><button className="primary" disabled={!afford(game, detail.id)} onClick={() => setGame(s => research(s, detail.id))}>
          {currentMaxRank ? "Fully learned" : `${rank ? "Improve" : "Learn"} · ${talentCost(game, detail.id)} TP`}
        </button>{!currentMaxRank && available(game, detail.id) && game.talentPoints < talentCost(game, detail.id) && onFunding && <button className="talent-funding-link" onClick={onFunding}>Convert RP into talent points →</button>}</div>
      </aside>}
    </div>
  </section>;
}

export const FirstExperiments = Research;
