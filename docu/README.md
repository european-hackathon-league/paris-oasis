# Research: Conditional Floor Plan Generation (MSD)

Research notes for the EHL Paris Hackathon — Challenge 1.
**Task:** given an empty apartment **outline** + an **access graph**, generate the
interior **room layout** (room polygons, each labeled with a room type) that tiles the outline.

Generated from a deep-research pass (16 primary sources, 25 adversarially-verified claims).
Last synced: 2026-06-27.

> **The website is the single source of truth.** This `docu/` folder is the written
> companion to it — kept in sync. Live site:
> http://g2rppuomu2ozk0hqtge9m2cv.46.225.0.236.sslip.io · source in `web/`.

## Current project state

| | |
|---|---|
| **Best model** | Baseline v1 — conditioned retrieval · **FID 36.0**, density 0.91, coverage 0.89 (N=400) |
| **Next lever** | Wall-mask segmentation → labelled rooms (uses the given `struct_in` walls) |
| **Eval** | Pipeline in `src/eval/` — validated end-to-end |
| **Literature** | Full reading list + downloaded papers in [`../literatur/`](../literatur/) |

## The one thing to remember

> **MSD is an _unsolved_ benchmark.** The dataset authors themselves report that all tested
> methods perform poorly (MIoU only 10.9–42.4) and "floor plans often look infeasible."
> So the realistic hackathon goal is a **solid baseline**, not a solved problem.

## Index

| File | Contents |
|---|---|
| [01-problem-and-dataset.md](01-problem-and-dataset.md) | The exact task, inputs/outputs, dataset facts |
| [02-methods-overview.md](02-methods-overview.md) | Every relevant method (HouseDiffusion, Graph2Plan, …) |
| [03-msd-baselines.md](03-msd-baselines.md) | The two official MSD baselines + their scores |
| [04-recommendations.md](04-recommendations.md) | What to actually build in a hackathon timeframe |
| [05-caveats-open-questions.md](05-caveats-open-questions.md) | What's uncertain / unknown |
| [sources.md](sources.md) | All sources + the full link directory |
| [`../literatur/`](../literatur/) | Downloaded papers (PDF + markdown) + reading list |

## TL;DR recommendation

- **Evaluation is image-based** (FID + density + coverage on _rendered_ plans), not IoU.
  That makes a simpler, plausible-looking model viable.
- **Start with a fast "smart baseline"** (Graph2Plan-style / rule-based room tiling) to
  guarantee a score, then **upgrade to the HouseDiffusion family** (true polygon output,
  matches `graph_out`) if time allows.

See [04-recommendations.md](04-recommendations.md) for the full reasoning.
