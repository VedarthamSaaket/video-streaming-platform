#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${ROOT_DIR}/docs/sample/sample.mp4"

mkdir -p "$(dirname "${OUTPUT}")"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate the sample video" >&2
  exit 1
fi

echo "Generating a 20 second 720p sample video..."
ffmpeg -y -loglevel error \
  -f lavfi -i "testsrc2=size=1280x720:rate=30" \
  -f lavfi -i "sine=frequency=440:sample_rate=48000" \
  -t 20 \
  -c:v libx264 -preset veryfast -pix_fmt yuv420p -b:v 1200k \
  -c:a aac -b:a 96k \
  -movflags +faststart \
  "${OUTPUT}"

ls -lh "${OUTPUT}"
