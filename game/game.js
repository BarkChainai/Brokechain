const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const dlg = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const handleInput = document.getElementById('handle');
const submitBtn = document.getElementById('submitBtn');
const top3El = document.getElementById('top3');

let running = false, raf = 0, t = 0, nonce = null;
let bag, pipes, score, gravity, lift, gap, speed, lastSpawn;

async function fetchTop3() {
  try {
    const r = await fetch('/api/top');
    const data = await r.json();
    const list = data.top.slice(0,3).map((e,i)=>`${i+1}) ${e.handle} — ${e.score}`).join('   ');
    top3El.textContent = list || 'No scores yet.';
  } catch {
    top3El.textContent = 'Top-3 unavailable';
  }
}
fetchTop3();

function resetGame() {
  bag = { x: 90, y: canvas.height/2, vy: 0, r: 18 };
  pipes = [];
  score = 0;
  gravity = 0.35;
  lift = -7.5;
  gap = 160;
  speed = 2.8;
  lastSpawn = 0;
  scoreEl.textContent = '0';
}

function flap() {
  if (!running) return;
  bag.vy = lift;
}

function spawnPipe() {
  const min = 80, max = canvas.height - 80 - gap;
  const topH = Math.floor(min + Math.random() * (max - min));
  pipes.push({ x: canvas.width + 20, topH, w: 60 });
}

function update(dt) {
  bag.vy += gravity;
  bag.y += bag.vy;
  if (bag.y < bag.r) {
    bag.y = bag.r;
    bag.vy = 0;
  }
  if (bag.y > canvas.height - bag.r) lose();

  lastSpawn += dt;
  if (lastSpawn > 1400) {
    spawnPipe();
    lastSpawn = 0;
  }
  for (const p of pipes) p.x -= speed;
  while (pipes.length && pipes[0].x + pipes[0].w < -10) pipes.shift();

  for (const p of pipes) {
    const hitX = bag.x + bag.r > p.x && bag.x - bag.r < p.x + p.w;
    const hitTop = bag.y - bag.r < p.topH;
    const hitBot = bag.y + bag.r > p.topH + gap;
    if (hitX && (hitTop || hitBot)) return lose();
    if (!p.passed && p.x + p.w < bag.x) {
      p.passed = true;
      score++;
      scoreEl.textContent = score;
    }
  }
}

function draw() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#0f1016');
  g.addColorStop(.5, '#0b0b10');
  g.addColorStop(1, '#0b0b10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of pipes) {
    ctx.fillStyle = '#1e2230';
    ctx.fillRect(p.x, 0, p.w, p.topH);
    ctx.fillRect(p.x, p.topH + gap, p.w, canvas.height - (p.topH + gap));
    ctx.strokeStyle = '#2a2f40';
    ctx.strokeRect(p.x, 0, p.w, p.topH);
    ctx.strokeRect(p.x, p.topH + gap, p.w, canvas.height - (p.topH + gap));
  }

  ctx.beginPath();
  ctx.arc(bag.x, bag.y, bag.r, 0, Math.PI * 2);
  ctx.fillStyle = '#9c6cff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#2a2440';
  ctx.stroke();

  ctx.font = 'bold 40px system-ui, -apple-system, Segoe UI';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillText(score, canvas.width / 2 + 2, 64 + 2);
  ctx.fillStyle = '#f3f4fa';
  ctx.fillText(score, canvas.width / 2, 64);
}

function loop(ts) {
  if (!running) return;
  if (!t) t = ts;
  const dt = ts - t;
  t = ts;
  update(dt);
  draw();
  raf = requestAnimationFrame(loop);
}

async function start() {
  resetGame();
  try {
    const res = await fetch('/api/start');
    const data = await res.json();
    nonce = data.nonce || null;
  } catch {
    nonce = null;
  }
  running = true;
  t = 0;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function lose() {
  running = false;
  cancelAnimationFrame(raf);
  finalScoreEl.textContent = String(score);
  if (!dlg.open) dlg.showModal();
}

async function submitScore() {
  const raw = (handleInput.value || '').trim();
  const handle = sanitizeHandle(raw);
  if (!handle) return dlg.close();
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle, score, nonce })
    });
    await res.json();
    await fetchTop3();
  } catch (e) {}
  dlg.close();
}

function sanitizeHandle(s) {
  s = s.replace(/[^\w@.-]/g, '').slice(0, 24);
  if (!s) return null;
  return s.startsWith('@') ? s : s;
}

startBtn.addEventListener('click', start);
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') flap();
});
canvas.addEventListener('pointerdown', flap);
submitBtn.addEventListener('click', e => {
  e.preventDefault();
  submitScore();
});
document.getElementById('closeBtn').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => {
  /* idle */
});
