"use client";

import { useState } from "react";
import { data, asset, type Sample } from "../app/data";

const LAYERS = [
  { key: "walls", label: "Input · walls", hint: "struct_in wall mask — the given structure" },
  { key: "roomsImg", label: "Target · rooms", hint: "graph_out room polygons, colored by type" },
  { key: "graphImg", label: "+ Access graph", hint: "rooms with the access graph overlaid" },
] as const;

type LayerKey = (typeof LAYERS)[number]["key"];

function roomTypeMeta(id: number) {
  return data.roomTypes.find((t) => t.id === id);
}

export default function Explorer() {
  const [selected, setSelected] = useState<Sample>(data.samples[Math.min(6, data.samples.length - 1)]);
  const [layer, setLayer] = useState<LayerKey>("graphImg");

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      {/* main viewer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              onClick={() => setLayer(l.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                layer === l.key
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-50">
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* preload all layers, show active */}
          {LAYERS.map((l) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={l.key}
              src={asset(selected[l.key])}
              alt={`${l.label} for apartment ${selected.id}`}
              className={`absolute max-h-[88%] max-w-[88%] object-contain transition-opacity duration-300 ${
                layer === l.key ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          {LAYERS.find((l) => l.key === layer)!.hint}
        </p>
      </div>

      {/* sidebar: metadata + gallery */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Apartment {selected.id}</h3>
            <span className="text-xs text-slate-400">test split</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Rooms</div>
              <div className="text-xl font-semibold text-slate-900">{selected.rooms}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Connections</div>
              <div className="text-xl font-semibold text-slate-900">{selected.connections}</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium text-slate-500">Room types present</div>
            <div className="flex flex-wrap gap-1.5">
              {selected.roomTypes.map((rt) => {
                const m = roomTypeMeta(rt);
                return (
                  <span key={rt} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: m?.color }} />
                    {m?.name ?? rt}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Browse {data.samples.length} apartments
          </div>
          <div className="grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1">
            {data.samples.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                title={`${s.rooms} rooms`}
                className={`relative aspect-square overflow-hidden rounded-lg border bg-slate-50 transition ${
                  selected.id === s.id ? "border-indigo-600 ring-2 ring-indigo-200" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset(s.graphImg)} alt={`apartment ${s.id}`} className="h-full w-full object-contain p-1" />
                <span className="absolute bottom-0.5 right-1 rounded bg-white/80 px-1 text-[10px] text-slate-600">
                  {s.rooms}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
