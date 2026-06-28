"use client";

import { useEffect, useState } from "react";

const VIEWS = [
  { kind: "walls", title: "Walls", note: "the given structure" },
  { kind: "rooms", title: "Rooms", note: "the target layout" },
  { kind: "graph", title: "Access graph", note: "which rooms connect" },
] as const;

/**
 * A deliberately simple live peek at the dataset for the overview deck: one
 * random TRAIN apartment shown as its three views, with a single Shuffle button.
 * Mirrors the look of the static "what the model sees" slide.
 */
export default function DataPeek() {
  const [ids, setIds] = useState<string[]>([]);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/ids?split=train")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: string[] = d.ids || [];
        setIds(list);
        setId(list.length ? list[Math.floor(Math.random() * list.length)] : null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const shuffle = () => ids.length && setId(ids[Math.floor(Math.random() * ids.length)]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">{id ? `Train apartment #${id}` : "loading…"}</span>
        <button
          onClick={shuffle}
          disabled={!ids.length}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
        >
          🎲 Shuffle
        </button>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {VIEWS.map((v) => (
          <figure key={v.kind} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            <div className="aspect-square w-full bg-white">
              {id ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={v.kind + id}
                  src={`/api/sample?split=train&id=${id}&kind=${v.kind}&size=512`}
                  alt={v.title}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-slate-100" />
              )}
            </div>
            <figcaption className="border-t border-slate-200 px-4 py-3">
              <div className="text-base font-semibold text-slate-900">{v.title}</div>
              <div className="text-sm text-slate-500">{v.note}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
