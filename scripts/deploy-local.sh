#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="streamvault"
CLUSTER_NAME="streamvault"
SKIP_BUILD="${1:-}"

if ! kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  bash "${ROOT_DIR}/scripts/kind-up.sh"
fi

if [ -z "${SKIP_BUILD}" ]; then
  echo "Building the StreamVault image..."
  docker build -t streamvault:local "${ROOT_DIR}"
fi

echo "Loading the image into kind..."
kind load docker-image streamvault:local --name "${CLUSTER_NAME}"

if [ ! -f "${ROOT_DIR}/k8s/base/secrets.env" ]; then
  cp "${ROOT_DIR}/k8s/base/secrets.env.example" "${ROOT_DIR}/k8s/base/secrets.env"
  echo "Created k8s/base/secrets.env from the example (development credentials)"
fi

echo "Applying Kubernetes resources..."
kubectl apply -k "${ROOT_DIR}/k8s/overlays/local"

echo "Waiting for MongoDB..."
kubectl -n "${NAMESPACE}" rollout status statefulset/mongo --timeout=240s

echo "Waiting for the application user job..."
kubectl -n "${NAMESPACE}" wait --for=condition=complete job/mongo-init --timeout=240s

echo "Waiting for the API deployment..."
kubectl -n "${NAMESPACE}" rollout status deployment/streamvault-app --timeout=240s

echo "Waiting for the NGINX deployment..."
kubectl -n "${NAMESPACE}" rollout status deployment/streamvault-nginx --timeout=180s

echo
kubectl -n "${NAMESPACE}" get pods -o wide
kubectl -n "${NAMESPACE}" get svc,hpa

echo
echo "StreamVault is available on http://localhost:30080"
