// Original presentation-only artwork. No gameplay values or registry mutations.
export const INK={ivory:'#F3EFE4',charcoal:'#252823',ink:'#34372F',sage:'#899576',olive:'#687451',clay:'#C66B49',ochre:'#D2A74E',teal:'#527F7A',gray:'#8A887F'};
export const MOTION={hover:140,state:180,screen:260,impact:100,shatter:240};
const preference=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
// OS preference OR in-game Reduced effects. Essential state feedback stays on.
let reducedSetting=false;
export function setReducedEffects(v){reducedSetting=Boolean(v);document.documentElement.classList.toggle('reduced-effects',reducedSetting);}
export function reducedMotion(){return reducedSetting||(preference?.matches??false);}
export const EASE='cubic-bezier(.22,.61,.36,1)';
export function pulse(selector,variant='gain'){const n=document.querySelector(selector);if(!n)return;if(reducedMotion()){n.dataset.flash=variant;setTimeout(()=>delete n.dataset.flash,600);return;}n.animate(variant==='loss'?[{color:'#985037',transform:'translateX(-2px)'},{transform:'translateX(2px)'},{color:'#34372F',transform:'none'}]:[{color:'#606C49',transform:'scale(1.25)'},{color:'#34372F',transform:'none'}],{duration:320,easing:EASE});}
export const ABILITY_ART={
 wide:{color:INK.sage,path:'M3 8v8M21 8v8M7 12h10M7 9l-3 3 3 3M17 9l3 3-3 3'},
 slow:{color:INK.teal,path:'M12 4a8 8 0 1 0 8 8M12 7v5l3 2M17 3v5h5'},
 life:{color:INK.clay,path:'M12 20 4 12C-1 5 6 1 12 7c6-6 13-2 8 5Z'},
 barrier:{color:INK.olive,path:'M12 2 4 6v6c0 4 4 7 8 10 4-3 8-6 8-10V6ZM8 12l3 3 5-6'},
 score:{color:INK.ochre,path:'M3 8l6 8M9 8l-6 8M13 8c5-5 11 1 4 5l-4 4h8'},
 multi:{color:INK.clay,path:'M8 6a3 3 0 1 0 0 .01M18 12a3 3 0 1 0 0 .01M8 18a3 3 0 1 0 0 .01'},
 laser:{color:INK.clay,path:'M6 21V5M3 8l3-4 3 4M18 21V5M15 8l3-4 3 4M10 15h4'},
 magnet:{color:INK.teal,path:'M4 4v10a8 8 0 0 0 16 0V4h-5v10a3 3 0 0 1-6 0V4ZM4 8h5M15 8h5'},
 sticky:{color:INK.olive,path:'M4 19h16M7 19v-4a5 5 0 0 1 10 0v4M12 3v4M5 6l2 3M19 6l-2 3'},
 fireball:{color:INK.clay,path:'M13 2c1 6-6 7-4 12 2-1 3-3 3-4 5 3 6 7 2 11 11 0 10-11-1-19Z'}
};
const ICONS={campaign:'M3 19h18M5 15V9h4v6M10 15V5h4v10M15 15V2h4v13',endless:'M12 12C4-1-6 19 6 18c7 0 7-12 12-12 12-1 2 19-6 6',time:'M9 2h6M12 5v3M18 6l2 2M12 9v5l3 2M12 6a8 8 0 1 0 .01 0',hardcore:'M12 2 3 6v7l9 9 9-9V6ZM8 8l8 8M16 8l-8 8',challenge:'M4 21V3M4 4h15l-3 5 3 5H4',pause:'M8 4v16M16 4v16',play:'M8 4l12 8-12 8Z',sound:'M3 9h4l5-5v16l-5-5H3ZM16 8c3 2 3 6 0 8M19 4c6 4 6 12 0 16'};
export function svgIcon(id,className='art-icon'){const path=ABILITY_ART[id]?.path??ICONS[id]??ICONS.campaign;return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;}
const paths=new Map();
export function drawIcon(ctx,id,x,y,size=20){let p=paths.get(id);if(!p){p=new Path2D(ABILITY_ART[id]?.path??ICONS[id]??ICONS.campaign);paths.set(id,p);}ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(p);ctx.restore();}
export function cosmeticColor(group,id){return ({paddles:{classic:INK.ivory,coral:INK.clay,gold:INK.ochre},trails:{aqua:INK.teal,violet:INK.clay},themes:{ocean:INK.teal,sunset:INK.clay}})[group]?.[id];}
