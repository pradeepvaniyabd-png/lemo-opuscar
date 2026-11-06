#!/bin/sh
# Rebuild "सार्थक ऑनलाइन सेवा केंद्र" from source: events → cue check → score → mix → video → mux → subtitles → poster.
#   sh build.sh            uses the voice lines already in voice/
#   sh build.sh --voice    also re-fetches the Hindi voice (edge-tts, online), shortens pauses and re-checks it with Whisper
# Needs: Node 20+, ffmpeg 7+ on PATH, the library's .venv (sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice),
# the sample libraries vcsl, vsco2ce, karoryfer, freepats (sh tools/fetch.sh instruments <lib>).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}          # clone mode: <repo>/films/<name>/
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
PY="$LIB/.venv/bin/python"
SIZE=1080x1920
if [ "$1" = "--voice" ]; then
  "$PY" "$HERE/tools/tts_hi.py" "$HERE/voice/lines.json" "$HERE/voice/"
  "$PY" "$HERE/tools/tighten.py" "$HERE/voice/lines.json" "$HERE/voice/"
  "$PY" -I "$HERE/tools/check_hi.py" "$HERE/voice/lines.json" "$HERE/voice/"
fi
"$PY" "$HERE/tools/env.py" "$HERE/voice/lines.json" "$HERE/voice/"
node core/render/events.mjs "$HERE" --size $SIZE
"$PY" "$HERE/tools/cuecheck.py"
"$PY" "$HERE/music/score.py"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --size $SIZE --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/sarthak-seva.mp4" 24 2
node "$HERE/tools/cues.mjs" "$HERE/out/cues.json"
"$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/sarthak-seva.srt"
node core/render/still.mjs "$HERE" 57.5 --size $SIZE --q nosubs=1 --out "$HERE/out" --prefix poster_
cp "$HERE/out/poster_57.5.jpg" "$HERE/poster.jpg"
echo "done: $HERE/sarthak-seva.mp4"
