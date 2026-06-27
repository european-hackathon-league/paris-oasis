# 04 — Recommendations for the Hackathon

> **Status update (synced with the website "Strategies" section).** Strategy 1 (conditioned
> retrieval) is **done and live** — it is the current best model at **FID 36.0** / density 0.91 /
> coverage 0.89 (N=400), ≈ the real-vs-real ceiling. The next lever is **strategy 2: wall-mask
> segmentation**, which uses the walls given in `struct_in` so geometry matches each specific input.
> The five strategies below map 1:1 to the cards on the website.

## Strategy ladder (mirrors the website)

| # | Strategy | Status | Output | Fit |
|---|---|---|---|---|
| 1 | Conditioned retrieval | ✅ done · best so far | real `graph_out` | high |
| 2 | Wall-mask segmentation → labelled rooms | ⏭ next up | true polygons | highest |
| 3 | HouseDiffusion / Modified HouseDiffusion | stretch | vector polygons | high |
| 4 | Graph2Plan (GNN + CNN + retrieval) | stretch | axis-aligned boxes | medium |
| 5 | Graph-informed U-Net (segmentation) | stretch | raster image | medium |

---


## The strategic insight

Your score is **FID + density + coverage on _rendered_ images** — not IoU. This is decisive:

- A model only needs to produce **plausible-looking rendered plans** to score well.
- Perfect vector geometry is required to *satisfy the output format*, but not necessarily to
  *win the metric*.
- Since MSD is unsolved and even the official diffusion baseline reports weak geometry
  (MIoU ~11–22), chasing a perfect-geometry model is high-risk for a hackathon.

## Recommended plan: baseline first, upgrade second

### 🥇 Option B — "Smart Baseline" (do this first)

A simpler model / pipeline that plausibly partitions the outline into labeled
(mostly rectangular) rooms guided by the access graph.

- **Approaches:** Graph2Plan-style (GNN+CNN+retrieval+refinement), or even a
  rule-based / optimization tiling (rectangular dissection driven by the graph).
- **Why:** lauffähig in hours; **guarantees a score**; renders look "realistic enough" to do
  surprisingly well on image-based FID/density/coverage.
- **Risk:** lower geometric fidelity; output may be boxes, not arbitrary polygons.

### 🥈 Option A — "Polygons, properly" (upgrade if time allows)

Build on the **HouseDiffusion family** — the output is true vector polygons, matching
`graph_out` exactly.

- **Code to start from:** [aminshabani/house_diffusion](https://github.com/aminshabani/house_diffusion)
  + the MSD adaptation [arXiv 2312.03938](https://arxiv.org/pdf/2312.03938).
- **Condition on walls** via cross-attention (room corners = queries, structural corners =
  keys/values), as in the MSD adaptation.
- **Why:** the "correct" architecture; best topology; the output format is exactly right.
- **Risk:** diffusion training is heavier; reported absolute geometry on MSD is still weak.

### Sequencing

```
Hour 0 ──────────────► Option B running ──────────────► guaranteed score
                              │
                              ▼ (if time remains)
                       Option A (HouseDiffusion) ──────► better topology / true polygons
```

Always keep a **vorzeigbares** (presentable) result in hand. Ship B, then attempt A.

## Architecture decision matrix

| Approach | Speed to stand up | Output fit | Likely FID/D/C | Verdict |
|---|---|---|---|---|
| Rule-based / optimization tiling | ⚡⚡⚡ fast | boxes/polygons | decent if plausible | great safety net |
| Graph2Plan (GNN+CNN+retrieval) | ⚡⚡ medium | boxes + raster | decent | strong baseline |
| U-Net segmentation (+GCN/SAM) | ⚡⚡ medium | raster | best pixels, raster | good if raster renders score |
| HouseDiffusion / MHD (diffusion) | 🐢 slow | **vector polygons** | best topology | best "proper" answer |
| GAN (HouseGAN++) | 🐢 slow | raster | — | not recommended (only a comparison) |

## Don't forget

- Your `outputs/eval_real_vs_real.json` **real-vs-real sanity check** is gold — it tells you
  the *floor* of the metrics under your own rendering pipeline. Use it to calibrate.
- Render generated and real plans with the **same** `plot.py` to keep FID fair.
