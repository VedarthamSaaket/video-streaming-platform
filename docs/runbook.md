# Operations runbook

## Deploy

```bash
make kind-up
make deploy
```

`make deploy` builds `streamvault:local`, loads it into kind, creates `k8s/base/secrets.env` from the
example if it is missing, applies the local overlay and waits for Mongo, the init Job and both
Deployments.

## Check health

```bash
kubectl -n streamvault get pods -o wide
kubectl -n streamvault get deploy,svc,hpa,pdb
kubectl -n streamvault get events --sort-by=.lastTimestamp | tail -20
curl -s http://localhost:30080/health | jq
```

## Logs

```bash
kubectl -n streamvault logs -l app=streamvault-app --tail=100 -f
kubectl -n streamvault logs -l app=streamvault-nginx --tail=50
```

Logs are JSON from Pino. The request id, pod name, route, status and duration are all included.

## Scale manually

```bash
kubectl -n streamvault scale deploy/streamvault-app --replicas=6
```

The HPA owns the replica count, so manual changes are reverted on the next metrics sync. To pin a
count, delete the HPA first.

## Common failures

### App pods are Running but not Ready

`/readyz` returns 503 when MongoDB is down or the app user does not exist.

```bash
kubectl -n streamvault exec deploy/streamvault-app -- node -e "fetch('http://127.0.0.1:3000/readyz').then(r=>r.text()).then(console.log)"
kubectl -n streamvault logs job/mongo-init
```

Re-run the user creation if the Job finished before Mongo accepted connections:

```bash
kubectl -n streamvault delete job mongo-init
kubectl apply -k k8s/overlays/local
```

### HPA shows `<unknown>` for targets

metrics-server is not ready. On kind it needs `--kubelet-insecure-tls`.

```bash
kubectl -n kube-system rollout status deploy/metrics-server
kubectl top nodes
```

### Upload returns 413

The upload is larger than `MAX_UPLOAD_BYTES` (200 MB) or larger than the NGINX
`client_max_body_size` (200 MB). Change both.

### Range request returns 200 instead of 206

Something in the path is stripping the `Range` header. Confirm NGINX has
`proxy_set_header Range $http_range;` and that the API was not bypassed. Test directly:

```bash
kubectl -n streamvault port-forward svc/streamvault-app 3000:3000
curl -s -D - -o /dev/null -H "Range: bytes=0-1023" http://localhost:3000/api/videos/<id>/stream
```

### Pod is OOMKilled

The container limit is 512Mi and `NODE_OPTIONS=--max-old-space-size=384` leaves headroom for the
runtime. Very large concurrent uploads still use temporary disk, not heap. Check:

```bash
kubectl -n streamvault describe pod -l app=streamvault-app | grep -A5 "Last State"
```

## Rollback

```bash
kubectl -n streamvault rollout undo deploy/streamvault-app
kubectl -n streamvault rollout status deploy/streamvault-app
```

## Teardown

```bash
make compose-down
make clean
```

`make clean` deletes the kind cluster and its volumes.
