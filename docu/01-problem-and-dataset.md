# 01 — The Problem & The Dataset

## The task (confirmed against the on-disk data)

It is a **conditional** generation problem: `outline + graph → rooms`.

| Role | What it is |
|---|---|
| **Input 1 — structure** | The building structure (load-bearing walls / columns) as a binary image OR geometry set. In the v2 data this is `struct_in` (512×512×3 `.npy`, channel 0 = binary wall mask). |
| **Input 2 — access graph** | A *zoning graph*: nodes carry a zoning/room category, edges carry connectivity typed as exactly `{door, entrance, passage}`. In the v2 data this is `graph_in`. |
| **Output — room layout** | The floor plan either as a room-class **pixel image** OR a **room graph** (`graph_out`) whose nodes carry `geometry` (polygon) + `room_type` + `centroid`, edges carry connectivity. |

> Measured on disk over 300 graphs: edge types `door` 8607, `entrance` 1363, `passage` 690.

**Why dual representations?** MSD ships both images (for CNNs) and graphs (for GNNs).
The authors' motivation: feeding *both* the boundary and the graph "would benefit both
geometrical and topological design constraints."

> ⚠️ Nuance: Input 1 is richer than a bare empty envelope — it is the structural components
> (load-bearing walls + columns). Input 2 is a *zoning* graph (zoning-class connectivity),
> which the "access graph" framing paraphrases closely but loosely.

## Dataset facts

| Fact | Value |
|---|---|
| Name | **Modified Swiss Dwellings (MSD)** |
| Venue | **ECCV 2024**, van Engelenburg et al. (DOI 10.1007/978-3-031-73636-0_4) |
| Scale | **5,372 floor plans**, **>18.9K distinct apartments** |
| Source | Derived from **Swiss Dwellings v3.0.0** |
| Primary container | The **graph** (`networkx.Graph` / `torch_geometric.data.Data`) — room shapes/types as node attrs, connectivity as edge attrs, full image as graph-level attr |
| Status | "Well-balanced, ML-ready dataset" — large enough to train/eval in a hackathon |

## Evaluation (fixed by organizers)

Pipeline: **generate rooms → render to image → InceptionV3 features → metrics vs. real plans.**

| Metric | Tool | Goal |
|---|---|---|
| **FID** | torchmetrics `FrechetInceptionDistance` | distribution match (lower = better) |
| **Density** | clovaai `prdc` (`nearest_k=5`) | quality (higher = better) |
| **Coverage** | clovaai `prdc` | diversity / mode coverage (higher = better) |

**Key consequence:** scoring is **image-based**, computed on *rendered* plans — not on raw
IoU. A model that produces plausible-looking renders can score well even with imperfect
geometry. This shapes the strategy in [04-recommendations.md](04-recommendations.md).
