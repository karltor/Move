import type { Dispatch, SetStateAction } from "react";
import { equipmentUnlocked, totalTrials, type Save } from "./game";
import {
  exchange, fundingPreview, projectAvailable, projectCost,
  projectShortfall, investProject, currentEra, nextFacility, facilityProgress,
} from "./economy";
import { DEVELOPMENT_PROJECTS, ERA_NAMES, type DevelopmentProject } from "./development";

export type FundingDestination = "research" | "equipment" | "development";
type FundingProps = {
  game: Save;
  setGame: Dispatch<SetStateAction<Save>>;
  onNavigate: (destination: FundingDestination) => void;
};
const number = (value: number) => Math.floor(value).toLocaleString("en");
const artwork = (name: string) => `${import.meta.env.BASE_URL}menu-art/${name}.webp`;
const facilityNames: Record<string, string> = {
  athletics: "Training clinic", biomechanics: "Biomechanics workshop", bionics: "Bionic integration",
  synthetics: "Synthetic physiology", inertia: "Inertial test chamber", metric: "Metric laboratory",
};
const facilityArt = (project: DevelopmentProject) => project.id === "athletics" ? "clinic" : project.era < 2 ? "workbench" : "bionics";

function RouteArt({ name }: { name: string }) {
  return <div className="funding-art"><img src={artwork(name)} alt="" /></div>;
}

export function FacilityChecklist({ game, id }: { game: Save; id: string }) {
  return <ul className="facility-checklist" aria-label="Facility requirements">
    {facilityProgress(game, id).filter(goal => goal.id !== "rp").map(goal => <li key={goal.id} className={goal.complete ? "complete" : ""}>
      <span className="facility-check" aria-hidden="true">{goal.complete ? "✓" : "○"}</span>
      <span>{goal.label}</span><b>{number(goal.current)} / {number(goal.target)}{goal.id === "distance" ? " m" : ""}</b>
    </li>)}
  </ul>;
}

function FacilityCard({ game, setGame, onNavigate, project, compact = false }: FundingProps & { project: DevelopmentProject; compact?: boolean }) {
  const cost = projectCost(game, project.id), ready = projectAvailable(game, project.id);
  const goals = facilityProgress(game, project.id);
  const funds = goals.find(goal => goal.id === "rp")!;
  const remaining = goals.filter(goal => !goal.complete).length;
  const name = facilityNames[project.id] ?? project.name;
  const build = () => {
    setGame(s => {
      const funded = investProject(s, project.id);
      return funded === s ? s : { ...funded, debriefPending: false };
    });
    onNavigate("research");
  };
  return <section className={`funding-route facility-route ${ready ? "ready" : "locked"} ${compact ? "compact" : ""}`} aria-label={name}>
    <RouteArt name={facilityArt(project)} />
    <div className="funding-route-body">
      <div className="funding-route-heading"><span>{ready ? "READY TO BUILD" : "YOUR NEXT UNLOCK"}</span><b>{number(cost)} RP</b></div>
      <h2>{name}</h2>
      <p className="facility-reward">{project.id === "athletics" ? "Opens Athletic science: new talent paths, stronger training and carbon gear. Earn 50% more RP from runs." : project.description}</p>
      <FacilityChecklist game={game} id={project.id} />
      <div className={`facility-savings ${funds.complete ? "complete" : ""}`}><span>{funds.complete ? "✓ RP saved" : "RP saved"}</span><b>{number(funds.current)} / {number(cost)}</b><i><em style={{ width: `${funds.current / cost * 100}%` }} /></i></div>
      <button className="primary" disabled={!ready} onClick={build}>{ready ? `Build · ${number(cost)} RP → Talents` : `Locked · ${number(cost)} RP`}</button>
      <small>{ready ? "This opens the next set of talents." : `${remaining} ${remaining === 1 ? "goal" : "goals"} remaining. Complete the checklist to build.`}</small>
    </div>
  </section>;
}

export function FundingRoutes({ game, setGame, onNavigate }: FundingProps) {
  const talent = fundingPreview(game, "talent"), voucher = fundingPreview(game, "voucher");
  const workshopOpen = equipmentUnlocked(game), next = nextFacility(game);
  const otherProjects = DEVELOPMENT_PROJECTS.filter(project => !project.opensEra && project.era <= currentEra(game) && (game.development[project.id] ?? 0) < project.maxRank);
  const cheapest = Math.min(...otherProjects.map(project => projectCost(game, project.id)));
  const spend = (kind: "talent" | "voucher") => {
    setGame(s => ({ ...exchange(s, kind, fundingPreview(s, kind).cost), debriefPending: false }));
    onNavigate(kind === "talent" ? "research" : "equipment");
  };
  const talentLabel = talent.basicsComplete ? "View learned talents →" : talent.quantity ? `Buy ${number(talent.quantity)} ${talent.quantity === 1 ? "point" : "points"} · ${number(talent.cost)} RP → Talents` : game.talentPoints ? "Choose a talent →" : `Need ${number(talent.nextPrice)} RP for 1 point`;
  const gearGoal = voucher.equipmentGoal;
  const voucherLabel = voucher.quantity ? `Buy ${number(voucher.quantity)} ${voucher.quantity === 1 ? "voucher" : "vouchers"} · ${number(voucher.cost)} RP → ${gearGoal?.action ?? "Equipment"}` : gearGoal?.ready ? `${gearGoal.action} →` : gearGoal ? `Save ${number(Math.max(0, gearGoal.rpCost - game.science))} more RP` : "Open equipment →";
  return <div className="funding-routes">
    <section className="funding-route talent-route">
      <RouteArt name="training" />
      <div className="funding-route-body">
        <div className="funding-route-heading"><span>LEARN SOMETHING NEW</span><b>{number(game.talentPoints)} points owned</b></div>
        <h2>Talents</h2>
        {talent.basicsComplete ? <div className="funding-finished"><strong>Basics learned ✓</strong><p>Build the clinic to open further training and new talent paths.</p></div> : <>
          <p>Buy points, then choose a permanent improvement. Buying points does not choose a talent for you.</p>
          <div className="funding-quote"><strong>{talent.quantity ? `+${number(talent.quantity)}` : game.talentPoints ? number(game.talentPoints) : "1"}</strong><span>{talent.quantity ? `Talent ${talent.quantity === 1 ? "Point" : "Points"}` : game.talentPoints ? "points ready" : "Talent Point"}</span><small>{talent.quantity ? `for ${number(talent.cost)} RP` : game.talentPoints ? "Already owned · no RP needed" : `costs ${number(talent.nextPrice)} RP`}{talent.capped ? " · batch limit" : talent.capacityLimited ? " · currency limit" : ""}</small></div>
          <div className="funding-affordability"><b>{`${talent.availableNodes} ${talent.availableNodes === 1 ? "talent choice" : "talent choices"} affordable`}</b><span>{`${number(talent.balance)} points to spend${talent.quantity ? " after this purchase" : ""}`}</span></div>
        </>}
        <button className="primary" disabled={!talent.quantity && !game.talentPoints && !talent.basicsComplete} onClick={() => spend("talent")}>{talentLabel}</button>
        <small>{number(Math.max(0, Math.floor(game.science) - talent.cost))} RP kept{talent.starterTalents ? " · Save toward the clinic" : ""}</small>
      </div>
    </section>
    <section className={`funding-route voucher-route ${workshopOpen ? "" : "workshop-locked"}`}>
      <RouteArt name="shoes" />
      <div className="funding-route-body">
        <div className="funding-route-heading"><span>{workshopOpen ? "FIT BETTER GEAR" : "OPENS AFTER 2 RUNS"}</span>{workshopOpen && <b>{number(game.vouchers)} vouchers owned</b>}</div>
        <h2>Equipment</h2>
        {workshopOpen ? <>
          {voucher.starterEquipmentComplete ? <div className="funding-finished"><strong>Starter gear ready ✓</strong><p>The clinic opens stronger equipment and another workbench.</p></div> : <>
            <p>{gearGoal ? `${gearGoal.label}. Vouchers pay for this purchase in the workshop.` : "Vouchers pay for gear and upgrades. Choose what your scientist wears in the workshop."}</p>
            <div className="funding-quote"><strong>{voucher.quantity ? `+${number(voucher.quantity)}` : gearGoal ? number(gearGoal.vouchers) : game.vouchers ? number(game.vouchers) : "1"}</strong><span>{voucher.quantity ? voucher.quantity === 1 ? "voucher" : "vouchers" : gearGoal ? "vouchers needed" : game.vouchers ? "vouchers ready" : "voucher"}</span><small>{voucher.quantity ? `for ${number(voucher.cost)} RP` : gearGoal?.ready ? "Already owned · no RP needed" : gearGoal ? `${number(gearGoal.rpCost)} RP buys the ${number(gearGoal.needed)} missing ${gearGoal.needed === 1 ? "voucher" : "vouchers"}` : game.vouchers ? "Already owned · no RP needed" : `costs ${number(voucher.nextPrice)} RP`}{voucher.capped ? " · batch limit" : voucher.capacityLimited ? " · currency limit" : ""}</small></div>
            <div className="funding-affordability"><b>{gearGoal ? `${number(game.vouchers)} / ${number(gearGoal.vouchers)} vouchers saved` : `${number(voucher.balance)} vouchers after purchase`}</b><span>{gearGoal ? voucher.quantity ? "This funds the complete purchase; choose it in Equipment." : gearGoal.ready ? "Ready to spend in Equipment." : "Keep RP until the complete purchase is affordable." : "Choose your equipment before the next run"}</span></div>
          </>}
          <button className="primary" disabled={Boolean(gearGoal && !gearGoal.ready && !voucher.quantity)} onClick={() => spend("voucher")}>{voucherLabel}</button>
          {gearGoal && !gearGoal.ready && <button className="text-button funding-equipment-link" onClick={() => onNavigate("equipment")}>Open equipment without buying →</button>}
          <small>{number(Math.max(0, Math.floor(game.science) - voucher.cost))} RP kept{voucher.starterEquipment ? " · One purchase at a time" : ""}</small>
        </> : <>
          <p>Your first pair of running shoes is waiting. Finish two runs to open the workshop.</p>
          <div className="funding-coming-soon"><strong>{Math.min(2, totalTrials(game))}<span> / 2</span></strong><span>runs completed</span></div>
          <button className="primary" disabled>Workshop locked</button>
          <small>Keep running. No vouchers needed to unlock it.</small>
        </>}
      </div>
    </section>
    {next ? <FacilityCard game={game} setGame={setGame} onNavigate={onNavigate} project={next} /> : <section className="funding-route facility-route">
      <RouteArt name="clinic" /><div className="funding-route-body"><div className="funding-route-heading"><span>YOUR LABORATORY</span></div><h2>Facilities built</h2><p>Your laboratory is complete. Ongoing projects improve how the team trains, recovers and records results.</p><button className="primary" onClick={() => onNavigate("development")}>Open laboratory →</button></div>
    </section>}
    {otherProjects.length > 0 && <button className="funding-lab-link" onClick={() => onNavigate("development")}><span>Laboratory projects</span><b>{otherProjects.length} available to review · from {number(cheapest)} RP</b><span aria-hidden="true">→</span></button>}
  </div>;
}

export default function FundingPanel({ game, setGame, onNavigate, development = false }: FundingProps & { development?: boolean }) {
  const showVouchers = equipmentUnlocked(game);
  return <section className="funding-page">
    <div className="funding-heading"><div><span className="eyebrow">Motion Laboratory</span><h1>{development ? "Your laboratory" : "Make the next run better"}</h1><p>{development ? "Build your next facility or improve the team’s support." : "Choose where your RP goes. You can also save it for later."}</p></div><div className="funding-bank"><span>RP TO SPEND</span><strong>{number(game.science)}</strong></div></div>
    <div className="funding-balances"><span><b>{number(game.talentPoints)}</b> Talent Points</span>{showVouchers && <span><b>{number(game.vouchers)}</b> Equipment vouchers</span>}{development && <button className="text-button" onClick={() => onNavigate("research")}>Back to talents →</button>}</div>
    {!development ? <FundingRoutes game={game} setGame={setGame} onNavigate={onNavigate} /> : <DevelopmentProjects game={game} setGame={setGame} onNavigate={onNavigate} />}
  </section>;
}

export function DevelopmentProjects({ game, setGame, onNavigate = () => {} }: Pick<FundingProps, "game" | "setGame"> & Partial<Pick<FundingProps, "onNavigate">>) {
  const activeEra = currentEra(game), next = nextFacility(game);
  const projects = DEVELOPMENT_PROJECTS.filter(project => !project.opensEra && project.era <= activeEra);
  return <div className="development-projects">
    <div className="development-era"><span>{ERA_NAMES[activeEra]}</span><b>Next facility</b></div>
    {next && <FacilityCard game={game} setGame={setGame} onNavigate={onNavigate} project={next} compact />}
    {projects.length > 0 && <><h2 className="development-support-heading">Support the team</h2><div className="development-grid">
      {projects.map(project => {
        const rank = game.development[project.id] ?? 0, complete = rank >= project.maxRank;
        const cost = projectCost(game, project.id), shortfall = projectShortfall(game, project.id), ready = projectAvailable(game, project.id);
        return <article key={project.id} className={`development-card ${complete ? "completed" : ready ? "ready" : "locked"}`}>
          <img className="development-project-art" src={artwork(project.id === "coaching" ? "training" : project.id === "logistics" || project.id === "supply-lab" ? "vest" : "workbench")} alt="" />
          <div className="development-card-top"><span>{complete ? "Complete" : ready ? "Ready to fund" : "Locked"}</span><b>{project.maxRank > 1 ? `Level ${rank} / ${project.maxRank}` : rank ? "Built" : "New facility"}</b></div>
          <h2>{project.name}</h2><p>{project.description}</p>
          {!complete && shortfall.length > 0 && <ul className="development-requirements">{shortfall.map(text => <li key={text}>{text}</li>)}</ul>}
          <button className={complete ? "secondary" : "primary"} disabled={complete || !ready} onClick={() => setGame(s => investProject(s, project.id))}>{complete ? "Complete" : `${rank ? "Improve" : "Fund"} · ${number(cost)} RP`}</button>
        </article>;
      })}
    </div></>}
  </div>;
}
