import {WIDTH,HEIGHT} from './game.js';
import {renderPowerups} from './powerup-ui.js';
import {POWERUPS} from './powerups.js';
import {INK,MOTION,reducedMotion,cosmeticColor,drawIcon} from './art.js';
// Visual-only state. Nothing here is read by physics, scoring or the snapshot.
// Effect time advances only while unpaused, so pause freezes every animation.
const scenes=new WeakMap(),ballHistory=new WeakMap();let background;
export const POOL_SIZE=96,TRAIL=7;
const BRICK_COLORS={normal:INK.sage,reinforced:INK.teal,armored:'#a49d87',explosive:INK.clay,bonus:INK.ochre,unbreakable:'#666b61'};
const BANNERS={life:'+1 LIFE',rescue:'BARRIER SPENT · BALL SAVED',multi:'MULTI-BALL',lose:'LIFE LOST · RESET & REFOCUS'};
function arenaSurface(){if(background)return background;background=document.createElement('canvas');background.width=WIDTH;background.height=HEIGHT;const c=background.getContext('2d');c.fillStyle=INK.charcoal;c.fillRect(0,0,WIDTH,HEIGHT);
 for(let i=0;i<5800;i++){const x=(i*127.31)%WIDTH,y=(i*53.79)%HEIGHT;c.fillStyle=i%2?'#f3efe405':'#0000000a';c.fillRect(x,y,1+(i%3)*.3,1);}
 c.strokeStyle='#f3efe417';c.lineWidth=1;c.beginPath();c.moveTo(14,46);c.lineTo(786,46);c.moveTo(14,482);c.lineTo(14,546);c.lineTo(50,546);c.moveTo(750,546);c.lineTo(786,546);c.lineTo(786,482);c.stroke();return background;}
function sceneFor(g){let s=scenes.get(g);if(!s){
 // Pool allocated once per game; spawning reuses slots, oldest overwritten.
 const pool=Array.from({length:POOL_SIZE},()=>({live:false,x:0,y:0,vx:0,vy:0,start:0,life:0,color:'',kind:0}));
 s={health:new Map(),pool,cursor:0,t:0,last:performance.now(),paddleHit:-1e9,lastLives:g.lives,balls:g.balls.length,active:new Set(Object.keys(g.effects.active)),barrier:g.effects.active.barrier!==undefined,shots:new Map(),banner:'',bannerAt:-1e9,bannerTone:INK.ivory};
 for(const b of g.bricks)s.health.set(b,{hp:b.health,alive:b.alive,hit:-1e9});scenes.set(g,s);}return s;}
export function liveParticles(g){const s=scenes.get(g);return s?s.pool.filter(p=>p.live).length:0;}
function spawn(s,x,y,vx,vy,life,color,kind=0){const p=s.pool[s.cursor];s.cursor=(s.cursor+1)%POOL_SIZE;p.live=true;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.start=s.t;p.life=life;p.color=color;p.kind=kind;}
function burst(s,x,y,count,speed,color,life=MOTION.shatter){if(reducedMotion())return;for(let i=0;i<count;i++){const a=(i/count)*Math.PI*2+i*.37;spawn(s,x,y,Math.cos(a)*speed,Math.sin(a)*speed*.65,life,color);}}
function ring(s,x,y,color,life=260){if(!reducedMotion())spawn(s,x,y,0,0,life,color,1);}
function banner(s,text,tone=INK.ivory){s.banner=text;s.bannerAt=s.t;s.bannerTone=tone;}
function drawBrick(ctx,b,hit,t,theme){const compression=reducedMotion()?0:Math.max(0,1-(t-hit)/MOTION.impact);const inset=compression*1.5;
 ctx.save();ctx.translate(0,inset);ctx.fillStyle='#00000030';ctx.beginPath();ctx.roundRect(b.x,b.y+2,b.w,b.h,2);ctx.fill();ctx.fillStyle=theme&&b.type==='normal'?theme:BRICK_COLORS[b.type]??INK.sage;ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h-inset,2);ctx.fill();
 ctx.fillStyle='#f3efe428';ctx.fillRect(b.x+2,b.y+1,b.w-4,1);ctx.fillStyle='#25282328';ctx.fillRect(b.x+2,b.y+b.h-3,b.w-4,2);
 ctx.strokeStyle='#25282390';ctx.fillStyle=INK.charcoal;ctx.lineWidth=1;const cx=b.x+b.w/2,cy=b.y+b.h/2;
 if(b.type==='reinforced'||b.type==='armored'){ctx.strokeRect(b.x+3,b.y+3,b.w-6,b.h-6);if(b.type==='armored'){ctx.fillStyle='#34372f30';ctx.fillRect(b.x+6,b.y+5,b.w-12,b.h-10);}
  const max=b.maxHealth;for(let i=0;i<max;i++){ctx.fillStyle=i<b.health?INK.charcoal:'#f3efe455';ctx.fillRect(cx-(max*5-2)/2+i*5,cy-2,3,4);}
  if(b.health<b.maxHealth){ctx.strokeStyle=INK.charcoal;ctx.beginPath();ctx.moveTo(b.x+13,b.y+1);ctx.lineTo(b.x+18,b.y+7);ctx.lineTo(b.x+13,b.y+12);ctx.lineTo(b.x+20,b.y+b.h-1);if(b.maxHealth-b.health>1){ctx.moveTo(b.x+47,b.y+2);ctx.lineTo(b.x+42,b.y+10);ctx.lineTo(b.x+49,b.y+b.h-1);}ctx.stroke();}}
 else if(b.type==='explosive'){ctx.beginPath();ctx.moveTo(cx,cy-7);ctx.lineTo(cx+7,cy+5);ctx.lineTo(cx-7,cy+5);ctx.closePath();ctx.stroke();ctx.fillRect(cx-.7,cy-3,1.4,4);ctx.fillRect(cx-.7,cy+3,1.4,1.4);}
 else if(b.type==='bonus'){ctx.beginPath();ctx.moveTo(cx,cy-6);ctx.lineTo(cx+5,cy);ctx.lineTo(cx,cy+6);ctx.lineTo(cx-5,cy);ctx.closePath();ctx.stroke();ctx.fillRect(cx-1,cy-2,2,4);}
 else if(b.type==='unbreakable'){ctx.strokeStyle='#f3efe46a';ctx.beginPath();for(let i=0;i<5;i++){const x=b.x+7+i*11;ctx.moveTo(x,b.y+4);ctx.lineTo(x-5,b.y+b.h-4);}ctx.stroke();ctx.fillStyle='#34372f';ctx.fillRect(b.x+2,b.y+1,4,b.h-2);ctx.fillRect(b.x+b.w-6,b.y+1,4,b.h-2);}
 if(compression){ctx.globalAlpha=compression*.2;ctx.fillStyle=INK.ivory;ctx.fillRect(b.x+1,b.y+1,b.w-2,b.h-2);ctx.globalAlpha=1;}
 ctx.restore();}
export function render(ctx,g){const now=performance.now(),s=sceneFor(g),paused=g.phase==='paused';
 // Clamp like the simulation; tab returns cannot fast-forward effects.
 const step=Math.min(40,now-s.last);s.last=now;if(!paused)s.t+=step;const t=s.t,dt=paused?0:step/1000;
 ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.drawImage(arenaSurface(),0,0);
 ctx.font='10px monospace';ctx.fillStyle='#c0c2b2';ctx.textAlign='left';ctx.fillText(`WALL / ${String(g.level).padStart(2,'0')}`,24,29);ctx.textAlign='right';ctx.fillText(`${String(g.cleared).padStart(2,'0')} / ${g.total} CLEARED`,776,29);ctx.textAlign='left';
 const theme=cosmeticColor('themes',g.cosmetics?.themes?.id);let destroyed=0;
 for(const b of g.bricks){let prior=s.health.get(b);if(!prior){prior={hp:b.health,alive:b.alive,hit:-1e9};s.health.set(b,prior);}
  if(prior.hp!==b.health){prior.hit=t;prior.hp=b.health;if(b.alive&&b.maxHealth>1)burst(s,b.x+b.w/2,b.y+b.h,3,30,'#f3efe4',160);}
  if(prior.alive&&!b.alive){destroyed++;const cx=b.x+b.w/2,cy=b.y+b.h/2,c=BRICK_COLORS[b.type];if(b.type==='explosive'){ring(s,cx,cy,INK.ochre,300);burst(s,cx,cy,10,80,INK.clay);}else burst(s,cx,cy,b.type==='bonus'?7:5,44,c);if(b.type==='bonus')ring(s,cx,cy,INK.ochre,220);}
  prior.alive=b.alive;if(b.alive)drawBrick(ctx,b,prior.hit,t,theme);}
 // Real-state callouts. Each needs an observed change in the authoritative game.
 const active=g.effects.active;
 for(const id of Object.keys(active))if(!s.active.has(id)&&POWERUPS[id]){banner(s,POWERUPS[id].name.toUpperCase(),INK.ivory);ring(s,g.paddle.x+g.paddle.w/2,g.paddle.y,INK.ochre,260);}
 s.active=new Set(Object.keys(active));
 const barrierNow=active.barrier!==undefined;if(s.barrier&&!barrierNow&&g.lives===s.lastLives&&g.phase==='playing'){banner(s,BANNERS.rescue,'#cdd7bd');for(let x=40;x<780;x+=60)burst(s,x,540,1,30,INK.sage,240);}s.barrier=barrierNow;
 if(g.lives>s.lastLives){banner(s,BANNERS.life,'#e8b09a');ring(s,g.paddle.x+g.paddle.w/2,g.paddle.y,INK.clay,360);}
 if(g.lives<s.lastLives&&g.lives>0)banner(s,BANNERS.lose,INK.ivory);s.lastLives=g.lives;
 if(g.balls.length>s.balls)banner(s,BANNERS.multi,INK.ivory);s.balls=g.balls.length;
 // Laser impacts: a tracked bolt disappearing below the top edge hit a brick.
 for(const [id,pos] of s.shots){if(!g.effects.projectiles.some(p=>p.id===id)&&pos.y>12){burst(s,pos.x,pos.y,4,40,INK.ochre,150);}}
 s.shots.clear();for(const shot of g.effects.projectiles)s.shots.set(shot.id,{x:shot.x,y:shot.y});
 const p=g.paddle;ctx.fillStyle='#00000030';ctx.beginPath();ctx.roundRect(p.x,p.y+3,p.w,p.h,5);ctx.fill();ctx.fillStyle=cosmeticColor('paddles',g.cosmetics?.paddles?.id)??INK.ivory;ctx.beginPath();ctx.roundRect(p.x,p.y,p.w,p.h,5);ctx.fill();ctx.fillStyle='#ffffff55';ctx.fillRect(p.x+6,p.y+1,p.w-12,1);ctx.fillStyle=INK.clay;ctx.fillRect(p.x+5,p.y+3,3,p.h-6);ctx.fillRect(p.x+p.w-8,p.y+3,3,p.h-6);ctx.fillStyle='#34372f66';for(let i=-2;i<=2;i++)ctx.fillRect(p.x+p.w/2+i*4,p.y+4,1,4);
 if(active.sticky){ctx.strokeStyle=INK.sage;ctx.setLineDash([3,2]);ctx.beginPath();ctx.moveTo(p.x+10,p.y-2);ctx.lineTo(p.x+p.w-10,p.y-2);ctx.stroke();ctx.setLineDash([]);}
 if(active.magnet){ctx.strokeStyle='#b6c7b2';drawIcon(ctx,'magnet',p.x+p.w/2-8,p.y-23,16);}
 if(active.laser){const ready=(active.laser.cooldown??0)<=0&&g.phase==='playing';ctx.fillStyle=ready?INK.clay:'#7d5546';for(const x of [p.x+18,p.x+p.w-18])ctx.fillRect(x-2,p.y-5,4,5);}
 const fire=Boolean(active.fireball),trail=cosmeticColor('trails',g.cosmetics?.trails?.id),reduce=reducedMotion();
 for(let n=0;n<g.balls.length;n++){const b=g.balls[n];let h=ballHistory.get(b);
  if(!h){h={xs:new Float32Array(TRAIL),ys:new Float32Array(TRAIL),count:0,head:0,vx:b.vx,vy:b.vy,impact:-1e9};ballHistory.set(b,h);}
  if(h.vx*b.vx<0||h.vy*b.vy<0){h.impact=t;if(b.y>=p.y-b.r-4){s.paddleHit=t;}}h.vx=b.vx;h.vy=b.vy;
  if(g.phase==='playing'&&!reduce){h.xs[h.head]=b.x;h.ys[h.head]=b.y;h.head=(h.head+1)%TRAIL;h.count=Math.min(TRAIL,h.count+1);}else if(reduce||g.phase==='aiming')h.count=0;
  ctx.strokeStyle=fire?INK.clay:trail??'#bcb89f';ctx.lineWidth=fire?3:2;ctx.lineCap='round';
  for(let i=1;i<h.count;i++){const a=(h.head-h.count+i-1+TRAIL)%TRAIL,c=(a+1)%TRAIL;ctx.globalAlpha=i/h.count*(fire?.4:.28);ctx.beginPath();ctx.moveTo(h.xs[a],h.ys[a]);ctx.lineTo(h.xs[c],h.ys[c]);ctx.stroke();}ctx.globalAlpha=1;
  ctx.fillStyle='#00000040';ctx.beginPath();ctx.arc(b.x+1,b.y+2,b.r,0,Math.PI*2);ctx.fill();
  // Fireball keeps an ivory core so the position stays readable.
  ctx.fillStyle=fire?INK.clay:INK.ivory;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();if(fire){ctx.fillStyle=INK.ivory;ctx.beginPath();ctx.arc(b.x,b.y,b.r*.45,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle=fire?INK.ochre:'#d2c6aa';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();
  if(n>0){ctx.strokeStyle=INK.teal;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x,b.y,b.r+2.5,0,Math.PI*2);ctx.stroke();}
  if(!fire){ctx.fillStyle='#fffaf0';ctx.beginPath();ctx.arc(b.x-2,b.y-2,2,0,Math.PI*2);ctx.fill();}
  const hit=1-(t-h.impact)/MOTION.impact;if(hit>0&&!reduce){ctx.globalAlpha=hit*.6;ctx.strokeStyle=INK.ivory;ctx.beginPath();ctx.arc(b.x,b.y,b.r+3*(1-hit),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 }
 const paddleHit=1-(t-s.paddleHit)/120;if(paddleHit>0){ctx.globalAlpha=reduce?.6:paddleHit*.7;ctx.fillStyle=INK.ochre;ctx.fillRect(p.x+5,p.y,p.w-10,2);ctx.globalAlpha=1;}
 for(const shot of g.effects.projectiles){ctx.fillStyle=INK.clay;ctx.fillRect(shot.x-1.5,shot.y-8,3,10);ctx.fillStyle=INK.ivory;ctx.fillRect(shot.x-.5,shot.y-8,1,3);}
 for(const q of s.pool){if(!q.live)continue;const age=(t-q.start)/q.life;if(age>=1||reduce||q.x<-20||q.x>WIDTH+20||q.y<-20||q.y>HEIGHT+20){q.live=false;continue;}
  q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=60*dt;const fade=(1-age)*(1-age);ctx.globalAlpha=fade*.75;
  if(q.kind===1){ctx.strokeStyle=q.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(q.x,q.y,8+age*26,0,Math.PI*2);ctx.stroke();}else{ctx.fillStyle=q.color;ctx.fillRect(q.x-1.5,q.y-1,3,2);}}
 ctx.globalAlpha=1;renderPowerups(ctx,g);
 // One short callout at a time; also kept in reduced effects (no movement).
 const ba=(t-s.bannerAt)/900;if(ba<1&&s.banner){const rise=reduce?0:(1-Math.min(1,ba*4))*6;ctx.globalAlpha=ba<.75?1:(1-ba)*4;ctx.fillStyle=s.bannerTone;ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText(s.banner,400,455+rise);ctx.textAlign='left';ctx.globalAlpha=1;}
 ctx.shadowBlur=0;
}
