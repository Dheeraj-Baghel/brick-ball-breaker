import {POWERUPS,BALANCE} from './powerups.js';
import {ABILITY_ART,INK,drawIcon,svgIcon,reducedMotion} from './art.js';
const particleColors=new Map(Object.entries(POWERUPS).map(([id,d])=>[d.color,ABILITY_ART[id].color]));
export function renderPowerups(ctx,g){
 for(const d of g.effects.drops){const rule=POWERUPS[d.type],art=ABILITY_ART[d.type];ctx.save();
 ctx.fillStyle='#00000035';ctx.beginPath();ctx.roundRect(d.x-12,d.y-10,24,25,9);ctx.fill();
 ctx.fillStyle=INK.ivory;ctx.strokeStyle=art.color;ctx.lineWidth=1.5;ctx.beginPath();
 if(rule.rarity==='common')ctx.roundRect(d.x-12,d.y-12,24,24,12);
 else {const corner=rule.rarity==='epic'?6:2;ctx.moveTo(d.x-12+corner,d.y-12);ctx.lineTo(d.x+12-corner,d.y-12);ctx.lineTo(d.x+12,d.y-12+corner);ctx.lineTo(d.x+12,d.y+12-corner);ctx.lineTo(d.x+12-corner,d.y+12);ctx.lineTo(d.x-12+corner,d.y+12);ctx.lineTo(d.x-12,d.y+12-corner);ctx.lineTo(d.x-12,d.y-12+corner);ctx.closePath();}
 ctx.fill();ctx.stroke();ctx.strokeStyle=art.color;drawIcon(ctx,d.type,d.x-9,d.y-9,18);
 const dots=rule.rarity==='epic'?3:rule.rarity==='rare'?2:1;ctx.fillStyle=art.color;for(let i=0;i<dots;i++)ctx.fillRect(d.x-(dots*3-1)/2+i*3,d.y+15,2,2);ctx.restore();}
 if(g.effects.active.barrier){ctx.strokeStyle=INK.sage;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,BALANCE.barrierY);ctx.lineTo(788,BALANCE.barrierY);ctx.stroke();ctx.fillStyle=INK.sage;for(let i=12;i<788;i+=24)ctx.fillRect(i,BALANCE.barrierY+3,6,1);}
 if(!reducedMotion()){let count=0;for(const p of g.effects.particles){if(count++>=24)break;ctx.globalAlpha=Math.max(0,p.life/BALANCE.particleDuration)*.7;ctx.fillStyle=particleColors.get(p.color)??INK.ochre;ctx.fillRect(p.x-1,p.y-1,2,3);}ctx.globalAlpha=1;}
}
export function createPowerupHUD(container){
 const nodes=new Map();
 return g=>{
 const active={...g.effects.active};if(g.balls?.length>1)active.multi={remaining:0,charges:g.balls.length};
 for(const [id,node] of nodes)if(!active[id]){node.remove();nodes.delete(id);}
 for(const [id,e]of Object.entries(active)){
 const d=POWERUPS[id],art=ABILITY_ART[id];let node=nodes.get(id);
 if(!node){node=document.createElement('div');node.className='ability';node.tabIndex=0;node.style.setProperty('--ability-color',art.color);node.dataset.rarity=d.rarity;node.innerHTML=`${svgIcon(id)}<span class="ability-name">${d.name}</span><small></small><progress aria-label="${d.name} remaining" max="${d.duration||1}"></progress><span class="ability-tip" role="tooltip">${d.rarity} · ${d.description}</span>`;node.setAttribute('aria-label',`${d.name}: ${d.description}`);container.append(node);nodes.set(id,node);}
 const cooldown=id==='laser'?(e.cooldown??0):0;
 const text=id==='multi'?`${e.charges} balls`:`${Math.ceil(e.remaining)}s${d.charges?` · ${e.charges} charge${e.charges!==1?'s':''}`:''}${id==='laser'?` · ${g.phase==='paused'?'paused':g.phase!=='playing'?'launch to fire':cooldown>0?`${cooldown.toFixed(1)}s cooldown`:'F / Fire ready'}`:''}`;
 if(node.querySelector('small').textContent!==text)node.querySelector('small').textContent=text;
 node.querySelector('progress').value=id==='multi'?1:e.remaining;node.classList.toggle('expiring',id!=='multi'&&e.remaining<3);
 }container.hidden=nodes.size===0;
 };
}
export function createAudio(button){
 let enabled=false,context;
 button.addEventListener('click',()=>{enabled=!enabled;button.textContent=enabled?'Sound on':'Sound off';button.setAttribute('aria-pressed',String(enabled));
 if(enabled){try{context??=new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{enabled=false;}}button.blur();});
 return id=>{if(!enabled||!context)return;const d=POWERUPS[id];const oscillator=context.createOscillator(),gain=context.createGain();
 oscillator.frequency.setValueAtTime(d.tone,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(d.tone*1.5,context.currentTime+.12);
 gain.gain.setValueAtTime(.045,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.2);
 oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.2);};
}
