"use client";

import { useState } from "react";
import { data } from "../app/data";

const STEPS = [
  { label: "Input", title: "Access graph + walls", body: "Per apartment: the access graph (rooms as nodes with a zoning type, edges = door / passage / entrance) plus the wall structure from struct_in. This is the model's condition." },
  { label: "Model", title: "Generate the layout", body: "The model assigns each node a room polygon and refined room type so the rooms tile the given walls. This is the part teams build — swappable behind the same interface." },
  { label: "Render", title: "Official MSD plot.py", body: "Generated and real plans are rasterized with the same plot_floor renderer (colored rooms + access graph) so both share one image distribution." },
  { label: "Features", title: "InceptionV3", body: "One InceptionV3 turns every rendered image into a feature vector. The same network feeds both metrics, so preprocessing never drifts between them." },
  { label: "Score", title: "FID · density · coverage", body: "FID (torchmetrics) compares the two feature distributions; density & coverage (clovaai prdc, k=5) measure quality and mode coverage." },
];

function evalCards() {
  const e = data.eval.baseline;
  if (!e) return [];
  return [
    { k: "FID", v: e.fid.toFixed(1), goal: "lower better", tone: "indigo" },
    { k: "Density", v: e.density.toFixed(2), goal: "higher better", tone: "emerald" },
    { k: "Coverage", v: e.coverage.toFixed(2), goal: "higher better", tone: "emerald" },
  ];
}

export default function Pipeline() {
  const [active, setActive] = useState(0);
  const tone: Record<string, string> = {
    indigo: "text-indigo-700 bg-indigo-50 border-indigo-200",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Illustrative diagram — this site visualizes the pipeline; it does not run it. The actual
        rendering &amp; metric code lives in the repo under <code className="font-mono">src/eval/</code>.
      </div>

      {/* stepper */}
      <div className="flex flex-wrap items-stretch gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setActive(i)}
            className={`flex min-w-[110px] flex-1 flex-col items-center gap-1 rounded-xl border px-3 py-3 transition ${
              active === i ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${active === i ? "text-indigo-600" : "text-slate-400"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={`text-sm font-medium ${active === i ? "text-indigo-700" : "text-slate-600"}`}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{STEPS[active].title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{STEPS[active].body}</p>
      </div>

      {/* eval results */}
      {data.eval.baseline && (
        <div>
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Retrieval baseline · 400 test apartments
          </div>
          <div className="grid grid-cols-3 gap-3">
            {evalCards().map((c) => (
              <div key={c.k} className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <div className="text-xs font-medium text-slate-500">{c.k}</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{c.v}</div>
                <div className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] ${tone[c.tone]}`}>
                  {c.goal}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">{data.eval.note}</p>
        </div>
      )}
    </div>
  );
}
