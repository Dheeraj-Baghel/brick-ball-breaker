// Checkpoint 5 first slice: only fully implemented abilities enter the registry.
export const BALANCE={dropChance:.18,maxDrops:3,fallSpeed:90,size:22,lifeCap:5,baseWidth:112,wideWidth:168,slowFactor:.7,multiplier:2,barrierY:540,particleDuration:.65,particleCount:12,multiMax:3,multiAngle:.42,laserDuration:14,laserCooldown:.34,laserSpeed:520,laserDamage:1,magnetRadius:220,magnetStrength:125,magnetMaxTurn:95,stickyDuration:14,stickyMax:3,fireballDuration:12};
export const RARITIES={common:{weight:70},rare:{weight:24},epic:{weight:5},legendary:{weight:1}};
export const POWERUPS={
 wide:{name:'Wide Paddle',icon:'↔',color:'#94e3bf',rarity:'common',duration:16,probability:1,stack:'refresh',incompatible:[],condition:'active',description:'Wider paddle for 16 seconds.',tone:440},
 slow:{name:'Slow Ball',icon:'◷',color:'#91c9ff',rarity:'common',duration:12,probability:1,stack:'refresh',incompatible:[],condition:'active',description:'Ball travels at 70% speed. Controls stay responsive.',tone:330},
 life:{name:'Extra Life',icon:'♥',color:'#ffa1b6',rarity:'rare',duration:0,probability:.7,stack:'instant',incompatible:[],condition:'belowLifeCap',description:'Adds one life, capped at five.',tone:660},
 barrier:{name:'Emergency Barrier',icon:'▰',color:'#baa7ff',rarity:'rare',duration:18,charges:1,probability:1,stack:'refresh',incompatible:[],condition:'active',description:'One rescue bounce below the paddle, expires in 18 seconds.',tone:550},
 score:{name:'Score Multiplier',icon:'×2',color:'#f4d383',rarity:'rare',duration:14,probability:1,stack:'refresh',incompatible:[],condition:'active',description:'Double destruction rewards for 14 seconds.',tone:880},
 multi:{name:'Multi-ball',icon:'●●',color:'#ffb478',rarity:'rare',duration:0,probability:.65,stack:'instant',incompatible:[],condition:'active',description:'Splits play into three independently simulated balls, capped at three.',tone:740},
 laser:{name:'Laser Paddle',icon:'↑↑',color:'#ff728b',rarity:'epic',duration:14,probability:.55,stack:'refresh',incompatible:[],condition:'active',description:'Press F or tap FIRE to shoot paired brick-damaging bolts.',tone:990},
 magnet:{name:'Magnet Paddle',icon:'∪',color:'#62e0dc',rarity:'epic',duration:13,probability:.55,stack:'refresh',incompatible:[],condition:'active',description:'Gently bends nearby descending balls toward the paddle.',tone:520},
 sticky:{name:'Sticky Paddle',icon:'⌒',color:'#c6f58a',rarity:'rare',duration:14,charges:3,probability:.7,stack:'refresh',incompatible:[],condition:'active',description:'Catches up to three balls. Space, click or tap releases them.',tone:610},
 fireball:{name:'Fireball',icon:'◉',color:'#ff7d4f',rarity:'epic',duration:12,probability:.5,stack:'refresh',incompatible:[],condition:'active',description:'Balls pierce destructible bricks while damaging them.',tone:780}
};
export function createEffects(){return {active:{},drops:[],particles:[],projectiles:[],events:[],serial:0};}
export function hasEffect(g,id){return Boolean(g.effects?.active[id]);}
export function eligible(g,id){const d=POWERUPS[id];return Boolean(d)&&['playing','aiming'].includes(g.phase)&&(d.condition!=='belowLifeCap'||g.lives<(g.lifeCap??BALANCE.lifeCap));}
export function activate(g,id){
 if(!eligible(g,id))return false;
 if(id==='multi'&&(g.phase!=='playing'||g.balls.length>=BALANCE.multiMax))return false;
 if(!g.rewards.powers.includes(id))g.rewards.powers.push(id);
 const d=POWERUPS[id];
 for(const other of d.incompatible)delete g.effects.active[other];
 if(id==='multi')spawnMultiBall(g);
 else if(d.stack==='instant')g.lives=Math.min(g.lifeCap??BALANCE.lifeCap,g.lives+1);
 else {
  const old=g.effects.active[id];
  g.effects.active[id]={remaining:d.stack==='extend'&&old?Math.min(d.duration*2,old.remaining+d.duration):d.duration,charges:d.charges??0};
 }
 applyDerived(g);feedback(g,id,g.paddle.x+g.paddle.w/2,g.paddle.y);return true;
}
function applyDerived(g){
 const center=g.paddle.x+g.paddle.w/2;
 g.paddle.w=hasEffect(g,'wide')?BALANCE.wideWidth:BALANCE.baseWidth;
 g.paddle.x=Math.max(12,Math.min(800-g.paddle.w-12,center-g.paddle.w/2));
 if(g.phase==='aiming'){g.ball.x=g.paddle.x+g.paddle.w/2;g.ball.y=g.paddle.y-g.ball.r;}
}
export function clearEffects(g){if(!g.effects)return;g.effects=createEffects();applyDerived(g);}
export function rewardScale(g){return hasEffect(g,'score')?BALANCE.multiplier:1;}
// Speed is a simulation multiplier, never a mutation of stored velocity.
export function ballTimeScale(g){return hasEffect(g,'slow')?BALANCE.slowFactor:1;}
export function spawnDrop(g,brick,rng=Math.random){
 if(!g.effects||g.phase!=='playing'||g.effects.drops.length>=BALANCE.maxDrops||rng()>=(g.dropChance??BALANCE.dropChance))return;
 const choices=Object.entries(POWERUPS).filter(([id])=>eligible(g,id));
 const weight=([,d])=>RARITIES[d.rarity].weight*d.probability;
 let roll=rng()*choices.reduce((s,d)=>s+weight(d),0);
 const choice=choices.find(d=>(roll-=weight(d))<0);if(!choice)return;
 g.effects.drops.push({id:++g.effects.serial,type:choice[0],x:brick.x+brick.w/2,y:brick.y+brick.h/2});
}
export function feedback(g,id,x,y){
 g.effects.events.push(id);g.effects.events=g.effects.events.slice(-8);
 for(let i=0;i<BALANCE.particleCount;i++){
 const a=i*Math.PI*2/BALANCE.particleCount;
 g.effects.particles.push({x,y,vx:Math.cos(a)*75,vy:Math.sin(a)*75,life:BALANCE.particleDuration,color:POWERUPS[id].color});}
 g.effects.particles=g.effects.particles.slice(-72);
}
export function tickEffects(g,dt){
 for(const [id,e]of Object.entries(g.effects.active)){e.remaining-=dt;if(e.remaining<=0)delete g.effects.active[id];}
 applyDerived(g);
 for(const p of g.effects.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
 g.effects.particles=g.effects.particles.filter(p=>p.life>0);
 const laser=g.effects.active.laser;if(laser)laser.cooldown=Math.max(0,(laser.cooldown??0)-dt);
 for(const d of g.effects.drops){
 const before=d.y;d.y+=BALANCE.fallSpeed*dt;
 if(before-BALANCE.size/2<=g.paddle.y+g.paddle.h&&d.y+BALANCE.size/2>=g.paddle.y&&d.x+BALANCE.size/2>=g.paddle.x&&d.x-BALANCE.size/2<=g.paddle.x+g.paddle.w){activate(g,d.type);d.caught=true;}
 }
 g.effects.drops=g.effects.drops.filter(d=>!d.caught&&d.y<580);
}
export function spawnMultiBall(g){
 const source=g.balls?.find(b=>b.alive!==false)??g.ball;if(!source||g.phase!=='playing')return false;
 g.balls??=[source];const speed=Math.hypot(source.vx,source.vy)||315,base=Math.atan2(source.vy,source.vx);
 for(const delta of [-BALANCE.multiAngle,BALANCE.multiAngle]){if(g.balls.length>=BALANCE.multiMax)break;g.balls.push({...source,id:++g.effects.serial,vx:Math.cos(base+delta)*speed,vy:Math.sin(base+delta)*speed,alive:true});}
 feedback(g,'multi',source.x,source.y);return true;
}
export function fireLaser(g){const e=g.effects.active.laser;if(!e||g.phase!=='playing'||(e.cooldown??0)>0)return false;e.cooldown=BALANCE.laserCooldown;
 for(const x of [g.paddle.x+18,g.paddle.x+g.paddle.w-18])g.effects.projectiles.push({id:++g.effects.serial,x,y:g.paddle.y-4,vy:-BALANCE.laserSpeed,alive:true});
 feedback(g,'laser',g.paddle.x+g.paddle.w/2,g.paddle.y);return true;}
export function magnetForce(g,b,dt){if(!hasEffect(g,'magnet')||b.vy<=0)return;const target=g.paddle.x+g.paddle.w/2,dx=target-b.x,dy=g.paddle.y-b.y,d=Math.hypot(dx,dy);if(d>BALANCE.magnetRadius||d<1)return;
 const change=Math.max(-BALANCE.magnetMaxTurn*dt,Math.min(BALANCE.magnetMaxTurn*dt,dx/d*BALANCE.magnetStrength*dt));b.vx+=change;
 const speed=Math.hypot(b.vx,b.vy),nominal=315;if(speed>nominal*1.2){b.vx*=nominal*1.2/speed;b.vy*=nominal*1.2/speed;}}
export function catchSticky(g,b){const e=g.effects.active.sticky;if(!e||e.charges<=0)return false;e.charges--;b.stuck=true;b.stuckOffset=Math.max(-g.paddle.w/2+8,Math.min(g.paddle.w/2-8,b.x-(g.paddle.x+g.paddle.w/2)));b.vx=0;b.vy=0;if(e.charges<=0)delete g.effects.active.sticky;return true;}
export function releaseSticky(g){let released=false;for(const b of g.balls??[]){if(!b.stuck)continue;b.stuck=false;const angle=(b.stuckOffset/(g.paddle.w/2))*0.8,speed=315;b.vx=Math.sin(angle)*speed;b.vy=-Math.cos(angle)*speed;released=true;}return released;}
export function positionSticky(g){for(const b of g.balls??[])if(b.stuck){b.x=g.paddle.x+g.paddle.w/2+b.stuckOffset;b.y=g.paddle.y-b.r;}}
export function barrierBounce(g,oldY){
 const b=g.ball,e=g.effects.active.barrier;
 if(!e||e.charges<=0||b.vy<=0||oldY+b.r>BALANCE.barrierY||b.y+b.r<BALANCE.barrierY)return false;
 b.y=BALANCE.barrierY-b.r;b.vy=-Math.abs(b.vy);e.charges--;feedback(g,'barrier',b.x,b.y);delete g.effects.active.barrier;return true;
}
