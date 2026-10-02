import { available, talentCost, talentRank, spentTalents, totalTrials, type Save } from './game';
import { NODES } from './research';
import { currentEra, DEVELOPMENT_PROJECTS, ERA_NAMES } from './development';
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
export function fundingPreview(s:Save,kind:ExchangeKind) {
  const quote=quoteExchange(s,kind);
  const balance=kind==='talent'?quote.balance:s.talentPoints;
  const choices=NODES.filter(n=>n.program===s.program&&available(s,n.id)&&talentCost(s,n.id)<=balance);
  // This is a count of choices, not a promise to purchase every choice.
  const availableRanks=choices.reduce((sum,n)=>sum+Math.min(n.maxRank-talentRank(s,n.id),Math.floor(balance/talentCost(s,n.id))),0);
  return {...quote,availableNodes:choices.length,availableRanks};
}
export function projectCost(s:Save,id:string) {
  const p=DEVELOPMENT_PROJECTS.find(p=>p.id===id);
  return p ? Math.min(1e15,Math.ceil(p.cost*Math.pow(1.32,s.development[id]??0))) : Infinity;
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
