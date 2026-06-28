import Link from "next/link";
import { data } from "./data";
import Deck from "../components/Deck";
import Reveal from "../components/Reveal";
import Counter from "../components/Counter";
import Leaderboard from "../components/Leaderboard";
import DeepDive from "../components/DeepDive";
import DataPeek from "../components/DataPeek";

function Cta({ href, children, dark }: { href: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <Link
      href={href}
      className={
        dark
          ? "rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          : "rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
      }
    >
      {children}
    </Link>
  );
}

const SAMPLES = [
  { kind: "walls", title: "Walls", note: "the given load-bearing structure", img: "/data/samples/10298_walls.png" },
  { kind: "rooms", title: "Rooms", note: "the target layout to generate", img: "/data/samples/10298_rooms.png" },
  { kind: "graph", title: "Access graph", note: "which rooms connect to which", img: "/data/samples/10298_graph.png" },
];

// The five families we explored, and the experiments that did NOT pan out - kept honest.
const FAMILIES = [
  ["Retrieval", "copy the nearest real plan - the FID ceiling, but it doesn't generate", "#94a3b8"],
  ["Rule-based partition", "Rectilinear & Voronoi exploit how real rooms are shaped", "#4f46e5"],
  ["Learned generative", "U-Net, refinement, and corner / centroid diffusion", "#10b981"],
  ["LLM reasoning", "Claude places rooms from the access graph: door-adjacency 41% → 72%", "#0ea5e9"],
  ["Structural-graph diffusion", "GSDiff-style: wall-junctions stalled → room-centroids won", "#f59e0b"],
] as const;

const DEAD_ENDS = [
  ["Ensemble fusion", "pixel-voting the LLM + Rectilinear + Partition made adjacency worse (39% vs 67%), not better"],
  ["GSDiff on wall junctions", "the representation round-trips, but generated graphs wouldn't close into rooms → pivoted to centroids"],
  ["Raster diffusion on noise", "predicting noise gave a degenerate all-uniform map - fixed by predicting x0"],
  ["Axis-aligned slicing", "cutting on the image grid scored FID 100.0; aligning to the walls beat it (80.9)"],
] as const;

// Papers our two best models descend from - shown on the Research slide.
const PAPERS = [
  {
    name: "GSDiff",
    venue: "Hu et al. · AAAI 2025",
    idea: "Synthesise a vector floor plan as a diffused structural graph - generate the nodes with a diffusion model, predict the edges, then read off room polygons.",
    built: "Centroid Diffusion. We diffuse room centroids from the outline instead of wall junctions, then reconstruct with Voronoi.",
    href: "https://arxiv.org/abs/2408.16258",
  },
  {
    name: "HouseDiffusion",
    venue: "Shabani et al. · CVPR 2023",
    idea: "Diffuse the corners of room polygons directly - the vector-output approach the MSD top baseline (Modified HouseDiffusion) is built on.",
    built: "Corner Diffusion: per-room corner boxes denoised jointly with graph-relational attention.",
    href: "https://arxiv.org/abs/2211.13287",
  },
  {
    name: "MSD benchmark",
    venue: "van Engelenburg et al. · ECCV 2024",
    idea: "The dataset and task: given the load-bearing structure + an access graph, segment the walls into rooms - don't invent partitions - at building-complex scale.",
    built: "The whole challenge, and Rectilinear's wall-aligned, rooms-are-rectangular insight.",
    href: "https://arxiv.org/abs/2407.10121",
  },
] as const;

export default function Home() {
  const s = data.stats;
  return (
    <Deck>
      {/* ───────────────────── Slide 1 · Title ───────────────────── */}
      <section
        id="title"
        data-slide
        data-label="Title"
        data-theme="dark"
        className="slide-dark relative flex min-h-[100dvh] snap-start snap-always items-center px-5 text-white"
      >
        <div className="mx-auto w-full max-w-5xl py-24">
          <Reveal variant="fade">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Modified Swiss Dwellings · scored live on an AMD MI300X
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              Given the walls,
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                generate the rooms.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={260}>
            <p className="mt-6 max-w-2xl text-lg text-slate-300 md:text-xl">
              The floor-plan generation challenge on {s.apartments.toLocaleString("en-US")} real apartments. We built and
              scored a whole leaderboard of approaches - rule-based, learned, and an LLM reasoner. This is what we
              tried, and the two models that work best.
            </p>
          </Reveal>
          <Reveal delay={420}>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#leaderboard"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                See the leaderboard ↓
              </a>
              <Link
                href="/studio"
                className="rounded-xl border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Try the Studio
              </Link>
            </div>
          </Reveal>
        </div>
        <div className="scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-slate-400">
          ↓ scroll · or use the ↑ ↓ keys
        </div>
      </section>

      {/* ───────────────────── Slide 2 · The challenge ───────────────────── */}
      <section id="challenge" data-slide data-label="Challenge" className="flex min-h-[100dvh] snap-start snap-always items-center px-5">
        <div className="mx-auto w-full max-w-6xl py-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">The challenge</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              The load-bearing shell is given. The rooms aren&apos;t.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-2xl text-lg text-slate-600">
              Each apartment comes with its load-bearing structure and an access graph - but not the partition walls.
              The task: generate a complete, plausible room layout, one labelled room per graph node, that tiles the
              envelope.
            </p>
          </Reveal>
          <div className="mt-14 grid grid-cols-2 gap-5 md:grid-cols-4">
            {[
              { v: <Counter to={s.apartments} />, l: "apartments" },
              { v: <Counter to={s.geometries / 1e6} decimals={2} suffix="M" />, l: "geometries" },
              { v: <Counter to={s.trainSamples} />, l: "train plans" },
              { v: <Counter to={s.testSamples} />, l: "test plans" },
            ].map((m, i) => (
              <Reveal key={i} variant="up" delay={i * 110}>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">{m.v}</div>
                  <div className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-500">{m.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── Slide 3 · The data ───────────────────── */}
      <section id="data" data-slide data-label="Data" className="flex min-h-[100dvh] snap-start snap-always items-center border-y border-slate-200 bg-white px-5">
        <div className="mx-auto w-full max-w-6xl py-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">What the model sees</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Three views of every home.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {SAMPLES.map((sm, i) => (
              <Reveal key={sm.kind} variant="up" delay={i * 130}>
                <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  <div className="aspect-square w-full bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sm.img} alt={sm.title} className="h-full w-full object-contain" />
                  </div>
                  <figcaption className="border-t border-slate-200 px-4 py-3">
                    <div className="text-base font-semibold text-slate-900">{sm.title}</div>
                    <div className="text-sm text-slate-500">{sm.note}</div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Slide · Floor-plan browser (interactive, simplified) ── */}
      <section id="browse" data-slide data-label="Browse" className="flex min-h-[100dvh] snap-start snap-always items-center px-5">
        <div className="mx-auto w-full max-w-6xl py-16">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Explore the data</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              The same three views - on real data.
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Shuffle through real training apartments, rendered live from the dataset on this GPU box.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-8">
            <DataPeek />
          </Reveal>
        </div>
      </section>

      {/* ───────────────────── Slide 4 · Research we built on ───────────────────── */}
      <section id="research" data-slide data-label="Research" className="flex min-h-[100dvh] snap-start snap-always items-center border-y border-slate-200 bg-white px-5">
        <div className="mx-auto w-full max-w-6xl py-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Research</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              Standing on the literature.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-slate-600">
              We started from recent floor-plan-generation papers and built on their core ideas - our two best
              models are direct descendants. Here is where they come from before we show them.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAPERS.map((p, i) => (
              <Reveal key={p.name} variant="up" delay={i * 110}>
                <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-semibold text-slate-900">{p.name}</div>
                  <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">{p.venue}</div>
                  <p className="mt-3 text-sm text-slate-600">{p.idea}</p>
                  <div className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                    <span className="font-semibold">We built → </span>{p.built}
                  </div>
                  <a href={p.href} target="_blank" rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
                    Read the paper ↗
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <Link href="/research" className="mt-8 inline-block text-sm font-medium text-indigo-600 hover:underline">
              Full reading list - 8 papers →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────── Slide 5 · Top model 01 · Centroid Diffusion ───────────────────── */}
      <section
        id="centroid"
        data-slide
        data-label="Centroid Diffusion"
        data-theme="dark"
        className="slide-dark flex min-h-[100dvh] snap-start snap-always items-center px-5 text-white"
      >
        <DeepDive
          dark
          index="01"
          name="Centroid Diffusion"
          score="Best generator · FID 60.5 · outline-only"
          accent="#34d399"
          summary="A GSDiff-style graph-diffusion model - and the only learned model that generates from a bare outline. A Transformer denoises a SET of room centroids from ONLY the apartment outline (no access graph), reads each room's type, then Voronoi reconstruction tiles the outline into rooms."
          metrics={[
            { value: "60.5", label: "FID" },
            { value: "0.28", label: "density" },
            { value: "0.26", label: "coverage" },
            { value: "no graph", label: "outline-only" },
          ]}
          how={[
            "A Transformer encodes the apartment outline (corner positions + angles).",
            "From noise, it denoises a set of room centroids conditioned on the outline, plus each room's type and count - no access graph is ever given.",
            "Weighted-Voronoi reconstruction tiles the outline into rooms; the access graph is read off the shared walls.",
          ]}
          paper={{
            name: "GSDiff (AAAI 2025)",
            idea: "synthesise a floor plan as a diffused structural graph",
            href: "https://arxiv.org/abs/2408.16258",
          }}
          preview={{ dir: "centroid-v1" }}
        />
      </section>

      {/* ───────────────────── Slide 6 · Top model 02 · Rectilinear ───────────────────── */}
      <section id="rectilinear" data-slide data-label="Rectilinear" className="flex min-h-[100dvh] snap-start snap-always items-center bg-white px-5">
        <DeepDive
          index="02"
          name="Rectilinear · wall-aligned"
          score="Best per-floor generator · FID 80.9"
          accent="#4f46e5"
          summary="A rule-based generator with no neural net. It exploits the strongest fact in the data - real MSD rooms are ~99% rectangular - and slices the interior into one rectangle per room, aligned to the longest outer wall."
          metrics={[
            { value: "80.9", label: "FID" },
            { value: "0.16", label: "density" },
            { value: "0.24", label: "coverage" },
            { value: "CPU", label: "no training" },
          ]}
          how={[
            "Trace the real (concave) interior, then find the building axis - the longest outer wall.",
            "Slice the interior into one rectangle per room, aligned to that wall and sized by learned per-type areas; balconies go to the facade.",
            "Vectorise and label each region into the scored graph_out.",
          ]}
          paper={{
            name: "MSD (ECCV 2024)",
            idea: "segment the given walls into rooms, don't invent partitions",
            href: "https://arxiv.org/abs/2407.10121",
          }}
          preview={{ dir: "rect-v1" }}
        />
      </section>

      {/* ───────────────────── Slide 7 · Leaderboard ───────────────────── */}
      <section id="leaderboard" data-slide data-label="Leaderboard" className="flex min-h-[100dvh] snap-start snap-always items-center px-5">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 py-20 lg:grid-cols-[1fr_1.3fr]">
          <Reveal variant="left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">What we built</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              Ten approaches, one honest leaderboard.
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              Every model is rendered with the official MSD tooling and scored by <strong>FID</strong> (lower is
              better) - with its own generated plan beside its bar, so you can see what the number means.
            </p>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Why is Retrieval on top?</span> It doesn&apos;t generate -
              it returns the nearest <em>real</em> plan unchanged, so its FID 34.1 is the <strong>ceiling</strong>, not
              a winner. The real result is the best <strong>generator</strong>, Centroid Diffusion at 60.5.
            </div>
            <div className="mt-6">
              <Cta href="/models">See every model →</Cta>
            </div>
          </Reveal>
          <Reveal variant="right" delay={140}>
            <Leaderboard />
          </Reveal>
        </div>
      </section>

      {/* ───────────────────── Slide 8 · What we tried ───────────────────── */}
      <section id="work" data-slide data-label="What we tried" className="flex min-h-[100dvh] snap-start snap-always items-center px-5">
        <div className="mx-auto w-full max-w-6xl py-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">The work</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              What we tried - and what didn&apos;t.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Reveal variant="left" delay={80}>
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Five families</p>
                <ul className="mt-4 space-y-4">
                  {FAMILIES.map(([name, note, color]) => (
                    <li key={name} className="flex gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      <span>
                        <span className="text-sm font-semibold text-slate-900">{name}</span>
                        <span className="text-sm text-slate-500"> - {note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal variant="right" delay={160}>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Negative results, kept honest</p>
                <ul className="mt-4 space-y-4">
                  {DEAD_ENDS.map(([name, note]) => (
                    <li key={name} className="flex gap-3">
                      <span className="mt-0.5 select-none text-rose-400">✕</span>
                      <span>
                        <span className="text-sm font-semibold text-slate-900">{name}</span>
                        <span className="text-sm text-slate-500"> - {note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/research" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline">
                  The full reasoning & papers →
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────────────── Slide 8 · Studio (additional) ───────────────────── */}
      <section id="studio" data-slide data-label="Studio" className="flex min-h-[100dvh] snap-start snap-always items-center border-y border-slate-200 bg-white px-5">
        <div className="mx-auto w-full max-w-5xl py-24">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Additional · see it work</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              See the mechanism, live.
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-6 max-w-2xl text-lg text-slate-600">
              The Studio runs the graph-informed U-Net - the one model that generates from a bare, hand-drawn
              structure. Sketch the walls, pick a model, and watch the rooms get laid out inside. It&apos;s a live demo
              of how conditional generation works end-to-end - not the top scorer, but the one you can drive yourself.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Cta href="/studio">✦ Open the Studio</Cta>
              <Link
                href="/live"
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Watch it train live →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────── Slide 9 · Closing ───────────────────── */}
      <section
        id="explore"
        data-slide
        data-label="Explore"
        data-theme="dark"
        className="slide-dark flex min-h-[100dvh] snap-start snap-always flex-col px-5 text-white"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center py-20 text-center">
          <Reveal variant="scale">
            <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">Explore it yourself.</h2>
          </Reveal>
          <Reveal delay={150}>
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["/models", "Models", "the leaderboard"],
                ["/research", "Research", "ideas & papers"],
                ["/studio", "Studio", "draw → generate"],
                ["/live", "Live", "train & compare"],
              ].map(([href, t, d]) => (
                <Link
                  key={href}
                  href={href}
                  className="group rounded-2xl border border-white/15 bg-white/5 p-5 text-left backdrop-blur transition hover:border-white/40 hover:bg-white/10"
                >
                  <div className="text-lg font-semibold text-white">{t}</div>
                  <div className="mt-1 text-sm text-slate-300">{d}</div>
                  <span className="mt-3 inline-block text-sm font-medium text-indigo-300 group-hover:underline">
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>

        {/* condensed footer, kept inside the closing slide so the deck ends clean */}
        <div className="mx-auto w-full max-w-5xl border-t border-white/10 py-6 text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <span>EHL Paris · Challenge 1</span>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <a className="hover:text-indigo-300" href="https://archilyse.standfest.science/modified-swiss-dwellings" target="_blank" rel="noopener noreferrer">
                MSD overview
              </a>
              <a className="hover:text-indigo-300" href="https://data.4tu.nl/datasets/e1d89cb5-6872-48fc-be63-aadd687ee6f9" target="_blank" rel="noopener noreferrer">
                Dataset
              </a>
              <a className="hover:text-indigo-300" href="https://arxiv.org/abs/2407.10121" target="_blank" rel="noopener noreferrer">
                Paper
              </a>
              <a className="hover:text-indigo-300" href="https://github.com/caspervanengelenburg/msd" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <Link className="hover:text-indigo-300" href="/research">
                Reading list →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Deck>
  );
}
