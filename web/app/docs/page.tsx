import { Section, Chip } from "../../components/ui";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import Pipeline from "../../components/Pipeline";
import Literature from "../../components/Literature";

export default function DocsPage() {
  return (
    <main className="min-h-screen">
      <Nav />

      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Chip color="#4f46e5">03 · Docs</Chip>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Evaluation &amp; literature
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            How generated plans are scored, and the full reading list behind the project — papers
            openable as PDFs right here.
          </p>
        </div>
      </div>

      {/* evaluation */}
      <Section eyebrow="Evaluation" title="How plans are scored">
        <Pipeline />
      </Section>

      {/* literature */}
      <div className="border-t border-slate-200 bg-white">
        <Section eyebrow="Literature" title="Papers behind the project">
          <Literature />
        </Section>
      </div>

      <Footer />
    </main>
  );
}
