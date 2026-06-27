# 03 — The Two Official MSD Baselines

The MSD authors built exactly **two** baseline models: "a diffusion- and a
segmentation-based approach." (HouseGAN++ and FLNet were also tested in the supplementary
material, but only for generalizability — not developed as baselines.)

## A — Modified HouseDiffusion (MHD) — diffusion / vector

- HouseDiffusion polygon-diffusion core
- **+ Wall Cross-Attention (WCA)** module (corner ↔ wall embeddings) → adds the wall condition
- **+ GAT** for room-type prediction (node classification on the zoning graph)
- **Output: true vector room polygons** ✅ (matches `graph_out`)

## B — Graph-informed U-Net (UN) — segmentation / raster

- U-Net for pixel-level prediction
- conditioned at its **bottleneck** on a **GCN** encoding of the zoning graph
- optional **Segment Anything (SAM)** pre-processing for a quality boost
- **Output: raster image** ❌ (no reliable polygon/graph)

## Results — geometry vs topology tradeoff

| Model | MIoU (pixel overlap) | Graph compatibility (topology) |
|---|---|---|
| U-Net `UN(pre)` (+ SAM) | **42.4** (best) | n.a. — can't reliably extract a graph |
| MHD (variants) | 10.9 → 21.8 | **74.4 → 87.0** (topology largely retained) |

**Reading the table:**
- **U-Net wins on pixels** but its raster output yields no clean graph → graph compatibility
  is unmeasurable ("too ambiguous").
- **MHD wins on topology** (connections/relations preserved) but its room *shapes* are weak.

> **Authors' own verdict:** "the performance is poor and does not yet comply with the
> performance standards we would like to see" — "floor plans often look infeasible."
> Overall MIoU only **10.9–42.4**. **No method solves MSD.**

## What this means for you

1. The two baselines embody the core tension: **good shapes (U-Net) vs good connectivity
   (diffusion)** — you rarely get both.
2. Because **your evaluation is image-based** (FID/density/coverage on renders), the U-Net's
   raster strength is *not* automatically disqualifying — see the open question in
   [05-caveats-open-questions.md](05-caveats-open-questions.md).
3. ⚠️ Official baseline code may live in unfinished dev branches (`yt` for U-Net,
   `wip-house-diffusion-msd` for MHD). **Verify availability before relying on it.**
