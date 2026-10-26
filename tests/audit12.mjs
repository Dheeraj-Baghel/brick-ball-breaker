// Checkpoint 12 audit pass: find real layout/accessibility defects before fixing.
import {chromium} from '../../chess-game-analyzer/node_modules/playwright/index.mjs';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4328';
const VIEWPORTS=[['desktop',1440,900],['laptop',1280,720],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['mobile',390,844],['small-mobile',320,568],['mobile-landscape',844,390]];
const browser=await chromium.launch({headless:true});const findings=[];
for(const [name,width,height] of VIEWPORTS){
 const context=await browser.newContext({viewport:{width,height}});const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?test',{waitUntil:'load'});await page.waitForFunction(()=>window.gameTest,null,{timeout:15000});
 const report=await page.evaluate(()=>{
  const out={overflow:document.documentElement.scrollWidth-innerWidth,small:[],tiny:[],offscreen:[],overlaps:[]};
  const interactive=[...document.querySelectorAll('button,input,[tabindex]')].filter(n=>n.offsetParent!==null||getComputedStyle(n).position==='fixed');
  for(const n of interactive){const r=n.getBoundingClientRect();if(r.width===0&&r.height===0)continue;
   const id=n.id||n.className||n.tagName;
   if(r.height<44||r.width<44)out.small.push({id,w:Math.round(r.width),h:Math.round(r.height)});
   if(r.right>innerWidth+1||r.left<-1)out.offscreen.push({id,left:Math.round(r.left),right:Math.round(r.right)});}
  for(const n of document.querySelectorAll('p,span,small,output,label,strong,em')){const r=n.getBoundingClientRect();if(!r.height||n.offsetParent===null)continue;
   const size=parseFloat(getComputedStyle(n).fontSize);if(size<10)out.tiny.push({id:n.id||n.className||n.tagName,size});}
  const canvas=document.querySelector('canvas').getBoundingClientRect();
  out.arena={w:Math.round(canvas.width),h:Math.round(canvas.height),ratio:+(canvas.width/canvas.height).toFixed(3),visible:canvas.bottom<=innerHeight+1,bottom:Math.round(canvas.bottom)};
  out.hud=[...document.querySelectorAll('.ability')].length;
  return out;});
 // Active abilities + settings open is the densest HUD state.
 await page.keyboard.press('Space');
 await page.evaluate(()=>{for(const id of ['wide','slow','barrier','score','laser','magnet','sticky','fireball'])gameTest.activate(id);});
 await page.locator('#settings-toggle').click();await page.waitForTimeout(150);
 const dense=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,
  arenaBottom:Math.round(document.querySelector('canvas').getBoundingClientRect().bottom),
  viewport:innerHeight,
  fireVisible:(()=>{const r=document.querySelector('#fire').getBoundingClientRect();return r.width>0&&r.bottom<=innerHeight;})(),
  sliderSmall:[...document.querySelectorAll('input[type=range]')].map(n=>Math.round(n.getBoundingClientRect().height))}));
 await page.screenshot({path:`artifacts/testing/checkpoint12/audit-${name}.png`,fullPage:false});
 findings.push({name,width,height,...report,dense,errors});
 await context.close();}
await writeFile('artifacts/testing/checkpoint12/audit.json',JSON.stringify(findings,null,2));
for(const f of findings)console.log(f.name,'overflow',f.overflow,'| arena',f.arena.w+'x'+f.arena.h,'ratio',f.arena.ratio,'bottom',f.arena.bottom,'vs',f.height,'| small',f.small.length,'| tiny',f.tiny.length,'| offscreen',f.offscreen.length,'| denseOverflow',f.dense.overflow,'| fireVisible',f.dense.fireVisible,'| errors',f.errors.length);
await browser.close();
