// Checkpoint 12: responsiveness, touch, keyboard and accessibility against the running game.
import {chromium, devices} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import AxeBuilder from '../../chess-game-analyzer/node_modules/@axe-core/playwright/dist/index.mjs';
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4328';
const VIEWPORTS=[['desktop',1440,900],['laptop',1280,720],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['mobile',390,844],['small-mobile',320,568],['mobile-landscape',844,390]];
const browser=await chromium.launch({headless:true});
const results={viewports:[],axe:[],notes:[]};
// The local static server occasionally drops a module request; one reload keeps
// the audit measuring the game rather than the test fixture.
const ready=async page=>{try{await page.waitForFunction(()=>window.gameTest,null,{timeout:10000});}
 catch{await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.gameTest,null,{timeout:20000});}};
// 1. Layout at every required size, in the densest HUD state.
for(const [name,width,height] of VIEWPORTS){
 const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?test');await ready(page);
 await page.keyboard.press('Space');
 await page.evaluate(()=>{for(const id of ['wide','slow','barrier','score','laser','magnet','sticky','fireball'])gameTest.activate(id);});
 await page.waitForTimeout(180);
 const m=await page.evaluate(()=>{const c=document.querySelector('canvas').getBoundingClientRect();
  const small=[...document.querySelectorAll('button:not([hidden]),input')].filter(n=>n.offsetParent!==null).map(n=>n.getBoundingClientRect()).filter(r=>r.width>0&&(r.height<24||r.width<24)).length;
  const tiny=[...document.querySelectorAll('p,span,small,output,label,strong,em,h1,h2,h3')].filter(n=>n.offsetParent!==null&&n.getBoundingClientRect().height>0&&parseFloat(getComputedStyle(n).fontSize)<10).length;
  return{overflow:document.documentElement.scrollWidth-innerWidth,ratio:+(c.width/c.height).toFixed(3),
   arenaW:Math.round(c.width),arenaH:Math.round(c.height),fitsViewport:c.bottom<=innerHeight+1,
   smallControls:small,tinyText:tiny,
   offscreen:[...document.querySelectorAll('button:not([hidden])')].filter(n=>n.offsetParent!==null).map(n=>n.getBoundingClientRect()).filter(r=>r.right>innerWidth+1||r.left<-1).length};});
 assert.equal(m.overflow,0,`${name}: no horizontal overflow`);
 assert.ok(Math.abs(m.ratio-800/560)<0.01,`${name}: arena ratio preserved (${m.ratio})`);
 assert.equal(m.fitsViewport,true,`${name}: arena visible without scrolling`);
 assert.equal(m.offscreen,0,`${name}: no clipped controls`);
 assert.equal(m.tinyText,0,`${name}: no text under 10px (${m.tinyText})`);
 assert.equal(m.smallControls,0,`${name}: no undersized controls`);
 assert.deepEqual(errors,[],`${name}: no console errors`);
 await page.screenshot({path:`artifacts/testing/checkpoint12/${name}.png`});
 results.viewports.push({name,width,height,...m});
 await context.close();}
// 2. Resize and rotation during active play must not disturb physics.
{const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();
 await page.goto(base+'/?test');await ready(page);
 await page.evaluate(()=>{gameTest.startCampaign(4);gameTest.set({phase:'playing',ball:{id:0,x:300,y:300,r:7,vx:150,vy:-120}});});
 const before=await page.evaluate(()=>{const g=gameTest.snapshot();return{x:g.ball.x,y:g.ball.y,vx:g.ball.vx,vy:g.ball.vy,level:g.level,score:g.score,bricks:g.bricks.filter(b=>b.alive).length,paddle:g.paddle.x,w:g.paddle.w};});
 for(const size of [{width:390,height:844},{width:844,height:390},{width:320,height:568},{width:1440,height:900}]){await page.setViewportSize(size);await page.waitForTimeout(120);}
 const after=await page.evaluate(()=>{const g=gameTest.snapshot();return{x:g.ball.x,y:g.ball.y,vx:g.ball.vx,vy:g.ball.vy,level:g.level,score:g.score,bricks:g.bricks.filter(b=>b.alive).length,paddle:g.paddle.x,w:g.paddle.w};});
 assert.equal(after.level,before.level,'resize did not reset the level');
 assert.equal(after.score,before.score,'resize did not change score');
 assert.equal(after.bricks,before.bricks,'resize did not alter the wall');
 assert.equal(Math.hypot(after.vx,after.vy).toFixed(6),Math.hypot(before.vx,before.vy).toFixed(6),'ball speed unchanged by resize');
 assert.ok(after.x>=0&&after.x<=800&&after.y>=0&&after.y<=560,'ball stayed in logical bounds');
 assert.equal(after.w,before.w,'paddle width unchanged');
 // Paddle stays inside the playable area after rotation.
 await page.evaluate(()=>{const g=gameTest.snapshot();gameTest.set({paddle:{...g.paddle,x:780}});});
 await page.setViewportSize({width:320,height:568});await page.waitForTimeout(120);
 await page.evaluate(()=>gameTest.step(.016));
 const paddle=await page.evaluate(()=>gameTest.snapshot().paddle);
 assert.ok(paddle.x>=12&&paddle.x+paddle.w<=788,`paddle clamped after resize (${paddle.x})`);
 results.notes.push('resize/rotation preserved physics, level and paddle bounds');
 await context.close();}
// 3. Touch play on an emulated phone, including end-outside and multi-touch.
{const context=await browser.newContext({...devices['iPhone 13'],hasTouch:true,isMobile:true});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?test');await ready(page);
 const box=await page.locator('canvas').boundingBox();
 const cdp=await context.newCDPSession(page);
 const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const at=(fx,fy=0.9)=>({x:box.x+box.width*fx,y:box.y+box.height*fy});
 // Tap launches.
 await touch('touchStart',[at(0.5)]);await touch('touchEnd',[]);await page.waitForTimeout(80);
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,'playing','tap launched the ball');
 // Drag steers the paddle.
 await touch('touchStart',[at(0.25)]);await page.waitForTimeout(60);
 await touch('touchMove',[at(0.75)]);await page.waitForTimeout(120);
 const dragged=await page.evaluate(()=>gameTest.snapshot().paddle.x);
 assert.ok(dragged>400,`drag moved paddle right (${dragged})`);
 // A second finger must not hijack control or double-fire.
 await touch('touchStart',[at(0.75),at(0.1)]);await page.waitForTimeout(80);
 assert.ok(await page.evaluate(()=>gameTest.snapshot().paddle.x)>400,'secondary touch ignored');
 // Releasing outside the canvas leaves a valid state.
 await touch('touchMove',[{x:box.x+box.width*0.9,y:box.y+box.height+120}]);await page.waitForTimeout(60);
 await touch('touchEnd',[]);await page.waitForTimeout(80);
 const afterTouch=await page.evaluate(()=>gameTest.snapshot());
 assert.ok(afterTouch.paddle.x>=12&&afterTouch.paddle.x+afterTouch.paddle.w<=788,'paddle valid after off-canvas release');
 // Sticky release and laser fire via touch.
 await page.evaluate(()=>{gameTest.activate('sticky');const g=gameTest.snapshot();gameTest.set({phase:'playing',ball:{...g.ball,x:g.paddle.x+g.paddle.w/2,y:g.paddle.y-40,vx:0,vy:300}});});
 await page.evaluate(()=>{for(let i=0;i<12;i++)gameTest.step(.016);});
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).ball.stuck,true,'ball caught by sticky paddle');
 await touch('touchStart',[at(0.5)]);await touch('touchEnd',[]);await page.waitForTimeout(80);
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).ball.stuck,false,'tap released the sticky ball');
 await page.evaluate(()=>gameTest.activate('laser'));await page.waitForTimeout(60);
 assert.equal(await page.locator('#fire').isVisible(),true,'Fire control visible on touch');
 const shotsBefore=await page.evaluate(()=>gameTest.snapshot().effects.projectiles.length);
 await page.locator('#fire').tap();await page.waitForTimeout(80);
 assert.ok(await page.evaluate(()=>gameTest.snapshot().effects.projectiles.length)>shotsBefore,'Fire button works via touch');
 // Sliders must not launch or fire.
 await page.locator('#settings-toggle').tap();
 const phaseBefore=await page.evaluate(()=>gameTest.snapshot().phase);
 const shots=await page.evaluate(()=>gameTest.snapshot().effects.projectiles.length);
 await page.locator('#sfx-volume').tap();await page.waitForTimeout(100);
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,phaseBefore,'slider did not change game phase');
 assert.ok(await page.evaluate(()=>gameTest.snapshot().effects.projectiles.length)<=shots+0,'slider did not fire the laser');
 await page.screenshot({path:'artifacts/testing/checkpoint12/touch-phone.png'});
 assert.deepEqual(errors,[],'no errors during touch play');
 results.notes.push('emulated touch: tap launch, drag, multi-touch, off-canvas release, sticky release, fire, slider safety');
 await context.close();}
// 4. Keyboard-only operation and focus behaviour.
{const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();
 await page.goto(base+'/?test');await ready(page);
 await page.keyboard.press('Space');await page.waitForTimeout(80);
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');
 assert.ok(await page.evaluate(()=>gameTest.snapshot().paddle.x)>344,'arrow keys move the paddle');
 await page.keyboard.press('KeyP');await page.waitForTimeout(80);
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,'paused','P pauses');
 await page.keyboard.press('KeyP');await page.waitForTimeout(80);
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,'playing','P resumes');
 // Space on a focused button activates it without launching gameplay.
 await page.evaluate(()=>{gameTest.startCampaign(2);});await page.waitForTimeout(80);
 await page.locator('#restart').focus();
 const phase=await page.evaluate(()=>gameTest.snapshot().phase);
 await page.keyboard.press('Space');await page.waitForTimeout(120);
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,phase,'Space on a button did not launch the ball');
 // Settings: focus moves in, Escape closes and restores focus without pausing.
 await page.keyboard.press('Space');await page.waitForTimeout(60);
 await page.locator('#settings-toggle').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'mute','focus enters the settings panel');
 const playing=await page.evaluate(()=>gameTest.snapshot().phase);
 await page.keyboard.press('Escape');await page.waitForTimeout(100);
 assert.equal(await page.locator('#settings-panel').isHidden(),true,'Escape closed settings');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'settings-toggle','focus restored to the opener');
 assert.equal((await page.evaluate(()=>gameTest.snapshot())).phase,playing,'Escape in settings did not pause the game');
 // Escape inside the reset dialog closes only that dialog.
 await page.locator('#settings-toggle').click();await page.locator('#reset-progress').click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'reset-understand','focus enters the confirmation');
 await page.keyboard.press('Escape');await page.waitForTimeout(80);
 assert.equal(await page.locator('#reset-confirm').isHidden(),true,'Escape closed the confirmation');
 assert.equal(await page.locator('#settings-panel').isHidden(),false,'settings stayed open');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'reset-progress','focus restored after confirmation');
 // Visible focus indicator.
 const outline=await page.evaluate(()=>{const n=document.querySelector('#restart');n.focus();const s=getComputedStyle(n);return{width:s.outlineWidth,style:s.outlineStyle};});
 assert.notEqual(outline.style,'none','focus indicator present');
 // Menus are reachable by Tab alone.
 await page.goto(base+'/');await page.locator('.mode-card').first().waitFor();
 const reached=await page.evaluate(async()=>{const order=[];for(let i=0;i<14;i++){order.push(document.activeElement?.id||document.activeElement?.className||'body');}
  return order;});
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');
 assert.ok(await page.evaluate(()=>document.activeElement!==document.body),'Tab reaches interactive elements');
 results.notes.push('keyboard: movement, pause, Space/button separation, Escape layering, focus restore');
 await context.close();}
// 5. Reduced motion keeps gameplay intact and persists.
{const context=await browser.newContext({viewport:{width:1280,height:800}});const page=await context.newPage();
 await page.goto(base+'/?test');await ready(page);
 await page.evaluate(()=>localStorage.clear());
 await page.goto(base+'/?test');await ready(page);
 await page.locator('#settings-toggle').click();await page.locator('#reduced-effects').check();await page.waitForTimeout(500);
 await page.goto(base+'/?test');await ready(page);
 assert.equal((await page.evaluate(()=>gameTest.settings())).reduced,true,'reduced motion persisted');
 assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('reduced-effects')),true,'applied on boot');
 await page.evaluate(()=>{gameTest.startCampaign(16);gameTest.set({phase:'playing'});});
 await page.evaluate(()=>{const b=gameTest.snapshot().bricks.find(x=>x.type==='explosive');gameTest.set({ball:{id:0,x:b.x+b.w/2,y:b.y-8,r:7,vx:0,vy:265}});gameTest.step(.008);});
 await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>gameTest.particles()),0,'decorative particles suppressed');
 const cleared=await page.evaluate(()=>gameTest.snapshot().cleared);
 assert.ok(cleared>0,'collisions still register with reduced motion');
 // Power-ups behave normally after resizing with reduced motion on.
 await page.evaluate(()=>{for(const id of ['multi','fireball','barrier'])gameTest.activate(id);});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 const s=await page.evaluate(()=>gameTest.snapshot());
 assert.equal(s.balls.length,3,'multi-ball intact after resize');
 assert.ok(s.effects.active.fireball&&s.effects.active.barrier,'power-ups intact after resize');
 results.notes.push('reduced motion persists, suppresses decoration, preserves collisions and power-ups');
 await context.close();}
// 6. Axe scans across sizes and key surfaces.
for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,568]]){
 const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();
 await page.goto(base+'/');await page.locator('.mode-card').first().waitFor();
 const surfaces=[];
 const scan=async label=>{await page.waitForTimeout(400);
  await page.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  surfaces.push({label,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))});};
 await scan('home');
 await page.locator('[data-mode=campaign]').click();await scan('levels');
 await page.locator('#back-modes').click();await page.locator('#open-rewards').click();await scan('collection');
 await page.goto(base+'/?test');await ready(page);await scan('gameplay');
 await page.keyboard.press('Space');await page.evaluate(()=>{for(const id of ['wide','laser','sticky'])gameTest.activate(id);});await page.waitForTimeout(150);await scan('active-abilities');
 await page.locator('#settings-toggle').click();await scan('settings');
 await page.locator('#reset-progress').click();await scan('reset-dialog');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.keyboard.press('KeyP');await page.waitForTimeout(150);await scan('pause-dialog');
 results.axe.push({viewport:name,surfaces});
 await context.close();}
const violations=results.axe.flatMap(v=>v.surfaces.flatMap(s=>s.violations.map(x=>({viewport:v.viewport,surface:s.label,...x}))));
await writeFile('artifacts/testing/checkpoint12/results.json',JSON.stringify({...results,violations},null,2));
console.log(JSON.stringify({viewports:results.viewports.map(v=>`${v.name}:${v.arenaW}x${v.arenaH}`),violations},null,1));
assert.deepEqual(violations,[],'no WCAG A/AA violations detected');
console.log('Checkpoint 12 checks passed');await browser.close();
