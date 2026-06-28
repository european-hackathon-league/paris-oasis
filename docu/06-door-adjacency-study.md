# Door-Adjacency Study (DoorDet-inspired)

A fresh literature pass (5-paper re-read) surfaced one transferable idea strong
enough to test end-to-end: **DoorDet's** core observation that *a door is a typed
edge asserting two rooms physically touch at a wall*. In MSD the door / passage /
entrance edges are **given for free** in `graph_in`. So we asked: do our
generators actually honour them?

## Finding 1 — the structural walls do NOT contain the rooms

A recurring proposal (MSD-benchmark, a corrected-GSDiff angle) was *"don't invent
geometry, the load-bearing walls already tile the rooms."* We measured it:

> For a real test floor, the structural walls split the interior into a **mean of
> 0.11 cells per real room** (e.g. 30 rooms → 2 wall-separated regions).

So in MSD the structural walls give the **apartment / circulation** skeleton, not
the room partition. Geometry *must* be invented — that whole family of ideas is
out for this dataset.

## Finding 2 — our best generator is structurally blind (the real result)

Fraction of `graph_in` door/passage/entrance edges whose two rooms actually share
a wall in the generated plan (n=120 test floors):

| Plan source | Door-adjacency faithfulness |
|---|---|
| **Real plans** (upper bound) | **100 %** |
| **Partition (Voronoi)** | **79 %** |
| **Rectilinear** (our best by FID, 80.9) | **41 %** |

**Our best-FID model honours less than half of the given adjacencies.** Its
slice-and-dice orders rooms by a 1-D PCA of the spring layout, which scatters
graph-adjacent rooms to opposite ends. This is exactly the global adjacency
structure that FID / coverage reward and that retrieval (FID 34) gets for free by
copying real plans. **Partition is nearly 2× more faithful (79 %)** at the same
FID — an important, previously-unnoticed model-selection insight: for
graph-faithfulness, Partition ≫ Rectilinear.

## Finding 3 — the fixes we tried (honest negative results)

1. **Graph-aware slicing** (`baseline_doorplan.py`): slice by recursive *connected
   graph bisection* instead of 1-D order. Result: **40.9 %** — no improvement.
   Reason: a guillotine slicing floorplan **cannot realize an arbitrary adjacency
   graph** (a known theoretical limitation of sliceable layouts).
2. **Door-weighted Voronoi seeding**: door/entrance edges as stronger springs to
   pull connected seeds together. Result: **74.5 %** (vs 76 % plain) — no gain.
   The spring layout already clusters connected nodes; the ceiling is the
   geometric realizability of a 2-D point embedding, not the edge weights.

## Conclusion & next step

- **Use Partition when graph-faithfulness matters** — it is the door-faithful
  generator (79 %) at the same FID as the geometrically-cleaner Rectilinear.
- Pushing adjacency toward 100 % needs **rectangular dualization** (build the
  floorplan as the rectangular dual of the planar access graph) — a classical but
  involved algorithm; flagged as the principled future direction.
- The geometry-from-real-walls family is **not applicable** to MSD (Finding 1).
