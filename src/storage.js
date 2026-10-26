// Centralized save service. Single writer: main.js calls save(reason) on real events.
// Validation is defensive — a malformed field falls back to a default, and a malformed
// payload is never written over a valid save.
import {createCampaign} from './levels.js';
import {createModeState} from './modes.js';
import {createProfile,ACHIEVEMENTS,COSMETICS} from './rewards.js';
export const SAVE_KEY='brick-ball-breaker/save';
export const SAVE_VERSION=3;
export const DEBOUNCE_MS=400;
export const LEVEL_COUNT=30,CHALLENGE_COUNT=10;
export function defaultSettings(){return{master:80,sfx:70,music:35,muted:false,reduced:false};}
const num=(v,min,max,fallback)=>Number.isFinite(v)?Math.min(max,Math.max(min,Math.round(v))):fallback;
const bool=(v,fallback)=>typeof v==='boolean'?v:fallback;
export function validateSettings(raw){const d=defaultSettings();if(!raw||typeof raw!=='object')return d;
 return{master:num(raw.master,0,100,d.master),sfx:num(raw.sfx,0,100,d.sfx),music:num(raw.music,0,100,d.music),muted:bool(raw.muted,d.muted),reduced:bool(raw.reduced,d.reduced)};}
export function validateCampaign(raw){const c=createCampaign();if(!raw||typeof raw!=='object')return c;
 c.unlocked=num(raw.unlocked,1,LEVEL_COUNT,1);c.selected=num(raw.selected,1,LEVEL_COUNT,1);
 const records=raw.records&&typeof raw.records==='object'?raw.records:{};
 for(const [key,value] of Object.entries(records)){const id=Number(key);
  if(!Number.isInteger(id)||id<1||id>LEVEL_COUNT||!value||typeof value!=='object')continue;
  const time=Number.isFinite(value.bestTime)&&value.bestTime>=0?value.bestTime:Infinity;
  c.records[id]={complete:bool(value.complete,false),stars:num(value.stars,0,3,0),bestScore:num(value.bestScore,0,Number.MAX_SAFE_INTEGER,0),bestTime:time};
  // An unlocked level must be reachable from its completed predecessors.
  if(c.records[id].complete)c.unlocked=Math.max(c.unlocked,Math.min(LEVEL_COUNT,id+1));}
 return c;}
export function validateModeState(raw){const m=createModeState();if(!raw||typeof raw!=='object')return m;
 const best=raw.runBest&&typeof raw.runBest==='object'?raw.runBest:{};
 for(const key of Object.keys(m.runBest))m.runBest[key]=num(best[key],0,Number.MAX_SAFE_INTEGER,0);
 const challenges=raw.challenges&&typeof raw.challenges==='object'?raw.challenges:{};
 for(const [key,value] of Object.entries(challenges)){const id=Number(key);
  if(!Number.isInteger(id)||id<1||id>CHALLENGE_COUNT||!value||typeof value!=='object')continue;
  m.challenges[id]={complete:bool(value.complete,false),score:num(value.score,0,Number.MAX_SAFE_INTEGER,0)};}
 m.selectedChallenge=num(raw.selectedChallenge,1,CHALLENGE_COUNT,1);return m;}
export function validateProfile(raw){const p=createProfile();if(!raw||typeof raw!=='object')return p;
 const stats=raw.stats&&typeof raw.stats==='object'?raw.stats:{};
 for(const key of Object.keys(p.stats))p.stats[key]=num(stats[key],0,Number.MAX_SAFE_INTEGER,0);
 const ids=new Set(ACHIEVEMENTS.map(a=>a.id));
 p.unlocked=Array.isArray(raw.unlocked)?[...new Set(raw.unlocked.filter(id=>ids.has(id)))]:[];
 p.powers=Array.isArray(raw.powers)?[...new Set(raw.powers.filter(id=>typeof id==='string'))]:[];
 const medals=raw.medals&&typeof raw.medals==='object'?raw.medals:{};
 p.medals={clean:num(medals.clean,0,Number.MAX_SAFE_INTEGER,0),combo:num(medals.combo,0,Number.MAX_SAFE_INTEGER,0)};
 const selected=raw.selected&&typeof raw.selected==='object'?raw.selected:{};
 for(const [group,items] of Object.entries(COSMETICS)){const choice=items.find(i=>i.id===selected[group]);
  // Only honour a cosmetic the player actually unlocked.
  p.selected[group]=choice&&(!choice.achievement||p.unlocked.includes(choice.achievement))?choice.id:items[0].id;}
 p.stats.powerCount=Math.max(p.stats.powerCount,p.powers.length);p.notifications=[];return p;}
export function migrate(raw){if(!raw||typeof raw!=='object')return null;
 const version=Number.isFinite(raw.version)?raw.version:0;
 if(version>SAVE_VERSION)return null; // Written by a newer build: ignore, keep defaults.
 const data={...raw};
 if(version<2&&data.progress){const legacy=data.progress;data.campaign??=legacy.campaign;data.modeState??=legacy.modes;data.profile??=legacy.profile;}
 if(version<3&&data.settings&&data.settings.master===undefined)data.settings={...data.settings,master:defaultSettings().master};
 return data;}
export function createStorage(backend){
 let store=backend;const status={available:false,version:SAVE_VERSION,lastSaved:null,lastReason:null,writes:0,blocked:0,errors:0,migratedFrom:null,recovered:false};
 if(store===undefined){try{store=globalThis.localStorage;const probe='brick-ball-breaker/probe';store.setItem(probe,'1');store.removeItem(probe);status.available=true;}catch{store=null;status.available=false;}}
 else status.available=Boolean(store);
 let timer=null,pending=null;
 function read(){if(!store)return null;
  try{const text=store.getItem(SAVE_KEY);if(!text)return null;const migrated=migrate(JSON.parse(text));
   if(!migrated){status.recovered=true;return null;}
   if((migrated.version??0)!==SAVE_VERSION)status.migratedFrom=migrated.version??0;
   return migrated;}
  catch{status.recovered=true;status.errors++;return null;}}
 function load(){const raw=read();
  return{settings:validateSettings(raw?.settings),campaign:validateCampaign(raw?.campaign),modeState:validateModeState(raw?.modeState),profile:validateProfile(raw?.profile),loaded:Boolean(raw)};}
 function write(state,reason){if(!store)return false;
  // Validate the outgoing payload; never replace a good save with a broken one.
  const payload={version:SAVE_VERSION,savedAt:Date.now(),settings:validateSettings(state.settings),campaign:validateCampaign(state.campaign),modeState:validateModeState(state.modeState),profile:validateProfile(state.profile)};
  try{store.setItem(SAVE_KEY,JSON.stringify(payload));status.writes++;status.lastSaved=payload.savedAt;status.lastReason=reason??null;return true;}
  catch(error){status.errors++;status.blocked++;status.lastReason=`error:${error?.name??'unknown'}`;return false;}}
 return{status,load,
  // Critical events flush immediately; routine churn is debounced.
  save(state,reason,{immediate=false}={}){pending=state;
   if(immediate){if(timer){clearTimeout(timer);timer=null;}return write(pending,reason);}
   if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;write(pending,reason);},DEBOUNCE_MS);return true;},
  flush(reason='flush'){if(!timer||!pending)return false;clearTimeout(timer);timer=null;return write(pending,reason);},
  // Progress reset keeps preferences unless the caller opts in.
  resetProgress(settings){const next={settings:settings??defaultSettings(),campaign:createCampaign(),modeState:createModeState(),profile:createProfile()};write(next,'reset-progress');return next;},
  resetSettings(state){const next={...state,settings:defaultSettings()};write(next,'reset-settings');return defaultSettings();}};}
