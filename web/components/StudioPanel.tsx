"use client";

import { useEffect, useRef, useState } from "react";
import DrawCanvas, { DrawCanvasHandle } from "./DrawCanvas";
import { strokesToSegments, segmentsToDataURL, Seg } from "../lib/straighten";

type Room = { type: number; name: string; color: string; count: number };
type Doc = { n_rooms: number; rooms: Room[]; weights?: string; n_connections?: number; requested?: number };
type Model = { id: string; name: string; status: string; hasWeights: boolean; sketch?: boolean; metrics?: { fid?: number } | null };
type Phase = "idle" | "building" | "running" | "done";
type Mode = "sketch" | "program";

const SIZE = 512;
const ROOM_TYPES: { type: number; name: string; color: string }[] = [
  { type: 0, name: "Bedroom", color: "#1f77b4" },
  { type: 1, name: "Living", color: "#e6550d" },
  { type: 2, name: "Kitchen", color: "#fd8d3c" },
  { type: 4, name: "Corridor", color: "#fdd0a2" },
  { type: 7, name: "Bathroom", color: "#6b6ecf" },
  { type: 8, name: "Balcony", color: "#2ca02c" },
  { type: 3, name: "Dining", color: "#fdae6b" },
  { type: 5, name: "Stairs", color: "#72246c" },
  { type: 6, name: "Storeroom", color: "#5254a3" },
];
const DEFAULT_PROGRAM: Record<number, number> = { 0: 2, 1: 1, 2: 1, 4: 1, 7: 1, 8: 1 };

function animateOutline(canvas: HTMLCanvasElement, segs: Seg[], dur = 900): Promise<void> {
  return new Promise((resolve) => {
    const c = canvas.getContext("2d");
    if (!c || !segs.length) { resolve(); return; }
    const n = segs.length;
    let start = 0;
    const frame = (now: number) => {
      if (!start) start = now;
      const e = Math.min(1, (now - start) / dur);
      c.fillStyle = "#ffffff"; c.fillRect(0, 0, SIZE, SIZE);
      c.strokeStyle = "#111111"; c.lineWidth = 6; c.lineCap = "round"; c.lineJoin = "round";
      const upto = e * n;
      for (let i = 0; i < n; i++) {
        const s = segs[i];
        c.beginPath();
        c.moveTo(s.a.x, s.a.y);
        if (i + 1 <= upto) c.lineTo(s.b.x, s.b.y);
        else if (i < upto) { const f = upto - i; c.lineTo(s.a.x + (s.b.x - s.a.x) * f, s.a.y + (s.b.y - s.a.y) * f); }
        else break;
        c.stroke();
      }
      if (e < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export default function StudioPanel() {
  const draw = useRef<DrawCanvasHandle | null>(null);
  const resultCanvas = useRef<HTMLCanvasElement | null>(null);
  const wrapper = useRef<HTMLDivElement | null>(null);

  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("");
  const [thickness, setThickness] = useState(6);
  const [rooms, setRooms] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState("");
  const [plan, setPlan] = useState<string | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [fs, setFs] = useState(false);
  const [mode, setMode] = useState<Mode>("sketch");
  const [program, setProgram] = useState<Record<number, number>>(DEFAULT_PROGRAM);
  const [progModel, setProgModel] = useState<"rect" | "partition">("rect");

  useEffect(() => {
    fetch("/api/models", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        // only models that can actually generate from a bare sketch
        const usable: Model[] = (d.models || []).filter((m: Model) => m.hasWeights && m.sketch);
        setModels(usable);
        if (usable.length) setModel((cur) => cur || usable[0].id);
      })
      .catch(() => {});
  }, []);

  const busy = phase === "building" || phase === "running";

  const programRooms = Object.entries(program)
    .map(([t, c]) => ({ type: Number(t), count: c }))
    .filter((r) => r.count > 0);

  const generate = async () => {
    if (busy) return;
    if (mode === "sketch" && !model) return;
    if (mode === "program" && !programRooms.length) { setErr("Add at least one room to the program."); return; }
    const strokes = draw.current?.getStrokes() || [];
    if (!strokes.length) { setErr(mode === "program" ? "Draw the building outline first." : "Draw a structure first."); return; }
    const segs = strokesToSegments(strokes);
    if (!segs.length) { setErr("Couldn't read the outline — draw clearer lines."); return; }
    setErr(""); setPlan(null); setDoc(null);

    // 1. animate the cleaned straight outline onto the result canvas
    setPhase("building");
    if (resultCanvas.current) await animateOutline(resultCanvas.current, segs, 900);

    // 2. run the chosen path on the cleaned outline
    setPhase("running");
    try {
      const image = segmentsToDataURL(segs, SIZE, 6);
      const endpoint = mode === "program" ? "/api/parametric" : "/api/canvas";
      const body = mode === "program" ? { image, rooms: programRooms, model: progModel } : { image, rooms, model };
      const r = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.ok) { setErr(d.error || "generation failed"); setPhase("idle"); return; }
      setPlan(d.image); setDoc(d.doc); setPhase("done");
    } catch (e) { setErr(String(e)); setPhase("idle"); }
  };

  const reset = () => { draw.current?.clear(); setPlan(null); setDoc(null); setPhase("idle"); setErr(""); };

  const toggleFs = async () => {
    const next = !fs;
    setFs(next);
    try {
      if (next) await wrapper.current?.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* CSS overlay still applies */ }
  };
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setFs(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---- shared sub-views -----------------------------------------------------
  const ModelSelect = (
    <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-3 text-xs font-medium text-slate-500">
      Model
      <select value={model} onChange={(e) => setModel(e.target.value)}
        className="h-full rounded-r-lg border-l border-slate-200 bg-transparent px-2 text-sm text-slate-900 outline-none">
        {models.length === 0 && <option value="">no trained model</option>}
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}{m.metrics?.fid != null ? ` · FID ${m.metrics.fid.toFixed(0)}` : ""}</option>
        ))}
      </select>
    </label>
  );

  const ProgramModelSelect = (
    <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-3 text-xs font-medium text-slate-500">
      Model
      <select value={progModel} onChange={(e) => setProgModel(e.target.value as "rect" | "partition")}
        className="h-full rounded-r-lg border-l border-slate-200 bg-transparent px-2 text-sm text-slate-900 outline-none">
        <option value="rect">Rectilinear · rectangles</option>
        <option value="partition">Partition · Voronoi</option>
      </select>
    </label>
  );

  const GenerateBtn = (
    <button onClick={generate} disabled={busy || (mode === "sketch" && !model)}
      className="inline-flex h-9 items-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
      {phase === "running" ? "Generating…" : phase === "building" ? "Building outline…" : "✨ Generate"}
    </button>
  );

  const ModeToggle = (
    <div className="inline-flex h-9 overflow-hidden rounded-lg border border-slate-200">
      {(["sketch", "program"] as Mode[]).map((mm) => (
        <button key={mm} onClick={() => setMode(mm)}
          className={`flex h-full items-center px-3.5 text-sm font-medium transition ${mode === mm ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
          {mm === "sketch" ? "✏️ Sketch → model" : "📐 Program"}
        </button>
      ))}
    </div>
  );

  const ProgramEditor = (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2.5 text-sm font-semibold text-slate-900">
        Room program <span className="font-normal text-slate-400">— {programRooms.reduce((a, b) => a + b.count, 0)} rooms, guaranteed</span>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {ROOM_TYPES.map((rt) => (
          <div key={rt.type} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: rt.color }} />{rt.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <button onClick={() => setProgram((p) => ({ ...p, [rt.type]: Math.max(0, (p[rt.type] || 0) - 1) }))}
                className="grid h-6 w-6 place-items-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50">−</button>
              <span className="w-4 text-center text-sm font-semibold tabular-nums">{program[rt.type] || 0}</span>
              <button onClick={() => setProgram((p) => ({ ...p, [rt.type]: Math.min(20, (p[rt.type] || 0) + 1) }))}
                className="grid h-6 w-6 place-items-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50">+</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const DrawSide = (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex h-9 items-center justify-between gap-2">
        <span className="inline-flex h-9 items-center rounded-lg bg-slate-900 px-3 text-sm font-medium text-white">
          {mode === "program" ? "✏️ Draw outline" : "✏️ Draw walls"}
        </span>
        <div className="flex items-center gap-2">
          <label className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
            thickness
            <input type="range" min={3} max={16} value={thickness} onChange={(e) => setThickness(Number(e.target.value))} className="w-16 accent-indigo-600" />
          </label>
          <button onClick={() => draw.current?.undo()} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 hover:bg-slate-50">↶ Undo</button>
          <button onClick={reset} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 hover:bg-slate-50">Clear</button>
        </div>
      </div>
      <div className="relative aspect-square w-full max-h-full overflow-hidden rounded-xl border border-slate-300 shadow-inner">
        <DrawCanvas ref={draw} lineWidth={thickness} className="h-full w-full" />
      </div>
    </div>
  );

  const ResultSide = (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex h-9 items-center gap-2 text-sm font-medium text-slate-900">
        <span className={`h-2 w-2 rounded-full ${busy ? "animate-pulse bg-indigo-500" : phase === "done" ? "bg-emerald-500" : "bg-slate-300"}`} />
        {phase === "building" ? "Straightening your walls…" : phase === "running" ? "Model laying out rooms…" : phase === "done" ? "Generated apartment" : "Generated apartment"}
      </div>
      <div className="relative aspect-square w-full max-h-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <canvas ref={resultCanvas} width={SIZE} height={SIZE} className="h-full w-full" />
        {plan && phase === "done" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={plan} alt="generated plan" className="absolute inset-0 h-full w-full object-contain animate-[fadeIn_0.4s_ease]" />
        )}
        {phase === "running" && (
          <div className="absolute inset-0 grid place-items-center bg-white/40">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
          </div>
        )}
        {phase === "idle" && !plan && (
          <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Draw, then Generate</div>
        )}
      </div>
    </div>
  );

  // ---- fullscreen showcase --------------------------------------------------
  if (fs) {
    return (
      <div ref={wrapper} className="fixed inset-0 z-50 flex flex-col gap-3 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-900">Studio · showcase</span>
          {ModeToggle}
          {mode === "sketch" && ModelSelect}
          {mode === "program" && ProgramModelSelect}
          <div className="ml-auto flex items-center gap-2">
            {GenerateBtn}
            <button onClick={reset} className="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">Clear</button>
            <button onClick={toggleFs} className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">✕ Exit</button>
          </div>
        </div>
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
        {mode === "program" && ProgramEditor}
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <div className="min-h-0">{DrawSide}</div>
          <div className="min-h-0">{ResultSide}</div>
        </div>
      </div>
    );
  }

  // ---- normal layout --------------------------------------------------------
  return (
    <div ref={wrapper}>
      {/* header — mode on the left, actions on the right (always one line) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {ModeToggle}
        <div className="flex items-center gap-2">
          <button onClick={toggleFs} className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">⛶ Fullscreen</button>
          {GenerateBtn}
        </div>
      </div>

      {/* per-mode configuration strip */}
      {mode === "sketch" ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {ModelSelect}
          <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500">
            Room hint
            <input type="number" min={0} max={40} value={rooms} onChange={(e) => setRooms(Number(e.target.value))}
              className="w-12 bg-transparent text-sm text-slate-900 outline-none" />
            <span className="text-slate-400">0 = auto</span>
          </label>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">{ProgramModelSelect}</div>
          {ProgramEditor}
          <p className="mb-4 text-sm text-slate-500">Set the room program, draw the outer outline, and the chosen
            rule-based model lays out exactly those rooms inside it.</p>
        </>
      )}

      {err && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {DrawSide}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {ResultSide}
          {doc && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap gap-3 text-sm">
                <Stat label="Rooms" v={doc.n_rooms} />
                {doc.requested != null && <Stat label="Requested" v={doc.requested} />}
                {doc.n_connections != null && <Stat label="Connections" v={doc.n_connections} />}
                {doc.weights && <Stat label="Model" v={doc.weights} mono />}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room breakdown</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {doc.rooms.map((r) => (
                  <span key={r.type} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    {r.name} <span className="text-slate-400">×{r.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v, mono }: { label: string; v: number | string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-semibold text-slate-900 ${mono ? "font-mono text-xs" : ""}`}>{v}</div>
    </div>
  );
}
