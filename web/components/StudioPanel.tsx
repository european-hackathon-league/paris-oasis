"use client";

import { useEffect, useRef, useState } from "react";
import DrawCanvas, { DrawCanvasHandle } from "./DrawCanvas";
import { strokesToSegments, segmentsToDataURL, Seg } from "../lib/straighten";

type Room = { type: number; name: string; color: string; count: number };
type Doc = { n_rooms: number; n_connections: number; free_fraction: number; rooms: Room[]; weights: string };
type Model = { id: string; name: string; status: string; hasWeights: boolean; metrics?: { fid?: number } | null };
type Phase = "idle" | "building" | "running" | "done";

const SIZE = 512;

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

  useEffect(() => {
    fetch("/api/models", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const usable: Model[] = (d.models || []).filter((m: Model) => m.hasWeights);
        setModels(usable);
        if (usable.length) setModel((cur) => cur || usable[0].id);
      })
      .catch(() => {});
  }, []);

  const busy = phase === "building" || phase === "running";

  const generate = async () => {
    if (!model || busy) return;
    const strokes = draw.current?.getStrokes() || [];
    if (!strokes.length) { setErr("Draw a structure first."); return; }
    const segs = strokesToSegments(strokes);
    if (!segs.length) { setErr("Couldn't read any walls — draw clearer lines."); return; }
    setErr(""); setPlan(null); setDoc(null);

    // 1. animate the cleaned straight outline onto the result canvas
    setPhase("building");
    if (resultCanvas.current) await animateOutline(resultCanvas.current, segs, 900);

    // 2. run the model on the cleaned outline
    setPhase("running");
    try {
      const image = segmentsToDataURL(segs, SIZE, 6);
      const r = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, rooms, model }),
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
    <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
      Model
      <select value={model} onChange={(e) => setModel(e.target.value)}
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900">
        {models.length === 0 && <option value="">no trained model</option>}
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}{m.metrics?.fid != null ? ` · FID ${m.metrics.fid.toFixed(0)}` : ""}</option>
        ))}
      </select>
    </label>
  );

  const GenerateBtn = (
    <button onClick={generate} disabled={busy || !model}
      className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
      {phase === "running" ? "Running model…" : phase === "building" ? "Building outline…" : "✨ Generate"}
    </button>
  );

  const DrawSide = (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">✏️ Draw walls</span>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">thickness
          <input type="range" min={3} max={16} value={thickness} onChange={(e) => setThickness(Number(e.target.value))} />
        </label>
        <button onClick={() => draw.current?.undo()} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">↶ Undo</button>
        <button onClick={reset} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Clear</button>
      </div>
      <div className="relative aspect-square w-full max-h-full overflow-hidden rounded-xl border border-slate-300 shadow-inner">
        <DrawCanvas ref={draw} lineWidth={thickness} className="h-full w-full" />
      </div>
    </div>
  );

  const ResultSide = (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
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
          {ModelSelect}
          <div className="ml-auto flex items-center gap-2">
            {GenerateBtn}
            <button onClick={reset} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Clear</button>
            <button onClick={toggleFs} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">✕ Exit</button>
          </div>
        </div>
        {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {ModelSelect}
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">Room hint
          <input type="number" min={0} max={40} value={rooms} onChange={(e) => setRooms(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900" />
          <span className="text-slate-400">(0 = auto)</span>
        </label>
        <button onClick={toggleFs} className="ml-auto rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">⛶ Fullscreen</button>
        {GenerateBtn}
      </div>
      {err && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{DrawSide}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {ResultSide}
          {doc && (
            <div className="mt-4">
              <div className="mb-3 flex gap-3 text-sm">
                <Stat label="Rooms" v={doc.n_rooms} />
                <Stat label="Connections" v={doc.n_connections} />
                <Stat label="Model" v={doc.weights} mono />
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
