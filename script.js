// Enhanced Car Racing Game - JS (with improved UI hooks)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score span');
const highEl = document.querySelector('#highscore span');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const overlayHigh = document.getElementById('overlayHigh');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

let cw = canvas.width, ch = canvas.height;
let keys = {};
let gameLoopId = null;
let running = false;

// Player
const player = {
  x: cw/2 - 18,
  y: ch - 110,
  w: 36,
  h: 70,
  speed: 4.2
};

// Road lanes
const lanes = [cw*0.17, cw*0.5 - player.w/2, cw*0.83 - player.w];

// Obstacles (enemy cars)
let enemies = [];
let spawnTimer = 0;
let score = 0;
let highscore = parseInt(localStorage.getItem('car_high') || 0, 10) || 0;
scoreEl.textContent = score;
highEl.textContent = highscore;
if(overlayHigh) overlayHigh.textContent = highscore;

// Road lines
let lines = [];
for(let i=0;i<6;i++){
  lines.push({x:cw/2 - 4, y:i*120, w:8, h:60});
}

function reset(){
  enemies = [];
  spawnTimer = 0;
  score = 0;
  player.x = lanes[1];
}

function start(){
  reset();
  overlay.classList.add('hidden');
  running = true;
  last = performance.now();
  gameLoopId = requestAnimationFrame(loop);
}

function stop(){
  running = false;
  cancelAnimationFrame(gameLoopId);
  overlay.classList.remove('hidden');
  restartBtn.style.display = 'inline-block';
  // update overlay high
  if(overlayHigh) overlayHigh.textContent = highscore;
}

startBtn.addEventListener('click', ()=>{
  startBtn.style.display = 'none';
  start();
});
restartBtn.addEventListener('click', ()=>{
  restartBtn.style.display = 'none';
  start();
});

// difficulty selection
let difficulty = 'normal';
const diffRadios = document.querySelectorAll('input[name="difficulty"]');
for(let r of diffRadios){
  r.addEventListener('change', ()=>{ difficulty = document.querySelector('input[name="difficulty"]:checked').value; applyDifficulty(); });
}
function applyDifficulty(){
  if(difficulty === 'easy'){ player.speed = 3.6; }
  else if(difficulty === 'normal'){ player.speed = 4.2; }
  else { player.speed = 5.0; }
}
applyDifficulty();

// Touch controls
leftBtn.addEventListener('touchstart', (e)=>{e.preventDefault(); keys.left = true});
leftBtn.addEventListener('touchend', (e)=>{e.preventDefault(); keys.left=false});
rightBtn.addEventListener('touchstart', (e)=>{e.preventDefault(); keys.right=true});
rightBtn.addEventListener('touchend', (e)=>{e.preventDefault(); keys.right=false});

// Mouse for buttons (desktop)
leftBtn.addEventListener('mousedown', ()=>keys.left = true);
leftBtn.addEventListener('mouseup', ()=>keys.left = false);
rightBtn.addEventListener('mousedown', ()=>keys.right = true);
rightBtn.addEventListener('mouseup', ()=>keys.right = false);

// Keyboard
window.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
});
window.addEventListener('keyup', (e)=>{
  if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

function spawnEnemy(){
  const laneIndex = Math.floor(Math.random()*3);
  const width = 36 + Math.floor(Math.random()*12); // varied width
  let speed = 2 + Math.random()*1.8;
  if(difficulty === 'easy') speed *= 0.9;
  if(difficulty === 'hard') speed *= 1.25;
  enemies.push({x:lanes[laneIndex], y:-80, w:width, h:70, speed: speed});
}

function update(dt){
  // Move player
  if(keys.left) player.x -= player.speed * dt;
  if(keys.right) player.x += player.speed * dt;
  // clamp to road edges
  const minX = lanes[0]-8; const maxX = lanes[2]+8;
  if(player.x < minX) player.x = minX;
  if(player.x > maxX) player.x = maxX;

  // Spawn enemies
  spawnTimer += dt;
  // spawn frequency depends on difficulty
  let spawnThreshold = 60; // ~1s
  if(difficulty === 'easy') spawnThreshold = 80;
  if(difficulty === 'hard') spawnThreshold = 46;
  if(spawnTimer > spawnThreshold){ spawnTimer = 0; spawnEnemy(); }

  // Update enemies
  for(let i=enemies.length-1;i>=0;i--){
    enemies[i].y += enemies[i].speed * dt;
    if(enemies[i].y > ch + 100) enemies.splice(i,1), score += 10;
  }

  // Update lines
  for(let l of lines){
    l.y += 2.4 * dt;
    if(l.y > ch) l.y = -60;
  }

  // Collision detection
  for(let e of enemies){
    if(rectIntersect(player,e)){
      // game over
      running = false;
      if(score > highscore){ highscore = score; localStorage.setItem('car_high', highscore); highEl.textContent = highscore; }
      scoreEl.textContent = score;
      stop();
      return;
    }
  }

  scoreEl.textContent = score;
}

function rectIntersect(a,b){
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

let last = 0;
function loop(ts){
  const dt = Math.min(40, ts - last) / 16.6667; // normalize to ~60fps units
  last = ts;
  update(dt);
  render();
  if(running) gameLoopId = requestAnimationFrame(loop);
}

function render(){
  ctx.clearRect(0,0,cw,ch);

  // soft vignette
  const grd = ctx.createLinearGradient(0,0,0,ch);
  grd.addColorStop(0,'#0b1220'); grd.addColorStop(1,'#081020');
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,cw,ch);

  // road bg
  const roadX = cw*0.12, roadW = cw*0.76;
  ctx.fillStyle = '#1b2633';
  roundRect(ctx, roadX, 0, roadW, ch, 8);
  ctx.fill();

  // side grass (neon hint)
  ctx.fillStyle = 'rgba(14,165,160,0.06)';
  ctx.fillRect(0,0,roadX,ch);
  ctx.fillRect(roadX+roadW,0,cw-(roadX+roadW),ch);

  // dashed center lines
  ctx.fillStyle = '#ffe';
  for(let l of lines){
    ctx.fillRect(l.x, l.y, l.w, l.h);
  }

  // glow for player
  drawCar(player.x, player.y, player.w, player.h, '#06b6d4', true);

  // draw enemies
  for(let e of enemies) drawCar(e.x, e.y, e.w, e.h, '#ff5c5c', false);

  // subtle HUD glow
}

function drawCar(x,y,w,h,color, glow){
  // shadow/glow
  if(glow){
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
  }
  // windows
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x+6, y+10, w-12, h/3);
  // wheels
  ctx.fillStyle = '#071018';
  ctx.fillRect(x+4, y+h-12, 8, 8);
  ctx.fillRect(x+w-12, y+h-12, 8, 8);
}

function roundRect(ctx, x, y, w, h, r){
  if(typeof r === 'number') r = {tl:r, tr:r, br:r, bl:r};
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

// initial draw
render();
