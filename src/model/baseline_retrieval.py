"""
Baseline v1 — conditioned nearest-neighbour retrieval.

For each input access graph (`graph_in`), find the most structurally similar
TRAIN sample and emit that sample's `graph_out` as the prediction. This conditions
on the input (node count, zoning mix, connectivity) and always produces a real,
valid floor-plan graph, so it renders to realistic images and sets a strong
reference on the distributional metrics (FID / density / coverage).

It deliberately does NOT use the given walls in `struct_in` — that is the lever
for a stronger v2 (segment the walls into rooms and label them). See README §9.

Usage:
    python src/model/baseline_retrieval.py \
        --train <MSD>/train --test <MSD>/test --out outputs/generated --n 800
"""
from __future__ import annotations

import argparse
import glob
import os
import pickle
import sys
from collections import Counter

import numpy as np
from sklearn.neighbors import NearestNeighbors

MAX_ZONING = 8          # zoning_type ids observed are small; 8 bins is safe
CONN_KINDS = ["door", "passage", "entrance"]


def graph_feature(G) -> np.ndarray:
    """Structural descriptor of an access graph: [n_nodes, zoning hist, conn counts]."""
    zhist = np.zeros(MAX_ZONING, dtype=np.float32)
    for _, att in G.nodes(data=True):
        z = att.get("zoning_type")
        if z is not None and 0 <= z < MAX_ZONING:
            zhist[z] += 1
    conn = Counter(d.get("connectivity") for _, _, d in G.edges(data=True))
    cvec = np.array([conn.get(k, 0) for k in CONN_KINDS], dtype=np.float32)
    n = np.float32(G.number_of_nodes())
    return np.concatenate([[n], zhist, cvec])


def _load_dir(path: str, limit: int | None = None):
    files = sorted(glob.glob(os.path.join(path, "*.pickle")))
    if limit:
        files = files[:limit]
    ids, graphs = [], []
    for f in files:
        ids.append(os.path.splitext(os.path.basename(f))[0])
        with open(f, "rb") as fh:
            graphs.append(pickle.load(fh))
    return ids, graphs


def main() -> None:
    import torch  # noqa: F401  (graph_out centroids are torch tensors → needed to (un)pickle)

    ap = argparse.ArgumentParser()
    ap.add_argument("--train", required=True, help="MSD train split dir (has graph_in/ graph_out/)")
    ap.add_argument("--test", required=True, help="MSD test split dir (has graph_in/)")
    ap.add_argument("--out", default="outputs/generated", help="dir to write predicted graph_out pickles")
    ap.add_argument("--n", type=int, default=None, help="cap number of test queries")
    args = ap.parse_args()

    print("Indexing train access graphs ...")
    train_ids, train_in = _load_dir(os.path.join(args.train, "graph_in"))
    X = np.vstack([graph_feature(G) for G in train_in])
    # standardize so node-count doesn't dominate
    mu, sd = X.mean(0), X.std(0) + 1e-6
    nn = NearestNeighbors(n_neighbors=1).fit((X - mu) / sd)

    print("Loading test queries ...")
    test_ids, test_in = _load_dir(os.path.join(args.test, "graph_in"), args.n)
    Q = (np.vstack([graph_feature(G) for G in test_in]) - mu) / sd
    _, idx = nn.kneighbors(Q)

    os.makedirs(args.out, exist_ok=True)
    for i, tid in enumerate(test_ids):
        match_id = train_ids[int(idx[i, 0])]
        with open(os.path.join(args.train, "graph_out", f"{match_id}.pickle"), "rb") as fh:
            pred = pickle.load(fh)
        with open(os.path.join(args.out, f"{tid}.pickle"), "wb") as fh:
            pickle.dump(pred, fh)
    print(f"Wrote {len(test_ids)} predictions to {args.out}")


if __name__ == "__main__":
    main()
