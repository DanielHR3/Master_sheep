#!/bin/bash
# scratch/landing_media/convert.sh <outdir>
# WebM crudo → MP4 H.264 ligero sin audio + póster JPG. Se omiten los primeros
# 3 s (login) y se recorta: hero hasta 15 s (la historia completa: pesaje sin
# señal → pendiente → sincronizado), semáforo hasta 10 s.
set -euo pipefail
OUT="$1"
convert() { # nombre duración
  local name="$1" dur="$2" src="$OUT/raw/$1.webm"
  [ -f "$src" ] || { echo "falta $src (hero requiere OFFLINE=1)"; return 0; }
  ffmpeg -y -loglevel error -ss 3 -i "$src" -t "$dur" -an -vf "scale=1280:-2,fps=30" \
    -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$OUT/$name.mp4"
  ffmpeg -y -loglevel error -ss 1 -i "$OUT/$name.mp4" -frames:v 1 -q:v 3 "$OUT/$name.jpg"
  echo "$name.mp4: $(du -h "$OUT/$name.mp4" | cut -f1), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$name.mp4" | cut -c1-4)s"
}
convert hero 15
convert semaforo 10
find "$OUT/raw" -name '*.webm' -delete 2>/dev/null; rmdir "$OUT/raw" 2>/dev/null || true
