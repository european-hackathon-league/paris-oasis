"""
Refinement model (baseline v5): learn to map the U-Net's rough room layout to the
clean real layout. A second U-Net takes the first U-Net's argmax map (one-hot) +
the building interior and predicts the clean room-type map, supervised by the real
rasterized graph_out. Keeps the U-Net's learned distribution + sizes, cleans the
geometry.

    python src/model/refine_model.py train    --data outputs/refine_train.npz --epochs 60
    python src/model/refine_model.py generate  --test <MSD>/test --out outputs/generated_refine --n 800
"""
from __future__ import annotations

import argparse
import glob
import os
import pickle
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import unet_seg as U          # noqa: E402
import unet_common as C       # noqa: E402

N_CLASS = C.N_CLASSES          # 10
RES = 128
REF_W = os.environ.get("REFINER_WEIGHTS", "outputs/refiner.pt")
UNET_W = os.environ.get("REFINE_UNET", "outputs/models/mi300x-full-100ep/weights.pt")


def build_refiner(base=32, in_ch=N_CLASS + 1, n=N_CLASS):
    import torch
    import torch.nn as nn

    def block(ci, co):
        return nn.Sequential(
            nn.Conv2d(ci, co, 3, padding=1), nn.BatchNorm2d(co), nn.ReLU(True),
            nn.Conv2d(co, co, 3, padding=1), nn.BatchNorm2d(co), nn.ReLU(True))

    class R(nn.Module):
        def __init__(self):
            super().__init__()
            self.e1 = block(in_ch, base); self.e2 = block(base, base * 2); self.e3 = block(base * 2, base * 4)
            self.pool = nn.MaxPool2d(2); self.bott = block(base * 4, base * 8)
            self.up3 = nn.ConvTranspose2d(base * 8, base * 4, 2, stride=2); self.d3 = block(base * 8, base * 4)
            self.up2 = nn.ConvTranspose2d(base * 4, base * 2, 2, stride=2); self.d2 = block(base * 4, base * 2)
            self.up1 = nn.ConvTranspose2d(base * 2, base, 2, stride=2); self.d1 = block(base * 2, base)
            self.head = nn.Conv2d(base, n, 1)

        def forward(self, x):
            e1 = self.e1(x); e2 = self.e2(self.pool(e1)); e3 = self.e3(self.pool(e2))
            b = self.bott(self.pool(e3))
            d3 = self.d3(torch.cat([self.up3(b), e3], 1))
            d2 = self.d2(torch.cat([self.up2(d3), e2], 1))
            d1 = self.d1(torch.cat([self.up1(d2), e1], 1))
            return self.head(d1)

    return R()


def _inp(pred, free, dev):
    """pred (B,H,W) uint8/long, free (B,H,W) -> (B,N+1,H,W) float."""
    import torch
    import torch.nn.functional as F
    oh = F.one_hot(pred.long(), N_CLASS).permute(0, 3, 1, 2).float()
    return torch.cat([oh, free[:, None].float()], dim=1).to(dev)


def train(args):
    import torch
    import torch.nn as nn
    dev = U._device()
    print(f"device={dev}")
    z = np.load(args.data)
    pred = torch.tensor(z["pred"]); tgt = torch.tensor(z["target"]).long(); free = torch.tensor(z["free"])
    M = len(pred)
    print(f"data: {M} pairs at {z['res']}px")
    model = build_refiner().to(dev)
    w = torch.ones(N_CLASS); w[0] = 0.3
    crit = nn.CrossEntropyLoss(weight=w.to(dev))
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    bs = args.batch
    for ep in range(args.epochs):
        perm = torch.randperm(M)
        tot = 0.0
        model.train()
        for k in range(0, M, bs):
            idx = perm[k:k + bs]
            x = _inp(pred[idx], free[idx], dev)
            t = tgt[idx].to(dev)
            out = model(x)
            loss = crit(out, t)
            opt.zero_grad(); loss.backward(); opt.step()
            tot += loss.item() * len(idx)
        if (ep + 1) % 5 == 0 or ep == 0:
            print(f"epoch {ep+1}/{args.epochs}  loss={tot/M:.4f}")
    os.makedirs(os.path.dirname(REF_W), exist_ok=True)
    torch.save({"model": model.state_dict()}, REF_W)
    print(f"saved -> {REF_W}")


def generate(args):
    import torch
    dev = U._device()
    uck = torch.load(UNET_W, map_location=dev)
    size = uck["size"]; mu, sd = uck["mu"].cpu(), uck["sd"].cpu(); base = uck.get("base", 24)
    unet = U.build_model(base) if "base" in uck else U.build_model()
    unet.load_state_dict(uck["model"]); unet.to(dev).eval()
    refiner = build_refiner().to(dev)
    refiner.load_state_dict(torch.load(REF_W, map_location=dev)["model"]); refiner.eval()

    ids = [os.path.splitext(os.path.basename(f))[0]
           for f in sorted(glob.glob(os.path.join(args.test, "graph_in", "*.pickle")))]
    if args.n:
        ids = ids[: args.n]
    os.makedirs(args.out, exist_ok=True)
    idx = np.linspace(0, size - 1, RES).round().astype(int)
    written = 0
    for j, tid in enumerate(ids):
        try:
            x, col, row = U.make_input(os.path.join(args.test, "struct_in", f"{tid}.npy"), size)
            gin = pickle.load(open(os.path.join(args.test, "graph_in", f"{tid}.pickle"), "rb"))
            f = (torch.tensor(C.graph_in_feature(gin), dtype=torch.float32) - mu) / sd
            with torch.no_grad():
                u = unet(torch.tensor(x[None]).to(dev), f[None].to(dev)).argmax(1)[0].cpu().numpy()
                free = x[0] > 0.5
                u = np.where(free, u, 0)
                p128 = torch.tensor(u[np.ix_(idx, idx)][None])
                fr128 = torch.tensor(free[np.ix_(idx, idx)][None].astype(np.float32))
                r = refiner(_inp(p128, fr128, dev)).argmax(1)[0].cpu().numpy().astype(np.int64)
            free128 = free[np.ix_(idx, idx)]
            r = np.where(free128, r, 0)
            g = C.vectorize(r, col[idx], row[idx])
            with open(os.path.join(args.out, f"{tid}.pickle"), "wb") as fh:
                pickle.dump(g, fh)
            written += 1
        except Exception:
            continue
        if (j + 1) % 200 == 0:
            print(f"  {j + 1}/{len(ids)}")
    print(f"Wrote {written}/{len(ids)} -> {args.out}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("train")
    t.add_argument("--data", default="outputs/refine_train.npz")
    t.add_argument("--epochs", type=int, default=60)
    t.add_argument("--batch", type=int, default=48)
    g = sub.add_parser("generate")
    g.add_argument("--test", required=True)
    g.add_argument("--out", default="outputs/generated_refine")
    g.add_argument("--n", type=int, default=None)
    a = ap.parse_args()
    train(a) if a.cmd == "train" else generate(a)


if __name__ == "__main__":
    main()
