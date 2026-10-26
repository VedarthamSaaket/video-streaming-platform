#!/usr/bin/env node
const autocannon = require('autocannon');

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const baseUrl = arg('url', process.env.BASE_URL || 'http://localhost:30080').replace(/\/$/, '');
const connections = Number.parseInt(arg('connections', '100'), 10);
const duration = Number.parseInt(arg('duration', '60'), 10);
const rangeSize = Number.parseInt(arg('range-size', String(256 * 1024)), 10);
const pipeline = Number.parseInt(arg('pipelining', '1'), 10);

async function pickVideo() {
  const response = await fetch(`${baseUrl}/api/videos?limit=1`);
  if (!response.ok) {
    throw new Error(`Unable to list videos: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data.items.length) {
    throw new Error('No videos found. Run scripts/seed.sh first.');
  }
  return data.items[0];
}

async function main() {
  const video = await pickVideo();
  const url = `${baseUrl}/api/videos/${video.id}/stream`;

  console.log(`Target      : ${url}`);
  console.log(`Connections : ${connections}`);
  console.log(`Duration    : ${duration}s`);
  console.log(`Range       : bytes=0-${rangeSize - 1}`);
  console.log('');

  const result = await autocannon({
    url,
    connections,
    duration,
    pipelining: pipeline,
    headers: {
      Range: `bytes=0-${rangeSize - 1}`,
    },
  });

  console.log(autocannon.printResult(result));

  const summary = {
    requests: result.requests.total,
    throughputMB: Number((result.throughput.total / 1024 / 1024).toFixed(1)),
    requestsPerSecond: result.requests.average,
    latencyP99Ms: result.latency.p99,
    errors: result.errors,
    non2xx: result.non2xx,
    timeouts: result.timeouts,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
