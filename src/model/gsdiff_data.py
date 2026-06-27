"""
Build the training set for the GSDiff-style wall-junction diffusion model:
extract every train plan's structural graph, normalize to [-1,1], pad to N_max,
and cache node features + validity + padded edge lists.

Node feature (12): [x, y, room_multihot(9), balcony]
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

N_MAX = 256
E_MAX = 640
FEAT = 2 + N_ROOM + 1  # x,y, room multi-hot(9), balcony  = 12


def normalize(nodes):
    c = nodes.mean(0)
    d = nodes - c
    s = float(np.abs(d).max()) or 1.0
    return d / s


def build(split_dir, n=None):
    files = sorted(glob.glob(os.path.join(split_dir, "graph_out", "*.pickle")))
    if n:
        files = files[:n]
    F, V, EE, EC, kept = [], [], [], [], 0
    skipped = 0
    for f in files:
        try:
            go = pickle.load(open(f, "rb"))
            nodes, rmh, bal, edges = extract_wall_graph(go)
            K = len(nodes)
            if K < 4 or K > N_MAX or len(edges) > E_MAX:
                skipped += 1
                continue
            pos = normalize(nodes)
            feat = np.zeros((N_MAX, FEAT), dtype=np.float32)
            feat[:K, 0:2] = pos
            feat[:K, 2:2 + N_ROOM] = rmh
            feat[:K, 2 + N_ROOM] = bal
            valid = np.zeros(N_MAX, dtype=bool)
            valid[:K] = True
            ej = np.full((E_MAX, 2), -1, dtype=np.int16)
            for i, (a, b) in enumerate(edges):
                ej[i] = (a, b)
            F.append(feat); V.append(valid); EE.append(ej); EC.append(len(edges))
            kept += 1
        except Exception:
            skipped += 1
    return (np.stack(F), np.stack(V), np.stack(EE),
            np.array(EC, dtype=np.int32), kept, skipped)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--split", default="train")
    ap.add_argument("--msd", default="data/modified-swiss-dwellings-v2")
    ap.add_argument("--out", default="outputs/gsdiff_train.npz")
    ap.add_argument("--n", type=int, default=None)
    a = ap.parse_args()
    F, V, EE, EC, kept, skipped = build(os.path.join(a.msd, a.split), a.n)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    np.savez_compressed(a.out, feat=F, valid=V, edges=EE, ecount=EC,
                        n_max=N_MAX, e_max=E_MAX)
    print(f"kept {kept} plans (skipped {skipped}); feat {F.shape} -> {a.out}")


if __name__ == "__main__":
    main()
