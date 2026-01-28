// Simple Car Racing Game - JavaScript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('highscore');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
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
let highscore = localStorage.getItem('car_high') || 0;
highEl.textContent = `High: ${highscore}`;

// Road lines
let lines = [];
for(let i=0;i<6;i++){
  lines.push({x:cw/2 - 4, y:i*120, w:8, h:60});
}

// Resize handling (canvas fixed size but scale CSS)
function toWorldX(cssX){return cssX * (cw / canvas.clientWidth);} // not used now

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
}

startBtn.addEventListener('click', ()=>{
  startBtn.style.display = 'none';
  start();
});
restartBtn.addEventListener('click', ()=>{
  restartBtn.style.display = 'none';
  start();
});

// Touch controls
leftBtn.addEventListener('touchstart', (e)=>{e.preventDefault(); keys.left = true});
leftBtn.addEventListener('touchend', (e)=>{e.preventDefault(); keys.left=false});
rightBtn.addEventListener('touchstart', (e)=>{e.preventDefault(); keys.right=true});
rightBtn.addEventListener('touchend', (e)=>{e.preventDefault(); keys.right=false});

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
  const width = 36;
  enemies.push({x:lanes[laneIndex], y:-80, w:width, h:70, speed:2 + Math.random()*1.8});
}

function update(dt){
  // Move player
  if(keys.left) player.x -= player.speed * dt;
  if(keys.right) player.x += player.speed * dt;
  // clamp to road edges
  const minX = lanes[0]-8; const maxX = lanes[2]+8;
  if(player.x < minX) player.x = minX;
  if(player.x > maxX) player.x = maxX;

  // Snap to lanes slowly
  // optional: smooth lane centering can be added

  // Spawn enemies
  spawnTimer += dt;
  if(spawnTimer > 60){ spawnTimer = 0; spawnEnemy(); }

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
      if(score > highscore){ highscore = score; localStorage.setItem('car_high', highscore); highEl.textContent = `High: ${highscore}`; }
      scoreEl.textContent = `Score: ${score}`;
      stop();
      return;
    }
  }

  scoreEl.textContent = `Score: ${score}`;
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

  // road bg
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(cw*0.12, 0, cw*0.76, ch);

  // side grass
  ctx.fillStyle = '#0d6624';
  ctx.fillRect(0,0,cw*0.12,ch);
  ctx.fillRect(cw*0.88,0,cw*0.12,ch);

  // dashed lines
  ctx.fillStyle = '#e9e9e9';
  for(let l of lines){
    ctx.fillRect(l.x, l.y, l.w, l.h);
  }

  // draw player (car)
  drawCar(player.x, player.y, player.w, player.h, '#0066ff');

  // draw enemies
  for(let e of enemies) drawCar(e.x, e.y, e.w, e.h, '#ff3333');
}

function drawCar(x,y,w,h,color){
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();
  // windows
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x+6, y+10, w-12, h/3);
  // wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(x+4, y+h-12, 8, 8);
  ctx.fillRect(x+w-12, y+h-12, 8, 8);
}

// polyfill for roundRect if not available
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    if(typeof r === 'number') r = {tl:r, tr:r, br:r, bl:r};
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
  }
}

// initial draw
render();
