import {BRICK_TYPES} from './bricks.js';
export const COLS=10;
const N='normal',R='reinforced',A='armored',E='explosive',B='bonus',U='unbreakable',X=null;
const tiers=['Beginner','Intermediate','Advanced','Expert','Master','Challenge'];
const row=(...cells)=>cells;
const L=[
 [row(X,X,N,N,N,N,N,N,X,X),row(X,N,N,N,N,N,N,N,N,X),row(N,N,N,N,B,B,N,N,N,N)],
 [row(N,X,N,X,N,N,X,N,X,N),row(N,N,N,N,N,N,N,N,N,N),row(X,N,X,N,B,B,N,X,N,X)],
 [row(N,N,N,N,N,N,N,N,N,N),row(X,N,N,N,R,R,N,N,N,X),row(X,X,N,N,B,B,N,N,X,X)],
 [row(N,X,X,N,N,N,N,X,X,N),row(X,N,N,X,R,R,X,N,N,X),row(X,X,N,N,B,B,N,N,X,X),row(X,X,X,N,N,N,N,X,X,X)],
 [row(N,N,N,N,R,R,N,N,N,N),row(N,X,N,X,N,N,X,N,X,N),row(N,N,B,N,N,N,N,B,N,N),row(X,N,N,N,N,N,N,N,N,X)],
 [row(R,N,N,N,R,R,N,N,N,R),row(N,N,X,N,N,N,N,X,N,N),row(X,N,N,B,N,N,B,N,N,X),row(N,X,N,N,N,N,N,N,X,N)],
 [row(N,R,N,R,N,N,R,N,R,N),row(N,N,N,N,B,B,N,N,N,N),row(X,N,X,N,R,R,N,X,N,X),row(N,N,N,N,N,N,N,N,N,N)],
 [row(R,R,N,N,N,N,N,N,R,R),row(R,X,N,X,B,B,X,N,X,R),row(N,N,N,N,R,R,N,N,N,N),row(X,N,N,N,N,N,N,N,N,X)],
 [row(N,N,R,R,R,R,R,R,N,N),row(N,X,N,N,B,B,N,N,X,N),row(R,N,N,X,N,N,X,N,N,R),row(N,N,N,N,N,N,N,N,N,N)],
 [row(R,N,R,N,R,R,N,R,N,R),row(N,B,N,N,N,N,N,N,B,N),row(R,N,N,R,N,N,R,N,N,R),row(N,N,N,N,R,R,N,N,N,N)],
 [row(A,N,N,R,R,R,R,N,N,A),row(N,X,E,N,B,B,N,E,X,N),row(R,N,N,N,A,A,N,N,N,R),row(X,N,R,N,N,N,N,R,N,X)],
 [row(N,R,A,R,N,N,R,A,R,N),row(N,N,N,E,B,B,E,N,N,N),row(R,X,N,N,A,A,N,N,X,R),row(N,N,R,N,N,N,N,R,N,N)],
 [row(A,A,N,N,R,R,N,N,A,A),row(N,X,R,E,N,N,E,R,X,N),row(N,N,N,N,B,B,N,N,N,N),row(R,N,A,N,N,N,N,A,N,R)],
 [row(N,R,N,A,R,R,A,N,R,N),row(E,N,N,N,B,B,N,N,N,E),row(N,A,X,R,N,N,R,X,A,N),row(R,N,N,N,A,A,N,N,N,R)],
 [row(A,N,R,N,A,A,N,R,N,A),row(N,E,N,R,B,B,R,N,E,N),row(R,N,A,N,R,R,N,A,N,R),row(N,N,N,N,U,U,N,N,N,N)],
 [row(A,R,A,R,A,A,R,A,R,A),row(N,E,N,E,B,B,E,N,E,N),row(R,N,U,N,R,R,N,U,N,R),row(N,A,N,N,N,N,N,N,A,N),row(R,N,N,R,N,N,R,N,N,R)],
 [row(U,N,A,N,R,R,N,A,N,U),row(N,E,N,R,B,B,R,N,E,N),row(A,N,R,N,A,A,N,R,N,A),row(N,U,N,N,R,R,N,N,U,N),row(R,N,N,A,N,N,A,N,N,R)],
 [row(A,A,R,R,U,U,R,R,A,A),row(N,E,N,N,B,B,N,N,E,N),row(R,N,A,N,R,R,N,A,N,R),row(U,N,N,A,N,N,A,N,N,U),row(N,R,N,N,A,A,N,N,R,N)],
 [row(U,R,A,R,A,A,R,A,R,U),row(N,E,N,E,B,B,E,N,E,N),row(A,N,U,N,R,R,N,U,N,A),row(R,A,N,N,A,A,N,N,A,R),row(N,N,R,N,N,N,N,R,N,N)],
 [row(A,R,U,R,A,A,R,U,R,A),row(E,N,E,N,B,B,N,E,N,E),row(R,A,N,U,R,R,U,N,A,R),row(N,R,A,N,A,A,N,A,R,N),row(U,N,N,R,N,N,R,N,N,U)],
 [row(A,A,R,U,R,R,U,R,A,A),row(E,N,E,N,B,B,N,E,N,E),row(R,U,A,N,A,A,N,A,U,R),row(N,R,N,A,R,R,A,N,R,N),row(U,N,R,N,A,A,N,R,N,U)],
 [row(U,A,R,A,U,U,A,R,A,U),row(N,E,N,E,B,B,E,N,E,N),row(A,R,U,N,A,A,N,U,R,A),row(R,N,A,R,N,N,R,A,N,R),row(N,U,N,N,R,R,N,N,U,N)],
 [row(A,U,A,R,A,A,R,A,U,A),row(E,N,E,N,B,B,N,E,N,E),row(R,A,N,U,R,R,U,N,A,R),row(N,R,A,N,A,A,N,A,R,N),row(U,N,R,N,U,U,N,R,N,U)],
 [row(U,A,U,A,R,R,A,U,A,U),row(N,E,N,E,B,B,E,N,E,N),row(A,R,A,N,U,U,N,A,R,A),row(R,N,U,A,N,N,A,U,N,R),row(N,R,N,R,A,A,R,N,R,N)],
 [row(A,R,A,U,A,A,U,A,R,A),row(E,N,E,N,B,B,N,E,N,E),row(R,U,N,A,R,R,A,N,U,R),row(N,A,R,N,U,U,N,R,A,N),row(U,N,A,R,N,N,R,A,N,U)],
 [row(U,A,U,R,A,A,R,U,A,U),row(E,N,E,N,B,B,N,E,N,E),row(A,R,A,U,N,N,U,A,R,A),row(R,N,U,N,A,A,N,U,N,R),row(N,A,N,R,U,U,R,N,A,N)],
 [row(A,U,A,U,R,R,U,A,U,A),row(N,E,N,E,B,B,E,N,E,N),row(U,R,A,N,A,A,N,A,R,U),row(R,A,N,U,R,R,U,N,A,R),row(N,U,R,N,A,A,N,R,U,N)],
 [row(U,A,R,A,U,U,A,R,A,U),row(E,N,E,N,B,B,N,E,N,E),row(A,U,N,R,A,A,R,N,U,A),row(R,N,A,U,R,R,U,A,N,R),row(U,R,N,A,N,N,A,N,R,U)],
 [row(A,U,A,R,U,U,R,A,U,A),row(E,N,E,N,B,B,N,E,N,E),row(U,A,R,N,A,A,N,R,A,U),row(R,U,N,A,R,R,A,N,U,R),row(N,R,U,N,A,A,N,U,R,N)],
 [row(U,A,U,A,U,U,A,U,A,U),row(E,R,E,R,B,B,R,E,R,E),row(A,U,A,U,A,A,U,A,U,A),row(R,A,U,A,R,R,A,U,A,R),row(U,R,A,R,U,U,R,A,R,U)]
];
const names=['Opening Arc','Checkers','Blue Steps','Diamond','Twin Towers','Gateway','Zigzag','Cornerstone','Crown','Five Lines','Fuse Box','Cross Current','Citadel','Twin Charges','Steel Gate','Voltage','Iron Garden','Bastion','Circuit','Fortress','Rampart','Labyrinth','Reactor','Stronghold','Gauntlet','Trial One','Trial Two','Trial Three','Trial Four','Final Matrix'];
const objectives=i=>{
 const tier=Math.floor(i/5), goal=i%4;
 if(!tier)return {type:'none'};
 if(goal===0)return {type:'time',limit:110-tier*8,label:`Finish within ${110-tier*8}s`};
 if(goal===1)return {type:'bonus',target:2,label:'Destroy 2 bonus bricks'};
 if(goal===2)return {type:'score',target:250+tier*125,label:`Reach ${250+tier*125} points`};
 return {type:'noLifeLost',label:'Finish without losing a life'};
};
export const LEVELS=L.map((layout,i)=>({id:i+1,name:names[i],tier:tiers[Math.floor(i/5)],layout,objective:objectives(i),powerups:{dropChance:Math.max(.08,.2-Math.floor(i/5)*.02)},stars:{clear:true,objective:true,parTime:Math.max(70,150-i*2)}}));
export function validateLevels(levels=LEVELS){
 const seen=new Set();const errors=[];
 for(const l of levels){const signature=JSON.stringify(l.layout);if(seen.has(signature))errors.push(`Level ${l.id}: duplicate layout`);seen.add(signature);
 if(l.layout.some(r=>r.length!==COLS))errors.push(`Level ${l.id}: row width`);
 const types=l.layout.flat().filter(Boolean);if(!types.length||!types.some(t=>BRICK_TYPES[t].behavior!=='solid'))errors.push(`Level ${l.id}: no completion target`);
 for(const t of types)if(!BRICK_TYPES[t])errors.push(`Level ${l.id}: unknown ${t}`);
 if(l.objective.type==='bonus'&&types.filter(t=>t==='bonus').length<l.objective.target)errors.push(`Level ${l.id}: impossible bonus objective`);
 }
 return errors;
}
export function createCampaign(){return {unlocked:1,selected:1,records:{}};}
export function rateLevel(level,stats){const objective=objectiveMet(level,stats);return {stars:1+Number(objective)+Number(stats.elapsed<=level.stars.parTime),objective};}
export function objectiveMet(level,s){switch(level.objective.type){case'none':return true;case'time':return s.elapsed<=level.objective.limit;case'bonus':return s.bonus>=level.objective.target;case'score':return s.score>=level.objective.target;case'noLifeLost':return s.livesLost===0;default:return false;}}
export function completeCampaignLevel(campaign,level,result){const old=campaign.records[level.id];campaign.records[level.id]={complete:true,stars:Math.max(old?.stars??0,result.stars),bestScore:Math.max(old?.bestScore??0,result.score),bestTime:Math.min(old?.bestTime??Infinity,result.elapsed)};campaign.unlocked=Math.max(campaign.unlocked,Math.min(30,level.id+1));return campaign;}
