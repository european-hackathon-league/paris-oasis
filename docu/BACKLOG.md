# Backlog — agreed-but-deferred work

Things we decided are worth doing but parked to pursue another idea first. Newest
context on top. Each item says *why* and *how* so we can pick it up cold.

## Corner Diffusion improvements (the best LEARNED generator, FID 96.1 / adj 59%)

See [09-corner-diffusion.md](09-corner-diffusion.md). Levers, by expected value:

1. **Adjacency loss (HIGH value, the headline lever).** Training is pure box-MSE,
   so the model has no incentive to make door-connected rooms share a wall. The
   tiling step then costs adjacency (raw boxes 71% → tiled 59%). Add a
   differentiable term on the predicted boxes: for each door/passage/entrance edge
   (i,j), penalise `1 - shared_edge_length(box_i, box_j)` (a soft overlap/contact
   measure on the box coordinates), plus a soft non-overlap penalty between
   non-adjacent rooms. Expected: push adjacency back toward ~70% **at** the good
   FID — making the corner model competitive with Partition on adjacency while
   keeping the better FID. *Where:* `corner_diffusion_model.py:train`, add to the
   loss on the predicted x0 boxes.

2. **Assembly robustness (MED).** 80% success (321/400). Empty-cell failures when a
   room's box is fully covered → its nearest-pixel fallback still fails
   `region_to_poly`. Fix: guarantee a contiguous, min-area cell per node (grow a
   small rect around the centre until valid). Also raise `R_MAX` past 64 (currently
   skips the 68–92-room floors). *Where:* `corner_diffusion_model.py:assemble_boxes`
   + `corner_diffusion_data.R_MAX`.

3. **L-shaped rooms (MED).** v1 is box-only; corridors/living rooms are sometimes
   L-shaped. Move from a 4-corner box to a short fixed-length corner sequence
   (HouseDiffusion proper) for non-rectangular rooms.

4. **Envelope CNN cross-attention (MED).** Envelope is conditioned only via the
   [0,1] normalization + post-clip. A small CNN over the interior mask, cross-
   attended by the room tokens, would let the model fit notched / L-shaped outlines.

## LLM Layout — Weg A (combination)

See [07-llm-layout.md](07-llm-layout.md). The combination is **built** (specs carry
`target_area_frac`); it just needs the LLM session limit to reset, then re-run the
full 80+ floors. Expected: keep the 72% adjacency win **and** match the real area
distribution → FID below the current 137 (n=36). *Where:* re-run
`scripts/...llm-floorplan-layout` workflow with the area-aware prompt, then
`llm_layout.py build`.
