"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type DrawCanvasHandle = {
  getPNG: () => string;
  clear: () => void;
  loadFromUrl: (url: string) => void;
};

const SIZE = 512;

const DrawCanvas = forwardRef<DrawCanvasHandle, { className?: string }>(function DrawCanvas(
  { className = "" },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const undoStack = useRef<ImageData[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [brush, setBrush] = useState(6);

  const ctx = () => canvasRef.current?.getContext("2d") || null;

  const fillWhite = () => {
    const c = ctx();
    if (!c) return;
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, SIZE, SIZE);
  };

  useEffect(() => {
    fillWhite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushUndo = () => {
    const c = ctx();
    if (!c) return;
    undoStack.current.push(c.getImageData(0, 0, SIZE, SIZE));
    if (undoStack.current.length > 25) undoStack.current.shift();
  };

  const pos = (e: React.PointerEvent) => {
    const cv = canvasRef.current!;
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    pushUndo();
    drawing.current = true;
    last.current = pos(e);
    stroke(e); // dot on tap
  };

  const stroke = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = ctx();
    if (!c) return;
    const p = pos(e);
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    const w = tool === "eraser" ? brush * 4 : brush * (0.4 + 1.2 * pressure);
    c.strokeStyle = tool === "eraser" ? "#ffffff" : "#111111";
    c.lineWidth = w;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    const l = last.current || p;
    c.moveTo(l.x, l.y);
    c.lineTo(p.x, p.y);
    c.stroke();
    last.current = p;
  };

  const up = (e: React.PointerEvent) => {
    drawing.current = false;
    last.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

  useImperativeHandle(ref, () => ({
    getPNG: () => canvasRef.current?.toDataURL("image/png") || "",
    clear: () => { pushUndo(); fillWhite(); },
    loadFromUrl: (url: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { pushUndo(); const c = ctx(); if (c) { fillWhite(); c.drawImage(img, 0, 0, SIZE, SIZE); } };
      img.src = url;
    },
  }));

  const undo = () => {
    const c = ctx();
    const prev = undoStack.current.pop();
    if (c && prev) c.putImageData(prev, 0, 0);
  };

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
          <button onClick={() => setTool("pen")} className={`px-3 py-1.5 text-sm font-medium ${tool === "pen" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>✏️ Wall</button>
          <button onClick={() => setTool("eraser")} className={`px-3 py-1.5 text-sm font-medium ${tool === "eraser" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>🩹 Erase</button>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          size
          <input type="range" min={2} max={18} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
        </label>
        <button onClick={undo} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">↶ Undo</button>
        <button onClick={() => { pushUndo(); fillWhite(); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        onPointerDown={down}
        onPointerMove={stroke}
        onPointerUp={up}
        onPointerLeave={up}
        onPointerCancel={up}
        className="aspect-square w-full touch-none rounded-xl border border-slate-300 bg-white shadow-inner"
        style={{ touchAction: "none" }}
      />
    </div>
  );
});

export default DrawCanvas;
