"""
Baseline v8 — door-graph-FAITHFUL rectilinear partition (DoorDet-inspired).

Finding: our best generator (rectilinear) honours the given door/passage/entrance
edges only 41% of the time — it orders rooms by a 1D PCA of the spring layout,
which scatters graph-adjacent rooms to opposite ends. Real plans are 100%
faithful, and that adjacency structure is exactly what FID / coverage reward.

Fix: slice by GRAPH BISECTION instead of 1D order. At each step we cut the
node-set into two CONNECTED halves (balanced by area) and give each a spatial
half of the rectangle; recursing keeps door-connected rooms in the same region,
so they come out adjacent — with the same clean, wall-aligned rectangles.

    python src/model/baseline_doorplan.py --test <MSD>/test --train <MSD>/train --out outputs/generated_door --n 400
"""
from __future__ import annotations

import argparse
import glob
import os
import pickle
import sys

import numpy as np
import networkx as nx
import torch

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)
sys.path.insert(0, os.path.join(_HERE, "..", "eval"))

from labeling import learn_mapping, fallback_mapping, label  # noqa: E402
from baseline_rect import interior_mask, building_angle, region_to_poly, DEFAULT_AREA  # noqa: E402
from validate import validate_graph_out  # noqa: E402


def _bfs_order(G):
    """Connected-prefix node order: BFS within each component from a peripheral node."""
    order = []
    for comp in nx.connected_components(G):
        sub = G.subgraph(comp)
        s = min(comp, key=lambda n: sub.degree(n))
        order += list(nx.bfs_tree(sub, s).nodes())
    return order


def connected_bisect(G, area):
    """Split G's nodes into two parts (A connected, balanced by area)."""
    nodes = list(G.nodes)
    total = sum(area[n] for n in nodes) or 1.0
    order = _bfs_order(G)
    A, acc = [], 0.0
    for n in order:
        A.append(n)
        acc += area[n]
        if acc >= total / 2 and len(A) < len(nodes):
            break
    aset = set(A)
    B = [n for n in nodes if n not in aset]
    if not B:                       # safety
        B = [A.pop()]
    return A, B


def predict(graph_in, struct_in, mapping, rules):
    interior, col_x, row_y = interior_mask(struct_in)
    ys, xs = np.where(interior)
    if len(ys) < 10:
        raise ValueError("interior too small")
    theta = building_angle(interior)
    ct, st = np.cos(theta), np.sin(theta)
    u_all = xs * ct + ys * st
    v_all = -xs * st + ys * ct

    nodes = list(graph_in.nodes)
    rts = {n: (int(graph_in.nodes[n]["room_type"]) if graph_in.nodes[n].get("room_type") is not None
               else label(graph_in.nodes[n].get("zoning_type"), mapping)) for n in nodes}
    af = rules.get("area_frac", DEFAULT_AREA)
    area = {n: max(float(graph_in.nodes[n].get("area")
                         or af.get(str(rts[n]), af.get(rts[n], 0.05))), 1e-3) for n in nodes}

    labels = np.full(len(ys), -1, dtype=int)
    nid = {n: i for i, n in enumerate(nodes)}

    def rec(idx, sub):
        sn = list(sub.nodes)
        if len(sn) == 1:
            labels[idx] = nid[sn[0]]
            return
        if len(idx) <= len(sn):
            for j, n in enumerate(sn):
                if j < len(idx):
                    labels[idx[j]] = nid[n]
            return
        A, B = connected_bisect(sub, area)
        fa = sum(area[n] for n in A) / (sum(area[n] for n in sn) or 1.0)
        uu, vv = u_all[idx], v_all[idx]
        o = np.argsort(uu, kind="stable") if (uu.max() - uu.min()) >= (vv.max() - vv.min()) \
            else np.argsort(vv, kind="stable")
        cut = max(1, min(len(idx) - 1, int(round(fa * len(idx)))))
        rec(idx[o[:cut]], sub.subgraph(A))
        rec(idx[o[cut:]], sub.subgraph(B))

    rec(np.arange(len(ys)), graph_in)

    lab = np.zeros(interior.shape, dtype=int)
    lab[ys, xs] = labels + 1

    G = nx.Graph()
    G.graph.update(graph_in.graph)
    for n in nodes:
        poly = region_to_poly(lab == (nid[n] + 1), col_x, row_y)
        if poly is None:
            raise ValueError(f"empty cell for node {n}")
        G.add_node(n, geometry=list(zip(*poly.exterior.coords.xy)), room_type=rts[n],
                   centroid=torch.tensor([poly.centroid.x, poly.centroid.y]))
    for u, v, d in graph_in.edges(data=True):
        G.add_edge(u, v, connectivity=d.get("connectivity"))
    return G


def _load(p):
    with open(p, "rb") as fh:
        return pickle.load(fh)


def _struct(test_dir, tid):
    for ext in (".npy", ".npz"):
        p = os.path.join(test_dir, "struct_in", f"{tid}{ext}")
        if os.path.exists(p):
            a = np.load(p)
            return a[a.files[0]] if hasattr(a, "files") else a
    raise FileNotFoundError(tid)


def run(args):
    mapping = learn_mapping(args.train) if args.train and os.path.isdir(args.train) else fallback_mapping()
    ids = [os.path.splitext(os.path.basename(f))[0]
           for f in sorted(glob.glob(os.path.join(args.test, "graph_in", "*.pickle")))]
    if args.n:
        ids = ids[: args.n]
    os.makedirs(args.out, exist_ok=True)
    written, failed = 0, []
    for tid in ids:
        try:
            gi = _load(os.path.join(args.test, "graph_in", f"{tid}.pickle"))
            G = predict(gi, _struct(args.test, tid), mapping, {})
            problems = validate_graph_out(G, gi)
            if problems:
                raise ValueError("; ".join(problems))
            with open(os.path.join(args.out, f"{tid}.pickle"), "wb") as fh:
                pickle.dump(G, fh)
            written += 1
        except Exception as e:
            failed.append((tid, str(e)))
    print(f"Wrote {written}/{len(ids)} -> {args.out}")
    if failed:
        print(f"[!] {len(failed)} failed; first: {failed[:4]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--test", required=True)
    ap.add_argument("--train")
    ap.add_argument("--out", default="outputs/generated_door")
    ap.add_argument("--n", type=int, default=None)
    run(ap.parse_args())


if __name__ == "__main__":
    main()
