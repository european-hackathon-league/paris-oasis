"""
Bake static visualization assets for the web app.

Renders a curated set of sample floor plans in three layers (walls / rooms /
rooms+access-graph) and exports real dataset statistics to JSON. The web app
ships these assets, so it never needs the 16 GB dataset at runtime.

Run:  python web/scripts/generate_assets.py
Out:  web/public/data/data.json  +  web/public/data/samples/*.png
"""
from __future__ import annotations

import glob
import json
import os
import pickle
import sys
from collections import Counter

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPolygon

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MSD = os.path.join(ROOT, "data", "modified-swiss-dwellings-v2")
OUT = os.path.join(ROOT, "web", "public", "data")
SAMPLES_DIR = os.path.join(OUT, "samples")

sys.path.insert(0, os.path.join(ROOT, "src", "msd_vendor"))
import plot as msd_plot          # noqa: E402
from constants import COLORS_ROOMTYPE, ROOM_NAMES  # noqa: E402

import torch  # noqa: F401  (graph_out centroids are torch tensors)

N_SAMPLES = 18
STATS_N = 600          # how many train graphs to aggregate stats over
PX = 560               # render size


def _save_ax(fig, path):
    fig.savefig(path, dpi=100, bbox_inches="tight", pad_inches=0.04, transparent=True)
    plt.close(fig)


def render_walls(struct_in, path):
    wall = struct_in[..., 0] == 0
    wx = struct_in[..., 2][wall]
    wy = struct_in[..., 1][wall]
    fig = plt.figure(figsize=(PX / 100, PX / 100))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.scatter(wx, wy, s=1.2, c="#0f172a", marker="s", linewidths=0)
    ax.set_aspect("equal"); ax.axis("off"); ax.invert_yaxis()
    _save_ax(fig, path)


def render_rooms(G, path, with_graph):
    fig = plt.figure(figsize=(PX / 100, PX / 100))
    ax = fig.add_axes([0, 0, 1, 1])
    for n in G.nodes:
        rt = G.nodes[n].get("room_type", 0)
        color = COLORS_ROOMTYPE[rt % len(COLORS_ROOMTYPE)]
        poly = np.array(G.nodes[n]["geometry"])
        ax.add_patch(MplPolygon(poly, closed=True, facecolor=color,
                                edgecolor="white", linewidth=1.2))
    if with_graph:
        import networkx as nx
        pos = {n: np.array(G.nodes[n]["centroid"]) for n in G.nodes}
        nx.draw_networkx_nodes(G, pos, node_size=22, node_color="black", ax=ax)
        de = [(u, v) for u, v, d in G.edges(data="connectivity") if d in ("door", "passage")]
        en = [(u, v) for u, v, d in G.edges(data="connectivity") if d == "entrance"]
        nx.draw_networkx_edges(G, pos, edgelist=de, edge_color="black", width=1.6, ax=ax)
        nx.draw_networkx_edges(G, pos, edgelist=en, edge_color="#dc2626", width=3, ax=ax)
    ax.autoscale_view()
    ax.set_aspect("equal"); ax.axis("off"); ax.invert_yaxis()
    _save_ax(fig, path)


def main():
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    test_go = sorted(glob.glob(os.path.join(MSD, "test", "graph_out", "*.pickle")))

    # ---- pick a spread of sizes ----
    sized = []
    for f in test_go[:400]:
        G = pickle.load(open(f, "rb"))
        sized.append((G.number_of_nodes(), os.path.splitext(os.path.basename(f))[0]))
    sized.sort()
    pick_idx = np.linspace(0, len(sized) - 1, N_SAMPLES).astype(int)
    picks = [sized[i][1] for i in pick_idx]

    samples = []
    for k, sid in enumerate(picks):
        G = pickle.load(open(os.path.join(MSD, "test", "graph_out", f"{sid}.pickle"), "rb"))
        si = np.load(os.path.join(MSD, "test", "struct_in", f"{sid}.npy")).astype(np.float32)
        render_walls(si, os.path.join(SAMPLES_DIR, f"{sid}_walls.png"))
        render_rooms(G, os.path.join(SAMPLES_DIR, f"{sid}_rooms.png"), with_graph=False)
        render_rooms(G, os.path.join(SAMPLES_DIR, f"{sid}_graph.png"), with_graph=True)
        rts = [G.nodes[n].get("room_type", 0) for n in G.nodes]
        samples.append({
            "id": sid,
            "rooms": G.number_of_nodes(),
            "connections": G.number_of_edges(),
            "roomTypes": sorted(set(int(r) for r in rts)),
            "walls": f"data/samples/{sid}_walls.png",
            "roomsImg": f"data/samples/{sid}_rooms.png",
            "graphImg": f"data/samples/{sid}_graph.png",
        })
        print(f"  rendered sample {k+1}/{len(picks)}  (id {sid}, {G.number_of_nodes()} rooms)")

    # ---- aggregate stats over train ----
    rt_counter = Counter()
    rooms_per_apt = []
    train_go = sorted(glob.glob(os.path.join(MSD, "train", "graph_out", "*.pickle")))[:STATS_N]
    for f in train_go:
        G = pickle.load(open(f, "rb"))
        rooms_per_apt.append(G.number_of_nodes())
        for n in G.nodes:
            rt_counter[int(G.nodes[n].get("room_type", 0))] += 1

    room_types = [{
        "id": i, "name": ROOM_NAMES[i] if i < len(ROOM_NAMES) else f"type{i}",
        "color": COLORS_ROOMTYPE[i % len(COLORS_ROOMTYPE)],
        "count": rt_counter.get(i, 0),
    } for i in range(len(ROOM_NAMES))]

    rpa = np.array(rooms_per_apt)
    hist_counts, hist_edges = np.histogram(rpa, bins=range(int(rpa.min()), int(rpa.max()) + 2))
    rooms_hist = [{"rooms": int(hist_edges[i]), "count": int(c)} for i, c in enumerate(hist_counts)]

    # ---- eval results (if present) ----
    def _load_json(p):
        try:
            return json.load(open(p))
        except Exception:
            return None
    eval_baseline = _load_json(os.path.join(ROOT, "outputs", "eval_baseline.json"))

    data = {
        "stats": {
            "apartments": 18902, "floors": 5372, "geometries": 1086846,
            "trainSamples": 4572, "testSamples": 800,
            "statsOver": len(train_go),
            "avgRooms": round(float(rpa.mean()), 1),
            "medianRooms": int(np.median(rpa)),
        },
        "roomTypes": room_types,
        "roomsHistogram": rooms_hist,
        "samples": samples,
        "eval": {
            "baseline": eval_baseline,
            "note": "Self-consistent local eval; retrieval baseline ≈ real-vs-real ceiling.",
        },
    }
    with open(os.path.join(OUT, "data.json"), "w") as fh:
        json.dump(data, fh, indent=2)
    print(f"\nWrote {os.path.join(OUT, 'data.json')} and {len(samples)*3} sample images.")


if __name__ == "__main__":
    main()
