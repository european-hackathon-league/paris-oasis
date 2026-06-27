#!/usr/bin/env bash
# Web-triggered training run: train -> predict -> eval, fully UNBUFFERED so the
# website can stream live progress. Writes metrics JSON for the results panel.
# Uses a separate weights file so it never clobbers the manual full run.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
source .venv/bin/activate
export PYTHONUNBUFFERED=1
export UNET_WEIGHTS=outputs/unet_web.pt

MSD=${MSD:-data/modified-swiss-dwellings-v2}
SIZE=${SIZE:-128}
EPOCHS=${EPOCHS:-20}
BATCH=${BATCH:-32}
NTRAIN=${NTRAIN:-1000}
NTEST=${NTEST:-200}
OUT=outputs/generated_web

echo "[web-train] START size=$SIZE epochs=$EPOCHS batch=$BATCH ntrain=$NTRAIN ntest=$NTEST"
echo "[web-train] PHASE train"
python -u src/model/unet_seg.py train \
  --train "$MSD/train" --size "$SIZE" --n "$NTRAIN" --epochs "$EPOCHS" --batch "$BATCH"

echo "[web-train] PHASE predict"
python -u src/model/unet_seg.py predict \
  --test "$MSD/test" --size "$SIZE" --n "$NTEST" --out "$OUT"

echo "[web-train] PHASE eval"
python -u src/eval/run_eval.py \
  --real "$MSD/test/graph_out" --fake "$OUT" --n "$NTEST" --out outputs/web_metrics.json

echo "[web-train] DONE"
