import {ACHIEVEMENTS,COSMETICS,cosmeticUnlocked,selectCosmetic} from './rewards.js';
import {cosmeticColor} from './art.js';
export function renderRewardsScreen(root,profile,onChange){root.replaceChildren();
 const h=document.createElement('h2');h.textContent='Achievement collection';root.append(h);
 const grid=document.createElement('div');grid.className='achievement-grid';root.append(grid);
 for(const a of ACHIEVEMENTS){const unlocked=profile.unlocked.includes(a.id),value=Math.min(a.target,profile.stats[a.stat]);const item=document.createElement('article');item.className=`achievement ${unlocked?'earned':''}`;
 const name=document.createElement('strong');name.textContent=`${unlocked?'★':'◇'} ${a.name}`;const label=document.createElement('p');label.textContent=`${a.stat}: ${value} / ${a.target} · ${unlocked?'Unlocked':value?'In progress':'Locked'}`;const bar=document.createElement('progress');bar.setAttribute('aria-label',`${a.name} progress`);bar.max=a.target;bar.value=value;item.append(name,label,bar);grid.append(item);}
 const heading=document.createElement('h2');heading.textContent='Cosmetic studio · visual only';root.append(heading);
 for(const [group,items]of Object.entries(COSMETICS)){const section=document.createElement('section');section.className='cosmetic-group';const title=document.createElement('h3');title.textContent=group;section.append(title);
 for(const item of items){const b=document.createElement('button');const unlocked=cosmeticUnlocked(profile,item);b.disabled=!unlocked;b.className='cosmetic-choice';b.setAttribute('aria-pressed',String(profile.selected[group]===item.id));b.style.setProperty('--swatch',cosmeticColor(group,item.id)??'#899576');
 const swatch=document.createElement('span');swatch.className=`cosmetic-swatch ${group}`;const label=document.createElement('span');const name=item.id==='violet'?'Clay streak':item.name;label.textContent=`${name}${profile.selected[group]===item.id?' · Selected':''}${unlocked?'':` · Unlock: ${ACHIEVEMENTS.find(a=>a.id===item.achievement).name}`}`;b.append(swatch,label);b.onclick=()=>{selectCosmetic(profile,group,item.id);onChange();};section.append(b);}root.append(section);}
 const medals=document.createElement('p');medals.textContent=`Medals · No life lost: ${profile.medals.clean} · Combo 10+: ${profile.medals.combo}`;root.append(medals);
}
export function resolvedCosmetics(profile){return Object.fromEntries(Object.entries(COSMETICS).map(([group,items])=>[group,items.find(i=>i.id===profile.selected[group])??items[0]]));}
