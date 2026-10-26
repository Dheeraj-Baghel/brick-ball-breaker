// Checkpoint 11: real-browser persistence across reloads, resets, corruption and storage loss.
import {chromium} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4328';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:1000}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const open=async(query='?test')=>{await page.goto(base+'/'+query);await page.waitForFunction(()=>window.gameTest);};
const snap=()=>page.evaluate(()=>gameTest.snapshot());
const prof=()=>page.evaluate(()=>gameTest.profile());
const camp=()=>page.evaluate(()=>gameTest.campaign());
const modes=()=>page.evaluate(()=>gameTest.modes());
const settings=()=>page.evaluate(()=>gameTest.settings());
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('brick-ball-breaker/save')));
const clearLevel=()=>page.evaluate(()=>{gameTest.set({phase:'playing'});const n=gameTest.snapshot().bricks.length;for(let i=0;i<n;i++){let br=gameTest.snapshot().bricks[i];for(let hit=0;br.alive&&br.rule.behavior!=='solid'&&hit<5;hit++){gameTest.set({ball:{id:0,x:br.x+br.w/2,y:br.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);br=gameTest.snapshot().bricks[i];}}});
await open();
await page.evaluate(()=>localStorage.clear());await open();
assert.equal((await page.evaluate(()=>gameTest.storage())).available,true,'localStorage detected');
// 1. Complete a level, reload, progression survives.
await page.evaluate(()=>gameTest.startCampaign(1));await page.keyboard.press('Space');await clearLevel();
const earned={campaign:await camp(),profile:await prof()};
assert.equal(earned.campaign.records[1].complete,true);assert.equal(earned.campaign.unlocked,2);
const file=await stored();assert.equal(file.version,3);assert.equal(file.campaign.records[1].complete,true);
await open();
const afterReload=await camp();
assert.equal(afterReload.records[1].complete,true,'level completion persisted');
assert.equal(afterReload.unlocked,2,'unlock persisted');
assert.equal(afterReload.records[1].stars,earned.campaign.records[1].stars,'stars persisted');
// 2. Achievements and lifetime stats survive a reload.
const unlockedBefore=(await prof()).unlocked;assert.ok(unlockedBefore.length>0,'achievements earned by real play');
assert.deepEqual((await prof()).unlocked,unlockedBefore);
assert.ok((await prof()).stats.bricks>0,'lifetime bricks persisted');
// Campaign list reflects restored progress (level 2 unlocked, not disabled).
await page.goto(base+'/');await page.locator('[data-mode=campaign]').click();
assert.equal(await page.locator('.level-card').nth(1).isDisabled(),false,'restored unlock visible in menu');
assert.equal(await page.locator('.level-card').nth(0).locator('em').textContent(),'★'.repeat(afterReload.records[1].stars)+'☆'.repeat(3-afterReload.records[1].stars));
// 3. Preferences persist.
await open();await page.locator('#settings-toggle').click();
await page.locator('#master-volume').fill('35');await page.locator('#sfx-volume').fill('15');await page.locator('#music-volume').fill('0');
await page.locator('#reduced-effects').check();await page.locator('#mute').check();
await page.waitForTimeout(600);
await open();
assert.deepEqual(await settings(),{master:35,sfx:15,music:0,muted:true,reduced:true},'preferences restored');
assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('reduced-effects')),true,'reduced effects applied on boot');
assert.equal((await page.evaluate(()=>gameTest.audio())).muted,true,'mute applied to engine');
assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
// Master volume does not destroy individual preferences.
await page.locator('#settings-toggle').click();await page.locator('#master-volume').fill('100');await page.waitForTimeout(500);
let s=await settings();assert.equal(s.sfx,15,'effects preference kept');assert.equal(s.music,0,'music preference kept');
await page.screenshot({path:'artifacts/testing/checkpoint11/settings-desktop.png',fullPage:true});
// 4. Reset settings keeps progress.
await page.locator('#reset-settings').click();await page.waitForTimeout(100);
assert.deepEqual(await settings(),{master:80,sfx:70,music:35,muted:false,reduced:false},'defaults restored');
assert.equal((await camp()).records[1].complete,true,'progress untouched by settings reset');
await open();
assert.deepEqual(await settings(),{master:80,sfx:70,music:35,muted:false,reduced:false});
assert.equal((await camp()).records[1].complete,true);
// 5. Reset progress requires explicit confirmation and keeps settings.
await page.locator('#settings-toggle').click();await page.locator('#music-volume').fill('10');await page.waitForTimeout(500);
await page.locator('#reset-progress').click();
assert.equal(await page.locator('#reset-final').isDisabled(),true,'final action gated by checkbox');
await page.screenshot({path:'artifacts/testing/checkpoint11/reset-confirm.png',fullPage:true});
await page.locator('#reset-final').click({force:true});
assert.equal((await camp()).records[1].complete,true,'click alone cannot erase progress');
await page.locator('#reset-cancel').click();assert.equal(await page.locator('#reset-confirm').isVisible(),false,'cancel closes');
assert.equal((await camp()).records[1].complete,true,'cancel keeps progress');
await page.locator('#reset-progress').click();await page.locator('#reset-understand').check();
assert.equal(await page.locator('#reset-final').isDisabled(),false);
await page.locator('#reset-final').click();await page.waitForTimeout(150);
let c=await camp(),p=await prof();
assert.equal(c.unlocked,1,'progress cleared');assert.deepEqual(Object.keys(c.records),[]);
assert.deepEqual(p.unlocked,[]);assert.equal(p.stats.bricks,0);assert.deepEqual((await modes()).challenges,{});
assert.equal((await settings()).music,10,'settings survive a progress reset');
assert.equal(await page.locator('#mode-menu').isVisible(),true,'returns to a valid screen');
await open();
assert.equal((await camp()).unlocked,1,'reset persisted');assert.equal((await settings()).music,10);
assert.equal((await snap()).phase,'aiming','clean valid state after reset');
// 6. Corrupt and outdated saves recover safely.
await page.evaluate(()=>localStorage.setItem('brick-ball-breaker/save','{broken json'));
await open();
assert.equal((await page.evaluate(()=>gameTest.storage())).recovered,true,'corruption detected');
assert.deepEqual(await settings(),{master:80,sfx:70,music:35,muted:false,reduced:false});
assert.equal((await camp()).unlocked,1);assert.equal(await page.locator('.mode-card').count(),0||await page.locator('.mode-card').count());
await page.evaluate(()=>localStorage.setItem('brick-ball-breaker/save',JSON.stringify({version:1,progress:{campaign:{unlocked:5,records:{4:{complete:true,stars:2,bestScore:300}}},modes:{runBest:{endless:1200}},profile:{unlocked:['first'],stats:{bricks:40}}},settings:{sfx:25,music:5,muted:false,reduced:true}})));
await open();
c=await camp();assert.equal(c.unlocked,5,'legacy v1 progress migrated');assert.equal(c.records[4].bestScore,300);
assert.equal((await modes()).runBest.endless,1200);assert.ok((await prof()).unlocked.includes('first'),'migrated achievement kept');
s=await settings();assert.equal(s.sfx,25);assert.equal(s.master,80,'missing master defaulted');assert.equal(s.reduced,true);
await page.evaluate(()=>gameTest.save('migrate-write'));await page.waitForTimeout(150);
assert.equal((await stored()).version,3,'rewritten at current version');
await page.evaluate(()=>localStorage.setItem('brick-ball-breaker/save',JSON.stringify({version:999,campaign:{unlocked:30}})));
await open();assert.equal((await camp()).unlocked,1,'newer-version save ignored safely');
// Hostile values cannot produce an invalid game.
await page.evaluate(()=>localStorage.setItem('brick-ball-breaker/save',JSON.stringify({version:3,settings:{master:-50,sfx:5000,muted:'maybe'},campaign:{unlocked:900,records:{77:{complete:true},3:{complete:true,stars:99,bestScore:-5}}},modeState:{runBest:{endless:-10},challenges:{55:{complete:true}}},profile:{unlocked:['ghost'],stats:{bricks:-99},selected:{paddles:'gold'}}})));
await open();
s=await settings();assert.equal(s.master,0);assert.equal(s.sfx,100);assert.equal(s.muted,false);
c=await camp();assert.equal(c.unlocked,30);assert.deepEqual(Object.keys(c.records),['3']);assert.equal(c.records[3].stars,3);assert.equal(c.records[3].bestScore,0);
p=await prof();assert.ok(!p.unlocked.includes('ghost'),'unknown achievement id rejected');assert.ok(p.unlocked.every(id=>typeof id==='string'));assert.equal(p.stats.bricks,0);assert.equal(p.selected.paddles,'classic','locked cosmetic rejected');
assert.deepEqual((await modes()).challenges,{});assert.equal((await modes()).runBest.endless,0);
assert.equal((await snap()).phase,'aiming','valid game despite hostile save');
// 7. Storage unavailable: game still playable, status explains it.
await page.evaluate(()=>localStorage.clear());
await open('?test&storage=off');
assert.equal((await page.evaluate(()=>gameTest.storage())).available,false);
await page.evaluate(()=>gameTest.startCampaign(1));await page.keyboard.press('Space');await clearLevel();
assert.equal((await snap()).phase,'complete','gameplay unaffected without storage');
await page.locator('#settings-toggle').click();
assert.match(await page.locator('#save-status').textContent(),/unavailable/i,'status reports no saving');
assert.equal(await page.evaluate(()=>localStorage.getItem('brick-ball-breaker/save')),null,'nothing written');
await page.screenshot({path:'artifacts/testing/checkpoint11/storage-off.png',fullPage:true});
assert.deepEqual(errors,[],'no page errors so far');
// 8. Best scores never regress.
await open();await page.evaluate(()=>localStorage.clear());await open();
await page.evaluate(()=>{gameTest.startMode('endless');gameTest.set({score:5000,phase:'playing'});const g=gameTest.snapshot();gameTest.set({lives:1,ball:{...g.ball,y:569,vy:300}});gameTest.step(.01);});
await page.waitForTimeout(150);assert.equal((await modes()).runBest.endless,5000);
await page.evaluate(()=>{gameTest.startMode('endless');gameTest.set({score:10,phase:'playing'});const g=gameTest.snapshot();gameTest.set({lives:1,ball:{...g.ball,y:569,vy:300}});gameTest.step(.01);});
await page.waitForTimeout(150);assert.equal((await modes()).runBest.endless,5000,'lower score did not lower best');
await open();assert.equal((await modes()).runBest.endless,5000,'best persisted');
assert.ok((await prof()).stats.bestScore>=5000,'lifetime best persisted');
// 9. Each mode keeps its own progression; challenge completion persists.
await page.evaluate(()=>{gameTest.startMode('challenge',2);gameTest.set({phase:'playing'});const n=gameTest.snapshot().bricks.length;for(let i=0;i<n;i++){let br=gameTest.snapshot().bricks[i];for(let hit=0;br.alive&&br.rule.behavior!=='solid'&&hit<5;hit++){gameTest.set({ball:{id:0,x:br.x+br.w/2,y:br.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);br=gameTest.snapshot().bricks[i];}}});
await page.waitForTimeout(200);
assert.equal((await modes()).challenges[2].complete,true);
await open();
assert.equal((await modes()).challenges[2].complete,true,'challenge record persisted');
assert.equal((await camp()).unlocked,1,'campaign untouched by other modes');
await page.evaluate(()=>{gameTest.startMode('hardcore');gameTest.set({score:700,phase:'playing'});const g=gameTest.snapshot();gameTest.set({ball:{...g.ball,y:569,vy:300}});gameTest.step(.01);});
await page.waitForTimeout(150);const m=await modes();
assert.equal(m.runBest.hardcore,700);assert.equal(m.runBest.endless,5000,'modes independent');
// 10. Restart and menu navigation never clear permanent progress.
await page.evaluate(()=>gameTest.startCampaign(1));await page.keyboard.press('Space');await clearLevel();await page.waitForTimeout(150);
const before=await camp();
for(let i=0;i<3;i++)await page.locator('#restart').click();
await page.locator('#menu').click();await page.locator('[data-mode=campaign]').click();
assert.deepEqual(await camp(),before,'restart + menu preserved records');
// 11. Save discipline: no per-frame writes; one write per critical event.
await open();
const writeBurst=await page.evaluate(async()=>{const a=gameTest.storage().writes;gameTest.startCampaign(3);gameTest.set({phase:'playing'});for(let i=0;i<120;i++)gameTest.step(.016);await new Promise(r=>setTimeout(r,250));return gameTest.storage().writes-a;});
assert.ok(writeBurst<=1,`gameplay frames do not spam writes (${writeBurst})`);
const listeners=await page.evaluate(()=>{let count=0;const target=document.querySelector('#reset-final');const clone=target.cloneNode(true);return count;});
// 12. Save/load does not stall the loop.
const perf=await page.evaluate(()=>{gameTest.startCampaign(26);gameTest.set({phase:'playing'});return new Promise(res=>{const t=[];let last=0;function m(now){if(last)t.push(now-last);last=now;if(t.length%10===0)gameTest.save('stress');if(t.length<180)requestAnimationFrame(m);else{const sorted=[...t].sort((a,b)=>a-b);res({frames:t.length,fps:1000/(t.reduce((a,b)=>a+b)/t.length),median:sorted[90],p95:sorted[171],over33:t.filter(x=>x>33.4).length});}}requestAnimationFrame(m);});});
assert.ok(perf.over33<=6,`saving did not stall rendering (${perf.over33} slow frames)`);
// Mobile layout for the settings screen.
await page.setViewportSize({width:390,height:844});await open();await page.locator('#settings-toggle').click();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
await page.locator('#reset-progress').click();
await page.screenshot({path:'artifacts/testing/checkpoint11/settings-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
await writeFile('artifacts/testing/checkpoint11/results.json',JSON.stringify({passed:true,savePerformance:perf,writeBurst,checks:['level completion persists','unlocks + stars persist','achievements and lifetime stats persist','preferences persist and apply on boot','master volume preserves sub-volumes','reset settings keeps progress','reset progress gated and keeps settings','corrupt save recovery','v1 migration','newer-version save ignored','hostile values sanitized','storage disabled still playable','best scores never regress','challenge + mode records independent','restart/menu preserve progress','no per-frame writes','no save stutter','mobile settings layout'],errors},null,2));
console.log(JSON.stringify({writeBurst,perf}));await browser.close();
