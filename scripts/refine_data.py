"""
Cache (U-Net prediction, real target, free mask) pairs to train a REFINEMENT
model that maps the U-Net's rough room layout to the clean real layout.

  input  = U-Net argmax room-type map  (good distribution, jagged)
  target = real graph_out rasterized    (clean, rectangular)
  + free = building interior mask

    python scripts/refine_data.py --weights outputs/models/mi300x-full-100ep/weights.pt \
        --train data/modified-swiss-dwellings-v2/train --out outputs/refine_train.npz
"""
from __future__ import annotations

import argparse
import glob
import os
import pickle
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "model"))
import unet_seg as U          # noqa: E402
import unet_common as C       # noqa: E402

OUT_RES = 128


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default="outputs/models/mi300x-full-100ep/weights.pt")
    ap.add_argument("--train", default="data/modified-swiss-dwellings-v2/train")
    ap.add_argument("--out", default="outputs/refine_train.npz")
    ap.add_argument("--n", type=int, default=None)
    a = ap.parse_args()

    import torch
    dev = U._device()
    ckpt = torch.load(a.weights, map_location=dev)
    size = ckpt["size"]
    mu, sd = ckpt["mu"].cpu(), ckpt["sd"].cpu()
    base = ckpt.get("base", 24)
    model = U.build_model(base) if "base" in ckpt else U.build_model()
    model.load_state_dict(ckpt["model"])
    model.to(dev).eval()
    print(f"device={dev} unet size={size} base={base}")

    ids = [os.path.splitext(os.path.basename(f))[0]
           for f in sorted(glob.glob(os.path.join(a.train, "graph_in", "*.pickle")))]
    if a.n:
        ids = ids[: a.n]
    idx = np.linspace(0, size - 1, OUT_RES).round().astype(int)

    PRED, TGT, FREE = [], [], []
    for j, tid in enumerate(ids):
        try:
            x, col, row = U.make_input(os.path.join(a.train, "struct_in", f"{tid}.npy"), size)
            gin = pickle.load(open(os.path.join(a.train, "graph_in", f"{tid}.pickle"), "rb"))
            f = (torch.tensor(C.graph_in_feature(gin), dtype=torch.float32) - mu) / sd
            with torch.no_grad():
                out = model(torch.tensor(x[None]).to(dev), f[None].to(dev))
                lab = out.argmax(1)[0].cpu().numpy().astype(np.int64)
            free = x[0] > 0.5
            lab = np.where(free, lab, 0)
            g = pickle.load(open(os.path.join(a.train, "graph_out", f"{tid}.pickle"), "rb"))
            tgt = C.rasterize_target(g, col, row, size)
            PRED.append(lab[np.ix_(idx, idx)].astype(np.uint8))
            TGT.append(tgt[np.ix_(idx, idx)].astype(np.uint8))
            FREE.append(free[np.ix_(idx, idx)].astype(np.uint8))
        except Exception:
            continue
        if (j + 1) % 500 == 0:
            print(f"  {j + 1}/{len(ids)}")

    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    np.savez_compressed(a.out, pred=np.stack(PRED), target=np.stack(TGT),
                        free=np.stack(FREE), res=OUT_RES)
    print(f"cached {len(PRED)} pairs at {OUT_RES}px -> {a.out}")


if __name__ == "__main__":
    main()
