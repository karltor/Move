import type { Stat } from './research';

export const ERA_NAMES = ['Field science', 'Athletic science', 'Biomechanics', 'Bionic integration', 'Synthetic physiology', 'Inertial engineering', 'Metric engineering'];
export interface DevelopmentProject {
  id: string;
  name: string;
  description: string;
  era: number;
  cost: number;
  maxRank: number;
  requires: string[];
  requirement: { distance?: number; trials?: number; talents?: number; gearLevel?: number };
  effects?: Partial<Record<Stat, number>>;
  multipliers?: Partial<Record<Stat, number>>;
  opensEra?: number;
}
export const DEVELOPMENT_PROJECTS: DevelopmentProject[] = [
  { id:'athletics',name:'Build the training clinic',description:'Unlock athletic talents and carbon equipment. The team can now measure oxygen use and improve running technique.',era:0,cost:180,maxRank:1,requires:[],requirement:{distance:120,trials:3,talents:4},opensEra:1,multipliers:{yield:1.5} },
  { id:'biomechanics',name:'Open the biomechanics workshop',description:'Unlock assisted movement, organ monitoring and equipment upgrades through level 49.',era:1,cost:6000,maxRank:1,requires:['athletics'],requirement:{distance:1000,trials:12,talents:25,gearLevel:10},opensEra:2,multipliers:{yield:2} },
  { id:'bionics',name:'Integrate bionic limbs',description:'Unlock powered joints, implanted organs and a new class of high-speed talent. Equipment can reach level 74.',era:2,cost:120000,maxRank:1,requires:['biomechanics'],requirement:{distance:10000,trials:40,talents:80,gearLevel:25},opensEra:3,multipliers:{yield:3} },
  { id:'synthetics',name:'Develop synthetic physiology',description:'Unlock engineered organs and thermal control for sustained supersonic travel. Equipment can reach level 99.',era:3,cost:2500000,maxRank:1,requires:['bionics'],requirement:{distance:100000,trials:120,talents:170,gearLevel:50},opensEra:4,multipliers:{yield:4} },
  { id:'inertia',name:'Build the inertial test chamber',description:'Unlock inertia control and plasma propulsion. Equipment can evolve to level 100.',era:4,cost:60000000,maxRank:1,requires:['synthetics'],requirement:{distance:1000000,trials:350,talents:350,gearLevel:75},opensEra:5,multipliers:{yield:5} },
  { id:'metric',name:'Commission the metric laboratory',description:'Unlock field-driven movement, the final talent chapter and repeatable equipment overclocking.',era:5,cost:2000000000,maxRank:1,requires:['inertia'],requirement:{distance:10000000,trials:1000,talents:600,gearLevel:100},opensEra:6,multipliers:{yield:6} },
  { id:'data-network',name:'Expand the data network',description:'Each level adds 12% RP yield from experiments. New staff analyze the same measurements more thoroughly.',era:1,cost:300,maxRank:50,requires:['athletics'],requirement:{},effects:{yield:.12} },
  { id:'coaching',name:'Train the coaching team',description:'Each level adds 10% experience gain. Training levels keep growing after talents are learned.',era:1,cost:450,maxRank:50,requires:['athletics'],requirement:{},effects:{xp:.10} },
  { id:'logistics',name:'Build expedition support',description:'Each level adds 8% recovery and 6% fatigue resistance. Useful for longer runs and recovery pacing.',era:1,cost:600,maxRank:50,requires:['athletics'],requirement:{},effects:{recovery:.08,resilience:.06} },
  { id:'supply-lab',name:'Prepare field supplies',description:'Unlock three stamina rations per running experiment. Use them to extend a promising run; they are not needed for projectile launches.',era:1,cost:900,maxRank:1,requires:['athletics'],requirement:{} },
  { id:'thermal-station',name:'Expand thermal management',description:'Each level adds 10% cooling and 8% oxygen delivery for high-speed movement.',era:3,cost:50000,maxRank:50,requires:['bionics'],requirement:{},effects:{cooling:.10,oxygen:.08} },
];
export function currentEra(s: {development: Record<string, number>}) {
  return DEVELOPMENT_PROJECTS.reduce((era,p)=>s.development[p.id] > 0 && p.opensEra ? Math.max(era,p.opensEra) : era,0);
}
