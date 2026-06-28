#!/usr/bin/env bash
# Generic training watcher — run ANY training command so the website's Live page
# can show it live (params, loss curve, ETA), no matter which model trains or who
# (which Claude instance / CLI) launches it.
#
# Every trainer prints "epoch N/M  loss=X"; this wrapper tees that to a per-run
# log and keeps a status JSON the web reads. Purely additive: it does not change
# any training code.
#
# Usage:
#   scripts/trainwatch.sh <run-id> "<model name>" -- <command...>
#
# Example (the centroid run, for next time):
#   scripts/trainwatch.sh centroid-600 "Centroid diffusion · 600ep" -- \
#     python -u src/model/centroid_diffusion_model.py train \
#       --data outputs/centroid_train.npz --epochs 600
set -euo pipefail
cd "$(dirname "$0")/.."

ID="${1:?run-id required}"
NAME="${2:?model name required}"
shift 2
[ "${1:-}" = "--" ] && shift
[ "$#" -ge 1 ] || { echo "no command given" >&2; exit 2; }

RUNS="outputs/runs"
mkdir -p "$RUNS"
LOG="$RUNS/$ID.log"
STATUS="$RUNS/$ID.json"
export PYTHONUNBUFFERED=1

# best-effort total epochs from the command line (the log carries it too)
TOTAL=0
args=("$@")
for ((i = 0; i < ${#args[@]}; i++)); do
  if [ "${args[$i]}" = "--epochs" ]; then TOTAL="${args[$((i + 1))]:-0}"; fi
done

START_MS=$(($(date +%s%3N)))
CMD="$*"

write_status() { # epoch loss status
  ID="$ID" NAME="$NAME" START="$START_MS" PID="$$" TOTAL="$TOTAL" CMD="$CMD" \
  EPOCH="${1:-0}" LOSS="${2:-}" STATUS_V="${3:-running}" STATUS_PATH="$STATUS" \
  python3 - <<'PY' 2>/dev/null || true
import json, os, time
json.dump({
  "id": os.environ["ID"], "name": os.environ["NAME"],
  "pid": int(os.environ["PID"]), "startedAt": int(os.environ["START"]),
  "updatedAt": int(time.time() * 1000), "total": int(os.environ.get("TOTAL") or 0),
  "epoch": int(os.environ.get("EPOCH") or 0),
  "loss": (float(os.environ["LOSS"]) if os.environ.get("LOSS") else None),
  "status": os.environ["STATUS_V"], "cmd": os.environ["CMD"],
  "config": {"epochs": int(os.environ.get("TOTAL") or 0)},
}, open(os.environ["STATUS_PATH"], "w"))
PY
}

finish() { # exit_code
  if [ "${1:-1}" = "0" ]; then write_status "" "" done; else write_status "" "" error; fi
}

write_status "" "" running

# Run the command, capture its exit code, tee everything to the log, and update
# the status JSON on each epoch line. pipefail + PIPESTATUS preserve the real
# exit code of the training command (not tee's).
set +e
{
  "$@"
  echo "__TRAINWATCH_EXIT_${PIPESTATUS[0]:-$?}__"
} 2>&1 | tee "$LOG" | while IFS= read -r line; do
  if [[ "$line" =~ epoch[[:space:]]+([0-9]+)/([0-9]+)[[:space:]]+loss=([0-9.]+) ]]; then
    write_status "${BASH_REMATCH[1]}" "${BASH_REMATCH[3]}" running
  elif [[ "$line" =~ ^__TRAINWATCH_EXIT_([0-9]+)__$ ]]; then
    finish "${BASH_REMATCH[1]}"
  fi
done
set -e
echo "[trainwatch] $ID finished — status in $STATUS, log in $LOG"
