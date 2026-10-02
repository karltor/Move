import {describe,it,expect} from 'vitest';
import {fresh,finish,start,step,research,restore,grantRP,stats,available,talentRank,spentTalents} from './game';
import {NODES} from './research';
import {exchange,quoteExchange,exchangePrice,fundingPreview,projectAvailable,investProject,projectShortfall,nextFacility,facilityProgress,CURRENCY_LIMIT,EXCHANGE_BATCH_LIMIT} from './economy';
import {DEVELOPMENT_PROJECTS,currentEra} from './development';
import {craftGear,upgradeGearTo} from './workshop';
import {gearPaths} from './equipment';
describe('RP funding',()=>{
 it('uses an exact quote and keeps all unspent RP',()=>{
  const s={...fresh(),science:100.8};
  for(const kind of ['talent','voucher'] as const){
   const q=quoteExchange(s,kind),n=exchange(s,kind);
   expect(q.quantity).toBeGreaterThan(0);
   expect(n.science+q.cost).toBeCloseTo(s.science);
   expect(n.currencyBought[kind]).toBe(q.quantity);
   expect(kind==='talent'?n.talentPoints:n.vouchers).toBe(q.balance);
   expect(q.nextPrice).toBeGreaterThan(n.science);
   expect(q.capped).toBe(false);
   expect(q.capacityLimited).toBe(false);
   expect(n.researched).toHaveLength(0);
  }
 });
 it('quotes a bounded exact batch and discloses when more currency remains affordable',()=>{
  for(const kind of ['talent','voucher'] as const){
   const s={...fresh(),science:1e15};
   const q=quoteExchange(s,kind),n=exchange(s,kind);
   const exactCost=Array.from({length:EXCHANGE_BATCH_LIMIT},(_,i)=>exchangePrice(kind,i)).reduce((a,b)=>a+b,0);
   expect(q.quantity).toBe(EXCHANGE_BATCH_LIMIT);expect(q.cost).toBe(exactCost);
   expect(q.capped).toBe(true);expect(q.capacityLimited).toBe(false);
   expect(n.science).toBe(s.science-exactCost);expect(n.science).toBeGreaterThanOrEqual(q.nextPrice);
   const exactBudget=quoteExchange(s,kind,q.cost);
   expect(exactBudget.quantity).toBe(EXCHANGE_BATCH_LIMIT);expect(exactBudget.capped).toBe(false);
   expect(quoteExchange({...s,science:1e16},kind,1e16).cost).toBe(q.cost);
  }
 });
 it('preserves legal purchases beyond one million talent points on reload',()=>{
  const s={...fresh(),science:1e15,talentPoints:1000000,currencyBought:{talent:1000000,voucher:0}};
  const n=exchange(s,'talent'),reloaded=restore(JSON.stringify(n));
  expect(n.talentPoints).toBeGreaterThan(1000000);
  expect(reloaded.talentPoints).toBe(n.talentPoints);
  expect(reloaded.currencyBought.talent).toBe(n.currencyBought.talent);
  expect(reloaded.science).toBe(n.science);
 });
 it('never exceeds wallet or purchase-history capacity when converting a large bank',()=>{
  for(const kind of ['talent','voucher'] as const){
   const s={...fresh(),science:1e15,talentPoints:kind==='talent'?CURRENCY_LIMIT-2:0,vouchers:kind==='voucher'?CURRENCY_LIMIT-2:0};
   const q=quoteExchange(s,kind),n=exchange(s,kind),reloaded=restore(JSON.stringify(n));
   expect(q.quantity).toBe(2);expect(q.capacityLimited).toBe(true);expect(q.capped).toBe(false);
   expect(kind==='talent'?n.talentPoints:n.vouchers).toBe(CURRENCY_LIMIT);
   expect(kind==='talent'?reloaded.talentPoints:reloaded.vouchers).toBe(CURRENCY_LIMIT);
   expect(quoteExchange(n,kind).quantity).toBe(0);
   const provenance={...fresh(),science:1e15,currencyBought:{talent:kind==='talent'?CURRENCY_LIMIT-1:0,voucher:kind==='voucher'?CURRENCY_LIMIT-1:0}};
   const capped=exchange(provenance,kind);
   expect(capped.currencyBought[kind]).toBeLessThanOrEqual(CURRENCY_LIMIT);
   expect(capped.currencyBought[kind]).toBe(CURRENCY_LIMIT);
   expect(quoteExchange({...capped,science:1e15},kind).quantity).toBe(0);
  }
 });
 it('never spends more than a reserved budget and makes bulk and single purchases equivalent',()=>{
  const s={...fresh(),science:10000};
  const bulk=exchange(s,'talent',1000);
  let single=s;
  for(let i=0;i<bulk.talentPoints;i++)single=exchange(single,'talent',exchangePrice('talent',single.currencyBought.talent));
  expect(single.science).toBe(bulk.science);
  expect(single.talentPoints).toBe(bulk.talentPoints);
  expect(bulk.science).toBeGreaterThanOrEqual(9000);
  expect(quoteExchange(s,'talent',NaN).quantity).toBe(0);
  expect(quoteExchange(s,'voucher',-1).quantity).toBe(0);
 });
 it('does not convert free points or mistake options for guaranteed purchases',()=>{
  const s=fresh();expect(exchange(s,'talent')).toBe(s);
  const funded=exchange({...s,science:18},'talent');expect(funded.talentPoints).toBe(1);
  const preview=fundingPreview({...s,science:18},'talent');
  expect(preview.availableNodes).toBe(NODES.filter(n=>n.program===funded.program&&available(funded,n.id)&&n.cost<=1).length);
  const learned=research(funded,'runner-0-0');
  expect(learned.science).toBe(funded.science);expect(learned.talentPoints).toBe(0);
  expect(research(learned,'runner-2-0')).toBe(learned);
 });
 it('raises prices through development instead of reducing expedition rewards',()=>{
  expect(exchangePrice('talent',500)).toBeGreaterThan(exchangePrice('talent',0));
  expect(exchangePrice('voucher',2000)).toBeGreaterThan(exchangePrice('voucher',0));
  let s=start(fresh(),5);for(let i=0;i<140&&s.trial;i++)s=step(s,.5);
  if(s.trial)s=finish(s);
  expect(s.science).toBeGreaterThanOrEqual(15);expect(s.science).toBeLessThan(30);
 });
 it('buys only useful basic talent points before the clinic and leaves RP for facilities',()=>{
  let s={...fresh(),science:10000};
  let q=fundingPreview(s,'talent');
  expect(q.quantity).toBe(6);expect(q.starterTalents).toBe(true);
  expect(q.availableRanks).toBe(3);
  s=exchange(s,'talent',q.cost);
  expect(s.talentPoints).toBe(6);expect(s.science).toBeGreaterThan(9800);
  expect(fundingPreview(s,'talent').quantity).toBe(0);
  s=research(s,'runner-0-0');
  expect(fundingPreview(s,'talent').quantity).toBe(0);
  s={...s,development:{athletics:1}};
  q=fundingPreview(s,'talent');
  expect(q.starterTalents).toBe(false);expect(q.quantity).toBeGreaterThan(6);
 });
 it('funds one meaningful starter equipment purchase at a time',()=>{
  let s={...fresh(),science:10000};
  s.progress.runner.trials=2;
  const before=fundingPreview(s,'voucher');
  expect(before.quantity).toBe(2);expect(before.cost).toBe(71);expect(before.starterEquipment).toBe(true);
  let funded=exchange(s,'voucher',before.cost);
  expect(funded.vouchers).toBe(2);expect(funded.science).toBe(9929);
  expect(fundingPreview(funded,'voucher').quantity).toBe(0);
  s=craftGear(funded,'runner','footwear');
  expect(s.vouchers).toBe(0);
  const fit=fundingPreview(s,'voucher');
  expect(fit.quantity).toBe(9);expect(fit.equipmentGoal?.action).toBe('Choose a fit');
  funded=exchange(s,'voucher',fit.cost);
  const item=s.inventory[0];
  s=upgradeGearTo(funded,item.id,5,gearPaths(item)[0].id);
  const improve=fundingPreview(s,'voucher');
  expect(improve.quantity).toBe(8);
  funded=exchange(s,'voucher',improve.cost);
  s=upgradeGearTo(funded,item.id,9);
  expect(s.inventory[0].upgradeLevel).toBe(9);expect(s.vouchers).toBe(0);
  expect(fundingPreview(s,'voucher').quantity).toBe(0);
  expect(fundingPreview(s,'voucher').starterEquipmentComplete).toBe(true);
  s={...s,development:{athletics:1}};
  expect(fundingPreview(s,'voucher').quantity).toBeGreaterThan(19);
 });
 it('keeps RP saved until vouchers can fund a complete starter purchase',()=>{
  const s={...fresh(),science:40};
  s.progress.runner.trials=2;
  let quote=fundingPreview(s,'voucher');
  expect(quote.quantity).toBe(0);expect(quote.cost).toBe(0);
  expect(quote.equipmentGoal?.vouchers).toBe(2);expect(quote.equipmentGoal?.rpCost).toBe(71);
  expect(exchange(s,'voucher',quote.cost)).toBe(s);
  quote=fundingPreview({...s,science:71},'voucher');
  expect(quote.quantity).toBe(2);expect(quote.cost).toBe(71);
  const partial={...s,vouchers:1,science:36,currencyBought:{talent:0,voucher:1}};
  quote=fundingPreview(partial,'voucher');
  expect(quote.quantity).toBe(1);expect(quote.balance).toBe(2);expect(quote.cost).toBe(36);
 });
 it('supports the temporary RP grant without buying milestones',()=>{
  const s=grantRP(fresh(),1e7);expect(s.science).toBe(1e7);
  expect(currentEra(s)).toBe(0);expect(s.researched).toHaveLength(0);
  expect(grantRP(s,NaN)).toBe(s);expect(grantRP(s,-10)).toBe(s);
  expect(grantRP(s,1e20).science).toBe(2e7);
 });
});
describe('development and ranks',()=>{
 it('requires measurements and talent investment before opening a chapter',()=>{
  let s={...fresh(),science:10000,talentPoints:100};
  expect(projectAvailable(s,'athletics')).toBe(false);
  expect(investProject(s,'athletics')).toBe(s);
  expect(projectShortfall(s,'athletics').join(' ')).toContain('experiments');
  s.progress.runner.trials=3;s.progress.runner.bestDistance=150;
  for(const id of ['runner-0-0','runner-1-0','runner-2-0','runner-0-1'])s=research(s,id);
  expect(spentTalents(s)).toBe(4);expect(projectAvailable(s,'athletics')).toBe(true);
  const n=investProject(s,'athletics');expect(currentEra(n)).toBe(1);
  expect(n.science).toBe(s.science-180);expect(stats(n).yield).toBeGreaterThan(stats(s).yield);
  expect(investProject(n,'athletics')).toBe(n);
 });
 it('validates wallets, ranks and project levels on reload',()=>{
  const s={...fresh(),science:100,talentPoints:7,vouchers:9,researched:['runner-0-0'],talentRanks:{'runner-0-0':4},development:{athletics:1,'data-network':3},currencyBought:{talent:10,voucher:8}};
  const n=restore(JSON.stringify(s));expect(n.talentPoints).toBe(7);expect(n.vouchers).toBe(9);
  expect(talentRank(n,'runner-0-0')).toBe(4);expect(currentEra(n)).toBe(1);
  const bad=restore(JSON.stringify({...s,talentPoints:-7,vouchers:'9',talentRanks:{'runner-0-0':1e9},development:{athletics:1e9,unknown:99}}));
  expect(bad.talentPoints).toBe(0);expect(bad.vouchers).toBe(0);
  expect(talentRank(bad,'runner-0-0')).toBe(NODES.find(n=>n.id==='runner-0-0')!.maxRank);
  expect(bad.development).not.toHaveProperty('unknown');expect(bad.development.athletics).toBe(1);
 });
 it('retains learned legacy discoveries as rank one without creating points',()=>{
  const n=restore(JSON.stringify({...fresh(),researched:['runner-0-0'],talentRanks:undefined,talentPoints:undefined}));
  expect(talentRank(n,'runner-0-0')).toBe(1);expect(n.talentPoints).toBe(0);
 });
 it('marks only manual results for a spending debrief',()=>{
  const manual=finish(start(fresh()));expect(manual.debriefPending).toBe(true);
  expect(start(manual).debriefPending).toBe(false);
  expect(finish(start({...fresh(),auto:true})).debriefPending).toBe(false);
 });
 it('adds new chapters through distinct facilities rather than RP alone',()=>{
  const s={...fresh(),science:1e12};
  for(const p of DEVELOPMENT_PROJECTS.filter(p=>p.opensEra))expect(projectAvailable(s,p.id)).toBe(false);
 });
 it('shows the next facility with progress that agrees with the actual purchase gate',()=>{
  const s=fresh();
  expect(nextFacility(s)?.id).toBe('athletics');
  const goals=facilityProgress(s,'athletics');
  expect(goals.map(g=>g.id)).toEqual(['distance','trials','talents','rp']);
  expect(goals.map(g=>g.target)).toEqual([120,3,4,180]);
  expect(goals.every(g=>!g.complete)).toBe(true);
  let ready={...s,science:180,talentPoints:4};
  ready.progress.runner.trials=3;ready.progress.runner.bestDistance=120;
  for(const id of ['runner-0-0','runner-1-0','runner-2-0','runner-0-1'])ready=research(ready,id);
  expect(facilityProgress(ready,'athletics').every(g=>g.complete)).toBe(true);
  expect(projectAvailable(ready,'athletics')).toBe(true);
  const built=investProject(ready,'athletics');
  expect(nextFacility(built)?.id).toBe('biomechanics');
  expect(built.science).toBe(0);
 });
});
