import {createGame,launchBall,movePaddle,togglePause,WIDTH,HEIGHT} from './game.js';
import {createInput} from './input.js';
import {render,liveParticles} from './render.js';
import {activate,POWERUPS,fireLaser,clearEffects} from './powerups.js';
import {createPowerupHUD} from './powerup-ui.js';
import {createAudioEngine,createObserver} from './audio.js';
import {setReducedEffects,pulse} from './art.js';
import {LEVELS,createCampaign,rateLevel,completeCampaignLevel} from './levels.js';
import {renderLevelMenu} from './campaign-ui.js';
import {MODE_DEFS,CHALLENGES,createModeState} from './modes.js';
import {makeModeGame,updateModeGame,nextModeWave,challengeSuccess} from './mode-runtime.js';
import {createProfile,collectProgress,finishMedals,completionReward,ACHIEVEMENTS} from './rewards.js';
import {createStorage,defaultSettings} from './storage.js';
import {renderRewardsScreen,resolvedCosmetics} from './rewards-ui.js';
import {svgIcon,reducedMotion} from './art.js';
const $=s=>document.querySelector(s);
const canvas=$('#game'),ctx=canvas.getContext('2d'),overlay=$('#overlay'),button=$('#start'),pauseButton=$('#pause');
const screens=[$('#mode-menu'),$('#level-menu'),$('#challenge-menu'),$('#game-shell'),$('#rewards-menu')];
const abilityHUD=createPowerupHUD($('#abilities')),audio=createAudioEngine(),observe=createObserver();
const LOCAL_TEST_HOST=['localhost','127.0.0.1','[::1]',''].includes(location.hostname);
const storage=createStorage(LOCAL_TEST_HOST&&new URLSearchParams(location.search).get('storage')==='off'?null:undefined);
const saved=storage.load();
// Preferences and progression come from the single save service.
const settings={...saved.settings};
function snapshotState(){return{settings,campaign,modeState,profile};}
function save(reason,immediate=false){storage.save(snapshotState(),reason,{immediate});updateSaveStatus();}
function applySettings(){audio.set('muted',settings.muted);audio.set('sfx',settings.sfx/100);audio.set('music',settings.music/100);setReducedEffects(settings.reduced);
 $('#sound').textContent=settings.muted?'Sound off':'Sound on';$('#sound').setAttribute('aria-pressed',String(!settings.muted));$('#mute').checked=settings.muted;$('#settings-panel').classList.toggle('is-muted',settings.muted);$('#master-volume').value=settings.master;$('#master-value').textContent=`${settings.master}%`;$('#sfx-volume').value=settings.sfx;$('#music-volume').value=settings.music;$('#reduced-effects').checked=settings.reduced;$('#sfx-value').textContent=`${settings.sfx}%`;$('#music-value').textContent=`${settings.music}%`;}
addEventListener('pointerdown',()=>audio.unlock(),{capture:true});addEventListener('keydown',()=>audio.unlock(),{capture:true});
$('#sound').onclick=()=>{audio.unlock();settings.muted=!settings.muted;applySettings();save('mute',true);$('#sound').blur();};
function toggleSettings(open){const panel=$('#settings-panel');const next=open??panel.hidden;panel.hidden=!next;
 $('#settings-toggle').setAttribute('aria-expanded',String(next));
 if(next)$('#mute').focus();else{$('#reset-confirm').hidden=true;$('#settings-toggle').focus();}}
$('#settings-toggle').onclick=()=>toggleSettings();
$('#mute').onchange=e=>{settings.muted=e.target.checked;applySettings();save('mute',true);};
$('#master-volume').oninput=e=>{settings.master=+e.target.value;applySettings();audio.play('ui');save('volume');};
$('#sfx-volume').oninput=e=>{settings.sfx=+e.target.value;applySettings();audio.play('ui');save('volume');};
$('#music-volume').oninput=e=>{settings.music=+e.target.value;applySettings();save('volume');};
$('#reduced-effects').onchange=e=>{settings.reduced=e.target.checked;applySettings();save('motion',true);};
// Reset settings keeps progression; reset progress keeps settings. Separate paths.
$('#reset-settings').onclick=()=>{Object.assign(settings,storage.resetSettings(snapshotState()));applySettings();updateSaveStatus();};
$('#reset-progress').onclick=()=>{const box=$('#reset-confirm');box.hidden=!box.hidden;$('#reset-understand').checked=false;$('#reset-final').disabled=true;if(!box.hidden)$('#reset-understand').focus();};
$('#reset-understand').onchange=e=>{$('#reset-final').disabled=!e.target.checked;};
$('#reset-cancel').onclick=()=>{$('#reset-confirm').hidden=true;$('#reset-understand').checked=false;$('#reset-final').disabled=true;$('#reset-progress').focus();};
$('#reset-final').onclick=()=>{if(!$('#reset-understand').checked)return;const fresh=storage.resetProgress(settings);
 Object.assign(campaign,fresh.campaign);campaign.records={};Object.assign(modeState,fresh.modeState);modeState.challenges={};
 for(const key of Object.keys(profile))delete profile[key];Object.assign(profile,fresh.profile);
 achievementsSeen=0;cosmeticKey='';$('#reset-confirm').hidden=true;$('#reset-understand').checked=false;$('#reset-final').disabled=true;
 startCampaign(LEVELS[0]);showModes();updateSaveStatus();};
function updateSaveStatus(){const node=$('#save-status');if(!node)return;const st=storage.status;
 const done=Object.values(campaign.records).filter(r=>r.complete).length;
 const detail=`${done}/30 levels · ${profile.unlocked.length}/${ACHIEVEMENTS.length} achievements · best ${profile.stats.bestScore}`;
 node.textContent=!st.available?`Saving unavailable in this browser — progress lasts for this session only. ${detail}.`
  :st.errors?`Last save failed (storage full or blocked). ${detail}.`
  :(st.lastSaved||saved.loaded)?`Progress saved automatically · ${detail}.`
  :`Ready to save · ${detail}.`;}
// Escape closes the reset confirmation first, then settings; gameplay pause is
// handled by the input module only when no dismissible surface is open.
addEventListener('keydown',e=>{if(e.key!=='Escape')return;
 if(!$('#reset-confirm').hidden){e.stopImmediatePropagation();$('#reset-confirm').hidden=true;$('#reset-progress').focus();return;}
 if(!$('#settings-panel').hidden){e.stopImmediatePropagation();toggleSettings(false);}},true);
const campaign=saved.campaign,modeState=saved.modeState;
const profile=saved.profile;let noticeUntil=0;
let current=LEVELS[0],kind='campaign',game=campaignGame(current),lastTime=0,result=null;
function campaignGame(level){const g=createGame({layout:level.layout,level:level.id,objective:level.objective,dropChance:level.powerups.dropChance});g.mode={kind:'campaign'};return g;}
function show(id){for(const screen of screens)screen.hidden=screen.id!==id;input.reset();lastTime=0;if(id==='game-shell')requestAnimationFrame(fitArena);}
function showModes(){collectProgress(profile,game,campaign,modeState);clearEffects(game);if(['aiming','playing'].includes(game.phase))togglePause(game);show('mode-menu');renderModes();}
function renderModes(){const grid=$('#mode-grid');grid.replaceChildren();for(const [id,d] of Object.entries(MODE_DEFS)){
 const b=document.createElement('button');b.className='mode-card';b.dataset.mode=id;b.innerHTML=`${svgIcon(id)}<strong>${d.name}</strong><small>${d.description}</small><em>${d.rules}</em>`;
 b.onclick=()=>id==='campaign'?showCampaign():id==='challenge'?showChallenges():startMode(id);grid.append(b);
 }const best=document.createElement('p');best.className='mode-records';best.textContent=`Session best · Endless ${modeState.runBest.endless} · Time Attack ${modeState.runBest.time} · Hardcore ${modeState.runBest.hardcore}`;grid.append(best);
}
function showCampaign(){show('level-menu');renderLevelMenu($('#level-grid'),campaign,startCampaign);}
function showChallenges(){show('challenge-menu');const grid=$('#challenge-grid');grid.replaceChildren();for(const c of CHALLENGES){
 const b=document.createElement('button');b.className='level-card';b.innerHTML=`<span>${String(c.id).padStart(2,'0')}</span><strong>${c.name}</strong><small>Clear the wall + ${c.objective.label.toLowerCase()}</small><em>${modeState.challenges[c.id]?.complete?'COMPLETED':'READY'}</em>`;b.onclick=()=>startMode('challenge',c.id);grid.append(b);
}}
function startCampaign(level){kind='campaign';current=level;game=campaignGame(level);begin();}
function startMode(k,challengeId=1,options={}){kind=k;modeState.kind=k;modeState.selectedChallenge=challengeId;game=makeModeGame(k,{challengeId,...options});current=k==='challenge'?CHALLENGES[challengeId-1]:{id:1,name:MODE_DEFS[k].name,objective:game.objective};begin();}
function begin(){game.phase='aiming';result=null;show('game-shell');document.activeElement?.blur();syncUI();resize();}
function showRewards(){show('rewards-menu');renderRewardsScreen($('#rewards-content'),profile,()=>{save('cosmetic',true);showRewards();});}
function restart(){if(kind==='campaign')startCampaign(current);else startMode(kind,modeState.selectedChallenge,{timeLimit:game.mode.timeLimit??120});}
function pause(){if($('#game-shell').hidden)return;togglePause(game);input.reset();lastTime=0;syncUI();document.activeElement?.blur();}
const input=createInput(canvas,p=>{if($('#game-shell').hidden)return;if(p!==null&&game.phase==='aiming')movePaddle(game,p-game.paddle.w/2);launchBall(game);},pause,()=>{if(!$('#game-shell').hidden)fireLaser(game);});
button.onclick=()=>{if(game.phase==='paused')pause();else if(game.phase==='complete'&&kind==='campaign'&&current.id<30)startCampaign(LEVELS[current.id]);else restart();};
pauseButton.onclick=pause;$('#restart').onclick=restart;$('#menu').onclick=showModes;$('#fire').onclick=()=>{fireLaser(game);$('#fire').blur();};$('#back-modes').onclick=showModes;$('#back-challenges').onclick=showModes;
$('#open-rewards').onclick=showRewards;$('#back-rewards').onclick=showModes;
function autoPause(){if(!$('#game-shell').hidden&&['playing','aiming'].includes(game.phase))pause();}window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function finish(){
 if(result||!['complete','gameover','timedout'].includes(game.phase))return;
 if(game.phase==='complete')completionReward(game,current.stars?.parTime??120);
 if(kind==='campaign'&&game.phase==='complete'){result={...rateLevel(current,{...game.stats,score:game.score}),score:game.score,elapsed:game.stats.elapsed};completeCampaignLevel(campaign,current,result);}
 else {result={objective:kind==='challenge'?challengeSuccess(game):game.phase==='complete'};
 if(kind==='challenge'){const old=modeState.challenges[current.id];modeState.challenges[current.id]={complete:Boolean(old?.complete||result.objective),score:Math.max(old?.score??0,game.score)};}
 if(['endless','time','hardcore'].includes(kind))modeState.runBest[kind]=Math.max(modeState.runBest[kind],game.score);
 }finishMedals(profile,game);collectProgress(profile,game,campaign,modeState);clearEffects(game);save(`result:${game.phase}`,true);
}
function tick(dt){updateModeGame(game,dt,input);
 // Automatic wave replacement prevents indefinite timer freezes on wave overlays.
 if(game.phase==='complete'&&['endless','time'].includes(kind)){completionReward(game);finishMedals(profile,game);modeState.runBest[kind]=Math.max(modeState.runBest[kind],game.score);collectProgress(profile,game,campaign,modeState);game=nextModeWave(game);input.reset();}
 finish();
}
let cosmeticKey='',cosmeticView;
let hudSignature='';
function syncUI(){finish();collectProgress(profile,game,campaign,modeState);const key=Object.values(profile.selected).join('/');if(key!==cosmeticKey){cosmeticKey=key;cosmeticView=resolvedCosmetics(profile);}game.cosmetics=cosmeticView;abilityHUD(game);
 const scoreNode=$('#score');if(scoreNode.textContent!==String(game.score)){scoreNode.textContent=game.score;if(!reducedMotion())scoreNode.animate([{color:'#C66B49',transform:'translateY(-1px)'},{color:'#34372F',transform:'none'}],{duration:180});}$('#lives').textContent=game.lives;$('#level').textContent=game.level;
 $('#combo').textContent=`COMBO ${game.rewards.combo} · BEST ${game.rewards.bestCombo}`;
 if(profile.notifications.length&&performance.now()>noticeUntil){$('#reward-toast').textContent=`Achievement unlocked · ${profile.notifications.shift()}`;noticeUntil=performance.now()+3000;}$('#reward-toast').hidden=performance.now()>noticeUntil;
 $('#mode-status').textContent=MODE_DEFS[kind].name.toUpperCase();$('#run-best').hidden=!['endless','time','hardcore'].includes(kind);$('#run-best').textContent=`BEST ${Math.max(modeState.runBest[kind]??0,game.score)}`;
 const signature=`${$('#abilities').hidden}|${$('#abilities').childElementCount}|${kind}|${$('#settings-panel').hidden}|${$('#fire').hidden}`;if(signature!==hudSignature){hudSignature=signature;requestAnimationFrame(fitArena);}
 $('#countdown').hidden=kind!=='time';$('#countdown').textContent=kind==='time'?`TIME LEFT · ${Math.max(0,Math.ceil(game.mode.timeLimit-game.mode.clock))}s`:'';
 pauseButton.disabled=!['aiming','playing','paused'].includes(game.phase);pauseButton.textContent=game.phase==='paused'?'Resume':'Pause';$('#fire').hidden=!game.effects.active.laser;$('#fire').disabled=game.phase!=='playing'||(game.effects.active.laser?.cooldown??0)>0;
 const objective=kind==='challenge'?`Clear wall + ${current.objective.label}`:current.objective.label??(kind==='endless'?'Clear each wave':'Clear the wall');
 $('#status').textContent=game.phase==='playing'?`${objective} · ${game.cleared}/${game.total}`:game.phase==='aiming'?`${objective} · Launch when ready`:game.phase;
 overlay.hidden=['aiming','playing'].includes(game.phase);if(overlay.hidden)return;
 let title='Game over.',description=`Score ${game.score}`,label='Retry';
 if(game.phase==='paused'){title='Take a breather.';description='Progress and timers are held.';label='Resume game';}
 else if(kind==='challenge'){title=result?.objective?'Challenge complete.':'Challenge failed.';description=`Clear wall + ${current.objective.label} · Score ${game.score}`;}
 else if(game.phase==='complete'){title=kind==='hardcore'?'Hardcore cleared.':'Level complete.';description=`${result?.stars?'★'.repeat(result.stars)+'☆'.repeat(3-result.stars)+' · ':''}Score ${game.score}${kind==='campaign'?` · Objective ${result.objective?'complete':'missed'}`:''}`;label=kind==='campaign'&&current.id<30?'Next level':'Replay';}
 else if(game.phase==='timedout')title='Time up.';
 if(['endless','time','hardcore'].includes(kind)&&game.phase!=='paused')description+=` · Best ${modeState.runBest[kind]}`;
 $('#result-kicker').textContent=game.phase==='paused'?'A MOMENT TO RESET':game.phase==='complete'?'A LITTLE SPACE, WELL EARNED':'THERE IS ALWAYS ANOTHER ROUND';
 $('#screen-title').textContent=title;$('#screen-description').textContent=description;button.textContent=label;
 $('#reward-summary').textContent=game.phase==='paused'?'':`Rewards · Base ${game.rewards.base} · Combo +${game.rewards.comboBonus} · Clear/time +${game.rewards.completion} · Best combo ${game.rewards.bestCombo}${game.phase==='complete'&&game.stats.livesLost===0?' · No-life-loss medal':''}${game.phase==='complete'&&game.rewards.bestCombo>=10?' · Combo medal':''}`;
}
// Reallocate the backing store only when DPR changes (zoom or monitor move).
let ratio=0;
// Fit the arena to the space left by the surrounding chrome, preserving 800:560.
// Logical physics coordinates never change; only the CSS presentation box does.
function fitArena(){const shell=$('#game-shell');if(shell.hidden)return;
 const arena=$('.arena'),top=arena.getBoundingClientRect().top;
 const footer=$('#game-shell footer').getBoundingClientRect().height||0;
 const available=Math.max(190,innerHeight-top-footer-14);
 shell.style.setProperty('--arena-space',`${Math.round(available)}px`);
}
function resize(){const r=Math.min(devicePixelRatio||1,2);if(r!==ratio){ratio=r;canvas.width=WIDTH*r;canvas.height=HEIGHT*r;ctx.setTransform(r,0,0,r,0,0);}fitArena();render(ctx,game);}
window.addEventListener('resize',resize);
// Orientation changes report new dimensions a frame late on mobile browsers.
addEventListener('orientationchange',()=>requestAnimationFrame(resize));
visualViewport?.addEventListener('resize',fitArena);
let achievementsSeen=profile.unlocked.length,frameId=0;
const ANNOUNCE={complete:'Level complete',gameover:'Game over',lose:'Life lost',life:'Extra life gained',rescue:'Emergency barrier saved the ball',multi:'Multi-ball active'};
function announce(text){const node=$('#event-announcer');if(!node||node.textContent===text)return;node.textContent=text;}
function feedback(){for(const cue of observe(game)){audio.play(cue);if(cue==='life')pulse('#lives');if(cue==='lose')pulse('#lives','loss');if(ANNOUNCE[cue])announce(ANNOUNCE[cue]);}game.effects.events.length=0;
 if(profile.unlocked.length>achievementsSeen){if(achievementsSeen)audio.play('achievement');achievementsSeen=profile.unlocked.length;save('achievement',true);}
 audio.music(!$('#game-shell').hidden&&['aiming','playing'].includes(game.phase)&&!document.hidden);}
// Single loop: paused frames render but skip simulation work entirely.
function frame(t){const dt=lastTime?Math.min((t-lastTime)/1000,.032):0;lastTime=t;if(!$('#game-shell').hidden){if(game.phase!=='paused')tick(dt);render(ctx,game);syncUI();feedback();}else audio.music(false);frameId=requestAnimationFrame(frame);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.suspend();else{audio.resume();lastTime=0;}});
addEventListener('pagehide',()=>{storage.flush('pagehide');audio.close();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)storage.flush('hidden');});
const testMode=LOCAL_TEST_HOST&&new URLSearchParams(location.search).has('test');
if(testMode)window.gameTest={audio:()=>({...audio.state,last:undefined}),loopId:()=>frameId,settings:()=>({...settings}),storage:()=>({...storage.status}),save:(reason='test')=>save(reason,true),profile:()=>structuredClone(profile),snapshot:()=>structuredClone(game),campaign:()=>structuredClone(campaign),modes:()=>structuredClone(modeState),start:id=>startCampaign(LEVELS[id-1]),startCampaign:id=>startCampaign(LEVELS[id-1]),startMode:(k,id,options)=>startMode(k,id,options),activate:id=>{activate(game,id);syncUI();},fire:()=>fireLaser(game),drop:id=>{if(POWERUPS[id])game.effects.drops.push({id:++game.effects.serial,type:id,x:game.paddle.x+game.paddle.w/2,y:game.paddle.y-16});},set:p=>{Object.assign(game,p);if(p.ball)game.balls=[game.ball=p.ball];syncUI();render(ctx,game);},step:dt=>{tick(dt);syncUI();render(ctx,game);feedback();},particles:()=>liveParticles(game)};
resize();syncUI();if(testMode)startCampaign(LEVELS[0]);else showModes();applySettings();updateSaveStatus();if(!window.__brickLoop){window.__brickLoop=true;frameId=requestAnimationFrame(frame);}
