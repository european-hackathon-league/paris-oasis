# 02 — Methods Overview

The published methods relevant to `outline + graph → room polygons`, ranked by fit.

## Quick comparison

| Method | Input | Output | Code | Fit for `graph_out` |
|---|---|---|---|---|
| **HouseDiffusion** (CVPR 2023) | bubble/constraint graph | **vector polygons** | [aminshabani/house_diffusion](https://github.com/aminshabani/house_diffusion) | ⭐ exact output match |
| **Modified HouseDiffusion** (MSD baseline) | outline + graph | **vector polygons** | MSD dev branch (may be unfinished) | ⭐ exactly this task |
| **HouseDiffusion-MSD adaptation** | outline + graph | polygons | [arXiv 2312.03938](https://arxiv.org/pdf/2312.03938) | ✅ already adapted (weak: IoU 0.231) |
| **Graph-informed U-Net** (MSD baseline) | outline + graph | **raster** | MSD dev branch | ❌ raster, no clean polygon |
| **Graph2Plan** (SIGGRAPH 2020) | boundary + layout graph | **bounding boxes** + raster | [HanHan55/Graph2plan](https://github.com/HanHan55/Graph2plan) | ⚡ fast, but axis-aligned boxes only |
| **HouseGAN++** | graph | raster | — | only tested as comparison on MSD |

---

## HouseDiffusion (Shabani et al., CVPR 2023) — the output-aligned choice

- **Idea:** Transformer-core **diffusion** model that denoises the **2D corner coordinates**
  of rooms/doors. A floor plan = a set of **1D polygonal loops** (one per room/door).
- **Output:** true **vector polygons** — directly matches MSD's `graph_out`.
- **Dual denoising targets:**
  1. a continuous single-step noise (to invert the forward diffusion), and
  2. the final 2D coordinate as a **discrete** quantity (8 binary bits per coord, ints in
     [0,255]) — this enforces parallelism, orthogonality, and corner-sharing.
- **Graph conditioning:** the input graph controls the Transformer **attention masks** via
  relational cross-attention (natively graph-conditioned).
- **Evidence it scores well on FID:** on RPLAN it beats House-GAN++ by **avg 67% in
  diversity (FID)** and 32% in compatibility (e.g. 8-room FID 32.9 → 9.5).
  ⚠️ Caveat: that's the **RPLAN** protocol, *not* the MSD FID/density/coverage protocol.

## Modified HouseDiffusion (MHD) — official MSD baseline

HouseDiffusion + two additions:
- a **Wall Cross-Attention (WCA)** module between room-corner and wall embeddings (adds the
  structural-walls condition), and
- a **GAT** that predicts room types from the zoning graph (node classification; room types
  learned separately).

See [03-msd-baselines.md](03-msd-baselines.md) for its scores.

## HouseDiffusion-MSD adaptation (Kuhn, Dec 2023)

Independent proof that the diffusion approach **runs on MSD**: adds structural walls via
cross-attention (room corners = queries, structural corners = keys/values) in both the
continuous and discrete denoising steps. **Results were weak** (IoU 0.231 vs 0.737 for GT
rectangles), struggling with many small rooms — author flags it as needing future work.
Still the most concrete starting codebase for the exact task.

## Graph2Plan (Hu / van Kaick et al., SIGGRAPH 2020) — the fast alternative

- **Idea:** hybrid **GNN** (over the layout graph) + **CNN** (over the boundary & a generated
  raster) + a **retrieval** component + a refinement/post-processing stage.
- **Pipeline:** first generates a raster floor plan image, then a refined set of
  **axis-aligned bounding boxes** (`y0,x0,y1,x1`) with room-type labels.
- **Tradeoff:** faster to stand up, but output is **boxes + raster**, not arbitrary tiling
  polygons — only partially matches MSD's polygon requirement. Trained on RPLAN, not MSD.

## Others seen in the literature (lower priority)

- **WallPlan** — boundary → wall graph (junctions + segments) with room labels; boundary-only.
- **TLC-Plan** — boundary-only autoregressive transformer sampling a "CodeTree" → room polygons.
- **Autoregressive / anchor-based transformers** — emit labeled polygon **sequences**; viable
  alternative output representation, but no MSD track record.
