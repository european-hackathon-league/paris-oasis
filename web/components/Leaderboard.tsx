"use client";

import { useEffect, useRef, useState } from "react";

type Row = { name: string; fid: number; tag: string; color: string; note?: string; top?: string; dir?: string; real?: boolean };

// One row per model: name + animated FID bar + that model's own result image.
// Ordered by FID ascending (best first). Retrieval is the ground-truth ceiling.
const ROWS: Row[] = [
  { name: "Retrieval", note: "ground truth", fid: 34.1, tag: "ceiling · copies real plans", color: "#94a3b8", real: true },
  { name: "Centroid Diffusion", fid: 60.5, tag: "learned · outline-only", color: "#10b981", top: "Best", dir: "centroid-v1" },
  { name: "Rectilinear", fid: 80.9, tag: "rule-based · wall-aligned", color: "#4f46e5", dir: "rect-v1" },
  { name: "Partition (Voronoi)", fid: 81.5, tag: "rule-based", color: "#6366f1", dir: "partition-concave" },
  { name: "Corner Diffusion", fid: 96.1, tag: "learned", color: "#0ea5e9", dir: "corner-v1" },
  { name: "Graph-informed U-Net", fid: 145.7, tag: "learned · powers the Studio", color: "#f59e0b", dir: "mi300x-full-100ep" },
];

export default function Leaderboard() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  const [ids, setIds] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/results", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const m: Record<string, string[]> = {};
        for (const r of d.runs || []) m[r.dir] = r.ids || [];
        setIds(m);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // a real test floor for Retrieval's "copies a real plan" thumbnail
  const realId = (ids["rect-v1"] || ids["mi300x-full-100ep"] || [])[0] ?? null;
  const imgFor = (row: Row): string | null => {
    const rot = "&crop=1&rot=90&size=384";
    if (row.real) return realId ? `/api/sample?split=test&id=${realId}&kind=rooms${rot}` : null;
    const id = row.dir ? (ids[row.dir] || [])[0] : undefined;
    return id ? `/api/sample?split=test&id=${id}&kind=pred&pred=${row.dir}&fit=1${rot}` : null;
  };

  return (
    <div ref={ref} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-2">
        {ROWS.map((row, i) => {
          const score = Math.max(0.06, (180 - row.fid) / 180); // lower FID -> longer bar
          const src = imgFor(row);
          return (
            <div key={row.name} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${row.real ? "bg-slate-100 opacity-70" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                    {row.name}
                    {row.note && <span className="font-normal text-slate-400">({row.note})</span>}
                    {row.top && (
                      <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white" style={{ background: row.color }}>
                        {row.top}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-500">
                    FID <span className="font-semibold text-slate-900">{row.fid.toFixed(1)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full transition-[width] duration-[1100ms] ease-out"
                    style={{ width: shown ? `${score * 100}%` : "0%", transitionDelay: `${i * 110}ms`, background: row.color }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-400">{row.tag}</div>
              </div>
              <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt={row.name} className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <div className="h-full w-full animate-pulse bg-slate-100" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-400">
        FID, lower is better. Each thumbnail is that model&apos;s own generated plan with the real walls overlaid;
        Retrieval just copies a real plan - the ground-truth ceiling.
      </p>
    </div>
  );
}
