import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame as createTypedGame, movePaddle, updateGame, launchBall, resetBall, togglePause } from '../src/game.js';
// Preserve regression coverage of the original uniform wall via configuration.
const createGame=()=>createTypedGame({layout:Array.from({length:5},()=>Array(10).fill('normal'))});
const input = { pointer: null, direction: 0 };
test('initial screen contains 50 bricks, one ball and bottom paddle', () => {
  const g = createGame(); assert.equal(g.bricks.length, 50); assert.equal(g.phase, 'ready'); assert.equal(g.paddle.y, 508); assert.equal(g.ball.y, 501);
});
test('ready screen does not advance', () => { const g = createGame(); updateGame(g, .03, input); assert.equal(g.ball.y, 501); });
test('paddle is clamped inside board', () => { const g = createGame(); movePaddle(g, -500); assert.equal(g.paddle.x, 12); movePaddle(g, 1000); assert.equal(g.paddle.x, 676); });
test('ball rebounds from wall', () => { const g = createGame(); g.phase = 'playing'; Object.assign(g.ball, {x:8,y:300,vx:-170,vy:0}); updateGame(g,.03,input); assert.ok(g.ball.vx > 0); });
test('paddle rebounds downward ball', () => { const g = createGame(); g.phase = 'playing'; Object.assign(g.ball,{x:400,y:499,vx:0,vy:265}); updateGame(g,.02,input); assert.ok(g.ball.vy < 0); });
test('brick collision clears one brick', () => { const g = createGame(); g.phase = 'playing'; g.bricks.forEach((b,i)=>b.alive=i===0); Object.assign(g.ball,{x:70,y:92,vx:0,vy:-265}); updateGame(g,.02,input); assert.equal(g.cleared,1); assert.ok(g.ball.vy > 0); });
test('last brick completes level', () => { const g = createGame(); g.phase = 'playing'; g.bricks.forEach((b,i)=>b.alive=i===0); g.cleared=49; Object.assign(g.ball,{x:70,y:92,vx:0,vy:-265}); updateGame(g,.02,input); assert.equal(g.phase,'complete'); });
test('missed ball consumes one life and resets', () => { const g = createGame(); g.phase = 'playing'; g.ball.y=569; updateGame(g,.01,input); assert.equal(g.phase,'aiming'); assert.equal(g.lives,2); assert.equal(g.ball.y,501); });
test('aiming ball follows paddle and launch is one-shot', () => {
  const g=createGame(); g.phase='aiming'; updateGame(g,.02,{pointer:null,direction:1});
  assert.equal(g.ball.x,g.paddle.x+56); assert.equal(g.ball.y,501); assert.equal(g.ball.vy,0);
  launchBall(g); assert.equal(g.phase,'playing'); assert.equal(g.ball.vy,-265);
  g.ball.vy=123; launchBall(g); assert.equal(g.ball.vy,123);
  g.phase='aiming'; resetBall(g); assert.equal(g.ball.vy,0);
});
test('three losses lead to game over without repeated deductions', () => {
  const g=createGame(); g.score=20; g.bricks[0].alive=false;
  for(let remaining=2;remaining>=0;remaining--) {
    g.phase='aiming'; launchBall(g); g.ball.y=569; updateGame(g,.05,input);
    assert.equal(g.lives,remaining); assert.equal(g.score,20); assert.equal(g.bricks[0].alive,false);
    assert.equal(g.ball.x,400); assert.equal(g.ball.vy,0);
    updateGame(g,.05,input); assert.equal(g.lives,remaining);
  }
  assert.equal(g.phase,'gameover'); launchBall(g); assert.equal(g.phase,'gameover');
});
test('pause freezes all state and resumes prior phase', () => {
  for(const phase of ['aiming','playing']) {
    const g=createGame(); g.phase=phase; togglePause(g); const saved=structuredClone(g);
    updateGame(g,.05,{pointer:600,direction:1}); launchBall(g); assert.deepEqual(g,saved);
    togglePause(g); assert.equal(g.phase,phase);
  }
});
test('brick top, bottom, side and corner contacts preserve speed and score once', () => {
  for(const [x,y,vx,vy,axis,sign] of [[70,56,0,265,'vy',-1],[70,92,0,-265,'vy',1],
    [37,74,265,0,'vx',-1],[115,74,-265,0,'vx',1],[39,58,180,180,'vx',-1]]) {
    const g=createGame(); g.phase='playing'; g.bricks.forEach((b,i)=>b.alive=i===0);
    Object.assign(g.ball,{x,y,vx,vy}); const speed=Math.hypot(vx,vy);
    updateGame(g,.02,input); assert.equal(g.score,10); assert.equal(g.cleared,1);
    assert.ok(g.ball[axis]*sign>0); assert.ok(Math.abs(Math.hypot(g.ball.vx,g.ball.vy)-speed)<1e-8);
    updateGame(g,.05,input); assert.equal(g.score,10);
  }
});
test('circle near a corner without touching does not destroy brick', () => {
  const g=createGame(); g.phase='playing'; Object.assign(g.ball,{x:39,y:58,vx:-100,vy:-100});
  updateGame(g,.004,input); assert.equal(g.score,0); assert.equal(g.cleared,0);
});
test('entire wall has exact base and capped combo reward; completed game freezes', () => {
  const g=createGame(); g.phase='playing';
  for(const brick of g.bricks) {
    Object.assign(g.ball,{x:brick.x+brick.w/2,y:brick.y-8,vx:0,vy:265});
    updateGame(g,.008,input);
  }
  assert.equal(g.phase,'complete'); assert.equal(g.rewards.base,500);assert.equal(g.rewards.comboBonus,560);assert.equal(g.score,1060); assert.equal(g.cleared,50);
  const saved=structuredClone(g); updateGame(g,.05,input); togglePause(g); assert.deepEqual(g,saved);
  const fresh=createGame(); assert.equal(fresh.score,0); assert.equal(fresh.lives,3); assert.equal(fresh.level,1);
});
test('free flight is equivalent at 30, 60 and 144 fps', () => {
  for (const fps of [30,60,144]) {
    const g=createGame(); g.phase='playing'; Object.assign(g.ball,{x:300,y:350,vx:120,vy:-100});
    for(let i=0;i<fps/2;i++) updateGame(g,1/fps,input);
    assert.ok(Math.abs(g.ball.x-360)<1e-8); assert.ok(Math.abs(g.ball.y-300)<1e-8);
  }
});
test('paddle and walls cannot be crossed at normal speeds and 20-144 fps', () => {
  for(const dt of [1/144,1/60,1/30,.05]) {
    for(const x of [345,400,455]) {
      const g=createGame(); g.phase='playing'; Object.assign(g.ball,{x,y:500,vx:0,vy:315});
      updateGame(g,dt,input); assert.ok(g.ball.vy<0); assert.ok(g.ball.y<=501);
    }
    for(const [x,y,vx,vy] of [[8,300,-315,0],[792,300,315,0],[400,8,0,-315]]) {
      const g=createGame(); g.phase='playing'; Object.assign(g.ball,{x,y,vx,vy});
      updateGame(g,dt,input); assert.ok(g.ball.x>=7&&g.ball.x<=793&&g.ball.y>=7);
      assert.ok(vx ? g.ball.vx*vx<0 : g.ball.vy*vy<0);
    }
  }
});
