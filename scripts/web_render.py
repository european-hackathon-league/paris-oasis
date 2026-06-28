"""
On-demand renderer for REAL MSD dataset samples, used by the website's
/api/sample route. Renders one real plan (by split+id) to a PNG.

    python scripts/web_render.py --split train --id 10000 --kind rooms --out o.png

kinds:
  walls  -> struct_in channel-0 wall/free mask (the given structure)
  rooms  -> graph_out rendered with the OFFICIAL MSD plot_floor (colored rooms)
  graph  -> graph_out access graph: room-type-colored nodes at centroids + edges
  pred   -> a generated graph_out pickle from an outputs/ dir (--pred-dir)
"""
from __future__ import annotations

import argparse
import os
import pickle
import sys

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src", "eval"))
sys.path.insert(0, os.path.join(ROOT, "src", "msd_vendor"))

# room_type -> (name, color), matching the MSD palette / data.json
ROOM_COLORS = {
    0: "#1f77b4", 1: "#e6550d", 2: "#fd8d3c", 3: "#fdae6b", 4: "#fdd0a2",
    5: "#72246c", 6: "#5254a3", 7: "#6b6ecf", 8: "#2ca02c",
}


def _save(fig, out, size):
    fig.savefig(out, dpi=100, facecolor="white", bbox_inches=None)
    plt.close(fig)


def _postprocess(out, crop=False, rot=0):
    """Optionally trim the white margins and rotate the saved PNG. Lets thumbnails
    show the plan bigger (rotate a portrait plan 90 deg -> fills a wide box)."""
    if not crop and not rot:
        return
    from PIL import Image, ImageChops
    im = Image.open(out).convert("RGB")
    if crop:
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bbox = ImageChops.difference(im, bg).getbbox()
        if bbox:
            pad = 6
            l, t, r, b = bbox
            im = im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))
    if rot:
        im = im.rotate(rot, expand=True, fillcolor=(255, 255, 255))
    im.save(out)


def render_walls(split_dir, sid, out, size):
    s = np.load(os.path.join(split_dir, "struct_in", f"{sid}.npy")).astype(np.float32)
    free = (s[..., 0] > 127).astype(np.float32)  # 1 free, 0 wall
    fig = plt.figure(figsize=(size / 100, size / 100), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off")
    # walls black, free white
    ax.imshow(free, cmap="gray", vmin=0, vmax=1, interpolation="nearest")
    _save(fig, out, size)


def render_rooms(split_dir, sid, out, size, pickle_path=None, overlay_real_dir=None):
    import plot as msd_plot  # noqa
    p = pickle_path or os.path.join(split_dir, "graph_out", f"{sid}.pickle")
    with open(p, "rb") as fh:
        G = pickle.load(fh)
    fig = plt.figure(figsize=(size / 100, size / 100), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor("white")
    try:
        if G.number_of_nodes() > 0:
            msd_plot.plot_floor(G, ax)
    except Exception:
        pass  # degenerate generated plan -> blank canvas
    # Optionally overlay the REAL plan's wall structure (room boundaries) in the
    # same world frame, so you can see how the generated rooms fit the actual
    # building. Same coordinates as plot_floor -> overlays align.
    if overlay_real_dir:
        try:
            with open(os.path.join(overlay_real_dir, f"{sid}.pickle"), "rb") as fh:
                RG = pickle.load(fh)
            for _, d in RG.nodes(data=True):
                geom = d.get("geometry")
                if not geom:
                    continue
                arr = np.asarray(geom, dtype=float)
                if arr.ndim != 2 or len(arr) < 2:
                    continue
                xs = np.append(arr[:, 0], arr[0, 0])
                ys = np.append(arr[:, 1], arr[0, 1])
                ax.plot(xs, ys, color="#0b1220", lw=1.4, alpha=0.6, zorder=6)
        except Exception:
            pass  # no real reference -> just the generated plan
    ax.set_aspect("equal"); ax.axis("off"); ax.margins(0.02)
    _save(fig, out, size)


def render_graph(split_dir, sid, out, size, pickle_path=None):
    p = pickle_path or os.path.join(split_dir, "graph_out", f"{sid}.pickle")
    with open(p, "rb") as fh:
        G = pickle.load(fh)
    fig = plt.figure(figsize=(size / 100, size / 100), dpi=100)
    ax = fig.add_axes([0.02, 0.02, 0.96, 0.96])
    ax.set_facecolor("white")
    pos = {}
    for nid, d in G.nodes(data=True):
        c = d.get("centroid")
        if c is None and "geometry" in d:
            arr = np.asarray(d["geometry"], dtype=float)
            c = (arr[:, 0].mean(), arr[:, 1].mean())
        if c is not None:
            c = (float(c[0]), float(c[1]))   # centroids may be tensors
        pos[nid] = c
    for u, v in G.edges():
        if pos.get(u) is not None and pos.get(v) is not None:
            ax.plot([pos[u][0], pos[v][0]], [pos[u][1], pos[v][1]],
                    color="#888", lw=1.2, zorder=1)
    for nid, d in G.nodes(data=True):
        if pos.get(nid) is None:
            continue
        rt = int(d.get("room_type", 0))
        ax.scatter(pos[nid][0], pos[nid][1], s=90, zorder=2,
                   color=ROOM_COLORS.get(rt, "#333"), edgecolors="white", linewidths=0.8)
    ax.set_aspect("equal"); ax.axis("off"); ax.invert_yaxis()
    _save(fig, out, size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--msd", default="data/modified-swiss-dwellings-v2")
    ap.add_argument("--split", default="train", choices=["train", "test"])
    ap.add_argument("--id", required=True)
    ap.add_argument("--kind", required=True, choices=["walls", "rooms", "graph", "pred"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--size", type=int, default=512)
    ap.add_argument("--pred-dir", default=None, help="dir of generated graph_out pickles for kind=pred")
    ap.add_argument("--overlay-real", default=None, help="dir of REAL graph_out pickles to overlay (wall structure)")
    ap.add_argument("--crop", action="store_true", help="trim white margins from the saved PNG")
    ap.add_argument("--rot", type=int, default=0, help="rotate the saved PNG by N degrees")
    a = ap.parse_args()

    split_dir = os.path.join(a.msd, a.split)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    if a.kind == "walls":
        render_walls(split_dir, a.id, a.out, a.size)
    elif a.kind == "rooms":
        render_rooms(split_dir, a.id, a.out, a.size)
    elif a.kind == "graph":
        render_graph(split_dir, a.id, a.out, a.size)
    elif a.kind == "pred":
        if not a.pred_dir:
            sys.exit("--pred-dir required for kind=pred")
        render_rooms(split_dir, a.id, a.out, a.size,
                     pickle_path=os.path.join(a.pred_dir, f"{a.id}.pickle"),
                     overlay_real_dir=a.overlay_real)
    _postprocess(a.out, crop=a.crop, rot=a.rot)
    print(a.out)


if __name__ == "__main__":
    main()
