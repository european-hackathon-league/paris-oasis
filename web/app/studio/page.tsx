import { Section, Chip } from "../../components/ui";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import StudioPanel from "../../components/StudioPanel";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  return (
    <main className="min-h-screen">
      <Nav />

      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Chip color="#4f46e5">✦ Studio · draw → generate</Chip>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Draw a structure, get an apartment
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Sketch the walls with your pencil. The trained model fills the enclosed space with rooms and
            documents what goes where — the same model you train on the Live page.
          </p>
        </div>
      </div>

      <Section eyebrow="Studio" title="Your sketch → a generated floor plan">
        <StudioPanel />
      </Section>

      <Footer />
    </main>
  );
}
