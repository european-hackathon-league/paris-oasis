"""
Parametric Studio: a room PROGRAM (which room types, how many, optional m²) plus a
hand-drawn building outline -> a rectilinear layout that honours the program.

The program becomes an access graph (one node per requested room, room_type set
directly, a corridor-centred access tree), and the drawn outline becomes the
envelope. baseline_rect.layout then places exactly those rooms inside it — so the
room COUNT, TYPES and the balcony-outside rule are guaranteed.

    python scripts/parametric_predict.py --in sketch.png --out plan.png \
        --program '{"rooms":[{"type":0,"count":3},{"type":4,"count":1}], "areas":{"0":14}}'
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter

import networkx as nx
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src", "model"))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import baseline_rect as R           # noqa: E402
from canvas_predict import build_input, render_aligned, ROOM_NAMES, ROOM_COLORS  # noqa: E402

CIRCULATION = {4, 5}  # corridor, stairs


def build_program_graph(room_types, areas=None) -> nx.Graph:
    """A program -> access graph: one 1-indexed node per room, corridor-centred tree."""
    areas = areas or {}
    G = nx.Graph()
    K = len(room_types)
    for i, rt in enumerate(room_types, start=1):
        attrs = {"room_type": int(rt)}
        if int(rt) in areas:
            attrs["area"] = float(areas[int(rt)])
        G.add_node(i, **attrs)
    hubs = [i for i, rt in enumerate(room_types, 1) if rt in CIRCULATION]
    if hubs:
        hub = hubs[0]
        for i in range(1, K + 1):
            if i != hub and not G.has_edge(i, hub):
                G.add_edge(i, hub, connectivity="door")
    else:
        for i in range(1, K):
            G.add_edge(i, i + 1, connectivity="door")
    e0 = next(iter(G.edges), None)
    if e0:
        G.edges[e0]["connectivity"] = "entrance"
    return G


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--program", required=True, help="JSON: {rooms:[{type,count}], areas:{type:m2}}")
    ap.add_argument("--size", type=int, default=256)
    a = ap.parse_args()

    prog = json.loads(a.program)
    room_types = []
    for r in prog.get("rooms", []):
        room_types += [int(r["type"])] * max(0, int(r.get("count", 0)))
    if not room_types:
        print(json.dumps({"ok": False, "error": "no rooms requested"})); return
    if len(room_types) > 60:
        print(json.dumps({"ok": False, "error": "too many rooms (max 60)"})); return
    areas = {int(k): float(v) for k, v in prog.get("areas", {}).items()}

    G = build_program_graph(room_types, areas)
    _, col_vals, row_vals, free = build_input(a.inp, a.size)
    if free.sum() < 50:
        print(json.dumps({"ok": False, "error": "draw a closed building outline first"})); return

    try:
        out = R.layout(G, free, col_vals, row_vals, mapping=None, rules={})
    except Exception as e:
        print(json.dumps({"ok": False, "error": f"layout failed: {e}"})); return

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    Image.fromarray(render_aligned(out, col_vals, row_vals, free, size=512)).save(a.out)

    cnt = Counter(int(d["room_type"]) for _, d in out.nodes(data=True))
    rooms_doc = [{"type": rt, "name": ROOM_NAMES.get(rt, str(rt)), "color": ROOM_COLORS.get(rt, "#333"),
                  "count": cnt[rt]} for rt in sorted(cnt, key=lambda r: -cnt[r])]
    print(json.dumps({"ok": True, "n_rooms": out.number_of_nodes(),
                      "requested": len(room_types), "rooms": rooms_doc}))


if __name__ == "__main__":
    main()
