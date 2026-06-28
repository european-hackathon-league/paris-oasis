"use client";

import { useEffect, useState } from "react";

/**
 * A compact live comparison for a model-explainer slide: the real ground-truth
 * plan and, below it, what the model generated - with the real wall structure
 * overlaid on the generated one so you can see how well it fits. Shuffle picks a
 * different test plan. Images come from /api/sample (rendered live).
 */
export default function ModelPreview({ dir, dark = false }: { dir: string; dark?: boolean }) {
  const [ids, setIds] = useState<string[]>([]);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/results", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const run = (d.runs || []).find((r: { dir: string }) => r.dir === dir);
        const list: string[] = run?.ids ?? [];
        setIds(list);
        setId(list[0] ?? null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [dir]);

  const shuffle = () => {
    if (!ids.length) return;
    setId(ids[Math.floor(Math.random() * ids.length)]);
  };

  const muted = dark ? "text-slate-400" : "text-slate-500";
  const border = dark ? "border-white/15" : "border-slate-200";
  const cap = dark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-700";
  const btn = dark ? "border-white/20 text-slate-200 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-50";

  const tile = (title: string, src: string | null) => (
    <figure className={`overflow-hidden rounded-xl border bg-white ${border}`}>
      <div className="aspect-square w-full bg-white">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={title} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <div className={`h-full w-full animate-pulse ${dark ? "bg-white/5" : "bg-slate-100"}`} />
        )}
      </div>
      <figcaption className={`border-t px-3 py-1.5 text-xs font-medium ${cap}`}>{title}</figcaption>
    </figure>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Real vs generated · live</span>
        <button
          onClick={shuffle}
          disabled={!ids.length}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${btn}`}
        >
          🎲 Shuffle
        </button>
      </div>
      <div className="space-y-3">
        {tile("Ground truth", id ? `/api/sample?split=test&id=${id}&kind=truth&pred=${dir}&size=512` : null)}
        {tile("Generated (real walls overlaid)", id ? `/api/sample?split=test&id=${id}&kind=pred&pred=${dir}&fit=1&size=512` : null)}
      </div>
      <p className={`mt-2 text-xs ${muted}`}>A held-out plan, generated live. The dark lines on the generated one are the real walls.</p>
    </div>
  );
}
