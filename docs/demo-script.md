# Demo script

A 12 minute walkthrough for the review. Every command below produces real output on the lab machine.

## 0. Before the review

```bash
cd ~/development/video-streaming-platform
make kind-up
make deploy
bash scripts/generate-sample.sh
bash scripts/seed.sh
```

Keep three terminals ready:

1. Repository root.
2. `kubectl -n streamvault get pods -w`.
3. `kubectl -n streamvault get hpa streamvault-app -w`.

## 1. The problem (30 seconds)

A video platform has two very different traffic patterns. Uploads are large sequential writes.
Playback is many concurrent byte-range reads. A single server cannot handle either well for long, and
a shared local disk makes adding replicas painful.

StreamVault keeps the API stateless: metadata and bytes live in MongoDB, so any pod can serve any
request. NGINX handles the edge and Kubernetes handles the replica count.

## 2. Show the stack running (2 minutes)

```bash
docker compose ps
curl -s http://localhost:30080/health | jq
kubectl -n streamvault get pods -o wide
kubectl -n streamvault get deploy,svc,hpa,pdb
```

Point out:

- Three API pods on different nodes.
- Two NGINX pods.
- The HPA target of 60 percent CPU.
- The headless service used by NGINX.

## 3. Upload and play (2 minutes)

Open <http://localhost:30080> and upload a video. Then show the same thing from the terminal:

```bash
curl -X POST http://localhost:30080/api/videos \
  -F "title=Review demo" \
  -F "file=@docs/sample/sample.mp4;type=video/mp4" | jq
```

Copy the id:

```bash
VIDEO_ID=<id>
curl -s -D - -o /dev/null -H "Range: bytes=0-65535" \
  http://localhost:30080/api/videos/$VIDEO_ID/stream
```

Expected lines:

```
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-65535/.....
Content-Length: 65536
Accept-Ranges: bytes
X-Upstream-Addr: 10.244.x.x:3000
X-Served-By: streamvault-app-...
```

The browser player uses the same path. Seeking sends a new Range request.

## 4. Load balancing (1 minute)

```bash
for i in $(seq 1 30); do
  curl -s -D - -o /dev/null http://localhost:30080/healthz |
    awk -F': ' 'tolower($1)=="x-served-by"{print $2}'
done | sort | uniq -c
```

All three pods should appear. NGINX resolves the headless service every five seconds, so a new pod
joins without touching the proxy configuration.

## 5. Tests (1 minute)

```bash
npm test
```

84 tests across nine suites: 90.45% line coverage, plus unit tests for range parsing, validation,
error rendering, request context, the Mongoose model and the GridFS driver. The integration suite
uploads a Buffer, reads it back with Range headers, checks the exact bytes, verifies 206 and 416
responses, tests unicode filenames, zero byte files and confirms deletion removes the GridFS file.

```bash
npm run test:api
```

The Postman collection runs 20 requests and 49 assertions through Newman: health, upload validation,
CRUD, search, full and partial streaming, invalid ranges, downloads and cleanup.

## 6. Autoscaling (3 minutes)

```bash
make hpa
```

Narrate the four phases:

1. Idle: 3 pods, low CPU.
2. Load starts: HPA raises the CPU target above 60 percent.
3. New pods appear one by one and NGINX starts sending them traffic.
4. Load stops: after the 60 second window, the deployment scales back to 3.

Show the metrics:

```bash
kubectl top pods -l app=streamvault-app
kubectl -n streamvault describe hpa streamvault-app
```

## 7. Reliability and security details (1 minute)

```bash
kubectl -n streamvault rollout restart deploy/streamvault-app
kubectl -n streamvault get pods -w
```

No failed requests: `maxUnavailable: 0` and readiness probes make the rollout overlap old and new
pods. Mention:

- Non-root user, read-only root filesystem, all capabilities dropped, seccomp profile.
- Startup, readiness and liveness probes.
- PodDisruptionBudgets for drains.
- NetworkPolicy default deny.
- Secrets are generated into Kubernetes, never baked into the image.

## 8. CI/CD (1 minute)

Open the GitHub Actions run. Five jobs:

1. ESLint and 84 Jest tests with coverage.
2. Kustomize render plus kubeconform validation for both overlays and the observability stack.
3. Terraform format, init and validate.
4. Image build, Trivy scan and GHCR push.
5. kind cluster, real deployment, upload, range check, load balancing check and the Postman collection.

## 9. Monitoring (1 minute)

```bash
docker compose -f observability/docker-compose.yml up -d
```

Open <http://localhost:3001>. Two dashboards are provisioned automatically: application traffic and
Node runtime. Show the request rate, p99 latency, error ratio, active streams, throughput, uploads,
heap, event loop lag and GC pause.

## 10. Cloud infrastructure (1 minute)

```bash
cd terraform
terraform fmt -check -recursive
terraform validate
terraform providers
```

The stack provisions a three AZ VPC, EKS 1.31, a managed node group, ECR, IRSA roles for the AWS
Load Balancer Controller and cluster autoscaler, and the Helm releases for both controllers and
metrics-server. `terraform plan` and `apply` need AWS credentials; CI validates without them.

## 11. Close

The same manifests run on a cloud overlay with a LoadBalancer, an Ingress, gp3 storage and a higher
HPA ceiling. The lab proves the orchestration and autoscaling behaviour without cloud spend.
