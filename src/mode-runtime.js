// Mode lifecycle wraps the established engine; campaign still uses LEVELS.
import {createGame,updateGame} from './game.js';
import {clearEffects} from './powerups.js';
import {LEVELS,objectiveMet} from './levels.js';
import {CHALLENGES,endlessLayout} from './modes.js';
export const MODE_BALANCE={timeLimit:120,endlessSpeedStep:.045,maxSpeed:1.55,hardcoreSpeed:1.18,hardcoreLives:1,defaultLives:3};
export function makeModeGame(kind,{wave=1,challengeId=1,timeLimit=MODE_BALANCE.timeLimit}={}){
 const challenge=CHALLENGES[challengeId-1];
 const layout=kind==='challenge'?challenge.layout:kind==='hardcore'?LEVELS[19].layout:endlessLayout(wave);
 const g=createGame({layout,level:kind==='challenge'?challengeId:wave,objective:kind==='challenge'?challenge.objective:{type:'none'},dropChance:kind==='hardcore'?.1:.16});
 g.mode={kind,wave,challengeId,timeLimit:kind==='time'?timeLimit:null,clock:0,started:false,
 speedScale:kind==='hardcore'?MODE_BALANCE.hardcoreSpeed:kind==='endless'?Math.min(MODE_BALANCE.maxSpeed,1+(wave-1)*MODE_BALANCE.endlessSpeedStep):1};
 g.lifeCap=kind==='hardcore'?1:5;g.lives=kind==='hardcore'?1:3;g.phase='aiming';return g;
}
export function updateModeGame(g,dt,input){
 if(!['aiming','playing'].includes(g.phase)||!Number.isFinite(dt)||dt<=0)return;
 const delta=Math.min(dt,.05);
 if(g.phase==='playing'&&g.mode)g.mode.started=true;
 // Run countdown includes aiming after launch/life loss, but not paused time.
 if(g.mode?.started){g.mode.clock+=delta;}
 updateGame(g,delta,input);
 if(g.mode?.kind==='time'&&g.mode.clock>=g.mode.timeLimit){g.phase='timedout';clearEffects(g);}
 if(g.mode?.kind==='challenge'&&g.objective.type==='time'&&g.mode.clock>g.objective.limit&&g.phase!=='complete'){g.phase='gameover';clearEffects(g);}
}
export function nextModeWave(g){const next=makeModeGame(g.mode.kind,{wave:g.mode.wave+1,timeLimit:g.mode.timeLimit});next.score=g.score;next.lives=g.lives;next.stats={...g.stats};next.mode.clock=g.mode.clock;next.mode.started=g.mode.started;next.rewards=structuredClone(g.rewards);next.rewards.finished=false;next.rewards.medalsReported=false;next.rewards.combo=0;next.rewards.lastHit=-Infinity;return next;}
export function challengeSuccess(g){return g.phase==='complete'&&objectiveMet(CHALLENGES[g.mode.challengeId-1],{...g.stats,elapsed:g.mode.clock,score:g.score});}
