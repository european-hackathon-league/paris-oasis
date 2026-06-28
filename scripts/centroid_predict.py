"""
Studio (outline-only): a hand-drawn apartment OUTLINE -> Centroid Diffusion plan.

Reuses the EXACT training featurization (centroid_diffusion_data) so the model sees
the same normalized outline-vertex tokens it was trained on, samples room
centroids + types, reconstructs rooms via weighted Voronoi (centroid_reconstruct),
and renders in the sketch's frame so the result sits where you drew it.

    python scripts/centroid_predict.py --in sketch.png --out plan.png \
        --weights outputs/models/centroid-v1/weights.pt

Prints a JSON document to stdout (consumed by /api/canvas), same shape as
canvas_predict.py so the Studio UI is identical for both engines.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src", "model"))
sys.path.insert(0, os.path.join(ROOT, "src", "eval"))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

from canvas_predict import build_input, render_aligned, ROOM_NAMES, ROOM_COLORS  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--weights", default=os.path.join(ROOT, "outputs", "centroid_diffusion.pt"))
    ap.add_argument("--steps", type=int, default=100)
    ap.add_argument("--rooms", type=int, default=0)  # accepted + ignored: the outline-only model decides the count
    a = ap.parse_args()

    if not os.path.exists(a.weights):
        print(json.dumps({"ok": False, "error": f"no centroid weights at {a.weights}"})); return

    # Point the model loader at the chosen weights BEFORE importing the module
    # (its WEIGHTS global is read from this env at import time).
    os.environ["CENTROID_WEIGHTS"] = os.path.abspath(a.weights)
    import centroid_diffusion_model as CD  # noqa: E402
    CD.WEIGHTS = os.path.abspath(a.weights)
    from centroid_diffusion_data import building_theta, canon, vertex_tokens, V_MAX, _largest  # noqa: E402
    from centroid_reconstruct import reconstruct  # noqa: E402
    from shapely.geometry import Polygon  # noqa: E402
    from skimage import measure  # noqa: E402

    SIZE = 256
    _, col_vals, row_vals, free = build_input(a.inp, SIZE)
    if free.sum() < 50:
        print(json.dumps({"ok": False, "error": "draw a closed building outline first"})); return

    # free interior mask -> outline polygon in the sketch's world frame (col/row ramps)
    conts = measure.find_contours(free.astype(float), 0.5)
    if not conts:
        print(json.dumps({"ok": False, "error": "couldn't read an outline — draw clearer lines"})); return
    cont = max(conts, key=len)
    nc, nr = len(col_vals), len(row_vals)
    pts = [(float(col_vals[min(int(round(c)), nc - 1)]), float(row_vals[min(int(round(r)), nr - 1)])) for r, c in cont]
    P = Polygon(pts)
    if not P.is_valid:
        P = P.buffer(0)
    P = _largest(P)
    if P.is_empty or P.area <= 0:
        print(json.dumps({"ok": False, "error": "outline too small"})); return
    # keep the vertex count within the model's V_MAX
    tol = 0.2
    while len(P.exterior.coords) > V_MAX + 1 and tol < 8:
        P = _largest(P.simplify(tol)); tol *= 1.6

    # canonicalize to the building frame — identical to centroid_diffusion_data.apartment_sample
    theta = building_theta(P)
    cen = (P.centroid.x, P.centroid.y)
    mrr = P.minimum_rotated_rectangle
    cc = list(mrr.exterior.coords)[:4]
    sides = [math.dist(cc[i], cc[(i + 1) % 4]) for i in range(4)]
    scale = max(sides) or 1.0
    out_norm = _largest(canon(P, theta, cen, scale))
    if not isinstance(out_norm, Polygon) or out_norm.is_empty:
        print(json.dumps({"ok": False, "error": "could not normalize the outline"})); return
    vt = vertex_tokens(out_norm)

    V = min(len(vt), V_MAX)
    verts = np.zeros((V_MAX, 4), np.float32); verts[:V] = vt[:V]
    vmask = np.zeros((V_MAX,), np.float32); vmask[:V] = 1
    tf = np.array([theta, cen[0], cen[1], scale], np.float32)

    dev = CD._device()
    try:
        cents, types, valid = CD.sample(dev, verts, vmask, steps=a.steps)
        G = reconstruct(cents, types, valid, out_norm, tf)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": f"generation failed: {e}"})); return
    if G.number_of_nodes() < 2:
        print(json.dumps({"ok": False, "error": "model produced no rooms — try a larger, cleaner outline"})); return

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    Image.fromarray(render_aligned(G, col_vals, row_vals, free, size=512)).save(a.out)

    from collections import Counter
    cnt = Counter(int(d.get("room_type", 0)) for _, d in G.nodes(data=True))
    rooms_doc = [{"type": rt, "name": ROOM_NAMES.get(rt, str(rt)), "color": ROOM_COLORS.get(rt, "#333"), "count": cnt[rt]}
                 for rt in sorted(cnt, key=lambda r: -cnt[r])]
    print(json.dumps({"ok": True, "n_rooms": G.number_of_nodes(), "n_connections": G.number_of_edges(),
                      "rooms": rooms_doc, "weights": os.path.basename(a.weights)}))


if __name__ == "__main__":
    main()
