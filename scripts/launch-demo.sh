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

echo "  resetting to 3 API pods and 2 NGINX pods so the autoscaler starts from the bottom..."
kubectl -n streamvault scale deployment/streamvault-app --replicas=3 >/dev/null
kubectl -n streamvault scale deployment/streamvault-nginx --replicas=2 >/dev/null
for _ in $(seq 1 90); do
  count="$(kubectl -n streamvault get pods --no-headers 2>/dev/null | grep -c 'streamvault-app' || true)"
  [ "${count}" -le 3 ] && break
  sleep 2
done
kubectl -n streamvault rollout status deployment/streamvault-app --timeout=120s >/dev/null

lsof -ti tcp:${PORT} -ti tcp:8098 | xargs kill 2>/dev/null || true
node demo/server.js &
SERVER=$!
trap 'kill ${SERVER} 2>/dev/null' EXIT INT TERM
until curl -fsS http://localhost:${PORT}/api/videos >/dev/null 2>&1; do sleep 1; done

URL="http://localhost:${PORT}/?auto=1"
if [ -z "${NO_OPEN:-}" ]; then
  if [ -d "/Applications/Google Chrome.app" ]; then
    open -na "Google Chrome" --args --user-data-dir="${TMPDIR:-/tmp}/streamvault-demo-chrome" \
      --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required \
      --start-fullscreen --app="${URL}"
  else
    open "${URL}"
  fi
fi
echo
echo "  live demo running at ${URL}, the tour plays by itself"
echo "  the app itself is at http://localhost:30080"
echo "  close this window or press ctrl+c to stop the demo server"
wait ${SERVER}
