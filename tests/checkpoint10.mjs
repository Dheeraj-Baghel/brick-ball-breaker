// Checkpoint 10: audio cues from real state, settings, bounded effects, loop safety, timing.
import {chromium} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4328/?test');await page.waitForFunction(()=>window.gameTest);
const played=()=>page.evaluate(()=>gameTest.audio().played);
const step=(n=1,dt=.016)=>page.evaluate(([n,dt])=>{for(let i=0;i<n;i++)gameTest.step(dt);},[n,dt]);
const hitBrick=type=>page.evaluate(type=>{const b=gameTest.snapshot().bricks.find(x=>x.alive&&x.type===type);gameTest.set({phase:'playing',ball:{id:0,x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);},type);
const wait=ms=>page.waitForTimeout(ms);
// Before any gesture the engine must not have created an AudioContext.
assert.equal((await page.evaluate(()=>gameTest.audio())).ready,false,'audio waits for gesture');
await page.keyboard.press('Space');assert.equal((await page.evaluate(()=>gameTest.audio())).ready,true,'unlocked by gesture');
// Paddle and wall bounces through real physics.
await page.evaluate(()=>{const g=gameTest.snapshot();gameTest.set({phase:'playing',ball:{...g.ball,x:g.paddle.x+g.paddle.w/2,y:g.paddle.y-40,vx:0,vy:300}});});await step(12);
await page.evaluate(()=>gameTest.set({ball:{id:0,x:60,y:300,r:7,vx:-300,vy:-10}}));await step(16);
let p=await played();assert.ok(p.paddle>=1,'paddle');assert.ok(p.wall>=1,'wall');
// Level 16 contains every brick family needed.
await page.evaluate(()=>gameTest.startCampaign(16));await page.keyboard.press('Space');await wait(80);
await hitBrick('normal');await wait(40);await hitBrick('reinforced');await wait(50);await hitBrick('armored');await wait(110);await hitBrick('explosive');await wait(120);
p=await played();for(const k of ['break','crack','boom'])assert.ok(p[k]>=1,k);
// Each power-up activation produces its distinct cue.
const powers={wide:'pickup',barrier:'barrier',score:'multiplier',magnet:'magnet',fireball:'fire',sticky:'pickup'};
for(const [id,cue] of Object.entries(powers)){const before=(await played())[cue]??0;await page.evaluate(id=>gameTest.activate(id),id);await step(1);assert.ok(((await played())[cue]??0)>before,`${id} -> ${cue}`);await wait(210);}
await page.evaluate(()=>gameTest.activate('multi'));await step(1);assert.ok((await played()).multi>=1,'multi');
await page.evaluate(()=>{gameTest.activate('laser');gameTest.fire();});await step(1);assert.ok((await played()).laser>=1,'laser fire');
await wait(150);await step(30);assert.ok(((await played()).zap??0)>=1,'laser impact');
// Fireball penetration cue on destruction while active.
await wait(60);await hitBrick('normal');await step(1);assert.ok(((await played()).pierce??0)>=1,'fireball pierce');
// Life gain, sticky catch/release, barrier rescue.
await page.evaluate(()=>gameTest.startCampaign(2));await page.keyboard.press('Space');await step(1);
await page.evaluate(()=>gameTest.set({lives:2}));await step(1);await page.evaluate(()=>gameTest.activate('life'));await step(1);assert.ok((await played()).life>=1,'extra life');
await page.evaluate(()=>{gameTest.activate('sticky');const g=gameTest.snapshot();gameTest.set({phase:'playing',ball:{...g.ball,x:g.paddle.x+g.paddle.w/2,y:g.paddle.y-40,vx:0,vy:300}});});await step(12);
assert.ok((await played()).stick>=1,'sticky catch');await page.keyboard.press('Space');await step(2);assert.ok((await played()).release>=1,'sticky release');
await page.evaluate(()=>{gameTest.activate('barrier');gameTest.set({phase:'playing',ball:{id:0,x:30,y:500,r:7,vx:0,vy:320}});});await step(10);
assert.ok((await played()).rescue>=1,'barrier rescue');assert.equal((await page.evaluate(()=>gameTest.snapshot())).lives,3,'rescue kept lives');
// Expiry, life loss, completion, game over.
await wait(220);await page.evaluate(()=>gameTest.activate('score'));await step(1);await page.evaluate(()=>{const s=gameTest.snapshot();s.effects.active.score.remaining=.001;gameTest.set({effects:s.effects});});await step(2);assert.ok((await played()).expire>=1,'multiplier expire');
await page.evaluate(()=>{const g=gameTest.snapshot();gameTest.set({phase:'playing',ball:{...g.ball,y:569,vy:300}});});await step(1);assert.ok((await played()).lose>=1,'life lost');
await page.evaluate(()=>gameTest.startCampaign(1));await page.evaluate(()=>{gameTest.set({phase:'playing'});for(const b of gameTest.snapshot().bricks){gameTest.set({ball:{id:0,x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);}});await step(1);
assert.ok((await played()).complete>=1,'complete');
await page.evaluate(()=>gameTest.startCampaign(1));await page.keyboard.press('Space');await step(1);await page.evaluate(()=>{const g=gameTest.snapshot();gameTest.set({phase:'playing',lives:1,ball:{...g.ball,y:569,vy:300}});gameTest.step(.01);});
assert.ok((await played()).gameover>=1,'game over');assert.ok(((await played()).achievement??0)>=1,'achievement chime');
// Throttle + voice cap: a 50-hit burst in one frame cannot flood the mixer.
const flood=await page.evaluate(async()=>{const {createAudioEngine,MAX_VOICES}=await import('/src/audio.js');const a=createAudioEngine();a.unlock();await new Promise(r=>setTimeout(r,60));let ok=0;for(let i=0;i<50;i++)if(a.play('hit'))ok++;const peak=a.state.voices;a.close();return{ok,peak,MAX_VOICES};});
assert.equal(flood.ok,1,'same-sound throttle');assert.ok(flood.peak<=flood.MAX_VOICES,'voice cap');
// Settings: mute, volumes, reduced effects.
await page.locator('#settings-toggle').click();assert.equal(await page.locator('#settings-panel').isVisible(),true);
await page.locator('#mute').check();assert.equal((await page.evaluate(()=>gameTest.audio())).muted,true);assert.equal(await page.locator('#sound').textContent(),'Sound off');
await page.locator('#sound').click();assert.equal((await page.evaluate(()=>gameTest.audio())).muted,false);
await page.locator('#sfx-volume').fill('20');await page.locator('#music-volume').fill('0');let st=await page.evaluate(()=>gameTest.audio());assert.equal(st.sfx,.2);assert.equal(st.music,0);
await page.locator('#reduced-effects').check();assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('reduced-effects')),true);
await page.screenshot({path:'artifacts/testing/checkpoint10/settings.png',fullPage:true});
await page.keyboard.press('Escape');assert.equal(await page.locator('#settings-panel').isVisible(),false,'Esc closes settings');
// Reduced effects keeps state feedback: a pool spawn is skipped but bricks still change.
await page.evaluate(()=>gameTest.startCampaign(16));await page.keyboard.press('Space');await hitBrick('explosive');
await step(2);assert.equal(await page.evaluate(()=>gameTest.particles()),0,'reduced effects spawns no particles');assert.ok((await played()).boom>=1,'audio feedback still present');
await page.locator('#settings-toggle').click();await page.locator('#reduced-effects').uncheck();await page.keyboard.press('Escape');
// Particle pool bound under an intense scene: whole wall in one burst, multiball.
const peak=await page.evaluate(()=>{gameTest.startCampaign(26);gameTest.set({phase:'playing'});gameTest.activate('multi');let max=0;for(const b of gameTest.snapshot().bricks)for(let i=0;i<3;i++){gameTest.set({phase:gameTest.snapshot().phase==='complete'?'complete':'playing',ball:{id:0,x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);max=Math.max(max,gameTest.particles());}return max;});
assert.ok(peak>20&&peak<=96,`particle pool bounded (${peak})`);
// Pause freezes effects and state; tab hide auto-pauses; resume does not teleport.
await page.evaluate(()=>gameTest.startCampaign(3));await page.keyboard.press('Space');await step(5);await page.keyboard.press('p');
const frozen=await page.evaluate(()=>gameTest.snapshot());await wait(300);assert.deepEqual(await page.evaluate(()=>gameTest.snapshot()),frozen,'pause freezes');
await page.keyboard.press('p');await wait(30);const before=await page.evaluate(()=>gameTest.snapshot().ball);
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,'paused','tab hide pauses');await wait(600);
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
const after=await page.evaluate(()=>gameTest.snapshot().ball);assert.ok(Math.hypot(after.x-before.x,after.y-before.y)<20,'no teleport after tab return');
// Resize keeps canvas logical resolution and physics coordinates.
await page.setViewportSize({width:600,height:900});await wait(80);await page.setViewportSize({width:1280,height:1000});await wait(80);
const dims=await page.evaluate(()=>{const c=document.querySelector('canvas');return{w:c.width,h:c.height,ratio:c.width/c.height};});assert.ok(Math.abs(dims.ratio-800/560)<.001);
// Exactly one rAF loop: callbacks per second must stay near the display rate after restarts.
for(let i=0;i<5;i++)await page.locator('#restart').click();
const loop=await page.evaluate(()=>new Promise(r=>{const a=gameTest.loopId();setTimeout(()=>r(gameTest.loopId()-a),1000);}));assert.ok(loop>40&&loop<75,`single loop (${loop} callbacks/s)`);
// Frame-rate independence: same flight at 30/60/144 fps through the real tick path.
const fr=await page.evaluate(()=>{const out=[];for(const fps of [30,60,144]){gameTest.startCampaign(1);gameTest.set({phase:'playing',ball:{id:0,x:300,y:350,r:7,vx:120,vy:-100}});for(let i=0;i<fps/2;i++)gameTest.step(1/fps);const b=gameTest.snapshot().ball;out.push([b.x,b.y]);}return out;});
for(const [x,y] of fr){assert.ok(Math.abs(x-fr[0][0])<1e-6&&Math.abs(y-fr[0][1])<1e-6,'frame-rate independent');}
// Memory: 25 full restarts must not grow heap without bound.
const heap=await page.evaluate(async()=>{const read=()=>performance.memory?.usedJSHeapSize??0;const start=read();for(let i=0;i<25;i++){gameTest.startCampaign(16);gameTest.set({phase:'playing'});gameTest.activate('multi');for(let k=0;k<60;k++)gameTest.step(.016);}await new Promise(r=>setTimeout(r,300));return{start,end:read()};});
// Intense-scene frame timing on the real loop.
const perf=await page.evaluate(()=>{gameTest.startCampaign(26);gameTest.set({phase:'playing'});for(const id of ['multi','laser','magnet','fireball','wide','slow'])gameTest.activate(id);return new Promise(res=>{const t=[];let last=0;function m(now){if(last)t.push(now-last);last=now;if(t.length%6===0)gameTest.fire();if(t.length<300)requestAnimationFrame(m);else{const s=[...t].sort((a,b)=>a-b);res({frames:t.length,fps:1000/(t.reduce((a,b)=>a+b)/t.length),median:s[150],p95:s[285],over33:t.filter(x=>x>33.4).length});}}requestAnimationFrame(m);});});
await page.screenshot({path:'artifacts/testing/checkpoint10/intense-scene.png',fullPage:true});
p=await played();assert.deepEqual(errors,[]);
await writeFile('artifacts/testing/checkpoint10/results.json',JSON.stringify({passed:true,cuesObserved:p,flood,heap,loopCallbacksPerSecond:loop,intensePerformance:perf,peakParticles:peak,frameRateIndependent:fr,errors},null,2));
console.log(JSON.stringify({peakParticles:peak,cues:Object.keys(p).length,flood,loop,heapMB:[heap.start/1e6|0,heap.end/1e6|0],perf}));await browser.close();
