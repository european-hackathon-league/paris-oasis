import { data } from "../app/data";

function FlowBox({ x, title, sub, tone }: { x: number; title: string; sub: string; tone: "slate" | "indigo" | "emerald" }) {
  const fill = tone === "indigo" ? "#eef2ff" : tone === "emerald" ? "#ecfdf5" : "#f1f5f9";
  const stroke = tone === "indigo" ? "#c7d2fe" : tone === "emerald" ? "#a7f3d0" : "#e2e8f0";
  const tcol = tone === "indigo" ? "#4338ca" : tone === "emerald" ? "#047857" : "#334155";
  const scol = tone === "indigo" ? "#6366f1" : tone === "emerald" ? "#059669" : "#64748b";
  return (
    <g>
      <rect x={x} y={28} width={184} height={64} rx={12} fill={fill} stroke={stroke} />
      <text x={x + 92} y={56} textAnchor="middle" fontSize={14} fontWeight={600} fill={tcol}>{title}</text>
      <text x={x + 92} y={76} textAnchor="middle" fontSize={11.5} fill={scol}>{sub}</text>
    </g>
  );
}

export default function BestModel() {
  const e = data.eval.baseline;
  const fid = e ? e.fid.toFixed(1) : "—";
  const density = e ? e.density.toFixed(2) : "—";
  const coverage = e ? e.coverage.toFixed(2) : "—";
  const prec = e ? e.precision.toFixed(2) : "—";
  const rec = e ? e.recall.toFixed(2) : "—";

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-xl font-semibold text-slate-900">Baseline v1 — conditioned retrieval</h3>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-semibold text-emerald-700">
          live · best so far
        </span>
      </div>

      <p className="mt-3 max-w-2xl text-slate-600">
        For each test access graph, find the most structurally similar <em>train</em> apartment
        (feature = node count + zoning histogram + connectivity counts) and emit that apartment&apos;s
        real <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px]">graph_out</code>.
        It always produces a valid, real-shaped plan, so it renders cleanly and scores near the
        real-vs-real ceiling.
      </p>

      <div className="mt-6 overflow-x-auto">
        <svg viewBox="0 0 760 120" className="w-full min-w-[640px]" role="img" aria-label="Test graph matched to nearest train graph, then emit its layout">
          <defs>
            <marker id="bm-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill="#94a3b8" />
            </marker>
          </defs>
          <FlowBox x={0} title="Test graph_in" sub="the query" tone="slate" />
          <line x1={188} y1={60} x2={244} y2={60} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#bm-arrow)" />
          <FlowBox x={250} title="Nearest neighbour" sub="in train set" tone="indigo" />
          <line x1={438} y1={60} x2={494} y2={60} stroke="#94a3b8" strokeWidth={1.5} markerEnd="url(#bm-arrow)" />
          <FlowBox x={500} title="Emit its graph_out" sub="a real plan" tone="emerald" />
        </svg>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="text-xs font-medium text-slate-500">FID</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-emerald-600">{fid}</div>
          <div className="mt-2 inline-block rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">lower better</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="text-xs font-medium text-slate-500">Density</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-emerald-600">{density}</div>
          <div className="mt-2 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">higher better</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <div className="text-xs font-medium text-slate-500">Coverage</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-emerald-600">{coverage}</div>
          <div className="mt-2 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">higher better</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        N=400 · precision {prec} · recall {rec} · <code className="font-mono">src/model/baseline_retrieval.py</code>.
        This ≈ the real-vs-real ceiling, which proves the metrics are distributional and partially
        gameable: anything emitting plausible real layouts scores well.
      </p>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Limitation:</strong> it ignores the walls given in <code className="font-mono">struct_in</code>,
        so geometry doesn&apos;t match the specific input. That&apos;s exactly what strategy 2 fixes.
      </div>
    </div>
  );
}
