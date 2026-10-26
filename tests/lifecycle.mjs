import { chromium } from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4328/?test');await page.waitForFunction(()=>window.gameTest);
const snapshot=()=>page.evaluate(()=>gameTest.snapshot());
await page.keyboard.press('p'); assert.equal((await snapshot()).phase,'paused');
await page.getByRole('button',{name:'Resume game'}).click(); assert.equal((await snapshot()).phase,'aiming');
await page.keyboard.press('Space'); await page.waitForTimeout(150);
await page.getByRole('button',{name:'Pause',exact:true}).click();
const paused=await snapshot(); await page.waitForTimeout(250); assert.deepEqual(await snapshot(),paused);
await page.screenshot({path:'artifacts/testing/paused.png',fullPage:true});
await page.keyboard.press('Escape'); assert.equal((await snapshot()).phase,'playing');
// Seed ball positions only; real physics removes every brick and drives terminal UI.
await page.evaluate(()=>{
  for(let index=0;index<gameTest.snapshot().bricks.length;index++) {
    let brick=gameTest.snapshot().bricks[index];
    if(brick.rule.behavior==='solid') continue;
    while(brick.alive) {
      gameTest.set({ball:{x:brick.x+brick.w/2,y:brick.y-8,r:7,vx:0,vy:265}});
      gameTest.step(.008); brick=gameTest.snapshot().bricks[index];
    }
  }
});
assert.equal((await snapshot()).phase,'complete');
const expectedScore=(await snapshot()).bricks.reduce((sum,b)=>sum+b.rule.score,0);
const ledger=(await snapshot()).rewards;assert.equal(ledger.base,expectedScore,'base equals summed brick values');assert.equal(await page.locator('#score').textContent(),String(ledger.base+ledger.comboBonus+ledger.completion),'score = base + combo + clear bonus');
assert.equal((await snapshot()).bricks.filter(b=>b.alive&&b.rule.behavior!=='solid').length,0);
assert.equal(await page.locator('#lives').textContent(),'3');
assert.equal(await page.locator('#level').textContent(),'1');
assert.equal(await page.locator('#screen-title').textContent(),'Level complete.');
await page.screenshot({path:'artifacts/testing/level-complete.png',fullPage:true});
await page.locator('#start').click();
{const n=await snapshot();assert.equal(n.score,0);assert.equal(n.level,2,'result advances to next level');assert.equal(n.bricks.filter(b=>b.alive).length,n.bricks.length,'fresh wall');}
// Three actual bottom-crossing loss transitions, with a real relaunch between lives.
for(let lives=2;lives>=0;lives--) {
  await page.keyboard.press('Space');
  await page.evaluate(()=>{const b=gameTest.snapshot().ball;gameTest.set({ball:{...b,y:569}});gameTest.step(.01);});
  const s=await snapshot(); assert.equal(s.lives,lives); assert.equal(s.ball.y,501);assert.equal(s.ball.vy,0);
  assert.equal(await page.locator('#lives').textContent(),String(lives));
  if(lives>0) { assert.equal(s.phase,'aiming');assert.equal(await page.locator('#overlay').isVisible(),false); }
}
assert.equal((await snapshot()).phase,'gameover');assert.equal(await page.locator('#screen-title').textContent(),'Game over.');
await page.screenshot({path:'artifacts/testing/game-over.png',fullPage:true});
await page.getByRole('button',{name:'Restart',exact:true}).click();
assert.equal((await snapshot()).phase,'aiming');assert.equal((await snapshot()).lives,3);
await page.keyboard.press('Space'); await page.keyboard.press('p');
await page.getByRole('button',{name:'Restart',exact:true}).click();
assert.equal((await snapshot()).phase,'aiming'); assert.equal((await snapshot()).pausedFrom,null);
await page.keyboard.press('Space');
await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await snapshot()).phase,'paused');
await page.getByRole('button',{name:'Resume',exact:true}).click();assert.equal((await snapshot()).phase,'playing');
assert.deepEqual(errors,[]);
await writeFile('artifacts/testing/lifecycle-results.json',JSON.stringify({passed:true,checks:['aiming pause/resume','playing pause freeze','Escape resume','mixed wall cleared with exact type scores','unbreakables excluded from completion','level complete UI','play again reset','three life losses and relaunch','game over UI','restart terminal and paused','blur auto-pause','HUD','no browser errors'],method:'Controlled ball-position fixtures run the production physics and UI.',errors},null,2));
console.log('Complete gameplay lifecycle checks passed');await browser.close();
