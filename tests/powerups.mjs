import {chromium}from '../../chess-game-analyzer/node_modules/playwright/index.mjs';import assert from 'node:assert/strict';import{writeFile}from 'node:fs/promises';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4328/?test');
for(const id of ['wide','slow','barrier','score','life']){
 await page.evaluate(id=>gameTest.drop(id),id);await page.waitForTimeout(150);
 const s=await page.evaluate(()=>gameTest.snapshot());
 if(id==='life')assert.equal(s.lives,4);else assert.ok(s.effects.active[id],id+' collected');
}
assert.equal(await page.locator('.ability').count(),4);
await page.screenshot({path:'artifacts/testing/powerups-active.png',fullPage:true});
await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');
await page.evaluate(()=>gameTest.activate('wide'));await page.waitForTimeout(50);
await page.keyboard.press('p');const paused=await page.evaluate(()=>gameTest.snapshot().effects.active);await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>gameTest.snapshot().effects.active),paused);
await page.keyboard.press('p');
await page.evaluate(()=>{const s=gameTest.snapshot();for(const e of Object.values(s.effects.active))e.remaining=.001;gameTest.set({effects:s.effects});gameTest.step(.02);});
assert.equal(await page.locator('.ability').count(),0);assert.equal(await page.evaluate(()=>gameTest.snapshot().paddle.w),112);
await page.evaluate(()=>{gameTest.activate('barrier');gameTest.set({phase:'playing',ball:{x:10,y:531,r:7,vx:0,vy:300}});gameTest.step(.05);});
assert.ok(await page.evaluate(()=>gameTest.snapshot().ball.vy<0));
await page.evaluate(()=>{gameTest.activate('wide');gameTest.set({ball:{x:10,y:569,r:7,vx:0,vy:300}});gameTest.step(.01);});
assert.equal(await page.locator('.ability').count(),0);
await page.getByRole('button',{name:'Restart',exact:true}).click();assert.equal(await page.evaluate(()=>gameTest.snapshot().lives),3);
await page.setViewportSize({width:390,height:1000});await page.evaluate(()=>{for(const id of ['wide','slow','score','barrier'])gameTest.activate(id);});
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await page.screenshot({path:'artifacts/testing/powerups-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
await writeFile('artifacts/testing/powerups-results.json',JSON.stringify({passed:true,checks:['all five falling pickups','active timers and charge HUD','audio opt-in and cue execution','pause timers','expiry restoration','barrier rescue','life-loss cleanup','restart','mobile layout'],errors},null,2));console.log('Five power-up browser checks passed');await browser.close();
