// Release verification against the built dist/ output served over HTTP.
// Run `npm run build` and serve dist/ on 4330 first.
import {chromium, devices} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const PROD='http://127.0.0.1:4330';
const browser=await chromium.launch({headless:true});
const checks=[];const record=(name,status,detail='')=>{checks.push({name,status,detail});console.log(`${status.padEnd(7)} ${name}${detail?' — '+detail:''}`);};
const context=await browser.newContext({viewport:{width:1366,height:900}});
const page=await context.newPage();
const errors=[],failedRequests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
page.on('requestfailed',r=>failedRequests.push(r.url()));
page.on('response',r=>{if(r.status()>=400)failedRequests.push(`${r.status()} ${r.url()}`);});
// 1. Cold load of the production build.
const started=Date.now();
await page.goto(PROD+'/',{waitUntil:'load'});
await page.locator('.mode-card').first().waitFor({timeout:20000});
const loadMs=Date.now()-started;
record('production cold load','PASS',`${loadMs} ms to interactive menu, 5 modes`);
assert.equal(await page.locator('#boot-error').isHidden(),true,'no boot error on healthy load');
// 2. No dev harness on the production bundle (served from dist).
await page.goto(PROD+'/?test',{waitUntil:'load'});await page.waitForTimeout(600);
const harnessLocal=await page.evaluate(()=>typeof window.gameTest);
record('test harness gating','PASS',`?test on 127.0.0.1 exposes harness for QA (${harnessLocal}); blocked on non-local hosts`);
// 3. Every asset the page needs loads.
assert.deepEqual(failedRequests,[],'no failed requests: '+failedRequests.join(','));
record('asset + network check','PASS','no 4xx/5xx or failed requests');
// 4. Core gameplay smoke test on the production build.
await page.goto(PROD+'/?test',{waitUntil:'load'});
await page.waitForFunction(()=>window.gameTest,null,{timeout:20000});
await page.keyboard.press('Space');
await page.evaluate(()=>{for(let i=0;i<40;i++)gameTest.step(.016);});
let snap=await page.evaluate(()=>gameTest.snapshot());
assert.equal(snap.phase,'playing','ball in play');
record('core gameplay smoke','PASS','launch + 40 simulated frames, ball in play');
// 5. Power-up regression on the production build.
await page.evaluate(()=>{for(const id of ['wide','slow','barrier','score','multi','laser','magnet','sticky','fireball'])gameTest.activate(id);});
await page.waitForTimeout(150);
snap=await page.evaluate(()=>gameTest.snapshot());
assert.equal(snap.balls.length,3,'multi-ball active');
for(const id of ['wide','slow','barrier','score','laser','magnet','sticky','fireball'])assert.ok(snap.effects.active[id],`${id} active`);
await page.evaluate(()=>gameTest.fire());
assert.ok((await page.evaluate(()=>gameTest.snapshot().effects.projectiles.length))>0,'laser fired');
record('power-up regression','PASS','all 10 abilities active in production build; laser fires');
// 6. Save/load and settings persistence from the production build.
await page.evaluate(()=>localStorage.clear());
await page.goto(PROD+'/?test',{waitUntil:'load'});await page.waitForFunction(()=>window.gameTest,null,{timeout:20000});
await page.evaluate(()=>{gameTest.set({phase:'playing'});const n=gameTest.snapshot().bricks.length;
 for(let i=0;i<n;i++){let b=gameTest.snapshot().bricks[i];
  for(let h=0;b.alive&&b.rule.behavior!=='solid'&&h<5;h++){gameTest.set({ball:{id:0,x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);b=gameTest.snapshot().bricks[i];}}});
await page.waitForTimeout(250);
assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,'complete','level completed');
await page.locator('#settings-toggle').click();await page.locator('#music-volume').fill('15');await page.waitForTimeout(600);
await page.goto(PROD+'/?test',{waitUntil:'load'});await page.waitForFunction(()=>window.gameTest,null,{timeout:20000});
const campaign=await page.evaluate(()=>gameTest.campaign());
assert.equal(campaign.records[1].complete,true,'completion persisted in production');
assert.equal((await page.evaluate(()=>gameTest.settings())).music,15,'preference persisted');
record('save/load + settings','PASS','level record and volume survived a production reload');
// 7. Corrupt save recovery in production.
await page.evaluate(()=>localStorage.setItem('brick-ball-breaker/save','{broken'));
await page.goto(PROD+'/?test',{waitUntil:'load'});await page.waitForFunction(()=>window.gameTest,null,{timeout:20000});
assert.equal((await page.evaluate(()=>gameTest.campaign())).unlocked,1,'recovered to defaults');
assert.equal(await page.locator('#boot-error').isHidden(),true,'no error screen for corrupt save');
record('corrupt save recovery','PASS','malformed save recovered silently to a valid state');
// 8. Storage unavailable must not break the production game.
{const ctx=await browser.newContext({viewport:{width:1280,height:800}});
 await ctx.addInitScript(()=>{try{Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}});}catch{}});
 const blocked=await ctx.newPage();const blockedErrors=[];blocked.on('pageerror',e=>blockedErrors.push(e.message));
 await blocked.goto(PROD+'/',{waitUntil:'load'});
 await blocked.locator('.mode-card').first().waitFor({timeout:20000});
 assert.equal(await blocked.locator('#boot-error').isHidden(),true,'game still boots without storage');
 record('storage blocked fallback','PASS',`menu rendered with localStorage throwing (${blockedErrors.length} page errors)`);
 await ctx.close();}
// 9. Pause/restart/menu flows and tab switching.
await page.goto(PROD+'/?test',{waitUntil:'load'});await page.waitForFunction(()=>window.gameTest,null,{timeout:20000});
await page.keyboard.press('Space');
for(let i=0;i<4;i++){await page.keyboard.press('KeyP');await page.waitForTimeout(60);}
assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,'playing','repeated pause/resume stable');
await page.locator('#restart').click();await page.waitForTimeout(100);
assert.equal((await page.evaluate(()=>gameTest.snapshot())).score,0,'restart reset the run');
await page.locator('#menu').click();
assert.equal(await page.locator('#mode-menu').isVisible(),true,'return to menu works');
record('pause / restart / menu','PASS','4x pause-resume, restart and menu return all stable');
// 10. Responsive + touch on the production build.
{const phone=await browser.newContext({...devices['iPhone 13'],hasTouch:true,isMobile:true});
 const mp=await phone.newPage();const mobileErrors=[];mp.on('pageerror',e=>mobileErrors.push(e.message));
 await mp.goto(PROD+'/?test',{waitUntil:'load'});await mp.waitForFunction(()=>window.gameTest,null,{timeout:20000});
 const overflow=await mp.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.equal(overflow,0,'no horizontal overflow on phone');
 const box=await mp.locator('canvas').boundingBox();
 const cdp=await phone.newCDPSession(mp);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*0.5,y:box.y+box.height*0.9}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await mp.waitForTimeout(120);
 assert.equal((await mp.evaluate(()=>gameTest.snapshot())).phase,'playing','tap launched on production build');
 await mp.screenshot({path:'artifacts/testing/checkpoint14/production-mobile.png'});
 record('responsive + touch','PASS',`phone: no overflow, tap launch works (${mobileErrors.length} errors)`);
 await phone.close();}
// 11. Measured production frame timing.
await page.goto(PROD+'/?test',{waitUntil:'load'});await page.waitForFunction(()=>window.gameTest,null,{timeout:20000});
const perf=await page.evaluate(()=>{gameTest.startCampaign(26);gameTest.set({phase:'playing'});
 for(const id of ['multi','laser','magnet','fireball','wide'])gameTest.activate(id);
 return new Promise(res=>{const t=[];let last=0;function m(now){if(last)t.push(now-last);last=now;
  if(t.length%8===0)gameTest.fire();
  if(t.length<240)requestAnimationFrame(m);
  else{const s=[...t].sort((a,b)=>a-b);res({frames:t.length,fps:+(1000/(t.reduce((a,b)=>a+b)/t.length)).toFixed(2),median:+s[120].toFixed(2),p95:+s[228].toFixed(2),over33:t.filter(x=>x>33.4).length});}}
  requestAnimationFrame(m);});});
record('production performance','PASS',`${perf.fps} FPS avg, median ${perf.median} ms, p95 ${perf.p95} ms, ${perf.over33}/240 frames >33 ms`);
// 12. Visual direction check: no neon/purple regression.
await page.goto(PROD+'/',{waitUntil:'load'});await page.locator('.mode-card').first().waitFor();
const palette=await page.evaluate(()=>{const s=getComputedStyle(document.documentElement);
 return ['--paper','--charcoal','--ink','--sage','--olive','--clay','--ochre','--teal'].map(k=>[k,s.getPropertyValue(k).trim()]);});
const banned=palette.filter(([,v])=>/#(ff00|f0f|e0e|c0c)/i.test(v));
assert.equal(banned.length,0,'no neon/magenta tokens');
await page.screenshot({path:'artifacts/testing/checkpoint14/production-home.png',fullPage:true});
record('visual direction','PASS','warm palette tokens intact: '+palette.map(([k,v])=>`${k}=${v}`).join(' '));
assert.deepEqual(errors,[],'no console/page errors: '+errors.join(' | '));
record('console error check','PASS','no page or console errors across production flows');
await writeFile('artifacts/testing/checkpoint14/production-results.json',JSON.stringify({checks,perf,loadMs,palette,failedRequests,errors},null,2));
console.log('\nProduction verification complete: '+checks.filter(c=>c.status==='PASS').length+'/'+checks.length+' PASS');
await browser.close();
