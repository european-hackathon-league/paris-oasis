import { data } from "../data";
import { Section, MetricCard, Chip } from "../../components/ui";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import Explorer from "../../components/Explorer";
import RawData from "../../components/RawData";
import KeyFacts from "../../components/KeyFacts";
import { RoomTypeChart, RoomsHistogram } from "../../components/Charts";

export default function InputPage() {
  const s = data.stats;
  return (
    <main className="min-h-screen">
      <Nav />

      <div className="grid-bg border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Chip color="#4f46e5">01 · Input data</Chip>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            What the model is given
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            The raw data behind the challenge — which tables and formats exist, real sample rows, and an
            interactive view of every input representation.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricCard label="Apartments" value={s.apartments.toLocaleString()} />
            <MetricCard label="Floors" value={s.floors.toLocaleString()} />
            <MetricCard label="Geometries" value={(s.geometries / 1e6).toFixed(2) + "M"} />
            <MetricCard label="Avg. rooms" value={String(s.avgRooms)} sub={`median ${s.medianRooms}`} />
          </div>
        </div>
      </div>

      {/* raw data */}
      <Section eyebrow="Raw data" title="Tables, formats & sample rows">
        <p className="mb-8 max-w-2xl text-slate-600">
          The dataset ships in two forms — a flat CSV of polygons, and an ML-ready folder of graphs and
          tensors. Here is the schema of each, plus actual rows from one apartment.
        </p>
        <RawData />
      </Section>

      {/* interactive explorer */}
      <div className="border-y border-slate-200 bg-white">
        <Section eyebrow="Interactive" title="Floor-plan explorer">
          <p className="mb-8 max-w-2xl text-slate-600">
            Pick an apartment and step through the three representations the challenge works with —
            the given <strong>walls</strong>, the target <strong>rooms</strong>, and the
            <strong> access graph</strong> that links them. All renders use the official MSD style.
          </p>
          <Explorer />
        </Section>
      </div>

      {/* charts */}
      <Section eyebrow="Distributions" title="What the data looks like">
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

      {/* key facts */}
      <div className="border-t border-slate-200 bg-white">
        <Section eyebrow="Key facts" title="The dataset at a glance">
          <p className="mb-8 max-w-2xl text-slate-600">
            The headline numbers and specs from the official Modified Swiss Dwellings dataset page.
          </p>
          <KeyFacts />
        </Section>
      </div>

      <Footer />
    </main>
  );
}
