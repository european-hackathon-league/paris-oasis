# Sources

All sources are primary (papers / official repos). Research pass: 16 sources fetched,
77 claims extracted, 25 adversarially verified (24 confirmed, 1 killed).

## Core — MSD dataset & benchmark

- **MSD paper (ECCV 2024)** — van Engelenburg et al., *MSD: A Benchmark Dataset for Floor
  Plan Generation of Building Complexes* — https://arxiv.org/abs/2407.10121
  (PDF: https://arxiv.org/pdf/2407.10121)
- **MSD GitHub** (official code, baselines, `plot.py`) —
  https://github.com/caspervanengelenburg/msd
- **MSD / Swiss Dwellings (SAGE / IJAC)** —
  https://journals.sagepub.com/doi/10.1177/14780771241290649

## HouseDiffusion (vector polygon diffusion)

- **HouseDiffusion (CVPR 2023)** — Shabani et al. — https://arxiv.org/abs/2211.13287
  (PDF: https://openaccess.thecvf.com/content/CVPR2023/papers/Shabani_HouseDiffusion_Vector_Floorplan_Generation_via_a_Diffusion_Model_With_Discrete_CVPR_2023_paper.pdf)
- **HouseDiffusion code** — https://github.com/aminshabani/house_diffusion
- **HouseDiffusion adapted to MSD (Kuhn, Dec 2023)** — https://arxiv.org/pdf/2312.03938
  (HTML: https://arxiv.org/html/2312.03938v1)

## Graph2Plan (GNN + CNN + retrieval)

- **Graph2Plan (SIGGRAPH 2020)** — Hu / van Kaick et al. — https://arxiv.org/abs/2004.13204
- **Graph2Plan code** — https://github.com/HanHan55/Graph2plan
- ResearchGate mirror — https://www.researchgate.net/publication/343625455_Graph2Plan_learning_floorplan_generation_from_layout_graphs

## Boundary-conditioned & other methods

- **WallPlan** (boundary → wall graph) — https://dl.acm.org/doi/10.1145/3528223.3530135
- Boundary-conditioned diffusion (U-Tokyo) —
  https://www.robot.t.u-tokyo.ac.jp/~yamashita/paper/B/B325Final.pdf
- Autoregressive / anchor-based polygon-sequence transformers — arXiv 2207.13268,
  2602.07100, 2602.09016 (see research log)

## Evaluation tooling (from project README)

- torchmetrics `FrechetInceptionDistance` (FID)
- clovaai `prdc` — `compute_prdc(..., nearest_k=5)` — density & coverage —
  https://github.com/clovaai/generative-evaluation-prdc

## Dataset directory

- **Archilyse · MSD overview** (the curated link hub) —
  https://archilyse.standfest.science/modified-swiss-dwellings
- **4TU.ResearchData (official dataset)** —
  https://data.4tu.nl/datasets/e1d89cb5-6872-48fc-be63-aadd687ee6f9
  (DOI: https://doi.org/10.4121/e1d89cb5-6872-48fc-be63-aadd687ee6f9.v2)
- **Kaggle mirror** —
  https://www.kaggle.com/datasets/caspervanengelenburg/modified-swiss-dwellings

## More research using MSD (from the Archilyse hub)

Full reading list, with downloaded PDFs converted to markdown, lives in
[`../literatur/`](../literatur/) (see `literatur/README.md`).

- **Floor plan generation: the interplay among data, machine, and designer** — Mostafavi et al.,
  IJAC 2024 — https://doi.org/10.1177/14780771241290649
- **GSDiff: Synthesizing Vector Floorplans via Geometry-enhanced Structural Graph Generation** —
  AAAI 2025 — https://arxiv.org/abs/2408.16258 · code https://github.com/SizheHu/GSDiff
- **LayoutGKN: Graph Similarity Learning of Floor Plans** — BMVC 2025 —
  https://arxiv.org/abs/2509.03737 · code https://github.com/caspervanengelenburg/LayoutGKN
- **Generating accessible multi-occupancy floor plans … using a diffusion model** —
  Automation in Construction 2025 — https://doi.org/10.1016/j.autcon.2025.106332 (paywalled)
- **MRED-14: A Benchmark for Low-Energy Residential Floor Plan Generation** — ACM MM 2025 —
  https://doi.org/10.1145/3746027.3754949 (paywalled)
- **Semi-Automated Dataset Generation for Residential Buildings …** — Buildings (MDPI) 2025 —
  https://www.mdpi.com/2075-5309/15/8/1283
- **DoorDet: Semi-Automated Multi-Class Door Detection Dataset …** — arXiv 2025 —
  https://arxiv.org/abs/2508.07714

## Live site

The project hub (ground of truth):
http://g2rppuomu2ozk0hqtge9m2cv.46.225.0.236.sslip.io
