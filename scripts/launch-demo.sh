#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"
PORT=8099

echo
echo "  StreamVault · live demo"
echo "  ------------------------"

if ! docker info >/dev/null 2>&1; then
  echo "  starting Docker Desktop..."
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 2; done
fi

if ! kind get clusters 2>/dev/null | grep -qx streamvault; then
  echo "  creating the kind cluster and deploying (first run takes a few minutes)..."
  bash scripts/kind-up.sh
  bash scripts/deploy-local.sh
fi

kubectl config use-context kind-streamvault >/dev/null
echo "  waiting for MongoDB, the API and NGINX..."
kubectl -n streamvault rollout status statefulset/mongo --timeout=300s >/dev/null
kubectl -n streamvault rollout status deployment/streamvault-app --timeout=300s >/dev/null
kubectl -n streamvault rollout status deployment/streamvault-nginx --timeout=300s >/dev/null
until curl -fsS http://localhost:30080/readyz >/dev/null 2>&1; do sleep 2; done

echo "  making sure the demo videos are in GridFS..."
bash scripts/demo-seed.sh

lsof -ti tcp:${PORT} | xargs kill 2>/dev/null || true
node demo/server.js &
SERVER=$!
trap 'kill ${SERVER} 2>/dev/null' EXIT INT TERM
until curl -fsS http://localhost:${PORT}/api/videos >/dev/null 2>&1; do sleep 1; done

[ -z "${NO_OPEN:-}" ] && open "http://localhost:${PORT}"
echo
echo "  demo open at http://localhost:${PORT}"
echo "  the app itself is at http://localhost:30080"
echo "  close this window or press ctrl+c to stop the demo server"
wait ${SERVER}
