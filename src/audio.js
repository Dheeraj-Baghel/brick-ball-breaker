// Original procedural Web Audio. No downloaded samples. Starts only after a user gesture.
export const SOUNDS={
 paddle:{f:330,to:392,d:.07,type:'triangle',gain:.5,gap:45},wall:{f:520,to:500,d:.035,type:'sine',gain:.22,gap:60},
 hit:{f:600,to:540,d:.05,type:'triangle',gain:.32,gap:30},crack:{f:260,to:190,d:.08,type:'square',gain:.16,gap:40},
 break:{f:700,to:980,d:.07,type:'triangle',gain:.34,gap:25},boom:{f:120,to:45,d:.28,type:'sawtooth',gain:.28,gap:90,noise:true},
 pickup:{f:520,to:780,d:.13,type:'triangle',gain:.38,gap:60},life:{f:523,to:1046,d:.32,type:'sine',gain:.42,gap:200,chord:[659,784]},
 multi:{f:600,to:900,d:.16,type:'triangle',gain:.34,gap:120,chord:[750]},laser:{f:1100,to:620,d:.06,type:'square',gain:.13,gap:120},
 zap:{f:900,to:300,d:.05,type:'sawtooth',gain:.12,gap:40},stick:{f:240,to:200,d:.08,type:'sine',gain:.4,gap:80},release:{f:300,to:520,d:.08,type:'sine',gain:.35,gap:80},
 magnet:{f:180,to:260,d:.25,type:'sine',gain:.28,gap:200},fire:{f:200,to:420,d:.22,type:'sawtooth',gain:.18,gap:200,noise:true},
 pierce:{f:480,to:360,d:.04,type:'sawtooth',gain:.12,gap:35},barrier:{f:440,to:660,d:.18,type:'triangle',gain:.3,gap:150},rescue:{f:660,to:330,d:.2,type:'triangle',gain:.38,gap:150},
 multiplier:{f:660,to:990,d:.2,type:'triangle',gain:.32,gap:200,chord:[880]},expire:{f:500,to:330,d:.18,type:'sine',gain:.22,gap:200},
 complete:{f:523,to:523,d:.5,type:'triangle',gain:.42,gap:600,arp:[523,659,784,1046]},lose:{f:330,to:180,d:.4,type:'triangle',gain:.36,gap:400},
 gameover:{f:294,to:147,d:.7,type:'triangle',gain:.4,gap:800,arp:[392,330,262]},achievement:{f:784,to:784,d:.35,type:'sine',gain:.3,gap:400,arp:[784,988,1175]},ui:{f:440,to:470,d:.03,type:'sine',gain:.15,gap:40}
};
export const MAX_VOICES=10;
export function createAudioEngine(){
 const state={sfx:.7,music:.35,muted:false,ready:false,voices:0,last:new Map(),played:{},dropped:0};let ctx,master,sfxBus,musicBus,noiseBuf,musicTimer=null,step=0;
 function ensure(){if(state.ready)return true;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;ctx=new AC();master=ctx.createGain();sfxBus=ctx.createGain();musicBus=ctx.createGain();const comp=ctx.createDynamicsCompressor();sfxBus.connect(master);musicBus.connect(master);master.connect(comp);comp.connect(ctx.destination);noiseBuf=ctx.createBuffer(1,ctx.sampleRate*.3,ctx.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);state.ready=true;apply();return true;}
 function apply(){if(!state.ready)return;const t=ctx.currentTime;master.gain.setTargetAtTime(state.muted?0:1,t,.03);sfxBus.gain.setTargetAtTime(state.sfx*.5,t,.03);musicBus.gain.setTargetAtTime(state.music*.12,t,.15);}
 function tone(freq,to,dur,type,gain,when){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);o.frequency.exponentialRampToValueAtTime(Math.max(30,to),when+dur);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(gain,when+.006);g.gain.exponentialRampToValueAtTime(.0001,when+dur);o.connect(g);g.connect(sfxBus);state.voices++;o.onended=()=>{state.voices--;o.disconnect();g.disconnect();};o.start(when);o.stop(when+dur+.02);}
 function play(id){const s=SOUNDS[id];if(!s)return false;const now=performance.now();if(now-(state.last.get(id)??-1e9)<s.gap){state.dropped++;return false;}state.last.set(id,now);state.played[id]=(state.played[id]??0)+1;
  if(!state.ready||state.muted||state.sfx<=0||ctx.state!=='running')return true;if(state.voices>=MAX_VOICES){state.dropped++;return false;}
  const t=ctx.currentTime;if(s.arp)s.arp.forEach((f,i)=>tone(f,f,.16,s.type,s.gain*.8,t+i*.08));else{tone(s.f,s.to,s.d,s.type,s.gain,t);for(const f of s.chord??[])tone(f,f*1.2,s.d,s.type,s.gain*.5,t);}
  if(s.noise){const n=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=900;n.buffer=noiseBuf;g.gain.setValueAtTime(s.gain*.6,t);g.gain.exponentialRampToValueAtTime(.0001,t+s.d);n.connect(f);f.connect(g);g.connect(sfxBus);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();};n.start(t);n.stop(t+s.d);}return true;}
 // Quiet four-chord pad, scheduled ahead; never reads gameplay state.
 const chords=[[220,277,330],[196,247,294],[175,220,262],[196,247,330]];
 function musicTick(){if(!state.ready)return;const t=ctx.currentTime+.05;for(const f of chords[step%4]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.5,t+.6);g.gain.exponentialRampToValueAtTime(.0001,t+2.3);o.connect(g);g.connect(musicBus);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+2.4);}step++;}
 function music(on){if(on&&state.ready&&!musicTimer&&state.music>0){musicTick();musicTimer=setInterval(musicTick,2400);}if(!on&&musicTimer){clearInterval(musicTimer);musicTimer=null;}}
 return{state,unlock(){if(ensure()&&ctx.state!=='running')ctx.resume().catch(()=>{});},play,music,set(k,v){state[k]=v;apply();if(k==='music'&&v<=0)music(false);},suspend(){music(false);if(state.ready&&ctx.state==='running')ctx.suspend().catch(()=>{});},resume(){if(state.ready)ctx.resume().catch(()=>{});},close(){music(false);if(state.ready)ctx.close();state.ready=false;}};
}
// Derives sound/visual cues from real state deltas: no gameplay hooks needed.
export function createObserver(){let prev=null;return function observe(g){const cues=[];const snap={g,lives:g.lives,phase:g.phase,balls:g.balls.length,active:new Set(Object.keys(g.effects.active)),barrier:g.effects.active.barrier?.charges,sticky:g.balls.some(b=>b.stuck),shots:g.effects.projectiles.length,
  bricks:g.bricks.map(b=>[b.alive,b.health]),vel:g.balls.map(b=>[b.vx,b.vy,b.x,b.y]),stats:g.stats.bonus};
 if(!prev||prev.g!==g){prev=snap;return cues;}
 let destroyed=0;snap.bricks.forEach(([alive,hp],i)=>{const [pa,ph]=prev.bricks[i];if(pa&&!alive){destroyed++;cues.push(g.bricks[i].type==='explosive'?'boom':'break');}else if(alive&&hp<ph)cues.push(g.bricks[i].maxHealth>1?'crack':'hit');});
 if(destroyed>=3)cues.push('boom');
 snap.vel.forEach(([vx,vy,x,y],i)=>{const p=prev.vel[i];if(!p||g.phase!=='playing')return;if(vy<0&&p[1]>0&&y>480)cues.push(snap.barrier===undefined&&prev.barrier!==undefined?'rescue':'paddle');else if((vx*p[0]<0||vy*p[1]<0)&&(x<=16||x>=784||y<=16))cues.push('wall');});
 if(g.effects.active.fireball&&destroyed&&prev.active.has('fireball'))cues.push('pierce');
 for(const id of snap.active)if(!prev.active.has(id))cues.push({wide:'pickup',slow:'pickup',barrier:'barrier',score:'multiplier',laser:'pickup',magnet:'magnet',sticky:'pickup',fireball:'fire'}[id]??'pickup');
 for(const id of prev.active)if(!snap.active.has(id)&&g.phase==='playing'&&id!=='barrier')cues.push('expire');
 if(prev.barrier!==undefined&&snap.barrier===undefined&&!snap.active.has('barrier')&&g.lives===prev.lives&&g.phase==='playing')cues.push('rescue');
 if(snap.balls>prev.balls)cues.push('multi');if(snap.lives>prev.lives)cues.push('life');if(snap.lives<prev.lives&&g.phase!=='gameover')cues.push('lose');
 if(snap.shots>prev.shots)cues.push('laser');else if(snap.shots<prev.shots&&destroyed+snap.bricks.filter((b,i)=>b[1]<prev.bricks[i][1]).length)cues.push('zap');
 if(snap.sticky&&!prev.sticky)cues.push('stick');if(!snap.sticky&&prev.sticky)cues.push('release');
 if(snap.phase!==prev.phase){if(snap.phase==='complete')cues.push('complete');if(snap.phase==='gameover'||snap.phase==='timedout')cues.push('gameover');}
 prev=snap;return [...new Set(cues)];};}
