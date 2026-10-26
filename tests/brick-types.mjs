import {chromium} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4328/?test');await page.waitForFunction(()=>window.gameTest);await page.evaluate(()=>gameTest.startCampaign(16));
const result=await page.evaluate(()=>{
  const original=gameTest.snapshot(); const results=[];
  for(const type of ['normal','reinforced','armored','explosive','bonus','unbreakable']) {
    const bricks=structuredClone(original.bricks); const target=bricks.find(b=>b.type===type);
    // Isolate behavior while keeping one distant normal brick to avoid early completion.
    for(const b of bricks)b.alive=b===target;
    const sentinel=bricks.find(b=>b.type==='normal'&&b!==target);sentinel.alive=true;sentinel.x=700;sentinel.y=300;
    gameTest.set({...original,bricks,phase:'playing',total:2});
    const hits=Number.isFinite(target.health)?target.health:4;
    for(let i=0;i<hits;i++) {
      gameTest.set({ball:{x:target.x+target.w/2,y:target.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);
      const state=gameTest.snapshot(); const brick=state.bricks.find(b=>b.type===type);
      if(state.ball.vy>=0)throw Error(type+' did not bounce');
      if(type!=='unbreakable'&&brick.health!==hits-i-1)throw Error(type+' incorrect damage');
    }
    const state=gameTest.snapshot();results.push({type,score:state.score,expected:target.rule.score,alive:state.bricks.find(b=>b.type===type).alive});
  }
  // Show damage states in the full mixed wall using actual ball hits.
  gameTest.set({...original,phase:'playing'});
  for(const type of ['reinforced','armored']) {
    const b=gameTest.snapshot().bricks.find(b=>b.type===type);
    gameTest.set({ball:{x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);
  }
  gameTest.set({phase:'aiming',ball:original.ball});return results;
});
for(const r of result){assert.equal(r.score,r.expected);assert.equal(r.alive,r.type==='unbreakable');}
await page.screenshot({path:'artifacts/testing/brick-types-damage.png',fullPage:true});
assert.deepEqual(errors,[]);await writeFile('artifacts/testing/brick-types-results.json',JSON.stringify({passed:true,result,method:'Controlled contacts through production browser physics, full-wall damage rendering.',errors},null,2));
console.log('All six brick types verified in browser gameplay');await browser.close();
