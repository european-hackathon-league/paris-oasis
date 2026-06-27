import { CSV_COLUMNS, ENTITY_COUNTS, V2_FOLDERS, SAMPLE_ROWS } from "../app/rawdata";

const total = ENTITY_COUNTS.reduce((a, b) => a + b.count, 0);

export default function RawData() {
  return (
    <div className="space-y-10">
      {/* two representations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Representation A · flat CSV (polygons)</h3>
          <p className="mt-1 text-sm text-slate-600">
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px]">mds_V2_5.372k.csv</code> —
            one row per geometry, stored as a WKT polygon. Quick to explore.
          </p>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2 font-medium">Column</th><th className="px-3 py-2 font-medium">Meaning</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CSV_COLUMNS.map((c) => (
                  <tr key={c.name}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12.5px] text-slate-800">{c.name}</td>
                    <td className="px-3 py-2 text-slate-600">{c.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Representation B · ML-ready folder (graphs + tensors)</h3>
            <p className="mt-1 text-sm text-slate-600">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px]">modified-swiss-dwellings-v2/</code> —
              per id, the canonical scored format.
            </p>
            <dl className="mt-4 divide-y divide-slate-100">
              {V2_FOLDERS.map((f) => (
                <div key={f.name} className="py-2.5 first:pt-0">
                  <dt className="font-mono text-[13px] font-medium text-indigo-700">{f.name}</dt>
                  <dd className="mt-0.5 text-sm text-slate-600">{f.content}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Geometry mix (entity_type)</h3>
            <div className="mt-4 space-y-3">
              {ENTITY_COUNTS.map((e) => (
                <div key={e.type}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-slate-700">{e.type} <span className="text-slate-400">· {e.note}</span></span>
                    <span className="text-slate-500">{e.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(e.count / total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* sample rows */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Sample rows (one apartment, unit 7300)</h3>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">unit_id</th>
                <th className="px-4 py-2.5 font-medium">entity_type</th>
                <th className="px-4 py-2.5 font-medium">subtype</th>
                <th className="px-4 py-2.5 font-medium">roomtype</th>
                <th className="px-4 py-2.5 font-medium">geom (WKT, truncated)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SAMPLE_ROWS.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 font-mono text-[12.5px] text-slate-700">{r.unit}</td>
                  <td className="px-4 py-2.5"><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">{r.entity}</span></td>
                  <td className="px-4 py-2.5 text-slate-600">{r.subtype}</td>
                  <td className="px-4 py-2.5 text-slate-600">{r.roomtype}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-slate-500">{r.geom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Coordinates are in meters; the full WKT lists every polygon corner.</p>
      </div>
    </div>
  );
}
