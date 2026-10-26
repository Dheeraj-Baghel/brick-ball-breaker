// Type rules live here, not in ball collision code. Bonus is score-only.
import { rewardScale, spawnDrop, clearEffects } from './powerups.js';
import {awardDestruction} from './rewards.js';
export const BRICK_TYPES = Object.freeze({
  normal: Object.freeze({health:1,score:10,color:'#94cbb5',symbol:'',behavior:'break'}),
  reinforced: Object.freeze({health:2,score:25,color:'#8dbae0',symbol:'II',behavior:'break'}),
  armored: Object.freeze({health:3,score:50,color:'#b9a0df',symbol:'III',behavior:'break'}),
  explosive: Object.freeze({health:1,score:30,color:'#fb957b',symbol:'✳',behavior:'explode',radius:85,damage:1}),
  bonus: Object.freeze({health:1,score:100,color:'#e6cd8a',symbol:'+',behavior:'break'}),
  unbreakable: Object.freeze({health:Infinity,score:0,color:'#657583',symbol:'×',behavior:'solid'})
});
// Sparse solid bricks do not form a barrier. All six types are in the single level.
export const DEFAULT_LAYOUT = [
  ['normal','reinforced','armored','bonus','normal','normal','bonus','armored','reinforced','normal'],
  ['reinforced','normal','normal','explosive','normal','normal','explosive','normal','normal','reinforced'],
  ['normal','armored','normal','normal','bonus','bonus','normal','normal','armored','normal'],
  ['normal','normal','explosive','normal','normal','normal','normal','explosive','normal','normal'],
  ['normal','normal','unbreakable','normal','reinforced','reinforced','normal','unbreakable','normal','normal']
];
export function createBrick(type, geometry, definitions=BRICK_TYPES) {
  const rule=definitions[type];
  if (!rule || !(rule.health>0) || !Number.isFinite(rule.score) || rule.score<0) throw new Error(`Invalid brick type: ${type}`);
  return {...geometry,type,rule:{...rule},health:rule.health,maxHealth:rule.health,alive:true};
}
export function remainingBricks(game) {
  return game.bricks.filter(b=>b.alive && b.rule.behavior!=='solid').length;
}
// Iterative destruction queue. Dead-before-enqueue and one detonation per source
// make explosive chains finite, even when blast radii overlap or form cycles.
export function damageBrick(game, target, amount=1) {
  const queue=[];
  const before=game.cleared;
  function damage(brick, value) {
    if (!brick.alive || brick.rule.behavior==='solid') return;
    brick.health=Math.max(0,brick.health-value);
    if (brick.health>0) return;
    brick.alive=false; game.cleared++; awardDestruction(game,brick,rewardScale(game));
    if(brick.type==='bonus'&&game.stats)game.stats.bonus++;
    spawnDrop(game,brick);
    if (brick.rule.behavior==='explode') queue.push(brick);
  }
  damage(target,amount);
  for(let i=0;i<queue.length;i++) {
    const source=queue[i];
    for(const brick of game.bricks) {
      const distance=Math.hypot(brick.x+brick.w/2-source.x-source.w/2,brick.y+brick.h/2-source.y-source.h/2);
      if(brick!==source && distance<=source.rule.radius) damage(brick,source.rule.damage);
    }
  }
  if(queue.length)game.rewards.chain=Math.max(game.rewards.chain,game.cleared-before);
  if (remainingBricks(game)===0) { game.phase='complete'; clearEffects(game); }
}
