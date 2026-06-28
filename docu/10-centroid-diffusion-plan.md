# Plan — Centroid Graph Diffusion (GSDiff-style) · NOT YET IMPLEMENTED

A planning doc. The idea (provided): generate a floor plan as a **graph of room
centroids** (position + type + adjacency) with a diffusion model, then reconstruct
**vector room polygons** with a deterministic *separator* algorithm. No pixels until
rendering.

This is genuinely new vs our 11 models and worth building. But several steps need
decisions before we code — collected below. Nothing here is implemented yet.

---

## 1. The idea in one breath

`outline polygon → [encode] → [diffuse N room centroids + types (+validity)] →
[predict adjacency] → [separator reconstruction] → room polygons → render/eval.`

Two-stage GSDiff (nodes then edges), fixed-N with a validity flag, Transformer +
cross-attention to the outline. The novel/risky core is **Component 4**, the
separator reconstruction that turns centroids into a clean tiling.

## 2. Why it is worth building (how it improves on what we have)

It is essentially **Partition-v2**, and it attacks the exact weaknesses of our two
strongest learned/partition models at once:

| | Partition (Voronoi) | Corner Diffusion | **Centroid Diffusion (this)** |
|---|---|---|---|
| room placement | spring-layout (fixed) | learned (boxes) | **learned (centroids)** |
| tiling | exact (Voronoi) | gaps (boxes) | **exact (separators)** |
| adjacency | 79% (geometry) | 59% (tiled) | **exact if edges given** |
| shapes | blobby | rectangular | rectangular (MRR) |

So the pitch: **learned centroids (better than spring) + a clean separator tiling
(no gaps, unlike boxes) + exact adjacency (separators realise the given edges).** It
could beat both Partition (FID 81) and Corner Diffusion (FID 96) — the centroid
representation is also far more tractable than the wall-junction GSDiff we tried and
abandoned (≈24 centroids vs 50–90 junctions; closing is geometric, not learned).

## 3. THE pivotal decision — what do we condition on?

The provided spec says *"given only the outline."* But the MSD benchmark **gives us
`graph_in`** (zoning types per room + door/passage/entrance edges), and every strong
model we have uses it. Three options:

- **(A) Outline-only** (as written): generate centroids, types, validity AND
  adjacency from just the shape. Hardest; discards a signal we are handed; needs
  Stage 2 (edge prediction) and the validity flag. Best as a *Studio* demo ("draw a
  shape → get a plan").
- **(B) Outline + graph_in** (recommended for the leaderboard): room **count, types
  and adjacency are GIVEN**; the diffusion only places the **centroids** conditioned
  on outline + graph. Then Stage 2 (edge prediction) is unnecessary — adjacency is
  known — and the validity flag is unnecessary — count is known. The separator step
  uses the *given* edges. This is benchmark-aligned, reuses our data, and is much
  easier to get working.
- **(C) Both modes**, sharing the encoder + node-diffusion: outline-only for the
  Studio, graph-conditioned for the score.

**Recommendation: build (B) first** (it is where a real number lives and reuses
everything), then add the (A) outline-only path for the Studio as (C). This single
choice cascades into Stage 2, validity, and room-count handling — so it is the first
thing to lock.

## 4. Components — mapped to our existing infra (reuse vs new)

| # | Component | Reuse / new | Notes |
|---|---|---|---|
| 0 | **Data** | **reuse, no CSV** | Our `graph_out` pickles already hold room polygons → centroids (the `centroid` attr exists), types (`room_type`), and adjacency (edges). Outline = `interior_mask`/room-union buffer trick we already use. **We do not need the Kaggle CSV.** Optionally split floors into apartments (connected components) for the per-apartment framing. |
| 1 | **Outline encoder** | new (small) | Polygon-vertex Transformer (vertex = [x,y,sin θ,cos θ] + ring positional enc). ~4 layers. New but small; ~the encoder side of corner-diffusion. |
| 2 | **Node diffusion** | **extend corner-diffusion** | Reuse the Transformer + x0-diffusion from `corner_diffusion_model.py`; change the token from a 4-box to a 2-centroid (+ type/validity heads), and add **cross-attention to outline tokens**. Add **SDF containment loss**. |
| 3 | **Edge prediction** | new (small) | Only needed in mode (A). Pairwise dot-product + MLP, BCE on the adjacency upper-triangle. Skipped in mode (B). |
| 4 | **Separator reconstruction** | **new, high-risk; Partition is the fallback** | Deterministic centroids → polygons. See §5. |
| 5 | **Render / eval** | **reuse** | Our renderer + FID/density/coverage harness unchanged. |

Most of this is an *extension* of the corner-diffusion stack, not a greenfield build.

## 5. Component 4 (separators) — the real risk, with a fallback ladder

The separator algorithm (anchor centroids to outline walls → place perpendicular
separators between adjacent centroids → snap endpoints to existing walls (T-junctions)
→ planar face extraction) is finicky: processing order, T-junction snapping, and
non-convex notched outlines all create edge cases. We tried planar polygonization in
the GSDiff attempt and it was the part that broke.

So build it as a **graded ladder**, cheapest-first, and stop when good enough:

1. **Weighted (power) Voronoi** from the learned centroids, weights from room-type
   area priors. Reuses our `partition.py`. **Guaranteed to tile, guaranteed to
   work** — gives a complete model immediately to validate centroid quality.
2. **Wall-snapped Voronoi**: snap Voronoi cell edges to the dominant outline axes /
   each other (rectilinear cleanup) for cleaner shapes.
3. **Full separator algorithm** as specified — only if (1)/(2) leave FID on the
   table. This is the upgrade, not the prerequisite.

This de-risks the whole thing: even if the separator algorithm proves hard, we ship
a learned-centroid + weighted-Voronoi model that should already beat plain Partition.

## 6. Proposed redefinitions of the provided spec

1. **Condition on `graph_in`** (mode B) for the scored model — do not throw away the
   given types + adjacency. Keep outline-only as a separate Studio mode.
2. **Drop Stage 2 + validity** in mode B (count/edges given). Re-add only for the
   outline-only mode.
3. **Reconstruct via weighted Voronoi first** (Component 4 ladder), separator
   algorithm as a later upgrade — not the v1 gate.
4. **Use our pickle data, not the CSV** — same dataset, already in our format, keeps
   train/eval consistent with the other 11 models.
5. **Keep `x0`-prediction** (our raster + corner diffusions both needed it; the spec
   says generic DDPM). Keep our DDIM sampler.
6. **Per-floor by default**, with an optional per-apartment split — our data is
   per-floor and the diffusion already handles multi-apartment.

## 7. Build order (when we start)

1. Data: centroids + types + adjacency + outline from `graph_out` → cached npz
   (extends `corner_diffusion_data.py`); verify by rendering Voronoi-from-real-
   centroids vs real (sanity that centroids+Voronoi ≈ the plan).
2. Node diffusion (mode B): centroid x0-diffusion, outline cross-attention, SDF
   containment loss; train on MI300X; verify centroids land inside + near real.
3. Reconstruction ladder step 1 (weighted Voronoi) → full pipeline → FID/adj.
4. Iterate: wall-snap → (maybe) separator algorithm; add outline-only mode (A) +
   Stage 2 for the Studio.

## 8. Open questions for discussion (before coding)

- **Q1.** Mode A vs B vs C? (my rec: B first, then C.) — the cascade-defining choice.
- **Q2.** Reconstruction: OK to start at weighted Voronoi and treat the separator
  algorithm as an upgrade, or do you specifically want the separator algorithm as
  the point of the exercise?
- **Q3.** Per-floor (our default, multi-apartment) vs per-apartment split?
- **Q4.** Is the goal a better *leaderboard* model (→ B) or a compelling *outline→plan
  Studio demo* (→ A), or both (→ C)?
- **Q5.** Use our pickle data (recommended) or download the Kaggle CSV the spec
  names? (Same data; pickles keep everything consistent.)
