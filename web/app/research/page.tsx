import { Section, Chip } from "../../components/ui";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import Strategies from "../../components/Strategies";
import Literature from "../../components/Literature";
import Pipeline from "../../components/Pipeline";
import KeyFacts from "../../components/KeyFacts";
import RawData from "../../components/RawData";

export default function ResearchPage() {
  return (
    <main className="min-h-screen">
      <Nav />

      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Chip color="#4f46e5">Research · ideas, methods &amp; papers</Chip>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            The thinking behind the tool
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Every idea we put in, how plans are scored, the dataset specs, and the full reading list — the
            documentation layer behind the Studio and the models.
          </p>
        </div>
      </div>

      {/* ideas / strategies */}
      <Section eyebrow="Ideas" title="Strategies & approaches">
        <p className="mb-8 max-w-2xl text-slate-600">
          Every idea we&apos;re weighing, as its own card — status, expected output, effort and fit. As we
          turn ideas into models they get documented on the Models page.
        </p>
        <Strategies />
      </Section>

      {/* evaluation */}
      <div className="border-y border-slate-200 bg-white">
        <Section eyebrow="Evaluation" title="How plans are scored">
          <Pipeline />
        </Section>
      </div>

      {/* dataset */}
      <Section eyebrow="Dataset" title="The data, in brief">
        <p className="mb-8 max-w-2xl text-slate-600">
          The Modified Swiss Dwellings dataset — schema, sample rows and headline specs. Browse the real
          plans live on the <a href="/live" className="text-indigo-600 underline">Live</a> page.
        </p>
        <RawData />
        <div className="mt-8">
          <KeyFacts />
        </div>
      </Section>

      {/* papers */}
      <div className="border-t border-slate-200 bg-white">
        <Section eyebrow="Literature" title="Papers behind the project">
          <Literature />
        </Section>
      </div>

      <Footer />
    </main>
  );
}
