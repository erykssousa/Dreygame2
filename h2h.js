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
     <div style="font-size:3rem;color:#fff">${a}</div>
      <h3>${titleOf(a)}</h3>
      <button class="preview-btn" onclick="event.stopPropagation();playPreview(${a})">▶ preview</button>
    </div>
    <div class="card" onclick="vote(${b},${a})">
    <div style="font-size:3rem;color:#fff">${b}</div>
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
  arena.style.display = 'none';
  const sorted = playlist.slice().sort((x, y) => state.elos[y.id] - state.elos[x.id]);

  let html = `<h2>O teu ranking final</h2><ol>`;
  sorted.forEach(t => {
    html += `<li>${t.title} – ${Math.round(state.elos[t.id])} pts</li>`;
  });
  html += `</ol>
  <button id="sendBtn">Enviar resultado</button>
  <button onclick="resetGame()">Jogar de novo (sem enviar)</button>`;
  result.innerHTML = html;

  // ---------- só envia quando clicar no botão ----------
  document.getElementById('sendBtn').onclick = () => {
    const nome = prompt("Nome para o ranking:");
    if (!nome) return;
    result.innerHTML = '<p>A enviar...</p>';

    const cb = 'cb' + Date.now();
    const script = document.createElement('script');
    script.src = `https://script.google.com/macros/s/AKfycbywYVEJtimYiP3HAzq8Ad9Y7JUmLeW3kBqiKfw4pewkbsU3fRumLlsbfkbPaY81XJxtsQ/exec?jsonp=${cb}&nome=${encodeURIComponent(nome)}&data=${encodeURIComponent(JSON.stringify(state.elos))}`;
    window[cb] = function (res) {
      console.log('✅ Guardado:', res);
      result.innerHTML = `<h2>Obrigado, ${nome}!</h2><p>Resultado enviado 💾</p>`;

      // ---------- pede ranking global ----------
      const cb2 = 'global' + Date.now();
      const script2 = document.createElement('script');
      script2.src = `https://script.google.com/macros/s/AKfycbywYVEJtimYiP3HAzq8Ad9Y7JUmLeW3kBqiKfw4pewkbsU3fRumLlsbfkbPaY81XJxtsQ/exec?ranking=1&callback=${cb2}`; 
      window[cb2] = function (top) {
      console.log('Ranking recebido:', top);
      let tbl = '<h3>Ranking Global (Top 30)</h3><ol>';
      top.forEach((m, i) => tbl += `<li>${m.title} – ${m.pts} pts</li>`);
      tbl += '</ol>';
      result.innerHTML += tbl;
      delete window[cb2];
      document.head.removeChild(script2);
      };
      script2.onerror = () => {
        result.innerHTML += `<p>Erro ao carregar ranking global.</p>`;
      };
      document.head.appendChild(script2);
    };
    script.onerror = () => {
      result.innerHTML = `<h2>Erro</h2><p>Falhou o envio — tenta mais tarde.</p>`;
    };
    document.head.appendChild(script);
  };
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
function resetGame(){
  localStorage.removeItem(storageKey);
  location.reload();
}
render();






