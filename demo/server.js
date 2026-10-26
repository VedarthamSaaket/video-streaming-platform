const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

const PORT = Number(process.env.DEMO_PORT || 8099);
const APP_PORT = Number(process.env.DEMO_APP_PORT || 8098);
const TARGET = process.env.STREAMVAULT_URL || 'http://localhost:30080';
const NAMESPACE = 'streamvault';
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const streams = new Map();
const load = { running: false, startedAt: null, seconds: 0, result: null, child: null };
let totals = { requests: 0, bytes: 0 };
const lifetime = { requests: 0, bytes: 0 };

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 16 * 1024 * 1024, timeout: 15000 }, (error, stdout) => {
      resolve(error ? '' : stdout);
    });
  });
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function role(name) {
  if (name.startsWith('streamvault-app')) return 'api';
  if (name.startsWith('streamvault-nginx')) return 'nginx';
  if (name.startsWith('mongo')) return 'mongo';
  return 'other';
}

async function cluster() {
  const [podsRaw, hpaRaw, topRaw, nodesRaw] = await Promise.all([
    run('kubectl', ['-n', NAMESPACE, 'get', 'pods', '-o', 'json']),
    run('kubectl', ['-n', NAMESPACE, 'get', 'hpa', '-o', 'json']),
    run('kubectl', ['-n', NAMESPACE, 'top', 'pods', '--no-headers']),
    run('kubectl', ['get', 'nodes', '-o', 'json']),
  ]);
  const cpu = {};
  for (const line of topRaw.trim().split('\n')) {
    const [name, cores, memory] = line.trim().split(/\s+/);
    if (name) cpu[name] = { cores, memory };
  }
  const pods = podsRaw
    ? JSON.parse(podsRaw).items
        .filter((pod) => pod.metadata.ownerReferences?.[0]?.kind !== 'Job')
        .map((pod) => {
          const statuses = pod.status.containerStatuses || [];
          const ready = statuses.length > 0 && statuses.every((s) => s.ready);
          const waiting = statuses.find((s) => s.state?.waiting)?.state.waiting.reason;
          return {
            name: pod.metadata.name,
            role: role(pod.metadata.name),
            node: pod.spec.nodeName || 'unscheduled',
            phase: pod.metadata.deletionTimestamp ? 'Terminating' : waiting || pod.status.phase,
            ready,
            image: pod.spec.containers[0].image,
            cpu: cpu[pod.metadata.name]?.cores || null,
            memory: cpu[pod.metadata.name]?.memory || null,
          };
        })
    : [];
  const hpa = hpaRaw
    ? JSON.parse(hpaRaw).items.map((item) => ({
        name: item.metadata.name,
        min: item.spec.minReplicas,
        max: item.spec.maxReplicas,
        target: item.spec.metrics?.[0]?.resource?.target?.averageUtilization,
        cpu: item.status.currentMetrics?.[0]?.resource?.current?.averageUtilization ?? null,
        replicas: item.status.currentReplicas,
        desired: item.status.desiredReplicas,
      }))
    : [];
  const nodes = nodesRaw
    ? JSON.parse(nodesRaw).items.map((node) => ({
        name: node.metadata.name,
        role: node.metadata.labels['node-role.kubernetes.io/control-plane'] !== undefined ? 'control-plane' : 'worker',
        version: node.status.nodeInfo.kubeletVersion,
        runtime: node.status.nodeInfo.containerRuntimeVersion,
      }))
    : [];
  return { pods, hpa, nodes, at: Date.now() };
}

async function containers() {
  const raw = await run('docker', ['ps', '--format', '{{json .}}']);
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((c) => ({ name: c.Names, image: c.Image, status: c.Status, ports: c.Ports }));
}

async function burst(count) {
  const tally = {};
  await Promise.all(
    Array.from({ length: count }, async () => {
      try {
        const response = await fetch(`${TARGET}/healthz`, { cache: 'no-store' });
        const body = await response.json();
        tally[body.instance] = (tally[body.instance] || 0) + 1;
      } catch (_error) {
        tally.failed = (tally.failed || 0) + 1;
      }
    })
  );
  return tally;
}

function proxyStream(req, res, id, tile) {
  const upstream = http.request(
    `${TARGET}/api/videos/${id}/stream`,
    { method: 'GET', headers: req.headers.range ? { range: req.headers.range } : {} },
    (up) => {
      const pod = up.headers['x-served-by'] || 'unknown';
      streams.set(tile, { pod, status: up.statusCode, range: up.headers['content-range'] || 'full', at: Date.now() });
      totals.requests += 1;
      lifetime.requests += 1;
      const headers = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range' };
      for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        if (up.headers[key]) headers[key] = up.headers[key];
      }
      res.writeHead(up.statusCode, headers);
      up.on('data', (chunk) => {
        totals.bytes += chunk.length;
        lifetime.bytes += chunk.length;
      });
      up.pipe(res);
    }
  );
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.on('close', () => upstream.destroy());
  upstream.end();
}

function startLoad(seconds, connections) {
  if (load.running) return;
  load.running = true;
  load.startedAt = Date.now();
  load.seconds = seconds;
  load.result = null;
  let output = '';
  load.child = spawn(
    process.execPath,
    [path.join(ROOT, 'scripts/load-test.js'), '--url', TARGET, '--duration', String(seconds), '--connections', String(connections)],
    { cwd: ROOT }
  );
  load.child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  load.child.on('close', () => {
    const match = output.match(/\{[\s\S]*"requests"[\s\S]*\}/);
    try {
      load.result = match ? JSON.parse(match[0]) : null;
    } catch (_error) {
      load.result = null;
    }
    load.running = false;
    load.child = null;
  });
}

function serveFile(res, file) {
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC) || !fs.existsSync(full)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(full).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/api/videos') {
      const response = await fetch(`${TARGET}/api/videos?limit=50`);
      return json(res, response.status, await response.json());
    }
    if (url.pathname.startsWith('/media/')) {
      const id = url.pathname.split('/')[2];
      return proxyStream(req, res, id, url.searchParams.get('tile') || '0');
    }
    if (url.pathname === '/api/streams') {
      return json(res, 200, { tiles: Object.fromEntries(streams), totals, lifetime });
    }
    if (url.pathname === '/api/streams/reset' && req.method === 'POST') {
      streams.clear();
      totals = { requests: 0, bytes: 0 };
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/cluster') return json(res, 200, await cluster());
    if (url.pathname === '/api/containers') return json(res, 200, { containers: await containers() });
    if (url.pathname === '/api/burst') {
      const count = Math.min(Number(url.searchParams.get('n') || 60), 300);
      return json(res, 200, { count, tally: await burst(count) });
    }
    if (url.pathname === '/api/load' && req.method === 'POST') {
      startLoad(Number(url.searchParams.get('seconds') || 90), Number(url.searchParams.get('connections') || 120));
      return json(res, 202, { running: true });
    }
    if (url.pathname === '/api/load') {
      return json(res, 200, {
        running: load.running,
        elapsed: load.startedAt ? Math.round((Date.now() - load.startedAt) / 1000) : 0,
        seconds: load.seconds,
        result: load.result,
      });
    }
    return serveFile(res, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
});

const appProxy = http.createServer((req, res) => {
  const upstream = http.request(`${TARGET}${req.url}`, { method: req.method, headers: req.headers }, (up) => {
    const headers = { ...up.headers };
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    res.writeHead(up.statusCode, headers);
    up.pipe(res);
  });
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
});

appProxy.listen(APP_PORT);

server.listen(PORT, () => {
  console.log(`StreamVault live demo on http://localhost:${PORT} (cluster ${TARGET})`);
});

function shutdown() {
  if (load.child) load.child.kill();
  appProxy.close();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
