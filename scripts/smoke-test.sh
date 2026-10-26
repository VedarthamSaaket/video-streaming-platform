#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${1:-http://localhost:30080}"
SAMPLE="${ROOT_DIR}/docs/sample/sample.mp4"

if [ ! -f "${SAMPLE}" ]; then
  bash "${ROOT_DIR}/scripts/generate-sample.sh"
fi

echo "Waiting for ${BASE_URL}/healthz ..."
for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/healthz" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "Health:"
curl -fsS "${BASE_URL}/health" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(JSON.stringify(j,null,2));})"

echo
echo "Uploading a sample video through NGINX..."
UPLOAD_RESPONSE="$(curl -fsS -X POST "${BASE_URL}/api/videos" \
  -F "title=Smoke test clip" \
  -F "description=Uploaded by scripts/smoke-test.sh" \
  -F "file=@${SAMPLE};type=video/mp4")"

VIDEO_ID="$(printf '%s' "${UPLOAD_RESPONSE}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")"
echo "Uploaded video id: ${VIDEO_ID}"

echo
echo "Range request (first 64 KiB):"
curl -sS -D - -o /dev/null -H "Range: bytes=0-65535" "${BASE_URL}/api/videos/${VIDEO_ID}/stream" | tr -d '\r'
RANGE_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-65535' "${BASE_URL}/api/videos/${VIDEO_ID}/stream")"
if [ "${RANGE_STATUS}" != "206" ]; then
  echo "Expected 206 Partial Content, got ${RANGE_STATUS}" >&2
  exit 1
fi

echo
echo "Load balanced responses (X-Served-By across 12 requests):"
for _ in $(seq 1 12); do
  curl -sS -D - -o /dev/null "${BASE_URL}/healthz" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-served-by"{print $2}'
done | sort | uniq -c

echo
echo "Stats:"
curl -fsS "${BASE_URL}/api/stats" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

curl -fsS -X DELETE "${BASE_URL}/api/videos/${VIDEO_ID}" >/dev/null
echo
echo "Smoke test passed."
