"use client";

import { useEffect, useMemo, useState } from "react";

type Split = "train" | "test";
const VIEWS = [
  { kind: "walls", label: "Walls (given structure)", note: "struct_in · channel 0" },
  { kind: "rooms", label: "Rooms (target plan)", note: "graph_out · official MSD render" },
  { kind: "graph", label: "Access graph", note: "graph_out · node-link" },
] as const;

export default function LiveExplorer() {
  const [split, setSplit] = useState<Split>("train");
  const [ids, setIds] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [jump, setJump] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/ids?split=${split}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setIds(d.ids || []);
        setIdx(0);
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [split]);

  const id = ids[idx];
  const total = ids.length;

  const go = (d: number) => setIdx((i) => (total ? (i + d + total) % total : 0));
  const random = () => setIdx(total ? Math.floor(Math.random() * total) : 0);
  const doJump = () => {
    const q = jump.replace(/[^0-9]/g, "");
    if (!q) return;
    const found = ids.indexOf(q);
    if (found >= 0) setIdx(found);
    setJump("");
  };

  const srcs = useMemo(
    () =>
      id
        ? VIEWS.map((v) => ({ ...v, src: `/api/sample?split=${split}&id=${id}&kind=${v.kind}&size=512` }))
        : [],
    [id, split],
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          {(["train", "test"] as Split[]).map((s) => (
            <button
              key={s}
              onClick={() => setSplit(s)}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                split === s ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">← Prev</button>
          <button onClick={() => go(1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Next →</button>
          <button onClick={random} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">🎲 Random</button>
        </div>

        <div className="flex items-center gap-1">
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doJump()}
            placeholder="jump to id…"
            inputMode="numeric"
            className="w-28 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
          />
          <button onClick={doJump} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Go</button>
        </div>

        <div className="ml-auto text-sm text-slate-500">
          {loading ? "loading ids…" : (
            <>
              <span className="font-mono font-semibold text-slate-900">#{id ?? "—"}</span>
              <span className="mx-2 text-slate-300">|</span>
              {total ? `${idx + 1} / ${total.toLocaleString("en-US")}` : "no samples"}
            </>
          )}
        </div>
      </div>

      {/* views */}
      <div className="grid gap-4 md:grid-cols-3">
        {srcs.map((v) => (
          <figure key={v.kind} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="aspect-square w-full bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={v.src}
                src={v.src}
                alt={v.label}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <figcaption className="border-t border-slate-200 px-3 py-2">
              <div className="text-sm font-medium text-slate-900">{v.label}</div>
              <div className="font-mono text-xs text-slate-400">{v.note}</div>
            </figcaption>
          </figure>
        ))}
        {!srcs.length && (
          <div className="md:col-span-3 py-16 text-center text-sm text-slate-400">
            {loading ? "Loading dataset index…" : "No sample selected."}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Rendered live from the real 16 GB MSD dataset on this MI300X box — not pre-baked thumbnails.
        Each image is produced on demand by the official MSD renderer and cached.
      </p>
    </div>
  );
}
