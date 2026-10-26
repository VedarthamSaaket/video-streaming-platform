# Observability and Grafana

StreamVault exposes Prometheus metrics on `/metrics`. Two Grafana dashboards are provisioned from
JSON so there is no manual import step.

## Local stack

The stack joins the kind Docker network and scrapes the NodePort, so it sees the same metrics as the
cluster:

```bash
docker compose -f observability/docker-compose.yml up -d
```

- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3001> (anonymous admin)
- Application dashboard: `/d/streamvault-overview`
- Runtime dashboard: `/d/streamvault-runtime`

`observability/prometheus/prometheus.yml` scrapes `streamvault-worker:30080` every 5 seconds. The
datasource and dashboard provider are provisioned under `observability/grafana/provisioning/`.

## Dashboards

### StreamVault · Application

- Requests per second
- p99 latency
- Active streams
- 5xx error ratio
- Request rate by route
- p95 and p99 latency percentiles
- Active streams
- Streaming throughput
- Uploads by status

### StreamVault · Node runtime

- Resident memory
- V8 heap used and total
- Event loop lag p99
- CPU usage
- Active handles
- CPU seconds
- Handles and requests
- Garbage collection pause

## Kubernetes dashboards

`k8s/observability/kustomization.yaml` turns both dashboard JSON files into a ConfigMap labelled
`grafana_dashboard: "1"`. A Grafana sidecar (for example from `kube-prometheus-stack`) picks it up
automatically:

```bash
kubectl apply -k k8s/observability
```

It also installs the ServiceMonitor and the four alert rules.

## Metrics

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `streamvault_http_request_duration_seconds` | histogram | method, route, status | Request latency |
| `streamvault_video_uploads_total` | counter | status | Successful and failed uploads |
| `streamvault_stream_requests_total` | counter | range | Full and partial stream requests |
| `streamvault_bytes_streamed_total` | counter | - | Bytes sent to clients |
| `streamvault_active_streams` | gauge | - | Streams currently open |
| `streamvault_storage_errors_total` | counter | operation | GridFS stat, get, put and delete errors |
| `streamvault_process_*` | various | - | CPU, memory, file descriptors |
| `streamvault_nodejs_*` | various | - | Heap, event loop, GC, handles |

The `X-Served-By` header gives the pod identity outside Prometheus.

## Alerts

- Error ratio above 2 percent for five minutes.
- p99 latency above 1.5 seconds for ten minutes.
- HPA at its maximum replica count for ten minutes.
- More than three container restarts in ten minutes.

## Useful PromQL

```promql
# Requests per second by route
sum by (route) (rate(streamvault_http_request_duration_seconds_count[5m]))

# 95th percentile latency
histogram_quantile(0.95, sum by (le) (rate(streamvault_http_request_duration_seconds_bucket[5m])))

# Streaming throughput in MB/s
sum(rate(streamvault_bytes_streamed_total[5m])) / 1024 / 1024

# Replica count and CPU target
kube_horizontalpodautoscaler_status_current_replicas{horizontalpodautoscaler="streamvault-app"}
kube_horizontalpodautoscaler_status_target_metric{horizontalpodautoscaler="streamvault-app"}
```
