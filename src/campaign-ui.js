import {LEVELS}from './levels.js';
export function renderLevelMenu(container,campaign,onSelect){container.replaceChildren();let tier;
 for(const level of LEVELS){if(level.tier!==tier){tier=level.tier;const h=document.createElement('h2');h.textContent=`${tier} · ${level.id}–${level.id+4}`;container.append(h);}
 const record=campaign.records[level.id],locked=level.id>campaign.unlocked;const button=document.createElement('button');button.className='level-card';button.disabled=locked;
 button.setAttribute('aria-label',`Level ${level.id}, ${level.name}${locked?', locked':''}`);
 button.innerHTML=`<span>${String(level.id).padStart(2,'0')}</span><strong>${level.name}</strong><small>${locked?'LOCKED · ':''}${record?.complete?'COMPLETED':level.objective.label??'Clear the wall'}</small><em aria-label="${record?.stars??0} stars">${'★'.repeat(record?.stars??0)}${'☆'.repeat(3-(record?.stars??0))}</em>`;
 if(!locked)button.addEventListener('click',()=>onSelect(level));container.append(button);}}
