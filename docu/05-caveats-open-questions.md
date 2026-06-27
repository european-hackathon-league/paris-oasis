# 05 — Caveats & Open Questions

## Caveats (read before trusting any number)

1. **Official baseline code may be unreleased.** The MSD GitHub README says baseline code
   "will be released soon" in dev branches (`yt` = U-Net, `wip-house-diffusion-msd` = MHD).
   Plan to build on [aminshabani/house_diffusion](https://github.com/aminshabani/house_diffusion)
   + [arXiv 2312.03938](https://arxiv.org/pdf/2312.03938) instead. **Verify branch
   availability before committing.**

2. **HouseDiffusion's headline FID gains are on RPLAN, not MSD.** The "67% better than
   House-GAN++" numbers use the House-GAN++ protocol on RPLAN — they show the *family* scores
   well on FID generally, but are **not** transferable to the MSD FID/density/coverage
   (clovaai prdc) protocol.

3. **MSD is unsolved.** Both MSD baselines and the independent adaptation report poor absolute
   quality (MIoU 10.9–42.4; IoU 0.231). "Scoring well" is **relative** to weak baselines.

4. **Input framing is a loose paraphrase.** MSD Input 1 = structural components (load-bearing
   walls + columns), richer than a bare empty envelope. Input 2 = a *zoning* graph
   (zoning-class connectivity), not strictly an "access graph."

5. **No public FID/density/coverage numbers exist for MSD under this exact protocol.** Sources
   report MIoU and graph compatibility, not the three metrics you're scored on. Evidence for
   "which architecture maximizes those three" is **inferential, not measured.**

6. **One claim had a dissenting vote.** The geometry/topology tradeoff claim passed 2-1 (its
   unanimous sibling corroborates it; the underlying numbers are consistent).

## Open questions (worth resolving early)

1. **What are the actual FID / density / coverage scores** of MHD and the U-Net on MSD under
   *this* protocol? Unknown publicly — you may be the first to measure them.

2. **Are the official MSD baselines actually runnable**, or must you build on the third-party
   code? Check the dev branches first thing.

3. **Does the polygon path even matter for the score?** The U-Net wins on pixels but outputs
   raster. Since evaluation is render-then-FID, a raster/segmentation model *might* score
   competitively without producing clean polygons. Is `graph_out` needed to **win**, or only
   to **satisfy the output format**? → cheap experiment, high value.

4. **Could a non-deep approach win on a hackathon budget?** A constraint/optimization or
   retrieval+refinement method (Graph2Plan-style, rectangular dissection, RL tiling) may beat
   a from-scratch diffusion model on FID/density/coverage given that diffusion needs heavy
   training and still reports weak geometry.

## Refuted claim (logged for honesty)

- ❌ A claim that "HouseDiffusion's setup matches the MSD outline+access-graph→room-polygons
  setup" was **refuted 0-3**. Reason: vanilla HouseDiffusion is conditioned on a *bubble
  diagram*, **not** on a building outline/structure. The outline conditioning is exactly the
  *modification* added by MHD and the arXiv 2312.03938 adaptation — don't assume stock
  HouseDiffusion ingests the outline out of the box.
