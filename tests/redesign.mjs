// Presentation audit: controlled game fixtures, screenshots, responsive and frame sampling.
import {chromium} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const base='http://127.0.0.1:4328',folder='artifacts/testing/redesign-after';
async function capture(name){await page.waitForTimeout(280);await page.screenshot({path:`${folder}/${name}.png`,fullPage:true});}
async function overflow(){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');}
await page.goto(base);await page.locator('.mode-card').first().waitFor();await capture('home-desktop');await overflow();
assert.equal(await page.locator('.mode-card').count(),5);
assert.equal(await page.locator('.mode-card').first().evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
await page.locator('[data-mode=campaign]').click();await capture('campaign-desktop');assert.equal(await page.locator('.level-card').count(),30);
await page.locator('#back-modes').click();await page.locator('[data-mode=challenge]').click();await capture('challenges-desktop');assert.equal(await page.locator('#challenge-grid button').count(),10);
await page.locator('#back-challenges').click();await page.locator('#open-rewards').click();await capture('collection-desktop');assert.equal(await page.locator('.achievement').count(),23);
await page.goto(base+'/?test');await page.waitForFunction(()=>window.gameTest);await page.evaluate(()=>gameTest.startCampaign(16));await capture('arena-desktop');
await page.evaluate(()=>{for(const type of ['reinforced','armored']){const b=gameTest.snapshot().bricks.find(b=>b.type===type);for(let i=0;i<(type==='armored'?2:1);i++){gameTest.set({phase:'playing',ball:{id:0,x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);}}gameTest.set({phase:'aiming'});});await capture('damage-states-desktop');
// Rendering the snapshot cannot change scoring, health, positions or effects.
assert.equal(await page.evaluate(async()=>{const {render}=await import('/src/render.js');const g=gameTest.snapshot(),before=JSON.stringify(g),c=document.createElement('canvas');c.width=800;c.height=560;render(c.getContext('2d'),g);return JSON.stringify(g)===before;}),true);
await page.keyboard.press('Space');await page.evaluate(()=>{for(const id of ['wide','slow','life','barrier','score','multi','laser','magnet','sticky','fireball'])gameTest.activate(id);const g=gameTest.snapshot();g.effects.drops=['wide','slow','life','barrier','score','multi','laser','magnet','sticky','fireball'].map((type,i)=>({id:100+i,type,x:55+i*75,y:310}));gameTest.set({effects:g.effects});});
await capture('abilities-desktop');assert.equal(await page.locator('.ability>.art-icon').count(),9);
await page.keyboard.press('f');await page.waitForTimeout(40);assert.equal(await page.locator('#fire').isDisabled(),true);await page.waitForTimeout(400);
await page.keyboard.press('p');await capture('pause-desktop');assert.match(await page.locator('.ability').filter({hasText:'Laser Paddle'}).textContent(),/paused/);assert.equal(await page.locator('#fire').isDisabled(),true);
const paused=await page.evaluate(()=>gameTest.snapshot());await page.waitForTimeout(200);assert.deepEqual(await page.evaluate(()=>gameTest.snapshot()),paused);
await page.locator('.ability').filter({hasText:'Slow Ball'}).focus();assert.equal(await page.locator('.ability:focus-visible .ability-tip').isVisible(),true);await page.keyboard.press('Escape');
// Real contacts generate damage, destruction, terminal summary and achievement toast.
await page.evaluate(()=>gameTest.startCampaign(1));await page.keyboard.press('Space');await page.evaluate(()=>{const bricks=gameTest.snapshot().bricks;for(const b of bricks){gameTest.set({ball:{id:0,x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);}});await capture('completion-desktop');assert.match(await page.locator('#screen-description').textContent(),/★/);
await page.locator('#menu').click();await page.locator('#open-rewards').click();await capture('collection-earned-desktop');
await page.getByRole('button',{name:'Coral',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Coral · Selected',exact:true}).getAttribute('aria-pressed'),'true');
await page.evaluate(()=>gameTest.startCampaign(1));await page.keyboard.press('Space');await page.evaluate(()=>{const g=gameTest.snapshot();gameTest.set({lives:1,ball:{...g.ball,y:569}});gameTest.step(.01);});await capture('gameover-desktop');
await page.evaluate(()=>{gameTest.startMode('time',1,{timeLimit:1});const g=gameTest.snapshot();gameTest.set({phase:'playing',mode:{...g.mode,clock:1,started:true}});gameTest.step(.01);});await capture('timeout-desktop');
await page.evaluate(()=>{gameTest.startMode('challenge',3);const g=gameTest.snapshot();gameTest.set({phase:'playing',lives:1,ball:{...g.ball,y:569}});gameTest.step(.01);});await capture('challenge-failed-desktop');
const viewports=[{width:1280,height:800,name:'laptop'},{width:820,height:1180,name:'tablet'},{width:390,height:844,name:'mobile'},{width:320,height:700,name:'small-mobile'}];
for(const v of viewports){await page.setViewportSize(v);await page.goto(base);await page.locator('.mode-card').first().waitFor();await overflow();await capture('home-'+v.name);
 await page.locator('[data-mode=campaign]').click();await overflow();await capture('campaign-'+v.name);await page.locator('#back-modes').click();await page.locator('#open-rewards').click();await overflow();await capture('collection-'+v.name);
 await page.goto(base+'/?test');await page.waitForFunction(()=>window.gameTest);await page.evaluate(()=>gameTest.startCampaign(16));await overflow();await capture('arena-'+v.name);const size=await page.locator('canvas').boundingBox();assert.ok(Math.abs(size.width/size.height-800/560)<.01);
 await page.keyboard.press('Space');await page.evaluate(()=>{for(const id of ['wide','slow','barrier','score','laser','magnet','sticky','fireball'])gameTest.activate(id);});await overflow();await capture('abilities-'+v.name);await page.keyboard.press('p');await capture('pause-'+v.name);
 assert.equal(await page.locator('#start').isVisible(),true);const buttonBox=await page.locator('#start').boundingBox(),arena=await page.locator('.arena').boundingBox();assert.ok(buttonBox.y>=arena.y&&buttonBox.y+buttonBox.height<=arena.y+arena.height,'overlay action stays within arena');
 await page.evaluate(()=>{const g=gameTest.snapshot();gameTest.set({phase:'complete',stats:{...g.stats,livesLost:0}});});await capture('result-'+v.name);const resultButton=await page.locator('#start').boundingBox(),resultArena=await page.locator('.arena').boundingBox();assert.ok(resultButton.y>=resultArena.y&&resultButton.y+resultButton.height<=resultArena.y+resultArena.height,'result action stays within arena');
}
// Real-device FPS is not claimed: this is headless Chromium rAF sampling on host.
async function sample(width,height){await page.setViewportSize({width,height});await page.goto(base+'/?test');await page.waitForFunction(()=>window.gameTest);await page.evaluate(()=>{gameTest.startCampaign(26);gameTest.set({phase:'playing'});for(const id of ['multi','laser','magnet','sticky','fireball','wide','slow'])gameTest.activate(id);gameTest.fire();});
 return page.evaluate(()=>new Promise(resolve=>{const times=[];let last=0;function measure(t){if(last)times.push(t-last);last=t;if(times.length<180)requestAnimationFrame(measure);else{const sorted=[...times].sort((a,b)=>a-b);resolve({frames:times.length,seconds:times.reduce((a,b)=>a+b,0)/1000,fps:1000/(times.reduce((a,b)=>a+b,0)/times.length),medianMs:sorted[90],p95Ms:sorted[171],framesOver33ms:times.filter(x=>x>33.4).length});}}requestAnimationFrame(measure);}));}
const desktopPerformance=await sample(1440,1000),mobilePerformance=await sample(390,844);
await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'/?test');await page.waitForFunction(()=>window.gameTest);assert.equal(await page.locator('.game-shell').evaluate(n=>getComputedStyle(n).animationName),'none');await capture('reduced-motion');
assert.ok(requests.every(url=>url.startsWith(base)),'all assets local');assert.deepEqual(errors,[]);
await writeFile(`${folder}/results.json`,JSON.stringify({passed:true,screens:['home/modes','campaign','challenges','collection/cosmetics','aiming','active abilities/collectibles','pause','completion/rewards','gameover','timeout','challenge failure'],viewports:[{width:1440,height:1000},...viewports],desktopPerformance,mobilePerformance,reducedMotion:true,renderDoesNotMutateGame:true,allAssetsLocal:true,errors,caveats:['Headless host sample, not real phone GPU or cross-browser QA.','Controlled game fixtures for screenshots and terminal states.','Manual screen-reader review remains unperformed.']},null,2));
console.log(JSON.stringify({desktopPerformance,mobilePerformance}));await browser.close();
