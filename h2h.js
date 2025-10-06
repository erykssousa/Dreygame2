/* Simple Elo constants */
const K = 32, DEFAULT_ELO = 1500;

/* ---------- bootstrap ---------- */
const playlist = window.PLAYLIST;
const storageKey = 'h2h_state';
let state = JSON.parse(localStorage.getItem(storageKey)) || initState();

function initState(){
  const pairs = [];
  for(let i=0;i<playlist.length;i++)
    for(let j=i+1;j<playlist.length;j++)
      pairs.push([playlist[i].id, playlist[j].id]);
  return {
    elos: Object.fromEntries(playlist.map(t=>[t.id, DEFAULT_ELO])),
    remaining: pairs.sort(()=>Math.random()-.5),
    done: []
  };
}

/* ---------- audio helpers ---------- */
const preview = new Audio();
function playPreview(id){
  const file = playlist.find(t=>t.id===id).file;
  preview.src = `previews/${file}`;
  preview.play();
}

/* ---------- UI ---------- */
const arena = document.getElementById('arena');
const bar   = document.getElementById('bar');
const result= document.getElementById('result');

function render(){
  bar.max = state.done.length + state.remaining.length;
  bar.value = state.done.length;
  if(!state.remaining.length) return showRanking();
  const [a,b] = state.remaining[0];
  arena.innerHTML = `
    <div class="card" onclick="vote(${a},${b})">
      <img src="https://via.placeholder.com/240x240/0ff/000?text=${a}" alt="">
      <h3>${titleOf(a)}</h3>
      <button class="preview-btn" onclick="event.stopPropagation();playPreview(${a})">▶ preview</button>
    </div>
    <div class="card" onclick="vote(${b},${a})">
      <img src="https://via.placeholder.com/240x240/f0f/000?text=${b}" alt="">
      <h3>${titleOf(b)}</h3>
      <button class="preview-btn" onclick="event.stopPropagation();playPreview(${b})">▶ preview</button>
    </div>`;
}
function titleOf(id){ return playlist.find(t=>t.id===id).title; }

function vote(winner, loser){
  updateElo(winner, loser);
  state.done.push(state.remaining.shift());
  save();
  render();
}
function updateElo(w, l){
  const Ra = state.elos[w], Rb = state.elos[l];
  const Ea = 1/(1+10**((Rb-Ra)/400));
  const Eb = 1-Ea;
  state.elos[w] = Ra + K*(1-Ea);
  state.elos[l] = Rb + K*(0-Eb);
}
function save(){
  localStorage.setItem(storageKey, JSON.stringify(state));
}
function showRanking() {
  const sorted = playlist.slice().sort((x,y)=>state.elos[y.id]-state.elos[x.id]);
  arena.style.display = 'none';
  result.innerHTML = '<h2>Ranking final</h2><p>A enviar resultado...</p>';

  const nome = prompt("O teu nome?");

// ---------- envio JSONP (sem CORS) ----------
const cb = 'cb' + Date.now();
const script = document.createElement('script');
script.src = `https://script.google.com/macros/s/AKfycby8_b1RxjQoy0lgOx9fQ0S0ZFpJj9AX7R5A0-vgHbqpjQUA7qaeCJQfHSsxWtRwI2cUqQ/exec?jsonp=${cb}&nome=${encodeURIComponent(nome)}&data=${encodeURIComponent(JSON.stringify(state.elos))}`;
window[cb] = function(res){
  console.log('✅ Guardado na spreadsheet:', res);
  result.innerHTML = `
    <h2>Obrigado, ${nome}!</h2>
    <p>O teu resultado foi enviado automaticamente 💾</p>
    <button onclick="resetGame()">Jogar de novo</button>
  `;
  delete window[cb];
  document.head.removeChild(script);
};
script.onerror = () => {
  result.innerHTML = `
    <h2>Oops!</h2>
    <p>Falhou o envio — tenta outra vez mais tarde.</p>
    <button onclick="resetGame()">Jogar de novo</button>
  `;
};
document.head.appendChild(script);


  .then(()=> {
    result.innerHTML = `
      <h2>Obrigado, ${nome}!</h2>
      <p>O teu resultado foi enviado automaticamente 💾</p>
      <button onclick="resetGame()">Jogar de novo</button>
    `;
  })
  .catch(()=>{
    result.innerHTML = `
      <h2>Oops!</h2>
      <p>Falhou o envio — tenta outra vez mais tarde.</p>
      <button onclick="resetGame()">Jogar de novo</button>
    `;
  });
}

const params = new URLSearchParams(location.search);
if (params.has('result')) {
  const decoded = decodeURIComponent(params.get('result'));
  document.body.innerHTML = `
    <h2>Resultado recebido</h2>
    <pre style="white-space:pre-wrap;background:#111;padding:1rem;border-radius:8px">${decoded}</pre>
    <p>Obrigado por jogar 💿</p>
  `;
} else {
  render();
}

render();



