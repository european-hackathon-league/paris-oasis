#!/usr/bin/env bash
# Generate + eval + register the rule-based RECTILINEAR model into the store.
#   RUN_ID=rect-v1 MODEL_NAME="Rectilinear (rule-based)" N=800 bash scripts/run_rect.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck disable=SC1091
source .venv/bin/activate
export PYTHONUNBUFFERED=1

MSD=${MSD:-data/modified-swiss-dwellings-v2}
RUN_ID=${RUN_ID:?set RUN_ID}
MODEL_NAME=${MODEL_NAME:?set MODEL_NAME}
N=${N:-800}
DIR="outputs/models/$RUN_ID"
mkdir -p "$DIR/generated"

echo "[rect] id=$RUN_ID n=$N"
python -u src/model/baseline_rect.py --test "$MSD/test" --train "$MSD/train" \
  --out "$DIR/generated" --n "$N"

echo "[rect] eval"
python -u src/eval/run_eval.py --real "$MSD/test/graph_out" --fake "$DIR/generated" \
  --n "$N" --out "$DIR/metrics.json"

python - "$RUN_ID" "$MODEL_NAME" "$N" <<'PY'
import sys, json, os, time
rid, name, n = sys.argv[1:4]; d = f"outputs/models/{rid}"
meta = {"id": rid, "name": name, "family": "partition", "status": "done",
        "config": {"type": "rule-based rectilinear (slice by interior area)", "ntest": int(n)},
        "metrics": None, "createdAt": int(time.time() * 1000), "source": "rect"}
try:
    m = json.load(open(os.path.join(d, "metrics.json")))
    meta["metrics"] = {k: m[k] for k in ("fid", "density", "coverage") if k in m}
except Exception:
    pass
meta["nGenerated"] = len([f for f in os.listdir(os.path.join(d, "generated")) if f.endswith(".pickle")])
json.dump(meta, open(os.path.join(d, "meta.json"), "w"), indent=2)
print("[rect] metrics:", json.dumps(meta["metrics"]))
PY
echo "[rect] DONE $RUN_ID"
