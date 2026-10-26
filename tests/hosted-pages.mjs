// Real public-site smoke test. No gameTest, injected saves or simulated engine steps.
// Optional QA dependency only: npm install --no-save --package-lock=false playwright@1.64.1
// Then npx playwright install chromium && node tests/hosted-pages.mjs
// PLAYWRIGHT_MODULE optionally selects an already-installed QA module.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {chromium,devices}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='https://dheeraj-baghel.github.io/brick-ball-breaker/';
const output='artifacts/testing/github-pages';
await mkdir(output,{recursive:true});
const checks=[],errors=[],failures=[];
const record=(name)=>{checks.push({name,status:'PASS'});console.log(`PASS ${name}`);};
const browser=await chromium.launch({headless:true});
function observe(page){
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>failures.push(r.url()));
 page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
}
async function boot(page,suffix=''){
 const response=await page.goto(base+suffix,{waitUntil:'networkidle'});
 assert.equal(response.status(),200);
 await page.locator('.mode-card').first().waitFor();
 assert.equal(await page.locator('.mode-card').count(),5);
 assert.equal(await page.locator('#boot-error').isHidden(),true);
}
async function launch(page){
 await page.keyboard.press('Space');
 await page.waitForFunction(()=>/\d+\/\d+/.test(document.querySelector('#status').textContent)
  &&document.querySelector('#pause').textContent==='Pause');
 assert.equal(await page.locator('#overlay').isHidden(),true);
 assert.match(await page.locator('#status').textContent(),/\d+\/\d+/);
}
try {
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();observe(page);
 await boot(page);
 record('public HTTPS cold load: five modes, no boot error');
 // Compare every deployable HTML/CSS/module/art byte, not just status codes.
 const manifest=JSON.parse(await readFile('dist/build-manifest.json','utf8'));
 const paths=['index.html','assets/arcade-study.svg',...[
  'art','audio','bricks','campaign-ui','game','input','levels','main','mode-runtime',
  'modes','powerup-ui','powerups','render','rewards-ui','rewards','storage'
 ].map(name=>`src/${name}.js`),'src/styles.css'];
 assert.equal(paths.length,manifest.files);
 for(const file of paths){
  const response=await context.request.get(base+file);assert.equal(response.status(),200,file);
  const local=await readFile('dist/'+file),remote=await response.body();
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(remote),hash(local),`published bytes match ${file}`);
 }
 record('all 19 public application files match the local production build byte-for-byte');
 await boot(page,'?test&storage=off');
 assert.equal(await page.evaluate(()=>typeof window.gameTest),'undefined');
 record('debug harness unavailable on the public hostname even with ?test');
 await page.screenshot({path:output+'/home-desktop.png',fullPage:true});
 await page.locator('[data-mode="campaign"]').click();
 assert.equal(await page.locator('#level-grid .level-card').count(),30);
 await page.locator('#level-grid .level-card').first().click();
 await launch(page);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(150);await page.keyboard.up('ArrowRight');
 await page.locator('#pause').click();
 assert.match(await page.locator('#screen-title').textContent(),/breather/);
 // Read the canvas itself: a DOM screenshot also includes the pause-overlay entrance animation.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const canvasHash=()=>page.evaluate(()=>document.querySelector('canvas').toDataURL());
 const frozen=await canvasHash();await page.waitForTimeout(200);
 assert.equal(await canvasHash(),frozen,'underlying game canvas stays frozen while paused');
 await page.locator('#pause').click();assert.equal(await page.locator('#overlay').isHidden(),true);
 await page.locator('#restart').click();assert.equal(await page.locator('#score').textContent(),'0');
 assert.match(await page.locator('#status').textContent(),/Launch when ready/);
 record('campaign selection, real keyboard launch, pause freeze, resume and restart');
 await page.locator('#settings-toggle').click();await page.locator('#music-volume').fill('15');
 await page.locator('#mute').check();await page.waitForTimeout(600);
 assert.ok(await page.evaluate(()=>localStorage.getItem('brick-ball-breaker/save')));
 await boot(page);
 await page.locator('[data-mode="campaign"]').click();await page.locator('#level-grid .level-card').first().click();
 await page.locator('#settings-toggle').click();
 assert.equal(await page.locator('#music-volume').inputValue(),'15');assert.equal(await page.locator('#mute').isChecked(),true);
 await page.keyboard.press('Escape');
 record('hosted settings persisted across reload on the GitHub Pages origin');
 await page.screenshot({path:output+'/arena-desktop.png',fullPage:true});
 await page.locator('#menu').click();
 for(const mode of ['endless','time','hardcore']){
  await page.locator(`[data-mode="${mode}"]`).click();await launch(page);
  if(mode==='time')assert.equal(await page.locator('#countdown').isVisible(),true);
  if(mode==='hardcore')assert.equal(await page.locator('#lives').textContent(),'1');
  await page.locator('#menu').click();
 }
 await page.locator('[data-mode="challenge"]').click();assert.equal(await page.locator('#challenge-grid .level-card').count(),10);
 await page.locator('#challenge-grid .level-card').first().click();await launch(page);await page.locator('#menu').click();
 record('Endless, Time Attack, Hardcore and Challenge live launch/menu flows');
 await page.locator('#open-rewards').click();assert.equal(await page.locator('#rewards-menu').isVisible(),true);
 await page.locator('#back-rewards').click();record('collection opens and returns to the mode menu');
 const phone=await browser.newContext({...devices['iPhone 13']});
 const mobile=await phone.newPage();observe(mobile);await boot(mobile);
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 await mobile.screenshot({path:output+'/home-mobile.png',fullPage:true});
 await mobile.locator('[data-mode="campaign"]').tap();await mobile.locator('#level-grid .level-card').first().tap();
 const box=await mobile.locator('canvas').boundingBox();
 await mobile.touchscreen.tap(box.x+box.width/2,box.y+box.height*.9);
 await mobile.waitForFunction(()=>/\d+\/\d+/.test(document.querySelector('#status').textContent));
 assert.equal(await mobile.locator('#overlay').isHidden(),true);
 await mobile.locator('#pause').tap();assert.equal(await mobile.locator('#overlay').isVisible(),true);
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 const arena=await mobile.locator('.arena').boundingBox();
 assert.ok(arena.y+arena.height<=844,JSON.stringify(arena));
 await mobile.screenshot({path:output+'/arena-mobile.png',fullPage:true});
 record('emulated-phone load, no horizontal overflow, actual tap launch/pause and arena fit');
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 record('zero browser console/page errors or failed/HTTP-error requests');
} finally {
 await browser.close();
 await writeFile(output+'/results.json',JSON.stringify({url:base,verifiedAt:new Date().toISOString(),checks,errors,failures,limits:'Chromium + emulated phone only; no physical device or human audio review.'},null,2));
}
console.log(`${checks.length}/${checks.length} hosted checks passed.`);
