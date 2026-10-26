// Fixed logical coordinates keep physics independent of screen size.
import { BRICK_TYPES, DEFAULT_LAYOUT, createBrick, damageBrick } from './bricks.js';
import {createRewards,tickRewards,resetCombo} from './rewards.js';
import { createEffects, tickEffects, clearEffects, ballTimeScale, barrierBounce, magnetForce, catchSticky, positionSticky, releaseSticky, hasEffect, BALANCE } from './powerups.js';
export const WIDTH = 800;
export const HEIGHT = 560;
export function createGame({layout=DEFAULT_LAYOUT, definitions=BRICK_TYPES, level=1, objective={type:'none'}, dropChance=.18}={}) {
  const bricks = [];
  for (let row = 0; row < layout.length; row++) for (let col = 0; col < layout[row].length; col++) {
    if (!layout[row][col]) continue;
    bricks.push(createBrick(layout[row][col], { x: 45 + col * 72, y: 64 + row * 30, w: 62, h: 20, row }, definitions));
  }
  const ball={id:0,x:400,y:501,r:7,vx:0,vy:0,alive:true};
  return { phase: 'ready', paddle: { x: 344, y: 508, w: 112, h: 12 },
    ball,balls:[ball],bricks, cleared: 0,
    score: 0, lives: 3, level, pausedFrom: null, effects:createEffects(), rewards:createRewards(),
    stats:{elapsed:0,livesLost:0,bonus:0}, objective, dropChance,
    total: bricks.filter(b=>b.rule.behavior!=='solid').length };
}
export function togglePause(game) {
  if (game.phase === 'paused') { game.phase = game.pausedFrom; game.pausedFrom = null; }
  else if (['aiming', 'playing'].includes(game.phase)) {
    game.pausedFrom = game.phase; game.phase = 'paused';
  }
}
// Before launch, the ball is attached to the paddle rather than simulated.
export function resetBall(game) {
  Object.assign(game.ball, { x: game.paddle.x + game.paddle.w / 2,
    y: game.paddle.y - game.ball.r, vx: 0, vy: 0,alive:true });game.balls=[game.ball];
}
export function launchBall(game) {
  if(!['aiming','playing'].includes(game.phase))return;
  if(releaseSticky(game))return;
  if (game.phase !== 'aiming') return;
  game.phase = 'playing'; game.ball.vx = 170; game.ball.vy = -265;
}
export function movePaddle(game, x) {
  game.paddle.x = Math.max(12, Math.min(WIDTH - game.paddle.w - 12, x));
  if (game.phase === 'ready' || game.phase === 'aiming') resetBall(game);
}
export function updateGame(game, dt, input) {
  if (!['aiming', 'playing'].includes(game.phase)) return;
  if (!Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);
  if (input.pointer !== null) movePaddle(game, input.pointer - game.paddle.w / 2);
  else movePaddle(game, game.paddle.x + input.direction * 470 * dt);
  tickEffects(game,dt);
  positionSticky(game);
  if (game.phase === 'aiming') return;
  game.stats.elapsed+=dt;
  tickRewards(game,dt);
  // Small substeps prevent the ball tunneling through thin bricks or paddle.
  const steps = Math.max(1, Math.ceil(dt / 0.004));
  const speedScale=game.mode?.speedScale??1;
  const substeps=Math.ceil(steps*speedScale);
  for (let i = 0; i < substeps && game.phase === 'playing'; i++) {const step=dt/substeps*ballTimeScale(game)*speedScale;for(const ball of [...game.balls])if(ball.alive!==false&&game.phase==='playing')advanceBall(game,ball,step);if(game.phase==='playing')advanceProjectiles(game,step);game.balls=game.balls.filter(b=>b.alive!==false);}
}
function advanceBall(game,b,dt) {
  if(b.stuck)return;
  const p = game.paddle;
  const oldX = b.x, oldY = b.y;
  magnetForce(game,b,dt);
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
  if (b.x > WIDTH - b.r) { b.x = WIDTH - b.r; b.vx = -Math.abs(b.vx); }
  if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
  if(b===game.ball)barrierBounce(game,oldY);
  if (b.vy > 0 && oldY + b.r <= p.y && b.y + b.r >= p.y && b.x + b.r >= p.x && b.x - b.r <= p.x + p.w) {
    b.y = p.y - b.r;
    game.rewards.rallies++;
    if(catchSticky(game,b))return;
    const offset = Math.max(-1, Math.min(1, (b.x - (p.x + p.w / 2)) / (p.w / 2)));
    const angle = offset * 1.05;
    const speed = Math.hypot(b.vx, b.vy);
    b.vx = Math.sin(angle) * speed; b.vy = -Math.cos(angle) * speed;
  }
  for (const brick of game.bricks) {
    if (!brick.alive) continue;
    const nearestX = Math.max(brick.x, Math.min(brick.x + brick.w, b.x));
    const nearestY = Math.max(brick.y, Math.min(brick.y + brick.h, b.y));
    if ((b.x - nearestX) ** 2 + (b.y - nearestY) ** 2 > b.r ** 2) continue;
    // Closest-point circle/AABB contact: corners reflect along their true normal.
    let nx = b.x - nearestX, ny = b.y - nearestY;
    let distance = Math.hypot(nx, ny);
    if (distance > 0) { nx /= distance; ny /= distance; }
    else {
      const sides = [[b.x-brick.x,-1,0],[brick.x+brick.w-b.x,1,0],
        [b.y-brick.y,0,-1],[brick.y+brick.h-b.y,0,1]].sort((a,c)=>a[0]-c[0]);
      nx=sides[0][1]; ny=sides[0][2]; distance=-sides[0][0];
    }
    b.x += nx * (b.r-distance+0.001); b.y += ny * (b.r-distance+0.001);
    const inward = b.vx*nx+b.vy*ny;
    if (inward < 0) {
      if(!hasEffect(game,'fireball')||brick.rule.behavior==='solid'){b.vx -= 2*inward*nx;b.vy -= 2*inward*ny;}
      damageBrick(game, brick);
      if(hasEffect(game,'fireball')&&brick.rule.behavior!=='solid'){
        // Continue beyond the struck face so substeps cannot damage the same live
        // multi-hit brick repeatedly while the ball is still geometrically inside.
        const travel=Math.max(brick.w,brick.h)+b.r*2;
        if(Math.abs(b.vx)>Math.abs(b.vy))b.x+=Math.sign(b.vx)*travel;else b.y+=Math.sign(b.vy)*travel;
      }
    }
    break;
  }
  if (game.phase === 'playing' && b.y - b.r > HEIGHT) {
    if(game.balls.some(other=>other!==b&&other.alive!==false)){b.alive=false;return;}
    game.lives--;
    resetCombo(game);
    game.stats.livesLost++;
    if(game.mode?.kind==='hardcore')game.lives=0;
    clearEffects(game);
    game.paddle.x = (WIDTH-game.paddle.w)/2; resetBall(game);
    game.phase = game.lives > 0 ? 'aiming' : 'gameover';
  }
}
function advanceProjectiles(game,dt){for(const shot of game.effects.projectiles){if(!shot.alive)continue;shot.y+=shot.vy*dt;if(shot.y<0){shot.alive=false;continue;}for(const brick of game.bricks){if(!brick.alive||brick.rule.behavior==='solid')continue;if(shot.x>=brick.x&&shot.x<=brick.x+brick.w&&shot.y>=brick.y&&shot.y<=brick.y+brick.h){damageBrick(game,brick,BALANCE.laserDamage);shot.alive=false;break;}}}game.effects.projectiles=game.effects.projectiles.filter(s=>s.alive);}
