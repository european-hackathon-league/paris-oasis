import { Section, Chip } from "../../components/ui";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import LiveExplorer from "../../components/LiveExplorer";
import TrainPanel from "../../components/TrainPanel";
import ResultsPanel from "../../components/ResultsPanel";

export const dynamic = "force-dynamic";

export default function LivePage() {
  return (
    <main className="min-h-screen">
      <Nav />

      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Chip color="#16a34a">● Live · running on the MI300X box</Chip>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Explore the real data
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            This page talks to the live server: every plan below is rendered on demand from the actual{" "}
            <strong>16 GB</strong> Modified Swiss Dwellings dataset sitting on this GPU machine —{" "}
            <strong>4,572 train</strong> and <strong>800 test</strong> apartments — not a fixed set of
            sample thumbnails.
          </p>
        </div>
      </div>

      <Section eyebrow="Interactive" title="Real floor-plan browser">
        <p className="mb-8 max-w-2xl text-slate-600">
          Step through any apartment in the dataset and see its three representations side by side: the
          given <strong>walls</strong>, the target <strong>rooms</strong>, and the{" "}
          <strong>access graph</strong>.
        </p>
        <LiveExplorer />
      </Section>

      <div className="border-y border-slate-200 bg-white">
        <Section eyebrow="Train" title="Launch a training run on the MI300X">
          <p className="mb-8 max-w-2xl text-slate-600">
            Configure and start a real U-Net training run on the GPU — straight from the browser. Watch the
            loss fall live, then it predicts the test split and computes FID / density / coverage
            automatically. Pick a preset or set the knobs yourself.
          </p>
          <TrainPanel />
        </Section>
      </div>

      <Section eyebrow="Results" title="Generated vs. real — and the metrics">
        <p className="mb-8 max-w-2xl text-slate-600">
          Every finished run lands here: its leaderboard numbers next to the retrieval baselines, and a
          side-by-side browser comparing each generated plan with the real ground truth.
        </p>
        <ResultsPanel />
      </Section>

      <Footer />
    </main>
  );
}
