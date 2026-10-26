# StreamVault

A production-shaped video streaming platform deployed with Docker and Kubernetes.

StreamVault stores video metadata in MongoDB and the video bytes in MongoDB GridFS, so every API
replica is stateless. NGINX sits at the edge, load balances across the API pods, streams byte ranges
without buffering, and applies upload rate limits. Kubernetes runs three API replicas by default and
scales them horizontally with a CPU based HorizontalPodAutoscaler.

```
Internet -> NGINX (2 replicas) -> API pods (3-12 replicas) -> MongoDB (GridFS)
```

## Why this project

The course project had to demonstrate container orchestration, load balancing and scalability. A
video platform is a natural fit: uploads are write heavy, playback is read heavy, range requests must
survive the proxy layer, and traffic spikes should add pods instead of dropping requests.

## What is included

| Area | Implementation |
|---|---|
| Application | Node.js 22, Express, Mongoose, Zod validation, Pino structured logs |
| Media | MongoDB GridFS, HTTP Range requests, `206 Partial Content`, inline playback |
| Edge | NGINX reverse proxy, dynamic DNS resolution, byte-range passthrough, upload rate limiting |
| Containers | Multi-stage Dockerfile, non-root user, healthcheck, `.dockerignore` |
| Local stack | Docker Compose with MongoDB, three API replicas and NGINX |
| Kubernetes | Kustomize base + local/cloud overlays, StatefulSet, Deployments, HPA, PDB, NetworkPolicy |
| Reliability | Startup, readiness and liveness probes, graceful shutdown, preStop hooks, rolling updates |
| Security | Non-root pods, read-only root filesystem, dropped capabilities, seccomp, secrets, no API token |
| Observability | Prometheus metrics, ServiceMonitor, alert rules, Grafana dashboard |
| Testing | 43 Jest tests, Supertest integration tests, MongoDB memory server, range request assertions |
| Delivery | GitHub Actions: lint, test, manifest validation, image build, Trivy scan, GHCR push, kind e2e |
| Load testing | Autocannon script with HPA watch mode |

## Quick start with Docker Compose

```bash
cp .env.example .env
make compose-up
```

Open <http://localhost:8080>. The Compose stack runs three API replicas behind NGINX. Upload a video
and play it; the browser will issue range requests and the API will answer with `206`.

```bash
make smoke
make load
```

## Quick start on Kubernetes (kind)

Requirements: Docker, kind, kubectl, Node.js 22, ffmpeg.

```bash
make kind-up      # 1 control plane + 2 workers, metrics-server, local-path storage
make deploy       # build the image, load it, apply the local overlay
make seed         # upload a generated 20 second test video
make smoke        # health, upload, range request, load balancing, cleanup
```

Open <http://localhost:30080>.

Watch autoscaling:

```bash
make hpa
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Liveness probe |
| GET | `/readyz` | Readiness probe, checks MongoDB and GridFS |
| GET | `/health` | Detailed instance health |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/videos` | List videos (`page`, `limit`, `search`) |
| POST | `/api/videos` | Upload a video (`multipart/form-data`, field `file`) |
| GET | `/api/videos/:id` | Video metadata |
| PATCH | `/api/videos/:id` | Update title, description or uploader |
| DELETE | `/api/videos/:id` | Delete metadata and GridFS file |
| GET | `/api/videos/:id/stream` | Stream with Range support |
| GET | `/api/videos/:id/download` | Download as attachment |
| GET | `/api/stats` | Library totals and serving instance |

Full contract: [`docs/openapi.yaml`](docs/openapi.yaml).

## Demo video

```bash
bash scripts/generate-sample.sh   # 20s 720p test pattern, ~2 MB
bash scripts/seed.sh
```

## Environment variables

| Name | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `MONGODB_URI` | localhost | Mongo connection string |
| `MONGODB_DB` | `streamvault` | Database name |
| `MEDIA_BUCKET` | `media` | GridFS bucket |
| `INSTANCE_ID` | hostname | Value returned in `X-Served-By` |
| `MAX_UPLOAD_BYTES` | `209715200` | Upload limit |
| `LOG_LEVEL` | `info` | Pino log level |
| `UPLOAD_RATE_MAX` | `60` | Uploads per window per IP |

## Project layout

```
src/
  app.js                 Express app, middleware chain
  server.js              HTTP server, Mongo retry, graceful shutdown
  controllers/           Upload, list, stream, stats
  middleware/            Request context, upload, errors
  models/Video.js        Mongoose schema and indexes
  routes/                Health, videos, stats
  storage/               GridFS storage driver
  utils/                 Range parser, validation, errors
public/                  Dark streaming UI
tests/                   Unit and integration tests
k8s/base/                Namespaced production-shaped manifests
k8s/overlays/local/      kind overlay (NodePort 30080, local-path)
k8s/overlays/cloud/      GHCR image, LoadBalancer, Ingress, gp3
k8s/observability/       ServiceMonitor, PrometheusRule, Grafana dashboard
scripts/                 Cluster, deploy, smoke, load, HPA and sample scripts
docs/                    Architecture, autoscaling, runbook, demo script, API spec
```

## Documentation

- [Architecture](docs/architecture.md)
- [Autoscaling and load balancing](docs/autoscaling.md)
- [Operations runbook](docs/runbook.md)
- [Demo script](docs/demo-script.md)
- [Observability](docs/observability.md)

## Screenshots

Real output captures from the local kind cluster and the CI pipeline live in
[`docs/screenshots/`](docs/screenshots/). They cover the test suite, container stack, upload and range
requests, pod placement, HPA scale-up, load test results and the GitHub Actions run.

## License

MIT. The sample video is generated locally with ffmpeg and is not committed.
