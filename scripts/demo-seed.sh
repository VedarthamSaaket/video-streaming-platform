#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${1:-http://localhost:30080}"
DIR="${ROOT_DIR}/docs/sample"
mkdir -p "${DIR}"

existing="$(curl -fsS "${BASE_URL}/api/videos?limit=100")"

clip() {
  local name="$1" title="$2" source="$3" description="$4"
  local file="${DIR}/${name}.mp4"
  if echo "${existing}" | grep -q "\"title\":\"${title}\""; then
    return
  fi
  if [ ! -f "${file}" ]; then
    ffmpeg -y -loglevel error -f lavfi -i "${source}" -t 20 \
      -c:v libx264 -preset veryfast -pix_fmt yuv420p -b:v 1200k -movflags +faststart "${file}"
  fi
  curl -fsS -o /dev/null -X POST "${BASE_URL}/api/videos" \
    -F "title=${title}" -F "description=${description}" -F "file=@${file};type=video/mp4"
  echo "uploaded ${title}"
}

if ! echo "${existing}" | grep -q '"title":"Kubernetes autoscaling demo"'; then
  bash "${ROOT_DIR}/scripts/seed.sh" "${BASE_URL}" >/dev/null
  echo "uploaded Kubernetes autoscaling demo"
fi
clip mandelbrot "Mandelbrot zoom" "mandelbrot=size=1280x720:rate=30" "A fractal zoom rendered by ffmpeg"
clip life "Game of life" "life=size=1280x720:rate=30:mold=10:ratio=0.1:death_color=#13202f:life_color=#c48f32" "Conway's life at 720p"
clip bars "Broadcast bars" "smptehdbars=size=1280x720:rate=30" "SMPTE HD colour bars"
clip cells "Cellular automaton" "cellauto=size=1280x720:rate=30:rule=110" "Rule 110 scrolling down the frame"
clip gradients "Moving gradients" "gradients=size=1280x720:rate=30:speed=0.02" "Slow colour gradients"
