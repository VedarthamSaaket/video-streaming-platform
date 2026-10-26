#!/usr/bin/env bash
set -euo pipefail

CLUSTER_NAME="streamvault"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v kind >/dev/null 2>&1; then
  echo "kind is not installed. Install it first: brew install kind" >&2
  exit 1
fi

if kind get clusters | grep -qx "${CLUSTER_NAME}"; then
  echo "kind cluster '${CLUSTER_NAME}' already exists"
else
  echo "Creating kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --name "${CLUSTER_NAME}" --config "${ROOT_DIR}/scripts/kind-config.yaml" --wait 120s
fi

kubectl config use-context "kind-${CLUSTER_NAME}" >/dev/null

echo "Installing local-path-provisioner for persistent volumes..."
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.30/deploy/local-path-storage.yaml >/dev/null
kubectl -n local-path-storage rollout status deployment/local-path-provisioner --timeout=180s

echo "Installing metrics-server for HorizontalPodAutoscaler..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml >/dev/null
kubectl -n kube-system patch deployment metrics-server --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]' >/dev/null

kubectl -n kube-system rollout status deployment/metrics-server --timeout=180s

echo "Waiting for the metrics API..."
for _ in $(seq 1 60); do
  if kubectl get apiservice v1beta1.metrics.k8s.io -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null | grep -q True; then
    echo "metrics API is available"
    break
  fi
  sleep 3
done

kubectl get nodes -o wide
echo "Cluster is ready. NodePort 30080 is mapped to localhost:30080"
