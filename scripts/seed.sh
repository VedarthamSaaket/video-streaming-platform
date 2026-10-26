#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${1:-http://localhost:30080}"
SAMPLE="${ROOT_DIR}/docs/sample/sample.mp4"

if [ ! -f "${SAMPLE}" ]; then
  bash "${ROOT_DIR}/scripts/generate-sample.sh"
fi

curl -fsS -X POST "${BASE_URL}/api/videos" \
  -F "title=Kubernetes autoscaling demo" \
  -F "description=A 20 second test pattern used for the HPA load test" \
  -F "file=@${SAMPLE};type=video/mp4" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
