import {test} from 'node:test';import assert from 'node:assert/strict';
import {createStorage,validateSettings,validateCampaign,validateModeState,validateProfile,migrate,defaultSettings,SAVE_KEY,SAVE_VERSION} from '../src/storage.js';
import {ACHIEVEMENTS} from '../src/rewards.js';
// Minimal localStorage double, including a quota-exceeded mode.
function memory({fail=false}={}){const map=new Map();return{get size(){return map.size;},getItem:k=>map.has(k)?map.get(k):null,setItem(k,v){if(fail){const e=new Error('quota');e.name='QuotaExceededError';throw e;}map.set(k,String(v));},removeItem:k=>map.delete(k),raw:map};}
test('settings clamp, coerce and fall back per field',()=>{const d=defaultSettings();
 assert.deepEqual(validateSettings(null),d);
 assert.deepEqual(validateSettings({master:-40,sfx:999,music:'loud',muted:'yes',reduced:true}),{master:0,sfx:100,music:d.music,muted:false,reduced:true});});
test('campaign rejects impossible levels and keeps unlock reachable',()=>{
 const c=validateCampaign({unlocked:9999,selected:-3,records:{5:{complete:true,stars:7,bestScore:-10,bestTime:-2},99:{complete:true},bad:{complete:true},7:'nope'}});
 assert.equal(c.unlocked,30);assert.equal(c.selected,1);
 assert.deepEqual(Object.keys(c.records),['5']);
 assert.equal(c.records[5].stars,3);assert.equal(c.records[5].bestScore,0);assert.equal(c.records[5].bestTime,Infinity);
 assert.equal(validateCampaign({unlocked:1,records:{4:{complete:true,stars:2}}}).unlocked,5,'completed level unlocks its successor');});
test('mode records clamp and drop unknown challenge ids',()=>{
 const m=validateModeState({runBest:{endless:-5,time:'x',hardcore:900},challenges:{3:{complete:true,score:120},44:{complete:true}},selectedChallenge:77});
 assert.deepEqual(m.runBest,{endless:0,time:0,hardcore:900});
 assert.deepEqual(Object.keys(m.challenges),["3"]);assert.equal(m.selectedChallenge,10,"clamped into range");});
test('profile drops unknown achievements and locked cosmetics',()=>{
 const p=validateProfile({stats:{bricks:-4,bestScore:50},unlocked:['first','not-real','first'],powers:['wide','wide'],medals:{clean:-1},selected:{paddles:'gold',trails:'aqua',themes:'nope'}});
 assert.deepEqual(p.unlocked,['first']);assert.deepEqual(p.powers,['wide']);
 assert.equal(p.stats.bricks,0);assert.equal(p.stats.bestScore,50);assert.equal(p.medals.clean,0);
 assert.equal(p.selected.paddles,'classic','gold needs level5');
 assert.equal(p.selected.trails,'none','aqua needs combo5');
 assert.equal(p.selected.themes,'classic');
 assert.equal(validateProfile({unlocked:['first'],selected:{paddles:'coral'}}).selected.paddles,'coral','unlocked cosmetic kept');
 assert.equal(validateProfile({unlocked:ACHIEVEMENTS.map(a=>a.id)}).unlocked.length,ACHIEVEMENTS.length);});
test('migration lifts legacy shapes and refuses newer versions',()=>{
 const v1=migrate({version:1,progress:{campaign:{unlocked:4},modes:{runBest:{endless:10}},profile:{unlocked:['first']}}});
 assert.equal(validateCampaign(v1.campaign).unlocked,4);assert.equal(validateModeState(v1.modeState).runBest.endless,10);
 assert.equal(migrate({version:2,settings:{sfx:50}}).settings.master,defaultSettings().master);
 assert.equal(migrate({version:SAVE_VERSION+5}),null);assert.equal(migrate('junk'),null);});
test('round trip restores progression and preferences',()=>{
 const store=memory(),s=createStorage(store);
 const state={settings:{master:50,sfx:10,music:0,muted:true,reduced:true},campaign:{unlocked:6,selected:6,records:{5:{complete:true,stars:3,bestScore:900,bestTime:42}}},
  modeState:{runBest:{endless:2200,time:1700,hardcore:300},challenges:{2:{complete:true,score:400}},selectedChallenge:2},
  profile:{stats:{bricks:120,bestScore:900},unlocked:['first','hundred'],powers:['wide','laser'],medals:{clean:2,combo:1},selected:{paddles:'coral',trails:'none',themes:'classic'}}};
 assert.equal(s.save(state,'test',{immediate:true}),true);
 const loaded=createStorage(store).load();
 assert.equal(loaded.loaded,true);
 assert.deepEqual(loaded.settings,state.settings);
 assert.equal(loaded.campaign.unlocked,6);assert.equal(loaded.campaign.records[5].bestScore,900);
 assert.equal(loaded.modeState.runBest.endless,2200);assert.equal(loaded.modeState.challenges[2].complete,true);
 assert.deepEqual(loaded.profile.unlocked,['first','hundred']);assert.equal(loaded.profile.selected.paddles,'coral');
 assert.equal(JSON.parse(store.getItem(SAVE_KEY)).version,SAVE_VERSION);});
test('corrupt payload recovers to defaults without throwing',()=>{
 const store=memory();store.setItem(SAVE_KEY,'{not json');
 const s=createStorage(store),loaded=s.load();
 assert.equal(s.status.recovered,true);assert.deepEqual(loaded.settings,defaultSettings());assert.equal(loaded.campaign.unlocked,1);
 assert.deepEqual(loaded.profile.unlocked,[]);});
test('malformed state cannot overwrite a valid save',()=>{
 const store=memory(),s=createStorage(store);
 s.save({settings:defaultSettings(),campaign:{unlocked:7,records:{6:{complete:true,stars:3}}},modeState:{runBest:{endless:500}},profile:{unlocked:['first']}},'good',{immediate:true});
 s.save({settings:'broken',campaign:'broken',modeState:null,profile:42},'bad',{immediate:true});
 const after=createStorage(store).load();
 assert.deepEqual(after.settings,defaultSettings());assert.equal(after.campaign.unlocked,1,'sanitized, not corrupted');
 assert.equal(JSON.parse(store.getItem(SAVE_KEY)).version,SAVE_VERSION,'file stays readable');});
test('unavailable and quota-limited storage degrade quietly',()=>{
 const off=createStorage(null);assert.equal(off.status.available,false);
 assert.deepEqual(off.load().settings,defaultSettings());
 assert.equal(off.save({settings:defaultSettings()},'noop',{immediate:true}),false);
 const full=createStorage(memory({fail:true}));
 assert.equal(full.save({settings:defaultSettings(),campaign:{},modeState:{},profile:{}},'quota',{immediate:true}),false);
 assert.equal(full.status.errors,1);assert.equal(full.status.blocked,1);});
test('debounced writes coalesce; critical saves flush at once',async()=>{
 const store=memory(),s=createStorage(store);
 const state={settings:defaultSettings(),campaign:{unlocked:2},modeState:{},profile:{}};
 for(let i=0;i<25;i++)s.save(state,'volume');
 assert.equal(s.status.writes,0,'no write during burst');
 await new Promise(r=>setTimeout(r,500));
 assert.equal(s.status.writes,1,'burst collapsed into one write');
 s.save(state,'achievement',{immediate:true});assert.equal(s.status.writes,2);});
test('reset progress keeps settings; reset settings keeps progress',()=>{
 const store=memory(),s=createStorage(store);
 const custom={master:20,sfx:5,music:0,muted:true,reduced:true};
 s.save({settings:custom,campaign:{unlocked:12,records:{11:{complete:true,stars:3}}},modeState:{runBest:{endless:900}},profile:{unlocked:['first'],stats:{bricks:200}}},'seed',{immediate:true});
 const fresh=s.resetProgress(custom);
 assert.deepEqual(fresh.settings,custom,'preferences survive a progress reset');
 assert.equal(fresh.campaign.unlocked,1);assert.deepEqual(fresh.profile.unlocked,[]);
 const reloaded=createStorage(store).load();
 assert.deepEqual(reloaded.settings,custom);assert.equal(reloaded.campaign.unlocked,1);assert.equal(reloaded.profile.stats.bricks,0);
 s.save({settings:custom,campaign:{unlocked:9,records:{8:{complete:true,stars:2}}},modeState:{},profile:{unlocked:['first']}},'seed2',{immediate:true});
 assert.deepEqual(s.resetSettings(createStorage(store).load()),defaultSettings());
 const kept=createStorage(store).load();
 assert.equal(kept.campaign.unlocked,9,'progress survives a settings reset');assert.deepEqual(kept.profile.unlocked,['first']);});
