import Link from "next/link";
import { data } from "./data";
import { Section, MetricCard, Chip } from "../components/ui";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

const PAGES = [
  {
    href: "/input",
    eyebrow: "01 · Input data",
    title: "What the model is given",
    body: "Raw data — the tables, columns and sample rows — plus an interactive look at the walls, rooms and access graph for real apartments.",
  },
  {
    href: "/ideas",
    eyebrow: "02 · Ideas",
    title: "How we solve it",
    body: "The current best model, visualized end to end, and five strategies to push further — each with its own diagram, status and fit.",
  },
  {
    href: "/docs",
    eyebrow: "03 · Docs",
    title: "Evaluation & literature",
    body: "How plans are scored (FID, density, coverage) and the full reading list — papers behind the project, openable as PDFs.",
  },
];

export default function Home() {
  const s = data.stats;
  return (
    <main className="min-h-screen">
      <Nav />

      {/* hero */}
      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <Chip color="#4f46e5">Modified Swiss Dwellings · ECCV 2024</Chip>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 md:text-6xl">
            Generating floor plans,<br />room by room.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            An interactive hub for the challenge: {s.apartments.toLocaleString()} apartments, their wall
            structures, room layouts and access graphs — the data, our ideas, and how generated plans are scored.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/input" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              Explore the input data
            </Link>
            <Link href="/ideas" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400">
              See our ideas
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard label="Apartments" value={s.apartments.toLocaleString()} />
            <MetricCard label="Floors" value={s.floors.toLocaleString()} />
            <MetricCard label="Geometries" value={(s.geometries / 1e6).toFixed(2) + "M"} />
            <MetricCard label="Avg. rooms" value={String(s.avgRooms)} sub={`median ${s.medianRooms}`} />
          </div>
        </div>
      </div>

      {/* page cards */}
      <Section eyebrow="The site" title="Three places to look">
        <p className="mb-8 max-w-2xl text-slate-600">
          This page is just the summary. Each area below has its own page with the full detail.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {PAGES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-300 hover:shadow"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{p.eyebrow}</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{p.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.body}</p>
              <span className="mt-4 text-sm font-medium text-indigo-600 group-hover:underline">Open →</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* best model teaser */}
      <div className="border-y border-slate-200 bg-white">
        <Section eyebrow="Current status" title="Best model so far">
          <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
            <p className="max-w-xl text-slate-600">
              A conditioned retrieval baseline already scores near the real-vs-real ceiling. It&apos;s the
              starting point we build on — see the Ideas page for how, and what comes next.
            </p>
            {data.eval.baseline && (
              <div className="grid grid-cols-3 gap-3">
                <MetricCard label="FID" value={data.eval.baseline.fid.toFixed(1)} sub="lower better" />
                <MetricCard label="Density" value={data.eval.baseline.density.toFixed(2)} sub="higher better" />
                <MetricCard label="Coverage" value={data.eval.baseline.coverage.toFixed(2)} sub="higher better" />
              </div>
            )}
          </div>
        </Section>
      </div>

      <Footer />
    </main>
  );
}
