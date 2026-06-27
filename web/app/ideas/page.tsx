import { Section, Chip } from "../../components/ui";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import BestModel from "../../components/BestModel";
import Strategies from "../../components/Strategies";

export default function IdeasPage() {
  return (
    <main className="min-h-screen">
      <Nav />

      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Chip color="#4f46e5">02 · Ideas</Chip>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            How we solve it
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            The model that currently scores best, visualized end to end — and the strategies we&apos;re
            weighing to push the metrics further.
          </p>
        </div>
      </div>

      {/* best model */}
      <Section eyebrow="The model" title="Best model right now">
        <p className="mb-8 max-w-2xl text-slate-600">
          Whatever currently scores best lives here, visualized end to end. Today that&apos;s the
          conditioned retrieval baseline.
        </p>
        <BestModel />
      </Section>

      {/* strategies */}
      <div className="border-t border-slate-200 bg-white">
        <Section eyebrow="Roadmap" title="Strategies to push further">
          <p className="mb-8 max-w-2xl text-slate-600">
            Every idea we&apos;re considering, as its own card — with status, expected output, effort and
            how well it fits the challenge. Filter by stage; the best model is marked.
          </p>
          <Strategies />
        </Section>
      </div>

      <Footer />
    </main>
  );
}
