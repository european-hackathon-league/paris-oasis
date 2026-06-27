"""
Build the training set for the BOUNDARY-CONDITIONED GSDiff model: for every train
plan, extract its wall-junction structural graph AND its building envelope
(struct_in interior), normalized into ONE shared frame so the junctions sit
inside the envelope image. Caches node features + validity + edges + envelope.

Node feature (12): [x, y, room_multihot(9), balcony];  envelope: 64x64 mask.
    python src/model/gsdiff_data.py --split train --out outputs/gsdiff_train.npz
"""
from __future__ import annotations

import argparse
import glob
import os
import pickle
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wallgraph import extract_wall_graph, N_ROOM  # noqa: E402
from baseline_rect import interior_mask  # noqa: E402

N_MAX = 256
E_MAX = 640
ENV = 64
FEAT = 2 + N_ROOM + 1  # 12


def _load_struct(test_dir, tid):
    for ext in (".npy", ".npz"):
        p = os.path.join(test_dir, "struct_in", f"{tid}{ext}")
        if os.path.exists(p):
            arr = np.load(p)
            return arr[arr.files[0]] if hasattr(arr, "files") else arr
    raise FileNotFoundError(tid)


def envelope_and_norm(struct_in, nodes):
    """Shared-frame normalization: returns (env 64x64, nodes_norm, ok)."""
    interior, col_x, row_y = interior_mask(struct_in)
    ys, xs = np.where(interior)
    if len(ys) < 20:
        return None, None, False
    wx, wy = col_x[xs], row_y[ys]
    cx, cy = 0.5 * (wx.min() + wx.max()), 0.5 * (wy.min() + wy.max())
    sc = 0.5 * max(wx.max() - wx.min(), wy.max() - wy.min()) or 1.0
    nxp = (wx - cx) / sc
    nyp = (wy - cy) / sc
    env = np.zeros((ENV, ENV), dtype=np.float32)
    gi = np.clip(((nyp + 1) / 2 * (ENV - 1)).round().astype(int), 0, ENV - 1)
    gj = np.clip(((nxp + 1) / 2 * (ENV - 1)).round().astype(int), 0, ENV - 1)
    env[gi, gj] = 1.0
    nn = (nodes - np.array([cx, cy])) / sc
    return env, nn, True


def build(msd, split, n=None):
    gdir = os.path.join(msd, split, "graph_out")
    files = sorted(glob.glob(os.path.join(gdir, "*.pickle")))
    if n:
        files = files[:n]
    F, V, EE, EC, EN = [], [], [], [], []
    kept = skipped = 0
    for f in files:
        tid = os.path.splitext(os.path.basename(f))[0]
        try:
            go = pickle.load(open(f, "rb"))
            nodes, rmh, bal, edges = extract_wall_graph(go)
            K = len(nodes)
            if K < 4 or K > N_MAX or len(edges) > E_MAX:
                skipped += 1; continue
            st = _load_struct(os.path.join(msd, split), tid)
            env, nn, ok = envelope_and_norm(st, nodes)
            if not ok or np.abs(nn).max() > 1.6:   # nodes must lie ~inside the envelope frame
                skipped += 1; continue
            feat = np.zeros((N_MAX, FEAT), dtype=np.float32)
            feat[:K, 0:2] = nn
            feat[:K, 2:2 + N_ROOM] = rmh
            feat[:K, 2 + N_ROOM] = bal
            valid = np.zeros(N_MAX, dtype=bool); valid[:K] = True
            ej = np.full((E_MAX, 2), -1, dtype=np.int16)
            for i, (a, b) in enumerate(edges):
                ej[i] = (a, b)
            F.append(feat); V.append(valid); EE.append(ej); EC.append(len(edges)); EN.append(env)
            kept += 1
        except Exception:
            skipped += 1
    return (np.stack(F), np.stack(V), np.stack(EE),
            np.array(EC, np.int32), np.stack(EN), kept, skipped)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", default="train")
    ap.add_argument("--msd", default="data/modified-swiss-dwellings-v2")
    ap.add_argument("--out", default="outputs/gsdiff_train.npz")
    ap.add_argument("--n", type=int, default=None)
    a = ap.parse_args()
    F, V, EE, EC, EN, kept, skipped = build(a.msd, a.split, a.n)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    np.savez_compressed(a.out, feat=F, valid=V, edges=EE, ecount=EC, env=EN,
                        n_max=N_MAX, e_max=E_MAX, env_size=ENV)
    print(f"kept {kept} (skipped {skipped}); feat {F.shape} env {EN.shape} -> {a.out}")


if __name__ == "__main__":
    main()
