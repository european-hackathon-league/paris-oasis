"""
GPU smoke + root-cause diagnostic for the U-Net pipeline.

Answers empirically: are the vectorized U-Net outputs near-empty (a structural
bug) or just undertrained?  Run from repo root inside the venv:

    python scripts/diag_smoke.py --msd data/modified-swiss-dwellings-v2 \
        --ntrain 96 --ntest 24 --size 128 --epochs 5
"""
from __future__ import annotations

import argparse
import glob
import os
import pickle
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src", "model"))
import unet_common as U  # noqa: E402
import unet_seg as S     # noqa: E402


def _ids(split_dir, n):
    files = sorted(glob.glob(os.path.join(split_dir, "graph_in", "*.pickle")))[:n]
    return [os.path.splitext(os.path.basename(f))[0] for f in files]


def _load(p):
    with open(p, "rb") as fh:
        return pickle.load(fh)


def real_graph_stats(split_dir, ids):
    nodes, edges = [], []
    for i in ids:
        g = _load(os.path.join(split_dir, "graph_out", f"{i}.pickle"))
        nodes.append(g.number_of_nodes())
        edges.append(g.number_of_edges())
    return np.array(nodes), np.array(edges)


def target_fill_stats(split_dir, ids, size):
    """How much of each rasterized TARGET is non-background, and #classes."""
    fills, nclasses, ncomp = [], [], []
    from scipy import ndimage
    for i in ids:
        _x, col, row = S.make_input(os.path.join(split_dir, "struct_in", f"{i}.npy"), size)
        g = _load(os.path.join(split_dir, "graph_out", f"{i}.pickle"))
        y = U.rasterize_target(g, col, row, size)
        fills.append(float((y > 0).mean()))
        nclasses.append(int(len(np.unique(y)) - (1 if 0 in y else 0)))
        # count distinct room components rendered
        comp = 0
        for c in range(1, U.N_CLASSES):
            m = y == c
            if m.any():
                _l, k = ndimage.label(m)
                comp += k
        ncomp.append(comp)
    return np.array(fills), np.array(nclasses), np.array(ncomp)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--msd", default="data/modified-swiss-dwellings-v2")
    ap.add_argument("--ntrain", type=int, default=96)
    ap.add_argument("--ntest", type=int, default=24)
    ap.add_argument("--size", type=int, default=128)
    ap.add_argument("--epochs", type=int, default=5)
    a = ap.parse_args()

    import torch
    dev = S._device()
    print(f"=== DEVICE: {dev} | torch {torch.__version__} ===")
    if dev == "cuda":
        print(f"    GPU: {torch.cuda.get_device_name(0)}")

    train_dir = os.path.join(a.msd, "train")
    test_dir = os.path.join(a.msd, "test")
    tr_ids = _ids(train_dir, a.ntrain)
    te_ids = _ids(test_dir, a.ntest)

    # ---- 1. real graph_out reference -------------------------------------
    rn, re = real_graph_stats(test_dir, te_ids)
    print("\n=== REAL test graph_out (reference) ===")
    print(f"  nodes/plan: mean={rn.mean():.1f} min={rn.min()} max={rn.max()}")
    print(f"  edges/plan: mean={re.mean():.1f} min={re.min()} max={re.max()}")

    # ---- 2. TARGET rasterization sanity ----------------------------------
    tf, tc, tcomp = target_fill_stats(train_dir, tr_ids[:24], a.size)
    print(f"\n=== TARGET rasterization @ {a.size}px (train, n=24) ===")
    print(f"  non-bg pixel fraction: mean={tf.mean():.3f} min={tf.min():.3f} max={tf.max():.3f}")
    print(f"  room classes present/plan: mean={tc.mean():.1f}")
    print(f"  room components/plan: mean={tcomp.mean():.1f}  (vs real nodes mean {rn.mean():.1f})")
    if tf.mean() < 0.05:
        print("  [!!] targets are nearly EMPTY -> rasterize_target/coords BUG suspected")
    else:
        print("  [ok] targets are well-populated")

    # ---- 3. tiny GPU training --------------------------------------------
    print(f"\n=== TRAIN (tiny: n={a.ntrain}, size={a.size}, epochs={a.epochs}) ===")
    class Args: pass
    ta = Args(); ta.train = train_dir; ta.size = a.size; ta.n = a.ntrain
    ta.epochs = a.epochs; ta.batch = 16
    import time; t0 = time.time()
    S.train(ta)
    print(f"  train wall: {time.time()-t0:.1f}s")

    # ---- 4. predict + vectorize, measure non-emptiness -------------------
    print(f"\n=== PREDICT + VECTORIZE (test, n={a.ntest}) ===")
    pa = Args(); pa.test = test_dir; pa.size = a.size; pa.n = a.ntest
    pa.out = "outputs/diag_unet"; pa.train = None
    S.predict(pa)

    pn, pe, plab_fill = [], [], []
    ckpt = torch.load(S.WEIGHTS, map_location="cpu")
    for i in te_ids:
        g = _load(os.path.join("outputs/diag_unet", f"{i}.pickle"))
        pn.append(g.number_of_nodes())
        pe.append(g.number_of_edges())
    pn, pe = np.array(pn), np.array(pe)
    print(f"  PREDICTED nodes/plan: mean={pn.mean():.1f} min={pn.min()} max={pn.max()}")
    print(f"  PREDICTED edges/plan: mean={pe.mean():.1f} min={pe.min()} max={pe.max()}")
    print(f"  empty plans (0 nodes): {int((pn == 0).sum())}/{len(pn)}")

    print("\n=== ROOT-CAUSE READOUT ===")
    print(f"  real nodes/plan ~{rn.mean():.1f}  vs  predicted nodes/plan ~{pn.mean():.1f}")
    if pn.mean() < 0.3 * rn.mean():
        print("  [!!] predicted plans have FAR fewer rooms than real -> vectorize/filter")
        print("       (min_px/buffer_px or near-empty argmax) is the prime FID suspect.")
    elif (pn == 0).mean() > 0.2:
        print("  [!!] many fully-empty predictions -> structural bug.")
    else:
        print("  [ok] predictions are populated; low FID is most likely UNDERTRAINING,")
        print("       which the full MI300X run should substantially improve.")


if __name__ == "__main__":
    main()
