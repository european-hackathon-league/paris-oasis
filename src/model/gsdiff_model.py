"""
Boundary-conditioned GSDiff-style wall-junction generator for MSD (baseline v4).

Given a building envelope (struct_in), generate the wall junctions INSIDE it, then
the wall segments, then reconstruct rooms. Two stages:
  1. NODE DIFFUSION — a Transformer DDPM denoises a padded junction set
     (13 channels: x, y, room_multihot(9), balcony, valid) while CROSS-ATTENDING
     to a CNN encoding of the envelope, so junctions land inside the footprint.
     Loss: noise-MSE + grid-snap ALIGNMENT (axis-aligned walls).
  2. EDGE PREDICTION — an MLP over junction pairs, BCE on real wall segments.

    python src/model/gsdiff_model.py train    --data outputs/gsdiff_train.npz --epochs 400
    python src/model/gsdiff_model.py generate  --test <MSD>/test --out outputs/generated_gsdiff --n 800
"""
from __future__ import annotations

import argparse
import functools
import glob
import math
import os
import pickle
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wallgraph import N_ROOM, reconstruct  # noqa: E402
from baseline_rect import interior_mask  # noqa: E402

FEAT = 2 + N_ROOM + 1   # 12 data channels
DCH = FEAT + 1          # + valid = 13 diffused channels
ENV = 64
WEIGHTS = os.environ.get("GSDIFF_WEIGHTS", "outputs/gsdiff.pt")


def _device():
    import torch
    return "cuda" if torch.cuda.is_available() else "cpu"


def env_image(struct_in):
    """Envelope 64x64 mask in its own centred, uniformly-scaled [-1,1] frame."""
    interior, col_x, row_y = interior_mask(struct_in)
    ys, xs = np.where(interior)
    if len(ys) < 20:
        return None
    wx, wy = col_x[xs], row_y[ys]
    cx, cy = 0.5 * (wx.min() + wx.max()), 0.5 * (wy.min() + wy.max())
    sc = 0.5 * max(wx.max() - wx.min(), wy.max() - wy.min()) or 1.0
    env = np.zeros((ENV, ENV), dtype=np.float32)
    gi = np.clip(((( wy - cy) / sc + 1) / 2 * (ENV - 1)).round().astype(int), 0, ENV - 1)
    gj = np.clip(((( wx - cx) / sc + 1) / 2 * (ENV - 1)).round().astype(int), 0, ENV - 1)
    env[gi, gj] = 1.0
    return env


# --------------------------------------------------------------------------- #
def build_models(d_model=256, depth=6, heads=8):
    import torch
    import torch.nn as nn

    class TimeEmb(nn.Module):
        def __init__(self, dim):
            super().__init__()
            self.dim = dim
            self.mlp = nn.Sequential(nn.Linear(dim, dim), nn.SiLU(), nn.Linear(dim, dim))

        def forward(self, t):
            half = self.dim // 2
            freqs = torch.exp(-math.log(10000) * torch.arange(half, device=t.device) / half)
            a = t[:, None] * freqs[None] * 1000.0
            return self.mlp(torch.cat([a.sin(), a.cos()], dim=-1))

    class EnvEncoder(nn.Module):
        def __init__(self):
            super().__init__()
            self.net = nn.Sequential(
                nn.Conv2d(1, 32, 3, 2, 1), nn.GELU(),     # 64->32
                nn.Conv2d(32, 64, 3, 2, 1), nn.GELU(),    # 32->16
                nn.Conv2d(64, d_model, 3, 2, 1), nn.GELU(),  # 16->8
            )

        def forward(self, env):                            # (B,1,64,64)
            h = self.net(env)
            return h.flatten(2).transpose(1, 2)            # (B,64,d_model)

    class Denoiser(nn.Module):
        def __init__(self):
            super().__init__()
            self.inp = nn.Linear(DCH, d_model)
            self.temb = TimeEmb(d_model)
            self.env = EnvEncoder()
            layer = nn.TransformerDecoderLayer(d_model, heads, d_model * 4,
                                               batch_first=True, activation="gelu", dropout=0.0)
            self.dec = nn.TransformerDecoder(layer, depth)
            self.out = nn.Linear(d_model, DCH)

        def forward(self, x, t, env):                      # x:(B,N,DCH) env:(B,1,64,64)
            mem = self.env(env)
            h = self.inp(x) + self.temb(t)[:, None, :]
            h = self.dec(h, mem)                           # self-attn nodes + cross-attn envelope
            return self.out(h)

    class EdgeNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.proj = nn.Linear(FEAT, 128)
            self.mlp = nn.Sequential(nn.Linear(128 * 2 + 3, 256), nn.SiLU(),
                                     nn.Linear(256, 128), nn.SiLU(), nn.Linear(128, 1))

        def forward(self, feat, ij):
            h = self.proj(feat)
            bi = torch.arange(feat.shape[0], device=feat.device)[:, None]
            fi, fj = h[bi, ij[..., 0]], h[bi, ij[..., 1]]
            d = feat[bi, ij[..., 1], :2] - feat[bi, ij[..., 0], :2]
            geo = torch.cat([d, d.norm(dim=-1, keepdim=True)], dim=-1)
            return self.mlp(torch.cat([fi + fj, (fi - fj).abs(), geo], dim=-1)).squeeze(-1)

    return Denoiser(), EdgeNet()


def schedule(T, device):
    import torch
    betas = torch.linspace(1e-4, 0.02, T, device=device)
    a = 1.0 - betas
    return betas, a, torch.cumprod(a, 0)


def grid_align_loss(x0_xy, valid):
    import torch
    G = 24.0
    err = (x0_xy - torch.round(x0_xy * G) / G).abs().sum(-1)
    return (err * valid).sum() / valid.sum().clamp(min=1)


# --------------------------------------------------------------------------- #
def train(args):
    import torch
    import torch.nn.functional as F
    dev = _device()
    print(f"device={dev}")
    z = np.load(args.data)
    feat = torch.tensor(z["feat"], dtype=torch.float32)
    valid = torch.tensor(z["valid"], dtype=torch.float32)
    edges = torch.tensor(z["edges"].astype(np.int64))
    ecount = torch.tensor(z["ecount"].astype(np.int64))
    env = torch.tensor(z["env"], dtype=torch.float32)        # (M,64,64)
    M, N, _ = feat.shape
    print(f"data: {M} plans, N={N}, env {tuple(env.shape)}")
    x_data = torch.cat([feat, valid[..., None]], dim=-1)

    den, edgenet = build_models()
    den.to(dev); edgenet.to(dev)
    T = 1000
    _, a, abar = schedule(T, dev)
    opt = torch.optim.AdamW(list(den.parameters()) + list(edgenet.parameters()), lr=2e-4)
    bs = args.batch
    for ep in range(args.epochs):
        perm = torch.randperm(M)
        td = te = 0.0
        den.train(); edgenet.train()
        for k in range(0, M, bs):
            idx = perm[k:k + bs]
            x0 = x_data[idx].to(dev)
            vmask = valid[idx].to(dev)
            en = env[idx].to(dev)[:, None]
            B = x0.shape[0]
            t = torch.randint(0, T, (B,), device=dev)
            ab = abar[t][:, None, None]
            noise = torch.randn_like(x0)
            xt = ab.sqrt() * x0 + (1 - ab).sqrt() * noise
            pred = den(xt, t.float() / T, en)
            loss_mse = F.mse_loss(pred, noise)
            x0_hat = (xt - (1 - ab).sqrt() * pred) / ab.sqrt().clamp(min=1e-4)
            loss_al = grid_align_loss(x0_hat[..., :2], vmask)

            ej = edges[idx].to(dev); ec = ecount[idx].to(dev)
            P = 256
            pos = torch.zeros(B, P, 2, dtype=torch.long, device=dev)
            for bb in range(B):
                e = ej[bb][: max(int(ec[bb]), 1)]
                pos[bb] = e[torch.randint(0, e.shape[0], (P,), device=dev)]
            ni = torch.randint(0, N, (B, P, 2), device=dev)
            ij = torch.cat([pos, ni], dim=1)
            lbl = torch.cat([torch.ones(B, P, device=dev), torch.zeros(B, P, device=dev)], dim=1)
            loss_e = F.binary_cross_entropy_with_logits(edgenet(x0[..., :FEAT], ij), lbl)

            loss = loss_mse + 0.8 * loss_al + loss_e
            opt.zero_grad(); loss.backward(); opt.step()
            td += (loss_mse + 0.8 * loss_al).item() * B
            te += loss_e.item() * B
        if (ep + 1) % 10 == 0 or ep == 0:
            print(f"epoch {ep+1}/{args.epochs}  diff={td/M:.4f}  edge={te/M:.4f}")

    os.makedirs(os.path.dirname(WEIGHTS), exist_ok=True)
    torch.save({"denoiser": den.state_dict(), "edgenet": edgenet.state_dict()}, WEIGHTS)
    print(f"saved -> {WEIGHTS}")


# --------------------------------------------------------------------------- #
@functools.lru_cache(maxsize=1)
def _load_gen(dev):
    import torch
    ckpt = torch.load(WEIGHTS, map_location=dev)
    den, edge = build_models()
    den.load_state_dict(ckpt["denoiser"]); edge.load_state_dict(ckpt["edgenet"])
    den.to(dev).eval(); edge.to(dev).eval()
    return den, edge


def sample_plan(dev, env, N=256, edge_thresh=0.5):
    import torch
    den, edge = _load_gen(dev)
    T = 1000
    betas, a, abar = schedule(T, dev)
    en = torch.tensor(env, dtype=torch.float32, device=dev)[None, None]
    with torch.no_grad():
        x = torch.randn(1, N, DCH, device=dev)
        for ti in range(T - 1, -1, -1):
            t = torch.full((1,), ti, device=dev)
            eps = den(x, t.float() / T, en)
            abar_t = abar[ti]
            x0 = ((x - (1 - abar_t).sqrt() * eps) / abar_t.sqrt()).clamp(-2, 2)
            if ti > 0:
                abar_p = abar[ti - 1]
                mean = (abar_p.sqrt() * betas[ti] / (1 - abar_t)) * x0 + \
                       (a[ti].sqrt() * (1 - abar_p) / (1 - abar_t)) * x
                var = betas[ti] * (1 - abar_p) / (1 - abar_t)
                x = mean + var.sqrt() * torch.randn_like(x)
            else:
                x = x0
        feat = x[0, :, :FEAT]
        valid = x[0, :, FEAT] > 0.5
        keep = torch.where(valid)[0]
        if len(keep) < 4:
            return None
        feat = feat[keep]
        pos = feat[:, :2].cpu().numpy()
        rmh = (feat[:, 2:2 + N_ROOM] > 0.5).float().cpu().numpy()
        K = len(keep)
        ii, jj = torch.meshgrid(torch.arange(K, device=dev), torch.arange(K, device=dev), indexing="ij")
        m = ii < jj
        ij = torch.stack([ii[m], jj[m]], dim=-1)[None]
        prob = torch.sigmoid(edge(feat[None], ij)[0])
        pairs = ij[0][prob > edge_thresh].cpu().numpy()
    return pos, rmh, [(int(p), int(q)) for p, q in pairs]


def _load_struct(test_dir, tid):
    for ext in (".npy", ".npz"):
        p = os.path.join(test_dir, "struct_in", f"{tid}{ext}")
        if os.path.exists(p):
            arr = np.load(p)
            return arr[arr.files[0]] if hasattr(arr, "files") else arr
    raise FileNotFoundError(tid)


def generate(args):
    dev = _device()
    ids = [os.path.splitext(os.path.basename(f))[0]
           for f in sorted(glob.glob(os.path.join(args.test, "graph_in", "*.pickle")))]
    if args.n:
        ids = ids[: args.n]
    os.makedirs(args.out, exist_ok=True)
    written = failed = 0
    for tid in ids:
        try:
            env = env_image(_load_struct(args.test, tid))
            if env is None:
                failed += 1; continue
            s = sample_plan(dev, env)
            if s is None:
                failed += 1; continue
            G = reconstruct(*[s[0], s[2], s[1]])  # nodes, edges, rmh
            if G.number_of_nodes() < 2:
                failed += 1; continue
            with open(os.path.join(args.out, f"{tid}.pickle"), "wb") as fh:
                pickle.dump(G, fh)
            written += 1
        except Exception:
            failed += 1
    print(f"Wrote {written}/{len(ids)} (failed {failed}) -> {args.out}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("train")
    t.add_argument("--data", default="outputs/gsdiff_train.npz")
    t.add_argument("--epochs", type=int, default=400)
    t.add_argument("--batch", type=int, default=48)
    g = sub.add_parser("generate")
    g.add_argument("--test", required=True)
    g.add_argument("--out", default="outputs/generated_gsdiff")
    g.add_argument("--n", type=int, default=None)
    a = ap.parse_args()
    train(a) if a.cmd == "train" else generate(a)


if __name__ == "__main__":
    main()
