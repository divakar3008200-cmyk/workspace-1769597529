/* script.js - Mini Pac-Man demo
   Split out from single-file version. Keep in sync with index.html + styles.css.
*/

// Config
const TILE = 26;
const COLS = 21;
const ROWS = 21;
const CANVAS_SIZE = TILE * Math.max(COLS, ROWS);
const canvas = document.getElementById('root');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('bestScore');
const overlay = document.getElementById('overlay');
const menu = document.getElementById('menu');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const diffButtons = document.querySelectorAll('.diff');
const muteBtn = document.getElementById('muteBtn');
const tutorialBtn = document.getElementById('tutorialBtn');

let SOUND = true;
let bestScore = parseInt(localStorage.getItem('pac_best')||'0',10);
bestEl.textContent = bestScore;

let DIFFICULTY = 'normal';
diffButtons.forEach(b=>{
  b.addEventListener('click', ()=>{
    diffButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    DIFFICULTY = b.dataset.diff;
  });
});

// create map programmatically: border walls + some blocks and a central house
const grid = createGrid();

function createGrid(){
  const g = Array.from({length: ROWS}, ()=>Array(COLS).fill(0));
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(r===0||r===ROWS-1||c===0||c===COLS-1) g[r][c]=1;
    }
  }
  const blocks = [
    {r:2,c:2,h:3,w:3},{r:2,c:16,h:3,w:3},
    {r:6,c:2,h:3,w:3},{r:6,c:16,h:3,w:3},
    {r:10,c:8,h:3,w:5},
    {r:14,c:2,h:3,w:3},{r:14,c:16,h:3,w:3},
    {r:16,c:8,h:3,w:5}
  ];
  for(const b of blocks){
    for(let dr=0;dr<b.h;dr++){
      for(let dc=0;dc<b.w;dc++){
        g[b.r+dr][b.c+dc]=1;
      }
    }
  }
  const hr = 9, hc=8;
  for(let r=hr;r<hr+3;r++){
    for(let c=hc;c<hc+5;c++){
      g[r][c]=1;
    }
  }
  g[hr+1][hc+2]=0;

  return g;
}

let pellets = [];
let powerPellets = [];
function resetPellets(){
  pellets = [];
  powerPellets = [];
  for(let r=1;r<ROWS-1;r++){
    for(let c=1;c<COLS-1;c++){
      if(grid[r][c]===0){
        if(r>=9 && r<=11 && c>=8 && c<=12) continue;
        pellets.push({r,c});
      }
    }
  }
  const power = [{r:1,c:1},{r:1,c:COLS-2},{r:ROWS-2,c:1},{r:ROWS-2,c:COLS-2}];
  power.forEach(p=>{
    if(grid[p.r][p.c]===0){
      pellets = pellets.filter(q=>!(q.r===p.r&&q.c===p.c));
      powerPellets.push(p);
    }
  });
}
resetPellets();

let pac = {
  r: 11, c: 10,
  x: 10*TILE + TILE/2, y: 11*TILE + TILE/2,
  dir: {x:0,y:0}, nextDir: {x:0,y:0},
  speed: 2.0,
  mouth:0,
  died:false
};

const ghostColors = ['#ff4950','#55d4ff','#7aff7a'];
let ghosts = [];

function resetGhosts(){
  ghosts = [
    makeGhost(10.5,9.5, ghostColors[0], 'chase'),
    makeGhost(9.5,10.5, ghostColors[1], 'random'),
    makeGhost(11.5,10.5, ghostColors[2], 'patrol')
  ];
}
function makeGhost(cx,cy,color,behavior){
  return { x: cx * TILE, y: cy * TILE, r: cx, c: cy, color, behavior, dir: {x:0,y:0}, speed: 1.3, frightened: 0, eaten: false, target: {r:11,c:10}, patrolIdx: 0 };
}
resetGhosts();

let score = 0, lives = 3, paused = false, playing = false, lastTime=0, ghostFearTimer = 0;
function resetGame(){
  score = 0; lives = 3;
  pac.r=11; pac.c=10; pac.x = pac.c*TILE+TILE/2; pac.y = pac.r*TILE+TILE/2;
  pac.dir={x:0,y:0}; pac.nextDir={x:0,y:0};
  resetPellets(); resetGhosts(); ghosts.forEach(g=>g.speed = getGhostSpeed()); updateHUD();
}
resetGame();
function updateHUD(){ scoreEl.textContent = score; livesEl.textContent = lives; bestEl.textContent = bestScore; }

const DIRS = { ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0}, ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, a: {x:-1,y:0}, d:{x:1,y:0}, w:{x:0,y:-1}, s:{x:0,y:1} };
window.addEventListener('keydown', (e)=>{ if(e.key in DIRS){ e.preventDefault(); pac.nextDir = DIRS[e.key]; } else if(e.key===' '){ togglePause(); } });
startBtn.addEventListener('click', ()=>startGame());
restartBtn.addEventListener('click', ()=>{ startGame(true) });
pauseBtn.addEventListener('click', ()=>togglePause());
muteBtn.addEventListener('click', ()=>{ SOUND = !SOUND; muteBtn.textContent = SOUND ? 'Toggle Sound' : 'Muted' });
tutorialBtn.addEventListener('click', ()=>alert('Use arrow keys or WASD to move. Eat all pellets to win. Eat power-pellets to make ghosts vulnerable.'));

function getGhostSpeed(){ if(DIFFICULTY==='easy') return 1.1; if(DIFFICULTY==='hard') return 1.8; return 1.4; }
function getFrightTime(){ if(DIFFICULTY==='easy') return 9000; if(DIFFICULTY==='hard') return 4500; return 7000; }

function startGame(restart=false){ if(!restart){ overlay.style.display = 'none'; menu.style.display = 'none'; } resetGame(); playing = true; paused = false; lastTime = performance.now(); requestAnimationFrame(loop); }
function togglePause(){ if(!playing) return; paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; if(!paused){ lastTime = performance.now(); requestAnimationFrame(loop); } }

function cellIsWall(r,c){ if(r<0||r>=ROWS||c<0||c>=COLS) return true; return grid[r][c]===1; }
function posToCell(x,y){ return {r: Math.floor(y / TILE), c: Math.floor(x / TILE)}; }
function sameCell(a,b){ return a.r===b.r && a.c===b.c; }
function removePelletAt(r,c){ const idx = pellets.findIndex(p=>p.r===r && p.c===c); if(idx>=0){ pellets.splice(idx,1); return true; } return false; }
function removePowerAt(r,c){ const idx = powerPellets.findIndex(p=>p.r===r && p.c===c); if(idx>=0){ powerPellets.splice(idx,1); return true; } return false; }

function bfsNextDir(fromCell, targetCell){ const q = []; const visited = Array.from({length:ROWS},()=>Array(COLS).fill(false)); const parent = Array.from({length:ROWS},()=>Array(COLS).fill(null)); q.push(fromCell); visited[fromCell.r][fromCell.c]=true; let found = false; while(q.length){ const cur = q.shift(); if(cur.r===targetCell.r && cur.c===targetCell.c){ found=true; break; } const moves = [{r:cur.r-1,c:cur.c},{r:cur.r+1,c:cur.c},{r:cur.r,c:cur.c-1},{r:cur.r,c:cur.c+1}]; for(const m of moves){ if(m.r<0||m.r>=ROWS||m.c<0||m.c>=COLS) continue; if(visited[m.r][m.c]) continue; if(grid[m.r][m.c]===1) continue; visited[m.r][m.c]=true; parent[m.r][m.c]=cur; q.push(m); } } if(!found) return {x:0,y:0}; let step = targetCell; while(parent[step.r][step.c] && !(parent[step.r][step.c].r===fromCell.r && parent[step.r][step.c].c===fromCell.c)){ step = parent[step.r][step.c]; } return {x: step.c - fromCell.c, y: step.r - fromCell.r}; }

function loop(t){ if(!playing) return; if(paused) return; const dt = Math.min(60, t - lastTime); lastTime = t; update(dt); render(); if(playing && !paused) requestAnimationFrame(loop); }

function update(dt){ let moveStep = pac.speed * (dt/16); if(!(pac.nextDir.x===0 && pac.nextDir.y===0)){ const targetCell = {r: pac.r + pac.nextDir.y, c: pac.c + pac.nextDir.x}; if(!cellIsWall(targetCell.r, targetCell.c)){ pac.dir = pac.nextDir; } } const desired = {r: pac.r + pac.dir.y, c: pac.c + pac.dir.x}; if(!cellIsWall(desired.r, desired.c)){ pac.x += pac.dir.x * moveStep; pac.y += pac.dir.y * moveStep; const newCell = posToCell(pac.x, pac.y); pac.r = newCell.r; pac.c = newCell.c; } pac.mouth += dt*0.02; const pr = pac.r, pc = pac.c; if(removePelletAt(pr,pc)){ score += 10; if(SOUND) beep(); } if(removePowerAt(pr,pc)){ score += 50; ghostFearTimer = getFrightTime(); ghosts.forEach(g=>{ g.frightened = ghostFearTimer; }); if(SOUND) powerSound(); }

  ghosts.forEach((g,gi)=>{
    if(g.eaten) { const houseCenter = {r:10,c:10}; moveGhostTowards(g,houseCenter, dt); const cell = posToCell(g.x,g.y); if(cell.r===houseCenter.r && cell.c===houseCenter.c){ g.eaten = false; g.frightened = 0; } return; }

    if(g.frightened > 0){ g.frightened -= dt; if(g.frightened < 0) g.frightened = 0; }

    let targetCell;
    if(g.frightened > 0){ targetCell = pickFleeTile(g); }
    else if(g.behavior==='chase'){ targetCell = {r: pac.r, c: pac.c}; }
    else if(g.behavior==='random'){ if(!g.target || Math.random()<0.02) g.target = pickRandomTile(); targetCell = g.target; }
    else if(g.behavior==='patrol'){ const patrolPoints = [{r:1,c:1},{r:1,c:COLS-2},{r:ROWS-2,c:1},{r:ROWS-2,c:COLS-2}]; targetCell = patrolPoints[g.patrolIdx % patrolPoints.length]; const curCell = posToCell(g.x,g.y); if(sameCell(curCell,targetCell)) g.patrolIdx++; }
    else { targetCell = {r:pac.r,c:pac.c}; }

    moveGhostTowards(g,targetCell, dt);
  });

  ghosts.forEach(g=>{
    const d = Math.hypot(pac.x - g.x, pac.y - g.y);
    if(d < TILE*0.6){
      if(g.frightened > 0 && !g.eaten){ score += 200; g.eaten = true; g.frightened = 0; if(SOUND) eatGhostSound(); } else if(!g.eaten){ loseLife(); }
    }
  });

  if(ghostFearTimer > 0){ ghostFearTimer -= dt; if(ghostFearTimer <= 0){ ghosts.forEach(g=>g.frightened = 0); } }

  if(pellets.length===0 && powerPellets.length===0){ score += 1000; resetPellets(); resetGhosts(); if(SOUND) winSound(); }

  updateHUD();
}

function loseLife(){ if(SOUND) deathSound(); lives--; if(lives<=0){ gameOver(); } else { pac.r=11; pac.c=10; pac.x = pac.c*TILE+TILE/2; pac.y = pac.r*TILE+TILE/2; pac.dir={x:0,y:0}; pac.nextDir={x:0,y:0}; resetGhosts(); paused = true; setTimeout(()=>{ paused=false; lastTime=performance.now(); requestAnimationFrame(loop); }, 1000); } }

function gameOver(){ playing = false; overlay.style.display = 'flex'; menu.style.display = 'block'; menu.querySelector('h2').textContent = 'Game Over'; menu.querySelector('p').textContent = 'Score: ' + score; if(score > bestScore){ bestScore = score; localStorage.setItem('pac_best', bestScore); bestEl.textContent = bestScore; menu.querySelector('p').textContent += ' • New Best!'; } }

function moveGhostTowards(g, targetCell, dt){ const curCell = posToCell(g.x, g.y); const next = bfsNextDir(curCell, targetCell); let dir = next; if(g.frightened > 0 && Math.random()<0.05) dir = pickRandomDir(curCell); const spd = (g.frightened>0) ? (getGhostSpeed()*0.7) : g.speed; const step = spd * (dt/16); g.x += dir.x * step * TILE; g.y += dir.y * step * TILE; const cell = posToCell(g.x, g.y); g.r = cell.r; g.c = cell.c; }

function pickRandomTile(){ let tries = 0; while(tries++ < 200){ const r = 1 + Math.floor(Math.random()*(ROWS-2)); const c = 1 + Math.floor(Math.random()*(COLS-2)); if(grid[r][c]===0) return {r,c}; } return {r:11,c:10}; }
function pickFleeTile(g){ const corners = [{r:1,c:1},{r:1,c:COLS-2},{r:ROWS-2,c:1},{r:ROWS-2,c:COLS-2}]; let best=null, maxd=-1; corners.forEach(c=>{ const d = Math.abs(c.r - pac.r) + Math.abs(c.c - pac.c); if(d>maxd){ maxd=d; best=c; } }); return best; }
function pickRandomDir(cell){ const opts = []; const moves = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]; moves.forEach(m=>{ const nr = cell.r + m.y, nc = cell.c + m.x; if(!cellIsWall(nr,nc)) opts.push(m); }); if(opts.length===0) return {x:0,y:0}; return opts[Math.floor(Math.random()*opts.length)]; }

function render(){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle = '#06102b'; ctx.fillRect(0,0,canvas.width,canvas.height);
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(grid[r][c]===1){ const x = c*TILE, y = r*TILE; const g = ctx.createLinearGradient(x,y,x+TILE,y+TILE); g.addColorStop(0, '#16385b'); g.addColorStop(1, '#0b2440'); ctx.fillStyle = g; roundRect(ctx,x+2,y+2,TILE-4,TILE-4,6); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1; ctx.stroke(); } else { const x = c*TILE, y = r*TILE; ctx.fillStyle = 'rgba(255,255,255,0.006)'; ctx.fillRect(x,y,TILE,TILE); } } }

  ctx.fillStyle = '#ffec99'; pellets.forEach(p=>{ const cx = p.c*TILE + TILE/2; const cy = p.r*TILE + TILE/2; circle(ctx,cx,cy,2); ctx.fill(); });
  powerPellets.forEach(p=>{ const cx = p.c*TILE + TILE/2; const cy = p.r*TILE + TILE/2; ctx.fillStyle = '#ffd166'; circle(ctx,cx,cy,6); ctx.fill(); ctx.fillStyle = '#ffffff20'; circle(ctx,cx,cy,6.5); ctx.fill(); });

  drawPacman(); ghosts.forEach(g=>{ drawGhost(g); });

  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.font = '12px Inter, sans-serif'; ctx.fillText('Score: ' + score, 8, 16);
}

function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function circle(ctx,x,y,r){ ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.closePath(); }

function drawPacman(){ const x = pac.x; const y = pac.y; const mouth = Math.abs(Math.sin(pac.mouth)) * 0.5; const dirAng = Math.atan2(pac.dir.y||0, pac.dir.x||1); ctx.save(); ctx.translate(x,y); ctx.rotate(dirAng); ctx.beginPath(); ctx.fillStyle = '#ffd23f'; ctx.moveTo(0,0); ctx.arc(0,0, TILE/2 -2, mouth*Math.PI, (2-mouth)*Math.PI); ctx.closePath(); ctx.fill(); ctx.restore(); }

function drawGhost(g){ const x = g.x; const y = g.y; const w = TILE*0.8; const h = TILE*0.9; ctx.save(); ctx.translate(x, y); const bodyX = -w/2, bodyY = -h/2; ctx.beginPath(); if(g.eaten){ ctx.fillStyle = '#ffffff'; circle(ctx, -6, -2, 4); ctx.fill(); circle(ctx, 6, -2, 4); ctx.fill(); ctx.fillStyle = '#000'; circle(ctx, -6, -1, 2); ctx.fill(); circle(ctx, 6, -1, 2); ctx.fill(); ctx.restore(); return; } if(g.frightened > 0){ const flash = (g.frightened < 1800) && (Math.floor(g.frightened/200)%2===0); ctx.fillStyle = flash ? '#ffffff' : '#2b66ff'; roundRect(ctx, bodyX, bodyY, w, h, 6); ctx.fill(); ctx.beginPath(); for(let i=0;i<5;i++){ circle(ctx, bodyX + (i+0.5)*(w/5), bodyY + h - 2, 6); } ctx.fillStyle = ctx.fillStyle; ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, -6, -4, 5); circle(ctx, 6, -4, 5); ctx.fill(); ctx.fillStyle = '#000'; circle(ctx, -4, -4, 2); circle(ctx, 8, -4, 2); ctx.fill(); ctx.restore(); return; }
  const ggrad = ctx.createLinearGradient(bodyX, bodyY, bodyX, bodyY+h); ggrad.addColorStop(0, brighten(g.color,0.12)); ggrad.addColorStop(1, darken(g.color,0.12)); ctx.fillStyle = ggrad; roundRect(ctx, bodyX, bodyY, w, h, 6); ctx.fill(); ctx.fillStyle = ggrad; ctx.beginPath(); for(let i=0;i<5;i++){ circle(ctx, bodyX + (i+0.5)*(w/5), bodyY + h - 2, 6); } ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, -6, -4, 5); circle(ctx, 6, -4, 5); ctx.fill(); ctx.fillStyle = '#000'; circle(ctx, -4, -4, 2); circle(ctx, 8, -4, 2); ctx.fill(); ctx.restore(); }

function brighten(hex, amt){ const c = hexToRgb(hex); c.r = Math.min(255, c.r + 255*amt); c.g = Math.min(255, c.g + 255*amt); c.b = Math.min(255, c.b + 255*amt); return rgbToHex(c); }
function darken(hex, amt){ const c = hexToRgb(hex); c.r = Math.max(0, c.r - 255*amt); c.g = Math.max(0, c.g - 255*amt); c.b = Math.max(0, c.b - 255*amt); return rgbToHex(c); }
function hexToRgb(hex){ const s = hex.replace('#',''); return {r: parseInt(s.substring(0,2),16), g: parseInt(s.substring(2,4),16), b: parseInt(s.substring(4,6),16)}; }
function rgbToHex(c){ return '#' + [c.r,c.g,c.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''); }

let audioCtx = null;
function beep(){ if(!SOUND) return; ensureAudio(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.type='sine'; o.frequency.value=520; g.gain.value=0.06; o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.06); }
function powerSound(){ if(!SOUND) return; ensureAudio(); const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='sawtooth'; o.frequency.value=260; g.gain.value=0.08; o.connect(g); g.connect(audioCtx.destination); o.start(); o.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime+0.4); o.stop(audioCtx.currentTime+0.5); }
function eatGhostSound(){ if(!SOUND) return; ensureAudio(); const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='square'; o.frequency.value=660; g.gain.value=0.08; o.connect(g); g.connect(audioCtx.destination); o.start(); o.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime+0.14); o.stop(audioCtx.currentTime+0.2); }
function deathSound(){ if(!SOUND) return; ensureAudio(); const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='sawtooth'; o.frequency.value=150; g.gain.value=0.12; o.connect(g); g.connect(audioCtx.destination); o.start(); o.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime+0.6); o.stop(audioCtx.currentTime+0.7); }
function winSound(){ if(!SOUND) return; ensureAudio(); const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='triangle'; o.frequency.value=880; g.gain.value=0.05; o.connect(g); g.connect(audioCtx.destination); o.start(); o.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime+0.4); o.stop(audioCtx.currentTime+0.5); }
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }

overlay.style.display = 'flex'; menu.style.display = 'block'; render();
