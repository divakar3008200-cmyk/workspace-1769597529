// Afterlight — Story Survival Demo
// Simple story-driven survival with animated UI.

const state = {
  day: 0,
  health: 100,
  hunger: 0,
  morale: 80,
  supplies: 3,
  survived: 0,
  best: parseInt(localStorage.getItem('afterlight_best')||'0',10)
};

// DOM
const startBtn = document.getElementById('startBtn');
const infoBtn = document.getElementById('infoBtn');
const choicesEl = document.getElementById('choices');
const sceneText = document.getElementById('sceneText');
const dayEl = document.getElementById('day');
const healthBar = document.querySelector('#healthBar span');
const hungerBar = document.querySelector('#hungerBar span');
const moralBar = document.querySelector('#moralBar span');
const healthVal = document.getElementById('healthVal');
const hungerVal = document.getElementById('hungerVal');
const moralVal = document.getElementById('moralVal');
const suppliesEl = document.getElementById('supplies');
const survivedEl = document.getElementById('survived');
const bestEl = document.getElementById('best');
const restBtn = document.getElementById('restBtn');
const scavengeBtn = document.getElementById('scavengeBtn');
const fortifyBtn = document.getElementById('fortifyBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const restartBtn = document.getElementById('restartBtn');

let busy = false;

startBtn.addEventListener('click', startGame);
infoBtn.addEventListener('click', ()=>alert('Survive day by day. Choose actions to manage your health, hunger and morale. If health reaches 0 you die.'));
restBtn.addEventListener('click', ()=>takeAction('rest'));
scavengeBtn.addEventListener('click', ()=>takeAction('scavenge'));
fortifyBtn.addEventListener('click', ()=>takeAction('fortify'));
saveBtn.addEventListener('click', saveGame);
loadBtn.addEventListener('click', loadGame);
restartBtn.addEventListener('click', ()=>{ if(confirm('Restart current run?')) startGame(); });

function startGame(){
  // reset
  state.day = 1; state.health = 100; state.hunger = 0; state.morale = 80; state.supplies = 3; state.survived = 0;
  updateUI();
  narrateIntro();
}

function narrateIntro(){
  setScene(`You wake to a sky bruised with ash. The world after the blaze is quiet — broken structures, distant smoke. You are alone, but alive. Supplies are limited. Every choice matters.`);
  setTimeout(()=>renderChoices(defaultChoices()), 900);
}

function setScene(text){
  sceneText.textContent = '';
  typeWriter(text, sceneText);
}

function typeWriter(text, node, i=0){
  if(i < text.length){
    node.textContent += text.charAt(i);
    setTimeout(()=>typeWriter(text,node,i+1), 12 + Math.random()*20);
  }
}

function renderChoices(list){
  choicesEl.innerHTML = '';
  list.forEach(ch=>{
    const b = document.createElement('div');
    b.className = 'choice';
    if(ch.disabled) b.classList.add('disabled');
    b.innerHTML = `<div><strong>${ch.title}</strong></div><div class=muted>${ch.desc}</div>`;
    b.addEventListener('click', ()=>{ if(!ch.disabled && !busy){ ch.fn(); } });
    choicesEl.appendChild(b);
  });
}

function defaultChoices(){
  return [
    {title: 'Scavenge Nearby', desc: 'Search ruined stores and yards for food and tools. Risky but rewarding.', fn: ()=>takeAction('scavenge')},
    {title: 'Rest at Shelter', desc: 'Consume time to recover health and morale.', fn: ()=>takeAction('rest')},
    {title: 'Fortify Camp', desc: 'Use supplies to improve defenses and morale.', fn: ()=>takeAction('fortify'), disabled: state.supplies<=0}
  ];
}

function takeAction(action){
  if(busy) return; busy=true; pulse();
  // small animation: temporarily disable
  setTimeout(()=>busy=false, 700);

  if(action==='rest'){
    setScene('You close your eyes and let the world still. For a few hours you feel safe enough to breathe.');
    // effects
    state.health = Math.min(100, state.health + 12);
    state.hunger = Math.min(100, state.hunger + 8);
    state.morale = Math.min(100, state.morale + 6);
    state.day++; state.survived++;
  } else if(action==='scavenge'){
    setScene('You step out into the ash. The day smells of metal and rain. You move carefully, eyes peeled.');
    // random outcome
    const roll = Math.random();
    if(roll < 0.55){
      const found = 1 + Math.floor(Math.random()*3);
      state.supplies += found;
      state.hunger = Math.min(100, state.hunger + 12);
      state.morale = Math.min(100, state.morale + 2);
      setTimeout(()=>setScene(`You found ${found} supply${found>1?'ies':''}! It helps, but the trip took its toll.`), 500);
    } else if(roll < 0.8){
      // minor injury
      state.health = Math.max(0, state.health - 12);
      state.hunger = Math.min(100, state.hunger + 14);
      setTimeout(()=>setScene('A collapsed beam grazed you — minor injury. Keep moving carefully.'), 500);
    } else {
      // big find
      const found = 3 + Math.floor(Math.random()*4);
      state.supplies += found;
      state.morale = Math.min(100, state.morale + 10);
      state.hunger = Math.min(100, state.hunger + 8);
      setTimeout(()=>setScene(`A small cache hidden under rubble — you found ${found} supplies! Hope returns.`), 500);
    }
    state.day++; state.survived++;
  } else if(action==='fortify'){
    if(state.supplies <= 0){ setScene('You have no supplies to fortify with.'); busy=false; return; }
    setScene('You spend time reinforcing your shelter. The walls hold, for now.');
    state.supplies = Math.max(0, state.supplies - 1);
    state.morale = Math.min(100, state.morale + 8);
    state.hunger = Math.min(100, state.hunger + 6);
    state.day++; state.survived++;
  }

  // after action, random event
  setTimeout(()=>{
    randomEvent();
    // passive effects each day
    state.hunger = Math.min(100, state.hunger + 6);
    if(state.hunger > 80) state.health = Math.max(0, state.health - 10);
    if(state.morale < 30) state.health = Math.max(0, state.health - 6);
    // cap values
    state.health = Math.min(100, Math.max(0, state.health));
    state.morale = Math.min(100, Math.max(0, state.morale));

    updateUI();
    checkEnd();
    renderChoices(defaultChoices());
  }, 900);
}

function randomEvent(){
  // small chance of special events
  const r = Math.random();
  if(r < 0.12){
    // raider attack
    setScene('Shouts in the distance — raiders near. You frantically prepare for an encounter.');
    if(state.supplies > 0){
      // can trade supplies to avoid harm
      const lost = 1;
      state.supplies = Math.max(0, state.supplies - lost);
      state.morale = Math.max(0, state.morale - 6);
      setTimeout(()=>setScene('You bartered a few supplies and escaped with bruises.'), 700);
    } else {
      state.health = Math.max(0, state.health - 20);
      state.morale = Math.max(0, state.morale - 12);
      setTimeout(()=>setScene('You were caught off-guard and suffered injuries.'), 700);
    }
  } else if(r < 0.22){
    // weather - shelter helps
    setScene('A sudden ashstorm rolls in. You huddle and wait it out.');
    state.morale = Math.max(0, state.morale - 4);
    state.hunger = Math.min(100, state.hunger + 4);
    setTimeout(()=>setScene('The storm passes. The world is quieter and colder.'), 700);
  } else if(r < 0.28){
    // find food lying around
    setScene('A half-spoiled can of food sits under a tarp. It might be questionable but it is food.');
    const gain = 1;
    state.supplies += gain;
    state.morale = Math.min(100, state.morale + 4);
    setTimeout(()=>setScene('You managed to salvage some food. Small victories.'), 700);
  }
}

function checkEnd(){
  if(state.health <= 0){
    endGame();
    return;
  }
  // tally survived days
  if(state.survived > state.best) state.best = state.survived;
}

function endGame(){
  setScene(`You did all you could. After ${state.survived} day${state.survived!==1?'s':''}, your journey ends.`);
  // save best
  localStorage.setItem('afterlight_best', String(state.best));
  // show choices to restart
  setTimeout(()=>{
    renderChoices([
      {title:'Try Again', desc:'Start a new run and see how long you can survive.', fn: startGame},
      {title:'Save Score', desc:'Save your performance locally.', fn: ()=>{ localStorage.setItem('afterlight_last', JSON.stringify(state)); alert('Saved.'); }}
    ]);
  }, 900);
}

function updateUI(){
  dayEl.textContent = state.day;
  healthBar.style.width = (state.health)+'%';
  hungerBar.style.width = (state.hunger)+'%';
  moralBar.style.width = (state.morale)+'%';
  healthVal.textContent = Math.round(state.health);
  hungerVal.textContent = Math.round(state.hunger);
  moralVal.textContent = Math.round(state.morale);
  suppliesEl.textContent = state.supplies;
  survivedEl.textContent = state.survived;
  bestEl.textContent = state.best;
}

function pulse(){
  // tiny pulse on HUD
  const h = document.querySelector('.hud');
  h.classList.add('pulse');
  setTimeout(()=>h.classList.remove('pulse'), 600);
}

function saveGame(){
  localStorage.setItem('afterlight_save', JSON.stringify(state));
  alert('Game saved to localStorage.');
}
function loadGame(){
  const s = localStorage.getItem('afterlight_save');
  if(!s){ alert('No save found.'); return; }
  const loaded = JSON.parse(s);
  Object.assign(state, loaded);
  updateUI();
  setScene('Loaded saved run. Continue your journey.');
  renderChoices(defaultChoices());
}

// init UI state
updateUI();
setScene('Welcome to Afterlight. Click New Game to begin.');
renderChoices(defaultChoices());
