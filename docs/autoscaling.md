# Autoscaling and load balancing

## HPA configuration

```yaml
minReplicas: 3
maxReplicas: 12
metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

The API asks for `100m` CPU and is limited to `500m`. At 60 percent utilisation each pod is using
about 60 millicores. With three baseline replicas the load generator can push the deployment to the
ceiling in roughly two minutes on the three node kind cluster.

Scale-up is intentionally aggressive (`stabilizationWindowSeconds: 0`, up to 100 percent or two pods
per 30 seconds). Scale-down waits 60 seconds and removes at most half the pods, which avoids
oscillation while a video is still being watched.

## Load balancing path

1. The browser or curl connects to the NGINX NodePort.
2. NGINX resolves the headless API service through the cluster DNS resolver.
3. All ready pod IPs come back in the DNS answer.
4. NGINX picks an upstream for each request and adds `X-Upstream-Addr`.
5. kube-proxy is not involved for the pod-to-pod hop because the headless service returns pod IPs.

This means the HPA can add a pod and NGINX will use it without a reload. The resolver cache is five
seconds.

## Proving it

```bash
make hpa
```

The script starts a 120 connection autocannon run against the stream endpoint, prints the HPA every
15 seconds and finishes with the final replica count. Results from this build:

| Phase | API replicas | NGINX replicas | Notes |
|---|---|---|---|
| Idle | 3 | 2 | 7% CPU per API pod |
| 30 seconds into load | 6 | 4 | CPU crossed 169% of target |
| 60 seconds into load | 12 | 6 | HPA hit both limits |
| 90 seconds into load | 12 | 6 | 68,861 requests, 17.9 GB, 0 errors |
| 3 minutes after load | 3 | 2 | scale-down completed |

The load run sustained 421.5 requests per second with a p99 of 696 ms and no errors or timeouts.
Screenshots of the HPA walk, the peak pod list and the autocannon output are in
`docs/screenshots/`.

## Tuning notes

- Memory is not used as an HPA metric. Node.js keeps its heap after a spike, so a memory target
  would hold replicas up long after traffic fell.
- If the workload becomes I/O bound, switch to a custom metric such as active streams per pod with
  Prometheus Adapter or KEDA.
- The cluster autoscaler is the next layer: HPA adds pods, the autoscaler adds nodes when pods stay
  Pending. That is documented in the cloud overlay notes.
- `maxReplicas: 20` is set in the cloud overlay to leave room for larger nodes.
