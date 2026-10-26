import { chromium } from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
// Measure actual rendered paddle/ball pixels, without exposing game state.
async function positions(p) {
  return p.evaluate(()=>{
    const c=document.querySelector('canvas'),ctx=c.getContext('2d'),s=c.width/800;
    function span(y,predicate){const d=ctx.getImageData(0,Math.round(y*s),c.width,1).data;const xs=[];
      for(let x=0;x<c.width;x++)if(predicate(d[x*4],d[x*4+1],d[x*4+2]))xs.push(x/s);
      return xs.length ? (xs[0]+xs.at(-1))/2 : null;}
    return {paddle:span(514,(r,g,b)=>r>170&&g>210&&b>180),ball:span(499,(r,g,b)=>r>230&&g>230&&b>200)};
  });
}
await page.goto('http://127.0.0.1:4328/?test'); await page.waitForTimeout(150);
await page.screenshot({path:'artifacts/testing/start-desktop.png',fullPage:true});
await page.waitForTimeout(80);
assert.match(await page.locator('#status').textContent(),/launch/i);
let pos=await positions(page); assert.ok(Math.abs(pos.paddle-400)<2&&Math.abs(pos.ball-400)<2);
for(const [key,sign] of [['ArrowRight',1],['ArrowLeft',-1],['d',1],['a',-1]]) {
  const before=await positions(page); await page.keyboard.down(key); await page.waitForTimeout(180); await page.keyboard.up(key);
  const after=await positions(page); assert.ok((after.paddle-before.paddle)*sign>40,key+' moves paddle');
  assert.ok(Math.abs(after.ball-after.paddle)<2,key+' carries reset ball');
}
const box=await page.locator('canvas').boundingBox();
await page.mouse.move(box.x+box.width*.75,box.y+box.height*.8); await page.waitForTimeout(80);
pos=await positions(page); assert.ok(Math.abs(pos.paddle-600)<2&&Math.abs(pos.ball-600)<2,'mouse positioning');
await page.screenshot({path:'artifacts/testing/aim-desktop.png',fullPage:true});
await page.keyboard.press('Space'); await page.waitForTimeout(180);
assert.match(await page.locator('#status').textContent(),/0\/24/); assert.equal((await positions(page)).ball,null,'ball left paddle');
await page.screenshot({path:'artifacts/testing/play-desktop.png',fullPage:true});
await page.reload();
await page.mouse.click(box.x+box.width*.4,box.y+box.height*.8); await page.waitForTimeout(80);
assert.match(await page.locator('#status').textContent(),/0\/24/); assert.ok(Math.abs((await positions(page)).paddle-320)<2,'click positions and launches');
await page.waitForFunction(()=>document.querySelector('#lives').textContent==='2',{timeout:15000});
assert.match(await page.locator('#status').textContent(),/Launch when ready/);
await page.getByRole('button',{name:'Restart',exact:true}).click(); await page.waitForTimeout(80);
assert.match(await page.locator('#status').textContent(),/launch/i); assert.ok(Math.abs((await positions(page)).ball-400)<2);
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const mobile=await context.newPage(); mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto('http://127.0.0.1:4328/?test'); await mobile.waitForFunction(()=>window.gameTest); await mobile.waitForTimeout(100);
await mobile.screenshot({path:'artifacts/testing/start-mobile.png',fullPage:true});
const mb=await mobile.locator('canvas').boundingBox();
const cdp=await context.newCDPSession(mobile);
const point=x=>({x:mb.x+mb.width*x,y:mb.y+mb.height*.8});
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(.25)]}); await mobile.waitForTimeout(60);
assert.match(await mobile.locator('#status').textContent(),/0\/24/); assert.ok(Math.abs((await positions(mobile)).paddle-200)<3,'touch launch and positioning');
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(.7)]}); await mobile.waitForTimeout(60);
assert.ok(Math.abs((await positions(mobile)).paddle-560)<3,'touch drag movement');
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await mobile.screenshot({path:'artifacts/testing/play-mobile.png',fullPage:true});
assert.deepEqual(errors,[]);
await writeFile('artifacts/testing/browser-results.json',JSON.stringify({passed:true,checks:['arrows left/right','A/D left/right','reset ball follows paddle','mouse movement','Space launch','mouse click launch','loss/replay reset','emulated touch launch','emulated touch drag','mobile layout','no browser exceptions'],errors},null,2));
console.log('All keyboard, mouse and emulated touch input checks passed'); await browser.close();
