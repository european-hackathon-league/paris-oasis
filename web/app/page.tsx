import { data } from "./data";
import { Section, MetricCard, Chip } from "../components/ui";
import Explorer from "../components/Explorer";
import Pipeline from "../components/Pipeline";
import { RoomTypeChart, RoomsHistogram } from "../components/Charts";

const NAV = [
  ["explorer", "Explorer"],
  ["task", "The task"],
  ["data", "Dataset"],
  ["pipeline", "Evaluation"],
];

export default function Home() {
  const s = data.stats;
  return (
    <main className="min-h-screen">
      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-xs font-bold text-white">M</span>
            <span className="text-sm font-semibold text-slate-900">MSD Floor-Plan Challenge</span>
          </div>
          <nav className="hidden gap-6 md:flex">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-sm text-slate-600 hover:text-indigo-600">{label}</a>
            ))}
          </nav>
        </div>
      </header>

      {/* hero */}
      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <Chip color="#4f46e5">Modified Swiss Dwellings · ECCV 2024</Chip>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 md:text-6xl">
            Generating floor plans,<br />room by room.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            An interactive look at the data behind the challenge: {s.apartments.toLocaleString()} apartments,
            their wall structures, room layouts and access graphs — and how generated plans are scored.
          </p>
          <div className="mt-8 flex gap-3">
            <a href="#explorer" className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              Explore the data
            </a>
            <a href="#pipeline" className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400">
              See the evaluation
            </a>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard label="Apartments" value={s.apartments.toLocaleString()} />
            <MetricCard label="Floors" value={s.floors.toLocaleString()} />
            <MetricCard label="Geometries" value={(s.geometries / 1e6).toFixed(2) + "M"} />
            <MetricCard label="Avg. rooms" value={String(s.avgRooms)} sub={`median ${s.medianRooms}`} />
          </div>
        </div>
      </div>

      {/* explorer */}
      <Section id="explorer" eyebrow="Interactive" title="Floor-plan explorer">
        <p className="mb-8 max-w-2xl text-slate-600">
          Pick an apartment and step through the three representations the challenge works with —
          the given <strong>walls</strong>, the target <strong>rooms</strong>, and the
          <strong> access graph</strong> that links them. All renders use the official MSD style.
        </p>
        <Explorer />
      </Section>

      {/* task */}
      <div className="border-y border-slate-200 bg-white">
        <Section id="task" eyebrow="The problem" title="From a bubble diagram to a real layout">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { n: "Given", t: "Walls + access graph", d: "The building's wall structure and a graph of rooms (zoning type) connected by doors, passages and the entrance." },
              { n: "Predict", t: "Room geometry & type", d: "For every node, a room polygon and refined room type that together tile the given walls." },
              { n: "Why hard", t: "Plausible & diverse", d: "Layouts must look architecturally real and cover the variety of real apartments — measured distributionally, not per-sample." },
            ].map((c) => (
              <div key={c.n} className="rounded-2xl border border-slate-200 bg-paper p-6">
                <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{c.n}</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{c.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{c.d}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* dataset */}
      <Section id="data" eyebrow="Dataset" title="What the data looks like">
        <div className="grid gap-6 lg:grid-cols-2">
          <RoomTypeChart />
          <RoomsHistogram />
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Room-type palette (official MSD colors)</h3>
          <div className="flex flex-wrap gap-2">
            {data.roomTypes.map((t) => (
              <Chip key={t.id} color={t.color}>{t.name}</Chip>
            ))}
          </div>
        </div>
      </Section>

      {/* pipeline */}
      <div className="border-t border-slate-200 bg-white">
        <Section id="pipeline" eyebrow="Evaluation" title="How plans are scored">
          <Pipeline />
        </Section>
      </div>

      {/* footer */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-5 py-10 text-sm">
          <div className="font-semibold text-white">MSD Floor-Plan Challenge</div>
          <p className="mt-2 max-w-xl text-slate-400">
            Data visualization for the Modified Swiss Dwellings generative challenge. Renders baked from the
            dataset; evaluation metrics (FID, density, coverage) computed offline with the official tooling.
          </p>
        </div>
      </footer>
    </main>
  );
}
