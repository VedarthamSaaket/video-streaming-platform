# Observability

StreamVault exposes Prometheus metrics on `/metrics` and includes optional manifests for a
Prometheus Operator installation.

## Metrics

| Metric | Type | Labels | Meaning |
|---|---|---|---|
| `streamvault_http_request_duration_seconds` | histogram | method, route, status | Request latency |
| `streamvault_video_uploads_total` | counter | status | Successful and failed uploads |
| `streamvault_stream_requests_total` | counter | range | Full and partial stream requests |
| `streamvault_bytes_streamed_total` | counter | - | Bytes sent to clients |
| `streamvault_active_streams` | gauge | - | Streams currently open |
| `streamvault_storage_errors_total` | counter | operation | GridFS stat, get, put and delete errors |
| default process metrics | various | - | CPU, memory, event loop, GC |

The `X-Served-By` header gives the same pod identity outside Prometheus.

## Install

```bash
kubectl apply -f k8s/observability/servicemonitor.yaml
kubectl apply -f k8s/observability/prometheusrule.yaml
```

The ServiceMonitor expects a Prometheus Operator with the `release: prometheus` label convention.
Import `k8s/observability/grafana-dashboard.json` in Grafana and select the Prometheus datasource.

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
