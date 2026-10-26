#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="streamvault"
BASE_URL="${1:-http://localhost:30080}"
DURATION="${2:-150}"

echo "Baseline HPA state:"
kubectl -n "${NAMESPACE}" get hpa

echo
echo "Starting ${DURATION}s load test against ${BASE_URL} ..."
node "${ROOT_DIR}/scripts/load-test.js" --url "${BASE_URL}" --connections 120 --duration "${DURATION}" \
  > /tmp/streamvault-load-test.log 2>&1 &
LOAD_PID=$!

echo "Watching the HPA while the load runs..."
for _ in $(seq 1 $((DURATION / 15))); do
  date "+%H:%M:%S"
  kubectl -n "${NAMESPACE}" get hpa streamvault-app
  echo "ready app pods: $(kubectl -n "${NAMESPACE}" get pods -l app=streamvault-app --no-headers | grep -c Running || true)"
  sleep 15
done

wait "${LOAD_PID}" || true

echo
echo "Load test summary:"
tail -40 /tmp/streamvault-load-test.log || true

echo
echo "Final HPA and pods:"
kubectl -n "${NAMESPACE}" get hpa
kubectl -n "${NAMESPACE}" get pods -o wide
