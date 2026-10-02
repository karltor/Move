import { available, talentCost, talentRank, talentLimit, spentTalents, totalTrials, type Save } from './game';
import { NODES } from './research';
import { currentEra, DEVELOPMENT_PROJECTS, ERA_NAMES } from './development';
import { beginnerVoucherNeed, CRAFT_CATALOG, workshopSlots, quoteUpgrade } from './workshop';
import { gearPaths } from './equipment';
export { currentEra, DEVELOPMENT_PROJECTS, ERA_NAMES } from './development';
export type ExchangeKind = 'talent' | 'voucher';
export const EXCHANGE_BATCH_LIMIT = 100000;
export const CURRENCY_LIMIT = 1e12;
export function exchangePrice(kind: ExchangeKind, bought: number) {
  const count=Math.max(0,Math.floor(bought));
  return Math.min(1e15,Math.ceil(kind==='talent' ? 15*Math.pow(1+count/75,1.65) : 35*Math.pow(1+count/300,1.4)));
}
export function quoteExchange(s: Save, kind: ExchangeKind, budget=s.science) {
  const limit=Math.max(0,Math.min(1e15,Math.floor(s.science),Number.isFinite(budget) ? Math.floor(budget) : 0));
  const bought=s.currencyBought[kind];
  const held=kind==='talent'?s.talentPoints:s.vouchers;
  const capacity=Math.max(0,Math.floor(Math.min(CURRENCY_LIMIT-held,CURRENCY_LIMIT-bought)));
  const maxQuantity=Math.min(EXCHANGE_BATCH_LIMIT,capacity);
  let quantity=0,cost=0;
  // Exact integer prices, with an explicit batch limit for very large banks.
  // Wallet and purchase-history limits match the save format.
  while(quantity<maxQuantity) {
    const next=exchangePrice(kind,bought+quantity);
    if(next>limit-cost) break;
    cost+=next; quantity++;
  }
  const nextPrice=exchangePrice(kind,bought+quantity);
  const canAffordMore=nextPrice<=limit-cost;
  return {quantity,cost,nextPrice,balance:held+quantity,
    capped:quantity===EXCHANGE_BATCH_LIMIT&&quantity<capacity&&canAffordMore,
    capacityLimited:quantity===capacity&&canAffordMore};
}
export function exchange(s: Save,kind: ExchangeKind,budget=s.science):Save {
  const quote=quoteExchange(s,kind,budget);
  if(!quote.quantity)return s;
  return {...s,science:s.science-quote.cost,
    talentPoints:kind==='talent'?quote.balance:s.talentPoints,
    vouchers:kind==='voucher'?quote.balance:s.vouchers,
    currencyBought:{...s.currencyBought,[kind]:s.currencyBought[kind]+quote.quantity},
    notice:`${quote.cost.toLocaleString('en')} RP converted into ${quote.quantity.toLocaleString('en')} ${kind==='talent'?'talent points':'equipment vouchers'}.`};
}
/** Fund one visible purchase at a time while the starter workshop is small. */
export function starterEquipmentGoal(s: Save) {
  const programs=[s.program,...s.unlocked.filter(program=>program!==s.program)];
  for(const program of programs) for(const slot of workshopSlots(s,program)) {
    const item=s.inventory.filter(gear=>gear.program===program&&gear.slot===slot)
      .sort((a,b)=>Number(s.equipped.includes(b.id))-Number(s.equipped.includes(a.id))||(b.upgradeLevel??0)-(a.upgradeLevel??0))[0];
    let vouchers=0, label='', action='';
    if(!item) {
      vouchers=CRAFT_CATALOG[program][slot].cost;
      label=`Build ${CRAFT_CATALOG[program][slot].name.toLowerCase()}`;
      action=slot==='footwear'&&program==='runner'?'Build shoes':label;
    } else if((item.upgradeLevel??0)<9) {
      const target=(item.upgradeLevel??0)<5?5:9;
      vouchers=quoteUpgrade({...s,trial:null},item.id,target,item.upgradePath?undefined:gearPaths(item)[0].id).cost;
      label=target===5?`Choose a fit for ${item.name.toLowerCase()}`:`Improve ${item.name.toLowerCase()} to level 9`;
      action=target===5?'Choose a fit':'Improve gear';
    }
    if(!vouchers)continue;
    const needed=Math.max(0,vouchers-s.vouchers);
    let rpCost=0;
    for(let index=0;index<needed;index++)rpCost+=exchangePrice('voucher',s.currencyBought.voucher+index);
    return {label,action,program,slot,gearId:item?.id??null,vouchers,needed,rpCost,ready:s.vouchers>=vouchers};
  }
  return null;
}
export function fundingPreview(s:Save,kind:ExchangeKind) {
  let budget=s.science;
  const starterTalents=kind==='talent'&&currentEra(s)===0;
  const starterEquipment=kind==='voucher'&&currentEra(s)===0;
  const equipmentGoal=starterEquipment?starterEquipmentGoal(s):null;
  if(starterTalents) {
    // Buy enough for every basic discovery, including the next steps in a path.
    // Banking hundreds of unusable points before the clinic obscures the next goal.
    const needed=Math.max(0,NODES.filter(n=>n.program===s.program&&n.era===0)
      .reduce((sum,n)=>sum+Math.max(0,talentLimit(s,n.id)-talentRank(s,n.id))*talentCost(s,n.id),0)-s.talentPoints);
    budget=0;
    for(let index=0;index<needed;index++)budget+=exchangePrice(kind,s.currencyBought[kind]+index);
  }
  if(starterEquipment) {
    // A partial conversion cannot build or fit the item. Keep the RP until the
    // whole visible purchase is affordable; existing vouchers still count.
    budget=equipmentGoal&&s.science>=equipmentGoal.rpCost?equipmentGoal.rpCost:0;
  }
  const quote=quoteExchange(s,kind,budget);
  const balance=kind==='talent'?quote.balance:s.talentPoints;
  const choices=NODES.filter(n=>n.program===s.program&&available(s,n.id)&&talentCost(s,n.id)<=balance);
  // This is a count of choices, not a promise to purchase every choice.
  const availableRanks=choices.reduce((sum,n)=>sum+Math.min(talentLimit(s,n.id)-talentRank(s,n.id),Math.floor(balance/talentCost(s,n.id))),0);
  const basicsComplete=starterTalents&&NODES.filter(n=>n.program===s.program&&n.era===0).every(n=>talentRank(s,n.id)>=talentLimit(s,n.id));
  const starterEquipmentComplete=starterEquipment&&beginnerVoucherNeed(s)===0;
  return {...quote,starterTalents,starterEquipment,equipmentGoal,starterEquipmentComplete,basicsComplete,availableNodes:choices.length,availableRanks};
}
export function projectCost(s:Save,id:string) {
  const p=DEVELOPMENT_PROJECTS.find(p=>p.id===id);
  return p ? Math.min(1e15,Math.ceil(p.cost*Math.pow(1.32,s.development[id]??0))) : Infinity;
}
export interface FacilityGoal {
  id: string;
  label: string;
  current: number;
  target: number;
  complete: boolean;
}
/** The next facility is visible as a goal; facilities further ahead stay undisclosed. */
export function nextFacility(s: Save) {
  return DEVELOPMENT_PROJECTS.find(project => project.opensEra && project.era <= currentEra(s)
    && (s.development[project.id] ?? 0) < project.maxRank);
}
export function facilityProgress(s: Save, id: string): FacilityGoal[] {
  const project = DEVELOPMENT_PROJECTS.find(project => project.id === id);
  if (!project) return [];
  const best = Math.max(0, ...Object.values(s.progress).map(progress => progress.bestDistance));
  const gear = Math.max(0, ...s.inventory.map(item => item.upgradeLevel ?? 0));
  const goals: FacilityGoal[] = [];
  const add = (goalId: string, label: string, current: number, target: number) => {
    goals.push({ id: goalId, label, current: Math.min(target, Math.floor(current)), target, complete: current >= target });
  };
  const requirement = project.requirement;
  if (requirement.distance) add('distance', `Reach ${requirement.distance.toLocaleString('en')} m in one run`, best, requirement.distance);
  if (requirement.trials) add('trials', `Complete ${requirement.trials.toLocaleString('en')} runs`, totalTrials(s), requirement.trials);
  if (requirement.talents) add('talents', project.id === 'athletics' ? 'Learn 4 basic talents' : `Learn ${requirement.talents.toLocaleString('en')} talent ranks`, spentTalents(s), requirement.talents);
  if (requirement.gearLevel) add('gear', `Upgrade gear to level ${requirement.gearLevel}`, gear, requirement.gearLevel);
  add('rp', `Save ${projectCost(s, id).toLocaleString('en')} RP`, s.science, projectCost(s, id));
  return goals;
}
export function projectShortfall(s:Save,id:string) {
  const p=DEVELOPMENT_PROJECTS.find(p=>p.id===id);
  if(!p)return ['Unknown project'];
  const rank=s.development[id]??0;
  if(rank>=p.maxRank)return ['Completed'];
  const missing:string[]=[];
  if(currentEra(s)<p.era)missing.push(`Open ${ERA_NAMES[p.era]}`);
  for(const required of p.requires)if(!(s.development[required]>0))missing.push(`Complete ${DEVELOPMENT_PROJECTS.find(x=>x.id===required)?.name??required}`);
  const req=p.requirement;
  const best=Math.max(...Object.values(s.progress).map(x=>x.bestDistance));
  const gear=Math.max(0,...s.inventory.map(g=>g.upgradeLevel??0));
  if(req.distance && best<req.distance)missing.push(`Reach ${req.distance.toLocaleString('en')} m in one experiment (${Math.floor(best).toLocaleString('en')} m recorded)`);
  if(req.trials && totalTrials(s)<req.trials)missing.push(`Complete ${req.trials} experiments (${totalTrials(s)} completed)`);
  if(req.talents && spentTalents(s)<req.talents)missing.push(`Learn ${req.talents} talent ranks (${spentTalents(s)} learned)`);
  if(req.gearLevel && gear<req.gearLevel)missing.push(`Upgrade a piece of gear to level ${req.gearLevel} (highest ${gear})`);
  if(s.science<projectCost(s,id))missing.push(`${Math.ceil(projectCost(s,id)-s.science).toLocaleString('en')} more RP`);
  return missing;
}
export function projectAvailable(s:Save,id:string) {return projectShortfall(s,id).length===0;}
export function investProject(s:Save,id:string):Save {
  if(!projectAvailable(s,id))return s;
  const p=DEVELOPMENT_PROJECTS.find(p=>p.id===id)!;
  return {...s,science:s.science-projectCost(s,id),development:{...s.development,[id]:(s.development[id]??0)+1},notice:p.opensEra?`${ERA_NAMES[p.opensEra]} is open. New talent chapters and equipment evolutions are available.`:`${p.name} expanded.`};
}
