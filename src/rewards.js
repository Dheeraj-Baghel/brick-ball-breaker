// All score sources use this ledger. Dead bricks never reach awardDestruction.
export const SCORING={comboWindow:3,comboStep:5,comboIncrement:.25,comboCap:3,completionBonus:100,timeBonusPerSecond:2,timeBonusCap:120,modeMultipliers:{campaign:1,endless:1,time:1,hardcore:1.25,challenge:1}};
export function createRewards(){return{clock:0,combo:0,bestCombo:0,lastHit:-Infinity,bricks:0,chain:0,base:0,comboBonus:0,completion:0,finished:false,events:[],powers:[],rallies:0};}
export function tickRewards(g,dt){const r=g.rewards;r.clock+=dt;if(r.clock-r.lastHit>SCORING.comboWindow)r.combo=0;}
export function resetCombo(g){g.rewards.combo=0;g.rewards.lastHit=-Infinity;}
export function awardDestruction(g,brick,powerScale){const r=g.rewards;r.combo=r.clock-r.lastHit<=SCORING.comboWindow?r.combo+1:1;r.lastHit=r.clock;r.bestCombo=Math.max(r.bestCombo,r.combo);r.bricks++;
 const combo=Math.min(SCORING.comboCap,1+Math.floor((r.combo-1)/SCORING.comboStep)*SCORING.comboIncrement),mode=SCORING.modeMultipliers[g.mode?.kind??'campaign']??1;
 const base=Math.round(brick.rule.score*powerScale*mode),points=Math.round(base*combo);g.score+=points;r.base+=base;r.comboBonus+=points-base;}
export function completionReward(g,parTime=120){const r=g.rewards;if(r.finished)return 0;r.finished=true;
 const bonus=Math.round((SCORING.completionBonus+Math.min(SCORING.timeBonusCap,Math.max(0,parTime-g.stats.elapsed))*SCORING.timeBonusPerSecond)*(SCORING.modeMultipliers[g.mode?.kind??'campaign']??1));g.score+=bonus;r.completion+=bonus;return bonus;}
export const ACHIEVEMENTS=[
 ['first','First crack','bricks',1],['hundred','Century breaker','bricks',100],['fivehundred','Demolition crew','bricks',500],['thousand','Wall legend','bricks',1000],
 ['score1','Four figures','bestScore',1000],['score5','High roller','bestScore',5000],['score10','Score legend','bestScore',10000],
 ['combo5','Getting warm','combo',5],['combo10','On a roll','combo',10],['combo20','Unstoppable','combo',20],
 ['chain3','Chain spark','chain',3],['chain6','Chain master','chain',6],
 ['level1','First clear','levels',1],['level5','Campaign explorer','levels',5],['level15','Halfway hero','levels',15],['level30','Campaign champion','levels',30],
 ['clean','Untouched','clean',1],['powers','Toolbox','powerCount',10],['endless1','Endless contender','endlessBest',1000],['endless5','Endless elite','endlessBest',5000],
 ['challenges','Ten trials','challenges',10],['stars','Beginner perfection','groupStars',15],['rally','Safe hands','rallies',25]
].map(([id,name,stat,target])=>({id,name,stat,target}));
export const COSMETICS={paddles:[{id:'classic',name:'Mint',color:'#c2eddc'},{id:'coral',name:'Coral',color:'#ff987e',achievement:'first'},{id:'gold',name:'Gold',color:'#f5d37b',achievement:'level5'}],trails:[{id:'none',name:'None'},{id:'aqua',name:'Aqua streak',color:'#62e0dc',achievement:'combo5'},{id:'violet',name:'Violet streak',color:'#c6a4ff',achievement:'hundred'}],themes:[{id:'classic',name:'Original'},{id:'ocean',name:'Ocean',color:'#65bad1',achievement:'level1'},{id:'sunset',name:'Sunset',color:'#edac8d',achievement:'chain3'}]};
export function createProfile(){return{stats:{bricks:0,bestScore:0,combo:0,chain:0,levels:0,clean:0,powerCount:0,endlessBest:0,challenges:0,groupStars:0,rallies:0},unlocked:[],powers:[],medals:{clean:0,combo:0},selected:{paddles:'classic',trails:'none',themes:'classic'},notifications:[]};}
export function checkAchievements(p){for(const a of ACHIEVEMENTS)if(!p.unlocked.includes(a.id)&&p.stats[a.stat]>=a.target){p.unlocked.push(a.id);p.notifications.push(a.name);}p.notifications=p.notifications.slice(-8);}
export function collectProgress(p,g,campaign,modeState){const r=g.rewards;
 // Cursor is stored on the run ledger, so repeated UI frames cannot farm totals.
 const prior=r.reported??{bricks:0,rallies:0};p.stats.bricks+=r.bricks-prior.bricks;p.stats.rallies+=r.rallies-prior.rallies;r.reported={bricks:r.bricks,rallies:r.rallies};
 p.stats.bestScore=Math.max(p.stats.bestScore,g.score);p.stats.combo=Math.max(p.stats.combo,r.bestCombo);p.stats.chain=Math.max(p.stats.chain,r.chain);
 for(const id of r.powers)if(!p.powers.includes(id))p.powers.push(id);p.stats.powerCount=p.powers.length;
 p.stats.levels=Object.values(campaign.records).filter(x=>x.complete).length;p.stats.challenges=Object.values(modeState.challenges).filter(x=>x.complete).length;p.stats.endlessBest=modeState.runBest.endless;
 p.stats.groupStars=Array.from({length:5},(_,i)=>campaign.records[i+1]?.stars??0).reduce((a,b)=>a+b,0);
 checkAchievements(p);}
export function finishMedals(p,g){const r=g.rewards;if(r.medalsReported||g.phase!=='complete')return;r.medalsReported=true;
 if(g.stats.livesLost===0){p.stats.clean++;p.medals.clean++;}if(r.bestCombo>=10)p.medals.combo++;checkAchievements(p);}
export function cosmeticUnlocked(p,item){return !item.achievement||p.unlocked.includes(item.achievement);}
export function selectCosmetic(p,group,id){const item=COSMETICS[group]?.find(x=>x.id===id);if(!item||!cosmeticUnlocked(p,item))return false;p.selected[group]=id;return true;}
