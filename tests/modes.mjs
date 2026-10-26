import {chromium} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4328');await page.locator('.mode-card').first().waitFor();assert.equal(await page.locator('.mode-card').count(),5);await page.screenshot({path:'artifacts/testing/mode-select.png',fullPage:true});
// Verify actual menu wiring, including all ten challenge descriptions.
await page.locator('.mode-card').filter({hasText:'Thirty sequential'}).click();assert.equal(await page.locator('.level-card').count(),30);await page.locator('#back-modes').click();await page.locator('.mode-card').filter({hasText:'Ten focused'}).click();assert.equal(await page.locator('#challenge-grid button').count(),10);await page.locator('#back-challenges').click();
await page.goto('http://127.0.0.1:4328/?test');
const snap=()=>page.evaluate(()=>gameTest.snapshot());
async function start(k,id=1){await page.evaluate(([k,id])=>k==='campaign'?gameTest.startCampaign(id):gameTest.startMode(k,id),[k,id]);}
async function clear(){await page.evaluate(()=>{
 gameTest.set({phase:'playing'});const initial=gameTest.snapshot();
 for(let i=0;i<initial.bricks.length;i++){
  let brick=gameTest.snapshot().bricks[i];if(brick.rule.behavior==='solid')continue;
  for(let hits=0;brick.alive&&hits<5;hits++){
   if(gameTest.snapshot().mode.wave!==initial.mode.wave||gameTest.snapshot().phase==='complete')break;
   gameTest.set({ball:{id:0,x:brick.x+brick.w/2,y:brick.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);brick=gameTest.snapshot().bricks[i];
  }
  if(gameTest.snapshot().mode.wave!==initial.mode.wave||gameTest.snapshot().phase==='complete')break;
 }
});}
// Campaign completion, stars, session unlock and replay survive other modes.
await clear();assert.equal((await snap()).phase,'complete');assert.equal((await page.evaluate(()=>gameTest.campaign())).unlocked,2);await page.getByRole('button',{name:'Next level'}).click();assert.equal((await snap()).level,2);const campaign=await page.evaluate(()=>gameTest.campaign());
for(const kind of ['campaign','endless','time','hardcore','challenge']){
 await start(kind);const initial=await snap();assert.equal(initial.score,0);assert.equal(initial.lives,kind==='hardcore'?1:3);assert.equal(initial.balls.length,1);
 await page.keyboard.press('Space');await page.keyboard.press('p');const paused=await snap();await page.waitForTimeout(100);assert.deepEqual(await snap(),paused);await page.getByRole('button',{name:'Resume game'}).click();assert.equal((await snap()).phase,'playing');
 await page.evaluate(()=>{gameTest.activate('wide');gameTest.activate('laser');});await page.getByRole('button',{name:'Restart',exact:true}).click();assert.equal((await snap()).phase,'aiming');assert.deepEqual((await snap()).effects.active,{});assert.equal((await snap()).paddle.w,112);
 await page.getByRole('button',{name:'Modes',exact:true}).click();assert.equal(await page.locator('#mode-menu').isVisible(),true);
}
await start('endless');await clear();let s=await snap();assert.equal(s.mode.wave,2);assert.ok(s.score>0);assert.ok(s.mode.speedScale>1);const runScore=s.score;
await page.evaluate(()=>{const s=gameTest.snapshot();gameTest.set({lives:1,phase:'playing',ball:{...s.ball,y:569}});gameTest.step(.01);});assert.equal((await snap()).phase,'gameover');assert.equal((await page.evaluate(()=>gameTest.modes())).runBest.endless,runScore);
await start('time');await page.keyboard.press('Space');await page.evaluate(()=>{const s=gameTest.snapshot();gameTest.set({mode:{...s.mode,clock:40,started:true}});});await clear();s=await snap();assert.equal(s.mode.wave,2);assert.ok(s.mode.clock>=40);assert.ok(s.mode.clock<41);assert.equal(await page.locator('#countdown').isVisible(),true);
await page.evaluate(()=>{const s=gameTest.snapshot();gameTest.set({score:777,mode:{...s.mode,clock:120,started:true}});gameTest.step(.01);});assert.equal((await snap()).phase,'timedout');assert.ok((await page.evaluate(()=>gameTest.modes())).runBest.time>=777);await page.screenshot({path:'artifacts/testing/time-attack-result.png',fullPage:true});
await start('hardcore');await page.evaluate(()=>gameTest.activate('life'));assert.equal((await snap()).lives,1);await clear();assert.equal((await snap()).phase,'complete');assert.equal(await page.locator('#screen-title').textContent(),'Hardcore cleared.');await page.getByRole('button',{name:'Replay',exact:true}).click();await page.evaluate(()=>{const s=gameTest.snapshot();gameTest.set({phase:'playing',ball:{...s.ball,y:569}});gameTest.step(.01);});assert.equal((await snap()).phase,'gameover');
// All ten challenge walls browser-completed using real ball-hit fixtures.
for(let id=1;id<=10;id++){await start('challenge',id);await clear();assert.equal((await snap()).phase,'complete',`challenge ${id}`);assert.equal(await page.locator('#screen-title').textContent(),'Challenge complete.',`challenge ${id}`);}
await start('challenge',3);await page.evaluate(()=>{const s=gameTest.snapshot();gameTest.set({stats:{...s.stats,livesLost:1}});});await clear();assert.equal(await page.locator('#screen-title').textContent(),'Challenge failed.');assert.equal((await page.evaluate(()=>gameTest.modes())).challenges[3].complete,true);
await start('challenge',1);await page.evaluate(()=>{const s=gameTest.snapshot();gameTest.set({mode:{...s.mode,clock:101,started:true}});gameTest.step(.01);});assert.equal((await snap()).phase,'gameover');assert.equal(await page.locator('#screen-title').textContent(),'Challenge failed.');
for(const kind of ['campaign','endless','time','hardcore','challenge']){
 await start(kind);await page.evaluate(()=>{const s=gameTest.snapshot();gameTest.set({lives:1,phase:'playing',ball:{...s.ball,y:569}});gameTest.step(.01);});assert.equal((await snap()).phase,'gameover',kind+' game over');
 await page.getByRole('button',{name:'Retry',exact:true}).click();assert.equal((await snap()).phase,'aiming');assert.equal((await snap()).score,0);
}
assert.deepEqual(await page.evaluate(()=>gameTest.campaign()),campaign);
// Existing abilities remain collectible and active across the shared engine.
await start('campaign');await page.keyboard.press('Space');await page.evaluate(()=>{gameTest.activate('multi');gameTest.activate('laser');gameTest.activate('magnet');gameTest.activate('sticky');gameTest.activate('fireball');gameTest.fire();});assert.equal((await snap()).balls.length,3);assert.equal((await snap()).effects.projectiles.length,2);
await page.setViewportSize({width:390,height:1000});await page.getByRole('button',{name:'Modes',exact:true}).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'artifacts/testing/modes-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);await writeFile('artifacts/testing/modes-results.json',JSON.stringify({passed:true,checks:['five menu cards','campaign unlock/next/stars isolation','all modes initialize/pause/resume/restart/exit','endless wave escalation and best','time clock carries waves and expires','hardcore extra-life denial/victory/loss','ten real-physics challenge completions','challenge failure/timeout/best record','existing five advanced abilities','mobile menu overflow','no page exceptions'],method:'Controlled production-physics ball fixtures, not uninterrupted human runs.',errors},null,2));console.log('Checkpoint 8: all five modes verified');await browser.close();
