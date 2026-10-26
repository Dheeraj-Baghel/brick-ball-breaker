import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,updateGame} from '../src/game.js';
import {BRICK_TYPES,damageBrick,createBrick} from '../src/bricks.js';
const input={pointer:null,direction:0};
for(const type of Object.keys(BRICK_TYPES)) test(`${type}: real ball contacts, health and exact score`,()=>{
  const g=createGame({layout:[[type,'normal']]});g.phase='playing';const b=g.bricks[0];
  const hits=Number.isFinite(b.health)?b.health:5;
  for(let i=0;i<hits;i++) {
    Object.assign(g.ball,{x:b.x+b.w/2,y:b.y-8,vx:0,vy:265});updateGame(g,.008,input);
    assert.ok(g.ball.vy<0);
    if(type==='unbreakable'){assert.equal(b.health,Infinity);assert.equal(g.score,0);}
    else {assert.equal(b.health,Math.max(0,b.maxHealth-i-1));if(b.health>0)assert.equal(g.score,0);}
  }
  if(type!=='unbreakable') {assert.equal(b.alive,false);assert.ok(g.score>=b.rule.score);const score=g.score;damageBrick(g,b);assert.equal(g.score,score);}
  else assert.equal(b.alive,true);
});
test('explosions chain finitely, damage multi-hit neighbors, ignore distant and solid bricks',()=>{
  const g=createGame({layout:[['explosive','explosive','armored','normal','unbreakable']]});g.phase='playing';
  damageBrick(g,g.bricks[0]);assert.equal(g.score,60);assert.equal(g.cleared,2);
  assert.equal(g.bricks[2].health,2);assert.equal(g.bricks[3].health,1);assert.equal(g.bricks[4].alive,true);
  damageBrick(g,g.bricks[0]);assert.equal(g.score,60);assert.equal(g.bricks[2].health,2);
});
test('dense cyclic explosive neighborhood detonates each source once',()=>{
  const g=createGame({layout:[['explosive','explosive'],['explosive','explosive']]});g.phase='playing';
  damageBrick(g,g.bricks[0]);assert.equal(g.score,120);assert.equal(g.cleared,4);assert.equal(g.phase,'complete');
});
test('unbreakables do not block completion',()=>{
  const g=createGame({layout:[['bonus','unbreakable']]});g.phase='playing';damageBrick(g,g.bricks[0]);
  assert.equal(g.phase,'complete');assert.equal(g.score,100);assert.equal(g.bricks[1].alive,true);
});
test('definitions configurable and snapshots independent',()=>{
  const definitions={...BRICK_TYPES,normal:{...BRICK_TYPES.normal,health:4,score:17}};
  const g=createGame({layout:[['normal']],definitions});assert.equal(g.bricks[0].health,4);
  definitions.normal.score=99;damageBrick(g,g.bricks[0],4);assert.equal(g.score,17);
  assert.throws(()=>createBrick('missing',{}));
});
