const MEDIA = `http://127.0.0.1:${location.port}`;
const $ = (id) => document.getElementById(id);

const state = {
  act: 0,
  videos: [],
  timers: [],
  tour: false,
  tourTimer: null,
  lastSolo: 0,
  servingPods: new Set(),
  history: [],
  maxPods: 0,
};

async function get(path, options) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  return response.json();
}

function short(pod) {
  if (!pod) return '–';
  const parts = pod.split('-');
  return parts.length > 2 ? `${parts[1]}-${parts[parts.length - 1]}` : pod;
}

function every(ms, fn) {
  fn();
  state.timers.push(setInterval(fn, ms));
}

function clearTimers() {
  state.timers.forEach(clearInterval);
  state.timers = [];
}

function media(video, tile) {
  return `${MEDIA}/media/${video.id}?tile=${tile}`;
}

function stopVideos() {
  document.querySelectorAll('video').forEach((v) => {
    v.pause();
    v.removeAttribute('src');
    v.load();
  });
}

async function cover() {
  const [cluster, videos] = await Promise.all([get('/api/cluster'), get('/api/videos')]);
  $('c-nodes').textContent = cluster.nodes.length;
  $('c-api').textContent = cluster.pods.filter((p) => p.role === 'api' && p.ready).length;
  $('c-nginx').textContent = cluster.pods.filter((p) => p.role === 'nginx' && p.ready).length;
  $('c-videos').textContent = videos.total;
}

function actApp() {
  $('app-frame').src = `http://localhost:8098/?t=${Date.now()}`;
}

function actSolo() {
  const video = $('solo-video');
  $('solo-log').replaceChildren();
  state.lastSolo = 0;
  const pick = state.videos.find((v) => v.title === 'Mandelbrot zoom') || state.videos[0];
  video.src = media(pick, 'solo');
  video.play().catch(() => {});
  let probes = 0;
  every(1800, () => {
    if (probes >= 6) return;
    probes += 1;
    const start = Math.floor(Math.random() * Math.max(pick.sizeBytes - 65536, 1));
    fetch(media(pick, 'solo'), { headers: { Range: `bytes=${start}-${start + 65535}` } }).then((r) => r.arrayBuffer());
  });
  every(600, async () => {
    const { tiles } = await get('/api/streams');
    const entry = tiles.solo;
    if (!entry || entry.at === state.lastSolo) return;
    state.lastSolo = entry.at;
    const li = document.createElement('li');
    li.innerHTML = `<b>${entry.status}</b><span>${entry.range}</span><span>served by ${entry.pod}</span>`;
    $('solo-log').prepend(li);
    while ($('solo-log').children.length > 7) $('solo-log').lastChild.remove();
  });
}

function actTiles() {
  const grid = $('tiles');
  grid.replaceChildren();
  state.servingPods = new Set();
  fetch('/api/streams/reset', { method: 'POST' });
  for (let i = 0; i < 6; i += 1) {
    const item = state.videos[i % state.videos.length];
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.innerHTML = `<div class="frame"><video muted playsinline loop></video></div><p><span>${item.title}</span><b id="tile-${i}">waiting</b></p>`;
    grid.append(tile);
    const player = tile.querySelector('video');
    player.src = media(item, `t${i}`);
    player.addEventListener('loadedmetadata', () => {
      player.currentTime = (i * 3) % Math.max(player.duration - 1, 1);
      player.play().catch(() => {});
    });
  }
  every(800, async () => {
    const { tiles, totals } = await get('/api/streams');
    for (let i = 0; i < 6; i += 1) {
      const entry = tiles[`t${i}`];
      if (entry) {
        $(`tile-${i}`).textContent = `${entry.status} · ${short(entry.pod)}`;
        state.servingPods.add(entry.pod);
      }
    }
    $('t-req').textContent = totals.requests.toLocaleString('en-US');
    $('t-mb').textContent = (totals.bytes / 1048576).toFixed(1);
    $('t-pods').textContent = state.servingPods.size;
  });
}

async function burst() {
  const button = $('burst');
  button.disabled = true;
  button.textContent = 'Sending…';
  const { tally, count } = await get('/api/burst?n=120');
  const rows = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((r) => r[1]));
  $('bars').innerHTML = rows
    .map(([pod, n]) => `<div class="bar-row"><span>${pod}</span><i style="width:0"></i><b>${n}</b></div>`)
    .join('');
  requestAnimationFrame(() => {
    $('bars').querySelectorAll('i').forEach((bar, k) => {
      bar.style.width = `${(rows[k][1] / max) * 100}%`;
    });
  });
  button.disabled = false;
  button.textContent = `Send ${count} again`;
}

function pods(list) {
  return list
    .map((p) => {
      const cls = p.ready ? 'ready' : 'pending';
      return `<div class="pod ${cls}"><b>${short(p.name).split('-').pop()}</b>${p.ready ? 'Ready' : p.phase}<br>${p.node.replace('streamvault-', '')}${p.cpu ? ` · ${p.cpu}` : ''}</div>`;
    })
    .join('');
}

function spark() {
  const points = state.history.slice(-60);
  if (points.length < 2) return;
  const step = 400 / (points.length - 1);
  const path = points.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(118 - (v / 12) * 110).toFixed(1)}`).join(' ');
  $('spark').innerHTML = `<path d="${path}" fill="none" stroke="#c48f32" stroke-width="3"/>`;
}

async function startLoad() {
  await fetch('/api/load?seconds=90&connections=120', { method: 'POST' });
}

function actScale() {
  state.history = [];
  const keep = $('keep-video');
  keep.src = media(state.videos[0], 'keep');
  keep.play().catch(() => {});
  if (state.tour) startLoad();
  state.maxPods = 0;
  every(2000, async () => {
    const [cluster, load, streams] = await Promise.all([get('/api/cluster'), get('/api/load'), get('/api/streams')]);
    const app = cluster.hpa.find((h) => h.name === 'streamvault-app');
    const nginx = cluster.hpa.find((h) => h.name === 'streamvault-nginx');
    const api = cluster.pods.filter((p) => p.role === 'api');
    $('pods-api').innerHTML = pods(api);
    $('pods-nginx').innerHTML = pods(cluster.pods.filter((p) => p.role === 'nginx'));
    if (app) {
      const readyApi = api.filter((p) => p.ready).length;
      state.maxPods = Math.max(state.maxPods, readyApi);
      $('g-replicas').textContent = readyApi;
      $('g-cpu').textContent = app.cpu == null ? '–' : `${app.cpu}%`;
      state.history.push(api.filter((p) => p.ready).length);
      spark();
    }
    if (nginx) $('g-nginx').textContent = cluster.pods.filter((p) => p.role === 'nginx' && p.ready).length;
    $('g-load').textContent = load.running ? `${load.elapsed}s / ${load.seconds}s` : load.result ? `${load.result.errors} errors` : 'idle';
    $('load').disabled = load.running;
    if (streams.tiles.keep) $('keep-pod').textContent = streams.tiles.keep.pod;
  });
}

async function actContainers() {
  const [cluster, docker] = await Promise.all([get('/api/cluster'), get('/api/containers')]);
  $('nodes').innerHTML = cluster.nodes
    .map((node) => {
      const here = cluster.pods.filter((p) => p.node === node.name);
      const chips = here.map((p) => `<span class="chip ${p.role}">${p.role} ${short(p.name).split('-').pop()}</span>`).join('');
      return `<div class="node"><h3>${node.name.replace('streamvault-', '')}</h3><p class="meta">${node.role} · ${node.version} · ${node.runtime}</p>${chips || '<span class="chip">system pods only</span>'}</div>`;
    })
    .join('');
  const images = [...new Set(cluster.pods.map((p) => `${p.role}: ${p.image}`))].join(' · ');
  $('docker').innerHTML =
    `<div><b>docker container</b><b>image</b><b>status</b></div>` +
    docker.containers.map((c) => `<div><span>${c.name}</span><span>${c.image}</span><span>${c.status}</span></div>`).join('') +
    `<div><span>pod images</span><span style="grid-column: span 2">${images}</span></div>`;
}

async function actResults() {
  const [load, streams, cluster] = await Promise.all([get('/api/load'), get('/api/streams'), get('/api/cluster')]);
  const ready = cluster.pods.filter((p) => p.role === 'api' && p.ready).length;
  $('r-pods').textContent = Math.max(state.maxPods, ready);
  $('r-req').textContent = load.result ? load.result.requests.toLocaleString('en-US') : load.running ? 'running' : '–';
  $('r-err').textContent = load.result ? load.result.errors : '–';
  $('r-streams').textContent = streams.lifetime.requests.toLocaleString('en-US');
}

const ACTS = [cover, actApp, actSolo, actTiles, () => {}, actScale, actContainers, actResults];

function show(index) {
  state.act = Math.max(0, Math.min(ACTS.length - 1, index));
  clearTimers();
  stopVideos();
  document.querySelectorAll('.act').forEach((el) => el.classList.toggle('active', Number(el.dataset.act) === state.act));
  document.querySelectorAll('#acts button').forEach((el) => el.classList.toggle('on', Number(el.dataset.act) === state.act));
  ACTS[state.act]();
  if (state.tour) scheduleTour();
}

function scheduleTour() {
  clearTimeout(state.tourTimer);
  const next = () => (state.act < ACTS.length - 1 ? show(state.act + 1) : toggleTour(false));
  if (state.act === 7) {
    toggleTour(false);
  } else if (state.act === 4) {
    setTimeout(burst, 800);
    state.tourTimer = setTimeout(next, 11000);
  } else if (state.act === 5) {
    const started = Date.now();
    state.tourTimer = setInterval(async () => {
      const cluster = await get('/api/cluster');
      const ready = cluster.pods.filter((p) => p.role === 'api' && p.ready).length;
      if (ready >= 12 || Date.now() - started > 120000) {
        clearInterval(state.tourTimer);
        state.tourTimer = setTimeout(next, 6000);
      }
    }, 3000);
  } else {
    state.tourTimer = setTimeout(next, [7000, 14000, 16000, 18000, 0, 0, 20000][state.act]);
  }
}

function toggleTour(on) {
  state.tour = on;
  $('tour').classList.toggle('on', on);
  $('tour').textContent = on ? 'Touring…' : 'Auto tour';
  clearTimeout(state.tourTimer);
  clearInterval(state.tourTimer);
  if (on) scheduleTour();
}

document.querySelectorAll('#acts button').forEach((el) => el.addEventListener('click', () => show(Number(el.dataset.act))));
$('prev').addEventListener('click', () => show(state.act - 1));
$('next').addEventListener('click', () => show(state.act + 1));
$('tour').addEventListener('click', () => toggleTour(!state.tour));
$('begin').addEventListener('click', () => {
  state.tour = true;
  $('tour').classList.add('on');
  $('tour').textContent = 'Touring…';
  show(1);
});
$('burst').addEventListener('click', burst);
$('load').addEventListener('click', startLoad);
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') show(state.act + 1);
  if (event.key === 'ArrowLeft') show(state.act - 1);
});

get('/api/videos').then((data) => {
  state.videos = data.items;
  show(0);
  if (new URLSearchParams(location.search).has('auto')) toggleTour(true);
});
