import type { Dispatch, SetStateAction } from "react";
import { equipmentUnlocked, type Save } from "./game";
import {
  exchange, fundingPreview, projectAvailable, projectCost,
  projectShortfall, investProject, currentEra,
} from "./economy";
import { DEVELOPMENT_PROJECTS, ERA_NAMES } from "./development";
import Glyph from "./ResearchGlyph";

export type FundingDestination = "research" | "equipment" | "development";
type FundingProps = {
  game: Save;
  setGame: Dispatch<SetStateAction<Save>>;
  onNavigate: (destination: FundingDestination) => void;
};
const number = (value: number) => Math.floor(value).toLocaleString("en");

export function FundingRoutes({ game, setGame, onNavigate }: FundingProps) {
  const talent = fundingPreview(game, "talent"), voucher = fundingPreview(game, "voucher");
  const spend = (kind: "talent" | "voucher") => {
    setGame((s) => ({ ...exchange(s, kind), debriefPending: false }));
    onNavigate(kind === "talent" ? "research" : "equipment");
  };
  return <div className="funding-routes">
    <section className="funding-route talent-route">
      <div className="funding-route-heading"><Glyph name="orbit" /><span>01 / PERMANENT SKILLS</span></div>
      <h2>Talent Points</h2><p>Unlock a new talent or increase a talent's rank. Every rank keeps its benefits permanently.</p>
      <div className="funding-quote"><strong>+{number(talent.quantity)}</strong><span>TP</span><small>for {number(talent.cost)} RP{talent.capped ? " · 100,000-point batch" : talent.capacityLimited ? " · currency limit reached" : ""}</small></div>
      <div className="funding-affordability"><b>{talent.availableNodes} talent {talent.availableNodes === 1 ? "choice" : "choices"} affordable after funding</b><span>Choose how to spend {number(talent.balance)} TP. This is a count of options, not purchases.</span></div>
      <button className="primary" disabled={!talent.quantity && !game.talentPoints} onClick={() => spend("talent")}>{talent.quantity ? talent.capped ? "Buy batch · open talents →" : "Convert RP · open talents →" : "Open talents →"}</button>
      <small>{number(Math.max(0, Math.floor(game.science) - talent.cost))} RP stays in the bank</small>
    </section>
    <section className="funding-route voucher-route">
      <div className="funding-route-heading"><Glyph name="pack" /><span>02 / EQUIPMENT</span></div>
      <h2>Equipment vouchers</h2><p>Buy basic gear, upgrade its level and tune its stats. Later development eras open equipment evolutions.</p>
      <div className="funding-quote"><strong>+{number(voucher.quantity)}</strong><span>vouchers</span><small>for {number(voucher.cost)} RP{voucher.capped ? " · 100,000-voucher batch" : voucher.capacityLimited ? " · currency limit reached" : ""}</small></div>
      <div className="funding-affordability"><b>{number(voucher.balance)} vouchers after funding</b><span>{equipmentUnlocked(game) ? "Workshop available" : "Buying vouchers opens the workshop"}</span></div>
      <button className="primary" disabled={!voucher.quantity && !game.vouchers && !equipmentUnlocked(game)} onClick={() => spend("voucher")}>{voucher.quantity ? voucher.capped ? "Buy batch · open workshop →" : "Convert RP · open workshop →" : "Open workshop →"}</button>
      <small>{number(Math.max(0, Math.floor(game.science) - voucher.cost))} RP stays in the bank</small>
    </section>
    <section className="funding-route development-route">
      <div className="funding-route-heading"><Glyph name="gear" /><span>03 / DEVELOPMENT</span></div>
      <h2>Development projects</h2><p>Build facilities to unlock new talent chapters and gear. Expand the lab to earn more RP, XP or expedition support.</p>
      <div className="funding-quote"><strong>{number(game.science)}</strong><span>RP available</span><small>Choose a project and review its next stage</small></div>
      <div className="funding-affordability"><b>{DEVELOPMENT_PROJECTS.filter((project) => projectAvailable(game, project.id)).length} projects ready</b><span>Projects use RP directly</span></div>
      <button className="primary" onClick={() => { setGame((s) => ({ ...s, debriefPending: false })); onNavigate("development"); }}>Compare projects →</button><small>RP is spent only when you fund a stage</small>
    </section>
  </div>;
}

export default function FundingPanel({ game, setGame, onNavigate, development = false }: FundingProps & { development?: boolean }) {
  return <section className="funding-page">
    <div className="funding-heading"><div><span className="eyebrow">Motion Laboratory</span><h1>{development ? "Development" : "Fund the next improvement"}</h1><p>{development ? "Choose a project. Each funded stage has a lasting effect." : "Allocate your RP to the part of the experiment you want to improve."}</p></div><div className="funding-bank"><span>AVAILABLE RP</span><strong>{number(game.science)}</strong></div></div>
    <div className="funding-balances"><span><b>{number(game.talentPoints)}</b> Talent Points</span><span><b>{number(game.vouchers)}</b> Equipment vouchers</span><button className="text-button" onClick={() => onNavigate(development ? "research" : "development")}>{development ? "Open talents →" : "View development projects →"}</button></div>
    {!development ? <FundingRoutes game={game} setGame={setGame} onNavigate={onNavigate} /> : <DevelopmentProjects game={game} setGame={setGame} />}
  </section>;
}

export function DevelopmentProjects({ game, setGame }: Pick<FundingProps, "game" | "setGame">) {
  const activeEra = currentEra(game);
  return <div className="development-projects"><div className="development-era"><Glyph name="flag" /><span>Current era</span><b>{ERA_NAMES[activeEra]}</b></div><div className="development-grid">
    {DEVELOPMENT_PROJECTS.filter((project) => project.era <= activeEra).map((project) => {
      const rank = game.development[project.id] ?? 0, complete = rank >= project.maxRank;
      const cost = projectCost(game, project.id), shortfall = projectShortfall(game, project.id), ready = projectAvailable(game, project.id);
      return <article key={project.id} className={"development-card " + (complete ? "completed" : ready ? "ready" : "locked")}>
        <div className="development-card-top"><span>{complete ? "Complete" : ready ? "Ready to fund" : "Requirements remaining"}</span><b>{rank} / {project.maxRank} stages</b></div>
        <h2>{project.name}</h2><p>{project.description}</p>
        <div className="development-stage-track" aria-label={rank + " of " + project.maxRank + " stages completed"}>{Array.from({ length: project.maxRank }, (_, index) => <i key={index} className={index < rank ? "complete" : ""} />)}</div>
        {!complete && shortfall.length > 0 && <ul className="development-requirements">{shortfall.map((text) => <li key={text}>{text}</li>)}</ul>}
        <button className={complete ? "secondary" : "primary"} disabled={complete || !ready || game.science < cost} onClick={() => setGame((s) => investProject(s, project.id))}>{complete ? "All stages funded" : "Fund stage " + (rank + 1) + " · " + number(cost) + " RP"}</button>
      </article>;
    })}
  </div></div>;
}
